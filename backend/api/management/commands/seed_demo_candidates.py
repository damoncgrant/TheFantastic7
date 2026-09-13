"""Seed comedy-character candidates, resumes, and applications."""

from django.core.management.base import BaseCommand, CommandError

from api.demo_data import DEMO_PASSWORD, seed_candidates


class Command(BaseCommand):
    help = "Create or update ten comedy TV candidates, resumes, applications, and web photos."

    def add_arguments(self, parser):
        parser.add_argument("--no-images", action="store_true", help="Skip web image downloads.")
        parser.add_argument("--refresh-images", action="store_true", help="Replace existing demo profile photos.")

    def handle(self, *args, **options):
        try:
            candidates = seed_candidates(
                include_images=not options["no_images"],
                refresh_images=options["refresh_images"],
                stdout=self.stdout,
            )
        except (OSError, ValueError) as error:
            raise CommandError(f"Could not seed demo candidates: {error}") from error
        self.stdout.write(self.style.SUCCESS(
            f"Ready: {len(candidates)} candidates with resumes and applications. "
            f"Every candidate password is {DEMO_PASSWORD}."
        ))
