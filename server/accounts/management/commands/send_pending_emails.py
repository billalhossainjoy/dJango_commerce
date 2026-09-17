import time

from django.core.management.base import BaseCommand
from django.db import OperationalError, close_old_connections

from accounts.emails.delivery import deliver_pending


class Command(BaseCommand):
    help = "Retry due unsent emails from the transactional outbox."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=100)
        parser.add_argument("--watch", action="store_true")
        parser.add_argument("--interval", type=int, default=30)

    def handle(self, *args, **options):
        while True:
            close_old_connections()
            try:
                count = deliver_pending(max(1, min(options["limit"], 1000)))
                if count or not options["watch"]:
                    self.stdout.write(f"Delivered {count} queued emails.")
            except OperationalError:
                if not options["watch"]:
                    raise
                # Keep retrying after temporary database/network outages.
                self.stderr.write("Email retry database unavailable; retrying shortly.")
            finally:
                close_old_connections()
            if not options["watch"]:
                break
            time.sleep(max(1, min(options["interval"], 3600)))
