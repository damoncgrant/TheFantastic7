"""Safely clear the local development database."""

import shutil
from pathlib import Path

from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Delete all rows from the local SQLite database; optionally remove uploaded media."

    def add_arguments(self, parser):
        parser.add_argument("--yes", action="store_true", help="Skip the interactive confirmation.")
        parser.add_argument("--media", action="store_true", help="Also delete all locally uploaded media files.")
        parser.add_argument(
            "--allow-other-database",
            action="store_true",
            help="Allow a database other than backend/db.sqlite3 (dangerous).",
        )

    def handle(self, *args, **options):
        configured_database = settings.DATABASES["default"]
        expected_path = (Path(settings.BASE_DIR) / "db.sqlite3").resolve()
        database_path = Path(configured_database["NAME"]).resolve()
        is_expected_local_database = (
            configured_database["ENGINE"] == "django.db.backends.sqlite3"
            and database_path == expected_path
        )
        if not is_expected_local_database and not options["allow_other_database"]:
            raise CommandError(
                "Refusing to clear a database other than backend/db.sqlite3. "
                "Use --allow-other-database only when you have verified the target."
            )

        media_root = Path(settings.MEDIA_ROOT).resolve()
        base_dir = Path(settings.BASE_DIR).resolve()
        if options["media"] and (not media_root.is_relative_to(base_dir) or media_root == base_dir):
            raise CommandError(f"Refusing to remove unsafe media path: {media_root}")

        if not options["yes"]:
            media_note = " and all uploaded media" if options["media"] else ""
            answer = input(f"Delete ALL data from {database_path}{media_note}? Type 'clear' to continue: ")
            if answer.strip().casefold() != "clear":
                self.stdout.write(self.style.WARNING("Cancelled; no data was deleted."))
                return

        call_command("flush", interactive=False, verbosity=0)
        if options["media"]:
            if media_root.exists():
                shutil.rmtree(media_root)

        suffix = " and uploaded media" if options["media"] else ""
        self.stdout.write(self.style.SUCCESS(f"Cleared the local database{suffix}."))
