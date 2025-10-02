import importlib.util
import pathlib
import sys

# Delegate to the repository root conftest.py to avoid duplicating fixture/stub code.
# This loader imports the file and injects its public names into this module's globals
# so pytest finds the fixtures as if they were defined here.
root_conftest = pathlib.Path(__file__).resolve().parents[3] / "conftest.py"
spec = importlib.util.spec_from_file_location("root_conftest", str(root_conftest))
module = importlib.util.module_from_spec(spec)
sys.modules["root_conftest"] = module
spec.loader.exec_module(module)

for name in dir(module):
    if not name.startswith("_"):
        globals()[name] = getattr(module, name)
