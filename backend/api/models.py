from django.db import models


class UserProfile(models.Model):
    class Role(models.TextChoices):
        CANDIDATE = "candidate", "Candidate"
        RECRUITER = "recruiter", "Recruiter"

    name = models.CharField(max_length=120)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=12, choices=Role.choices)
    headline = models.CharField(max_length=180, blank=True)
    bio = models.TextField(blank=True)
    skills = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.role})"


class Company(models.Model):
    name = models.CharField(max_length=120)
    logo_url = models.URLField(blank=True)
    website = models.URLField(blank=True)

    def __str__(self):
        return self.name


class Job(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="jobs")
    recruiter = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name="jobs")
    title = models.CharField(max_length=160)
    description = models.TextField()
    location = models.CharField(max_length=120)
    compensation = models.CharField(max_length=120)
    employment_type = models.CharField(max_length=60, default="Full-time")
    requirements = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} at {self.company.name}"


class Application(models.Model):
    class CandidateDecision(models.TextChoices):
        APPLIED = "applied", "Applied"
        SKIPPED = "skipped", "Skipped"

    class RecruiterDecision(models.TextChoices):
        PENDING = "pending", "Pending"
        SELECTED = "selected", "Selected"
        REJECTED = "rejected", "Rejected"

    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name="applications")
    candidate = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name="applications")
    candidate_decision = models.CharField(max_length=10, choices=CandidateDecision.choices)
    recruiter_decision = models.CharField(max_length=10, choices=RecruiterDecision.choices, default=RecruiterDecision.PENDING)
    applied_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["job", "candidate"], name="one_application_per_job_candidate")]

    @property
    def is_match(self):
        return self.candidate_decision == self.CandidateDecision.APPLIED and self.recruiter_decision == self.RecruiterDecision.SELECTED


class Message(models.Model):
    application = models.ForeignKey(Application, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name="sent_messages")
    body = models.TextField(max_length=4000)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]
