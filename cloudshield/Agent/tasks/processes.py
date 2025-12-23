from .task import BaseTask

from proto import agent_pb2
from logger import task_logger

import psutil
import time
import hashlib

class GetProcessListTask(BaseTask):
    def __init__(self, agent_state):
        super().__init__(agent_state)
        self.agent_state = agent_state
        self.md5sum_cache = {}

    def get_md5_sum(self, path):
        """
        Compute the MD5 checksum of a file, using a cache to avoid recomputation.
        """
        if path in self.md5sum_cache:
            task_logger.debug(f"md5sum cache hit on {path}")
            return self.md5sum_cache[path]
        try:
            f = open(path, "rb")
            # nosec: B303
            file_hash = hashlib.md5()
            while chunk := f.read(8192):
                file_hash.update(chunk)
            f.close()
            md5sum = file_hash.hexdigest()
            self.md5sum_cache[path] = md5sum

            return md5sum

        except Exception as e:
            task_logger.error(e)
            task_logger.error(f"error getting md5sum for {path}")
            return ""

    def get_process_list(self):
        """
        Returns a list of process info dictionaries including pid, name, username,
        create_time, cpu_percent, memory usage, cmdline, and parent pid.
        """
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'username', 'create_time',
                                         'cpu_percent', 'memory_info', 'cmdline', 'ppid']):
            try:
                info = proc.info
                # Normalize fields that can be None or unexpected types
                pid = info.get('pid')
                name = info.get('name') or ''
                username = info.get('username') or ''
                create_time = str(info.get('create_time') or '')
                cpu_percent = str(info.get('cpu_percent') or '')
                memory_usage = ''
                if info.get('memory_info') and hasattr(info['memory_info'], 'rss'):
                    memory_usage = str(info['memory_info'].rss)

                # cmdline may be a list of strings or a single string; ensure it's iterable
                raw_cmdline = info.get('cmdline') or []
                if isinstance(raw_cmdline, str):
                    cmdline_str = raw_cmdline
                else:
                    try:
                        # Filter out non-string items and convert to string as fallback
                        cmdline_parts = [str(x) for x in raw_cmdline if x is not None]
                        cmdline_str = " ".join(cmdline_parts)
                    except TypeError:
                        cmdline_str = ''

                processes.append(agent_pb2.Process(
                    pid=pid,
                    name=name,
                    username=username,
                    create_time=create_time,
                    cpu_percent=cpu_percent,
                    memory_usage=memory_usage,
                    cmdline=cmdline_str,
                    ppid=info.get('ppid') or 0
                ))
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue
        return processes

    def get_process_information(self, pid):
        """
        Collect runtime and on-disk artifacts for a Windows process for analysis.

        Given a process ID, gather network connections (listening & established), open files
        (with hashing), memory maps (modules) and thread info.
        """
        [c for c in psutil.net_connections(kind='inet') if c.pid == pid]
        open_files_grpc = []
        memory_maps_grpc = []
        threads_grpc = []
        try:

            proc = psutil.Process(pid)
            # Create grpc messages for psutil open_files() data
            open_files = proc.open_files()
            for open_file in open_files:
                if "popenfile" in str(type(open_file)):
                    open_files_grpc.append(agent_pb2.OpenFile(
                        md5sum     =   self.get_md5_sum(open_file.path),
                        file_path   =   str(open_file.path),
                        position    =   str(getattr(open_file, "position", 0)),
                        mode        =   str(getattr(open_file, "mode", "")),
                        flags       =   str(getattr(open_file, "flags", ""))
                    ))
                else:
                    open_files_grpc.append(agent_pb2.OpenFile(
                        md5sum     =   self.get_md5_sum(open_file.path),
                        file_path   =   str(open_file.path),
                        fd          =   str(getattr(open_file, "fd", "")),
                        position    =   str(getattr(open_file, "position", 0)),
                        mode        =   str(getattr(open_file, "mode", "")),
                        flags       =   str(getattr(open_file, "flags", ""))
                    ))


            # Create grpc messages for psutil memory_maps() data
            memory_maps = proc.memory_maps()
            for memory_map in memory_maps:
                memory_maps_grpc.append(agent_pb2.MemoryMap(
                    md5sum     =   self.get_md5_sum(memory_map.path),
                    file_path   =   str(memory_map.path),
                    rss         =   str(memory_map.rss)
                ))

            # Create grpc messages for psutil threads() data
            threads = proc.threads()
            for thread in threads:
                threads_grpc = agent_pb2.Thread(
                    thread_count = len(threads)
                )
            return {
                "name": proc.name(),
                "path": proc.exe(),
                "open_files": open_files_grpc,
                "memory_maps": memory_maps_grpc,
                "threads": threads_grpc
            }
        except psutil.NoSuchProcess:
            task_logger.warning(f"psutil no such process (pid={pid}")
        except psutil.AccessDenied as e:
            task_logger.warning(f"psutil access denied (pid={pid}")
            task_logger.error(e)
            task_logger.error(f"Failed to get detailed process info (pid={pid}")
            return None

    def run(self):
        processes = self.get_process_list()
        request = agent_pb2.ProcessList(
            agent_id=self.agent_state["agent_id"],
            timestamp=int(time.time()),
            processes=processes,
            is_pending=False
        )

        response = self.send("SendProcessList", request)

        if response is None:
            return

        if response.action is True:
            task_logger.info("Responding to GRPC Server with detailed process info")
            pids = response.pids
            process_info = []
            for pid in pids:
                proc_info_data = self.get_process_information(pid)
                if proc_info_data is None:
                    task_logger.warning(f"pid {pid} no longer exists")
                    continue

                proc_info = agent_pb2.ProcessInformation(
                        pid = pid,
                        name = proc_info_data["name"],
                        open_files = proc_info_data["open_files"],
                        memory_maps = proc_info_data["memory_maps"],
                        threads = proc_info_data["threads"]
                )

                #task_logger.debug(f"open_files: {proc_info_data['open_files']}")
                #task_logger.debug(f"memory_maps: {proc_info_data['memory_maps']}")
                #task_logger.debug(f"threads: {proc_info_data['threads']}")

                process_info.append(proc_info)

            request_res = agent_pb2.ProcessListAckRes(
                    agent_id=self.agent_state["agent_id"],
                    timestamp=int(time.time()),
                    processes=process_info,
                    is_pending=False
            )

            self.send("SendProcessListInformation", request_res)
