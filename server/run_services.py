"""Run the web server and email retries as one Railway service."""

import os
import signal
import subprocess
import sys
from threading import Event


def supervise(commands: list[list[str]]) -> int:
    stopped = Event()
    processes: list[subprocess.Popen] = []
    previous = {
        signum: signal.signal(signum, lambda *_: stopped.set())
        for signum in (signal.SIGTERM, signal.SIGINT)
    }
    try:
        for command in commands:
            processes.append(subprocess.Popen(command))
        while not stopped.wait(0.5):
            for process in processes:
                if process.poll() is not None:
                    # Either child exiting is unexpected. Stop its sibling and
                    # let Railway's restart policy recover the complete service.
                    return process.returncode or 1
        return 0
    finally:
        for process in processes:
            if process.poll() is None:
                process.terminate()
        for process in processes:
            try:
                process.wait(timeout=20)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
        for signum, handler in previous.items():
            signal.signal(signum, handler)


if __name__ == "__main__":
    sys.exit(
        supervise(
            [
                [sys.executable, "manage.py", "send_pending_emails", "--watch"],
                [
                    sys.executable,
                    "-m",
                    "gunicorn",
                    "config.wsgi:application",
                    "--bind",
                    f"[::]:{os.environ.get('PORT', '8080')}",
                    "--workers",
                    "2",
                    "--access-logfile",
                    "-",
                    "--error-logfile",
                    "-",
                ],
            ]
        )
    )
