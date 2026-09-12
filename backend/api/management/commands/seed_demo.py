from django.core.management.base import BaseCommand

from api.models import Application, Company, Job, UserProfile


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
            ("Product Designer", "Design clear, human-centered experiences for healthcare teams.", "Edmonton, AB · Hybrid", "$72k–$88k", ["Figma", "UX research", "Design systems"]),
            ("DevOps Engineer", "Improve deployment tooling and help developers ship confidently.", "Remote · Canada", "$85k–$105k", ["Docker", "AWS", "CI/CD"]),
            ("Data Analyst", "Turn product data into insights that guide practical decisions.", "Calgary, AB · Hybrid", "$65k–$82k", ["SQL", "Python", "Tableau"]),
        ]
        created_jobs = {}
        for title, description, location, compensation, requirements in jobs:
            job, _ = Job.objects.get_or_create(
                company=company, recruiter=recruiter, title=title,
                defaults={"description": description, "location": location, "compensation": compensation, "requirements": requirements},
            )
            created_jobs[title] = job
        # These records power the candidate's Applications filters: one at each stage.
        stages = {
            "Backend Developer": (Application.Stage.APPLIED, Application.RecruiterDecision.PENDING),
            "Frontend Developer": (Application.Stage.INTERVIEW, Application.RecruiterDecision.SELECTED),
            "Software Developer Intern": (Application.Stage.OFFER, Application.RecruiterDecision.SELECTED),
        }
        for title, (stage, recruiter_decision) in stages.items():
            application, _ = Application.objects.get_or_create(
                job=created_jobs[title], candidate=candidate,
                defaults={"candidate_decision": Application.CandidateDecision.APPLIED, "recruiter_decision": recruiter_decision, "stage": stage},
            )
            if application.stage != stage or application.recruiter_decision != recruiter_decision:
                application.stage = stage
                application.recruiter_decision = recruiter_decision
                application.save(update_fields=["stage", "recruiter_decision", "updated_at"])
        self.stdout.write(self.style.SUCCESS(f"Demo data ready. Candidate ID: {candidate.id}; recruiter ID: {recruiter.id}"))
