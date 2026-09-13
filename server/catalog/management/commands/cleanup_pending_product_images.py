from datetime import timedelta
from typing import Any

from django.core.exceptions import ImproperlyConfigured
from django.core.management.base import BaseCommand, CommandError, CommandParser
from django.utils import timezone

from catalog.models import ProductImage
from catalog.services import ProductImageDeletionError, delete_product_image


class Command(BaseCommand):
    help = "Delete product-image uploads that remained pending past their expiry."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            "--older-than-minutes",
            type=int,
            default=60,
            help="Delete pending uploads older than this many minutes (default: 60).",
        )

    def handle(self, *args: Any, **options: Any) -> None:
        older_than_minutes = options["older_than_minutes"]
        if older_than_minutes < 1:
            raise CommandError("--older-than-minutes must be at least 1.")

        cutoff = timezone.now() - timedelta(minutes=older_than_minutes)
        images = ProductImage.objects.filter(
            status=ProductImage.Status.PENDING,
            created_at__lt=cutoff,
        ).order_by("created_at")

        deleted = 0
        for image in images.iterator():
            try:
                delete_product_image(image)
            except (ImproperlyConfigured, ProductImageDeletionError) as error:
                raise CommandError(
                    f"Could not clean pending product image {image.id}."
                ) from error
            deleted += 1

        self.stdout.write(self.style.SUCCESS(f"Deleted {deleted} pending image(s)."))
