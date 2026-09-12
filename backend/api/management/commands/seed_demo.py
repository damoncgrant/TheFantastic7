from django.core.management.base import BaseCommand

from api.models import Company, Job, UserProfile


class Command(BaseCommand):
    help = "Create idempotent demo candidate, recruiter, company, and job data."

    def handle(self, *args, **options):
        candidate, _ = UserProfile.objects.get_or_create(
            email="candidate@jobbler.demo",
            defaults={
                "name": "Chud", "role": UserProfile.Role.CANDIDATE,
                "headline": "Computing Science student", "skills": ["React", "Python", "Django"],
            },
        )
        recruiter, _ = UserProfile.objects.get_or_create(
            email="recruiter@northstar.demo",
            defaults={"name": "Riley Morgan", "role": UserProfile.Role.RECRUITER},
        )
        company, _ = Company.objects.get_or_create(
            name="Northstar Labs",
            defaults={"logo_url": "https://placehold.co/200x200/3F6B4F/F4EFE2?text=NL"},
        )
        jobs = [
            ("Backend Developer", "Build thoughtful APIs for a growing product team.", "Edmonton, AB · Hybrid", "$75k–$95k", ["Python", "Django", "PostgreSQL"]),
            ("Frontend Developer", "Create accessible, polished experiences used every day.", "Remote · Canada", "$70k–$90k", ["React", "JavaScript", "CSS"]),
            ("Software Developer Intern", "Ship features with mentorship from a small engineering team.", "Calgary, AB · On-site", "$25–$32/hour", ["Python", "Git", "4 months"]),
        ]
        for title, description, location, compensation, requirements in jobs:
            Job.objects.get_or_create(
                company=company, recruiter=recruiter, title=title,
                defaults={"description": description, "location": location, "compensation": compensation, "requirements": requirements},
            )
        self.stdout.write(self.style.SUCCESS(f"Demo data ready. Candidate ID: {candidate.id}; recruiter ID: {recruiter.id}"))
