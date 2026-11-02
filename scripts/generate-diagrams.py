"""Compatibility entry point for the current UML sources and renderer."""
from pathlib import Path
import subprocess,sys
root=Path(__file__).resolve().parent.parent
subprocess.run([sys.executable,str(root/'scripts'/'write-uml-sources.py')],cwd=root,check=True)
subprocess.run(['node',str(root/'scripts'/'render-uml.mjs')],cwd=root,check=True)
