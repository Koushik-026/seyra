"""Compatibility entry point for college-format editable reports."""
import runpy
from pathlib import Path
runpy.run_path(str(Path(__file__).with_name('build-college-reports.py')), run_name='__main__')
