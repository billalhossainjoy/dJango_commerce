import os
import signal
import subprocess
import sys
import time
from pathlib import Path

import pytest


@pytest.mark.parametrize("stop_with_signal", [False, True])
def test_supervisor_stops_children_on_shutdown_or_child_exit(
    tmp_path, stop_with_signal
):
    child = tmp_path / "child.py"
    child.write_text(
        "import os, signal, sys, time\n"
        "from pathlib import Path\n"
        "def stop(*args):\n"
        "    Path(sys.argv[1] + '.stopped').touch()\n"
        "    sys.exit(0)\n"
        "signal.signal(signal.SIGTERM, stop)\n"
        "Path(sys.argv[1]).write_text(str(os.getpid()))\n"
        "while True: time.sleep(0.05)\n"
    )
    marker = tmp_path / "child.pid"
    commands = [[sys.executable, str(child), str(marker)]]
    if not stop_with_signal:
        commands.append([sys.executable, "-c", "import time; time.sleep(1)"])
    process = subprocess.Popen(
        [
            sys.executable,
            "-c",
            f"from run_services import supervise; import sys; sys.exit(supervise({commands!r}))",
        ],
        cwd=Path(__file__).resolve().parents[1],
    )
    try:
        deadline = time.monotonic() + 10
        while not marker.exists() and time.monotonic() < deadline:
            time.sleep(0.05)
        assert marker.exists()
        if stop_with_signal:
            process.send_signal(signal.SIGTERM)
        assert process.wait(timeout=10) == (0 if stop_with_signal else 1)
        assert marker.with_suffix(".pid.stopped").exists()
        with pytest.raises(ProcessLookupError):
            os.kill(int(marker.read_text()), 0)
    finally:
        if process.poll() is None:
            process.terminate()
            process.wait(timeout=10)
