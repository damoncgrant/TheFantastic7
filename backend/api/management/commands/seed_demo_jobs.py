"""Seed the comedy-universe job board."""

from django.core.management.base import BaseCommand, CommandError

from api.demo_data import DEMO_PASSWORD, DEMO_RECRUITER_EMAIL, seed_jobs


class Command(BaseCommand):
    help = "Create or update ten comedy TV-inspired jobs using photos from demo_assets."

    def add_arguments(self, parser):
        parser.add_argument("--no-images", action="store_true", help="Skip copying local demo images.")
        parser.add_argument("--refresh-images", action="store_true", help="Replace media photos from demo_assets.")

    def handle(self, *args, **options):
        try:
            jobs = seed_jobs(
                include_images=not options["no_images"],
                refresh_images=options["refresh_images"],
                stdout=self.stdout,
            )
        except (OSError, ValueError) as error:
            raise CommandError(f"Could not seed demo jobs: {error}") from error
        self.stdout.write(self.style.SUCCESS(
            f"Ready: {len(jobs)} demo jobs. Recruiter login: {DEMO_RECRUITER_EMAIL} / {DEMO_PASSWORD}"
        ))
