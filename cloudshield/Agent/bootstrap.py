import hashlib
import subprocess

BOOTSTRAP_BINARY = "bootstrap"
BOOSTRAP_HASH = ""

def get_md5_checksum():
    md5_bootstrap_hash = haslib.md5()
    f = open(BOOTSTRAP_BINARY, "rb")
    for c in iter(lambda: f.read(4096), b""):
        md5_bootstrap_hash.update(c)
    f.close()
    return md5_bootstrap_hash.hexdigest()

def check_bootstrap_sum():
    bootstrap_hash = get_md5_checksum()

    if bootstrap_hash != BOOTSTRAP_HASH:
        print("failed to execute bootstrap, invalid bootstrap hash")
        exit()




def init_bootstrap():
    subprocess.run(
            [BOOTSTRAP_BINARY],
            capture_output=True,
            text=True
    )

    pass
