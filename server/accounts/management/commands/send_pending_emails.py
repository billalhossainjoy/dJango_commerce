from django.core.management.base import BaseCommand

from accounts.emails.delivery import deliver_pending


class Command(BaseCommand):
    help = "Retry due unsent emails from the transactional outbox."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=100)

    def handle(self, *args, **options):
        count = deliver_pending(max(1, min(options["limit"], 1000)))
        self.stdout.write(f"Delivered {count} queued emails.")
