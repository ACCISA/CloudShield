# -*- mode: python ; coding: utf-8 -*-

from pathlib import Path
from PyInstaller.utils.hooks import collect_all, collect_submodules

BASE_DIR = Path(__file__).resolve().parent if "__file__" in globals() else Path.cwd()

grpc_datas, grpc_binaries, grpc_hiddenimports = collect_all('grpc')
proto_datas, proto_binaries, proto_hiddenimports = collect_all('google.protobuf')

a = Analysis(
    ['main.py'],
    pathex=[str(BASE_DIR)],
    binaries=grpc_binaries + proto_binaries,
    datas=[('config', 'config'), ('scripts', 'scripts'), ('proto', 'proto')] + grpc_datas + proto_datas,
    hiddenimports=grpc_hiddenimports + proto_hiddenimports + [
        'grpc',
        'grpc._cython',
        'grpc._cython.cygrpc',
        'google.protobuf',
        'schedule',
        'psutil',
        'boto3',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='cloudshield_agent',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
