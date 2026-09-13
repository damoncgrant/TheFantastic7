"""Show a quick readiness report before a demo."""

from django.core.management.base import BaseCommand

from api.demo_data import CANDIDATES, DEMO_PASSWORD, DEMO_RECRUITER_EMAIL, JOBS
from api.models import Application, Job, Resume, UserProfile


class Command(BaseCommand):
    help = "Report whether the comedy demo jobs, candidates, resumes, applications, and photos are ready."

    def handle(self, *args, **options):
        demo_job_titles = [item["title"] for item in JOBS]
        demo_candidate_emails = [item["email"] for item in CANDIDATES]
        jobs = Job.objects.filter(title__in=demo_job_titles)
        candidates = UserProfile.objects.filter(email__in=demo_candidate_emails)
        applications = Application.objects.filter(candidate__email__in=demo_candidate_emails)
        resumes = Resume.objects.filter(user__email__in=demo_candidate_emails)

        rows = [
            ("Jobs", jobs.count(), len(JOBS)),
            ("Jobs with photos", jobs.exclude(photo="").count(), len(JOBS)),
            ("Candidates", candidates.count(), len(CANDIDATES)),
            ("Candidates with photos", candidates.exclude(photo="").count(), len(CANDIDATES)),
            ("Resumes", resumes.count(), len(CANDIDATES)),
            ("Applications", applications.count(), len(CANDIDATES)),
        ]
        for label, actual, expected in rows:
            marker = "✓" if actual >= expected else "!"
            self.stdout.write(f"{marker} {label}: {actual}/{expected}")
        self.stdout.write(f"Recruiter login: {DEMO_RECRUITER_EMAIL} / {DEMO_PASSWORD}")
        self.stdout.write("Candidate emails end in @jobbler.demo and use the same password.")
