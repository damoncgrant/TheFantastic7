from django.core.management.base import BaseCommand, CommandError

from api.demo_data import (
    DEMO_PASSWORD,
    DEMO_RECRUITER_EMAIL,
    seed_candidates,
    seed_jobs,
)


class Command(BaseCommand):
    help = "Prepare the complete Jobbler comedy demo: jobs, candidates, resumes, applications, and photos."

    def add_arguments(self, parser):
        parser.add_argument("--no-images", action="store_true", help="Skip copying local demo images.")
        parser.add_argument("--refresh-images", action="store_true", help="Replace media photos from demo_assets.")

    def handle(self, *args, **options):
        include_images = not options["no_images"]
        try:
            jobs = seed_jobs(
                include_images=include_images,
                refresh_images=options["refresh_images"],
                stdout=self.stdout,
            )
            candidates = seed_candidates(
                include_images=include_images,
                refresh_images=options["refresh_images"],
                stdout=self.stdout,
            )
        except (OSError, ValueError) as error:
            raise CommandError(f"Could not prepare demo data: {error}") from error
        self.stdout.write(self.style.SUCCESS(
            f"Demo ready: {len(jobs)} jobs and {len(candidates)} candidates. "
            f"Recruiter login: {DEMO_RECRUITER_EMAIL} / {DEMO_PASSWORD}"
        ))
