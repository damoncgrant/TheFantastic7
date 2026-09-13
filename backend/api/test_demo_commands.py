import tempfile
from io import StringIO
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase

from .demo_data import CANDIDATES, DEMO_PASSWORD, DEMO_RECRUITER_EMAIL, JOBS
from .models import Application, Job, Resume, UserProfile


class DemoSeedCommandTests(TestCase):
    def test_complete_seed_is_idempotent_and_connects_all_demo_records(self):
        output = StringIO()
        call_command("seed_demo", no_images=True, stdout=output)
        call_command("seed_demo", no_images=True, stdout=output)

        candidate_emails = [candidate["email"] for candidate in CANDIDATES]
        demo_jobs = Job.objects.filter(title__in=[job["title"] for job in JOBS])
        demo_candidates = UserProfile.objects.filter(email__in=candidate_emails)
        applications = Application.objects.filter(candidate__email__in=candidate_emails)
        resumes = Resume.objects.filter(user__email__in=candidate_emails)

        self.assertEqual(demo_jobs.count(), 10)
        self.assertEqual(demo_candidates.count(), 10)
        self.assertEqual(applications.count(), 10)
        self.assertEqual(resumes.count(), 10)
        self.assertFalse(applications.filter(resume=None).exists())
        self.assertFalse(applications.exclude(stage=Application.Stage.APPLIED).exists())
        self.assertTrue(get_user_model().objects.get(email=DEMO_RECRUITER_EMAIL).check_password(DEMO_PASSWORD))

    def test_summary_reports_a_ready_seed(self):
        call_command("seed_demo", no_images=True, stdout=StringIO())
        output = StringIO()

        call_command("demo_summary", stdout=output)

        self.assertIn("✓ Jobs: 10/10", output.getvalue())
        self.assertIn("✓ Candidates: 10/10", output.getvalue())
        self.assertIn("✓ Resumes: 10/10", output.getvalue())
        self.assertIn("✓ Applications: 10/10", output.getvalue())

    def test_seed_copies_every_local_asset_into_media_storage(self):
        with tempfile.TemporaryDirectory() as media_root, self.settings(MEDIA_ROOT=media_root):
            call_command("seed_demo", stdout=StringIO())

            jobs = Job.objects.filter(title__in=[job["title"] for job in JOBS])
            candidates = UserProfile.objects.filter(email__in=[candidate["email"] for candidate in CANDIDATES])
            self.assertEqual(jobs.exclude(photo="").count(), 10)
            self.assertEqual(candidates.exclude(photo="").count(), 10)
            self.assertTrue(all(Path(item.photo.path).is_file() for item in [*jobs, *candidates]))
