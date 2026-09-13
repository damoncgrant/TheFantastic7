import json
import mimetypes
import re
from urllib.parse import quote
from uuid import uuid4

from django.db import transaction
from django.db.models import Case, Count, IntegerField, Q, Value, When
from django.http import FileResponse, HttpResponse, JsonResponse
from django.middleware.csrf import get_token
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods, require_POST

from .latex import LatexError, compile_png
from .identity import ensure_user_profile
from .models import Application, Company, Job, Message, Resume, UserProfile
from .resume_builder import build_resume as build_latex_resume


@require_GET
def hello(request):
    return JsonResponse({"message": "Job matching API is online."})


def error(message, status=400):
    return JsonResponse({"error": message}, status=status)


def request_json(request):
    try:
        return json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return None


def recruiter_job_request_data(request):
    """Read either JSON or the multipart payload used when a photo is attached."""
    if request.content_type and request.content_type.startswith("multipart/form-data"):
        data = request.POST.dict()
        try:
            data["requirements"] = json.loads(data.get("requirements", "[]"))
        except json.JSONDecodeError:
            return None
        return data
    return request_json(request)


def prepare_job_photo(upload):
    """Validate an uploaded image by size and file signature, then give it a safe name."""
    if upload is None:
        return None, None
    if upload.size > 5 * 1024 * 1024:
        return None, error("Choose a job photo smaller than 5 MB.")

    header = upload.read(12)
    upload.seek(0)
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        extension = "png"
    elif header.startswith(b"\xff\xd8\xff"):
        extension = "jpg"
    elif header.startswith(b"RIFF") and header[8:12] == b"WEBP":
        extension = "webp"
    else:
        return None, error("Choose a PNG, JPEG, or WebP job photo.")

    upload.name = f"job-{uuid4().hex}.{extension}"
    return upload, None


def prepare_profile_photo(upload):
    """Validate a candidate profile image and replace its original filename."""
    if upload is None:
        return None, error("Choose a profile picture to upload.")
    if upload.size > 5 * 1024 * 1024:
        return None, error("Choose a profile picture smaller than 5 MB.")

    header = upload.read(12)
    upload.seek(0)
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        extension = "png"
    elif header.startswith(b"\xff\xd8\xff"):
        extension = "jpg"
    elif header.startswith(b"RIFF") and header[8:12] == b"WEBP":
        extension = "webp"
    else:
        return None, error("Choose a PNG, JPEG, or WebP profile picture.")

    upload.name = f"candidate-{uuid4().hex}.{extension}"
    return upload, None


def authenticated_user(request):
    if request.user.is_authenticated:
        return request.user
    return None


def authenticated_profile(request, required_role):
    account = authenticated_user(request)
    if account is None:
        return None, error("Sign in to continue.", 401)
    profile = ensure_user_profile(account)
    if profile.role != required_role:
        return None, error("This action is not available for your account role.", 403)
    return profile, None


def serialize_resume(resume):
    return {
        "id": resume.id,
        "name": resume.name,
        "latex": resume.latex,
        "builderData": resume.builder_data,
        "isDefault": resume.is_default,
        "createdAt": resume.created_at.isoformat(),
        "updatedAt": resume.updated_at.isoformat(),
    }


def resume_payload(request):
    data = request_json(request)
    if not isinstance(data, dict):
        return None, error("Resume data must be valid JSON.")
    name = data.get("name")
    latex = data.get("latex")
    builder_data = data.get("builderData")
    if not isinstance(name, str) or not name.strip():
        return None, error("A resume name is required.")
    if len(name.strip()) > 150:
        return None, error("Resume names must be 150 characters or fewer.")
    if latex is None and isinstance(builder_data, dict):
        try:
            latex = build_latex_resume(builder_data).decode("utf-8")
        except ValueError as exc:
            return None, error(str(exc))
    if not isinstance(latex, str) or not latex.strip():
        return None, error("LaTeX source is required.")
    if len(latex.encode("utf-8")) > 1024 * 1024:
        return None, error("LaTeX source must be smaller than 1 MB.")
    if builder_data is not None and not isinstance(builder_data, dict):
        return None, error("Builder data must be an object.")
    return {
        "name": name.strip(),
        "latex": latex,
        "builder_data": builder_data,
        "is_default": data.get("isDefault") is True,
    }, None


@require_http_methods(["GET", "POST"])
def resumes(request):
    user = authenticated_user(request)
    if user is None:
        return error("Sign in to manage resumes.", 401)
    if request.method == "GET":
        return JsonResponse({"resumes": [serialize_resume(resume) for resume in Resume.objects.filter(user=user)]})

    payload, response = resume_payload(request)
    if response:
        return response
    with transaction.atomic():
        has_resumes = Resume.objects.filter(user=user).exists()
        make_default = payload["is_default"] or not has_resumes
        if make_default:
            Resume.objects.filter(user=user, is_default=True).update(is_default=False)
        payload["is_default"] = make_default
        resume = Resume.objects.create(user=user, **payload)
    return JsonResponse({"resume": serialize_resume(resume)}, status=201)


@require_http_methods(["GET", "PATCH", "DELETE"])
def resume_detail(request, resume_id):
    user = authenticated_user(request)
    if user is None:
        return error("Sign in to manage resumes.", 401)
    if request.method == "DELETE":
        with transaction.atomic():
            resume = Resume.objects.filter(pk=resume_id, user=user).first()
            if resume is None:
                return HttpResponse(status=204)
            was_default = resume.is_default
            resume.delete()
            if was_default:
                replacement = Resume.objects.filter(user=user).first()
                if replacement:
                    replacement.is_default = True
                    replacement.save(update_fields=["is_default", "updated_at"])
        return HttpResponse(status=204)

    resume = get_object_or_404(Resume, pk=resume_id, user=user)
    if request.method == "GET":
        return JsonResponse({"resume": serialize_resume(resume)})

    payload, response = resume_payload(request)
    if response:
        return response
    resume.name = payload["name"]
    resume.latex = payload["latex"]
    resume.builder_data = payload["builder_data"]
    resume.save()
    return JsonResponse({"resume": serialize_resume(resume)})


@require_POST
def set_default_resume(request, resume_id):
    user = authenticated_user(request)
    if user is None:
        return error("Sign in to manage resumes.", 401)
    with transaction.atomic():
        resume = get_object_or_404(Resume, pk=resume_id, user=user)
        Resume.objects.filter(user=user, is_default=True).exclude(pk=resume.pk).update(is_default=False)
        if not resume.is_default:
            resume.is_default = True
            resume.save(update_fields=["is_default", "updated_at"])
    return JsonResponse({"resume": serialize_resume(resume)})


def get_user(user_id, role=None):
    try:
        user = UserProfile.objects.filter(pk=user_id).first()
    except (TypeError, ValueError):
        return None
    return user if user and (not role or user.role == role) else None


def request_candidate(request, legacy_candidate_id=None):
    if request.user.is_authenticated:
        if request.user.role != "applicant":
            return None
        profile = ensure_user_profile(request.user)
        return profile if profile.role == UserProfile.Role.CANDIDATE else None
    # Keep the existing ID-based interface for standalone hackathon clients.
    return get_user(legacy_candidate_id, UserProfile.Role.CANDIDATE)


def serialize_job(job, application=None):
    return {
        "id": job.id, "title": job.title, "description": job.description,
        "location": job.location, "compensation": job.compensation,
        "employment_type": job.employment_type, "requirements": job.requirements,
        "company": {"id": job.company_id, "name": job.company.name, "logo_url": job.company.logo_url},
        "photo_url": f"/api/jobs/{job.id}/photo/?v={quote(job.photo.name, safe='')}" if job.photo else "",
        "swipe_status": application.candidate_decision if application else "new",
    }


def serialize_application(application):
    return {
        "id": application.id,
        "stage": application.stage,
        "stage_label": application.get_stage_display(),
        "is_match": application.is_match,
        "recruiter_decision": application.recruiter_decision,
        "applied_at": application.applied_at.isoformat(),
        "resume": {"id": application.resume_id, "name": application.resume.name} if application.resume_id else None,
        "job": serialize_job(application.job, application),
    }


def recruiter_jobs_queryset(recruiter):
    return Job.objects.filter(recruiter=recruiter).select_related("company").annotate(
        applicant_count=Count(
            "applications",
            filter=Q(applications__candidate_decision=Application.CandidateDecision.APPLIED),
        ),
        new_applicant_count=Count(
            "applications",
            filter=Q(
                applications__candidate_decision=Application.CandidateDecision.APPLIED,
                applications__recruiter_decision=Application.RecruiterDecision.PENDING,
            ),
        ),
    ).order_by("-created_at")


def serialize_recruiter_job(job):
    return {
        **serialize_job(job),
        "is_active": job.is_active,
        "created_at": job.created_at.isoformat(),
        "applicant_count": getattr(job, "applicant_count", 0),
        "new_applicant_count": getattr(job, "new_applicant_count", 0),
    }


def candidate_resume_for_application(application):
    """Use the submitted resume, or the candidate's default for older applications."""
    if application.resume:
        return application.resume
    return Resume.objects.filter(
        user__email__iexact=application.candidate.email,
    ).order_by("-is_default", "-updated_at", "-id").first()


def candidate_keywords(application, resume):
    """Build concise, factual pills from profile and structured resume fields."""
    raw_values = [application.candidate.headline, *application.candidate.skills]
    builder_data = resume.builder_data if resume and isinstance(resume.builder_data, dict) else {}
    skills = builder_data.get("skills")
    if isinstance(skills, dict):
        raw_values.extend(skills.values())
    for experience in builder_data.get("experience", []):
        if isinstance(experience, dict):
            raw_values.append(experience.get("title", ""))
    for project in builder_data.get("projects", []):
        if isinstance(project, dict):
            raw_values.append(project.get("stack", ""))

    keywords = []
    for raw_value in raw_values:
        if not isinstance(raw_value, str):
            continue
        for value in re.split(r"[,;|\n]+", raw_value):
            value = value.strip()
            if value and value.casefold() not in {item.casefold() for item in keywords}:
                keywords.append(value[:48])
            if len(keywords) == 8:
                return keywords
    return keywords or [application.job.title, "Applicant"]


def serialize_recruiter_candidate(application):
    resume = candidate_resume_for_application(application)
    return {
        "application_id": application.id,
        # Include the posting id so the Manage page can show only this job's applicants.
        "job_id": application.job_id,
        "name": application.candidate.name,
        "headline": application.candidate.headline,
        "bio": application.candidate.bio,
        "skills": application.candidate.skills,
        "photo_url": (
            f"/api/candidates/{application.candidate_id}/photo/"
            f"?v={quote(application.candidate.photo.name, safe='')}"
            if application.candidate.photo else ""
        ),
        "job_title": application.job.title,
        "company_name": application.job.company.name,
        "recruiter_decision": application.recruiter_decision,
        "stage": application.stage,
        "stage_label": application.get_stage_display(),
        "applied_at": application.applied_at.isoformat(),
        "keywords": candidate_keywords(application, resume),
        "resume": ({
            "name": resume.name,
            "image_url": f"/api/applications/{application.id}/resume/",
        } if resume else None),
    }


@require_GET
def candidate_job_deck(request):
    candidate = request_candidate(request, request.GET.get("candidate_id"))
    if candidate is None:
        return error("candidate_id must belong to a candidate", 403)
    applications = {item.job_id: item for item in Application.objects.filter(candidate=candidate)}
    # Skipped (left-swiped) cards are retained but intentionally placed at the end.
    jobs = Job.objects.filter(is_active=True).select_related("company").annotate(
        deck_order=Case(
            When(applications__candidate=candidate, applications__candidate_decision="skipped", then=Value(1)),
            default=Value(0), output_field=IntegerField(),
        )
    ).order_by("deck_order", "-created_at")
    jobs = [job for job in jobs if not applications.get(job.id) or applications[job.id].candidate_decision == Application.CandidateDecision.SKIPPED]
    return JsonResponse({"jobs": [serialize_job(job, applications.get(job.id)) for job in jobs]})


@require_GET
def job_photo(request, job_id):
    job = get_object_or_404(Job.objects.exclude(photo=""), pk=job_id)
    content_type = mimetypes.guess_type(job.photo.name)[0] or "application/octet-stream"
    response = FileResponse(job.photo.open("rb"), content_type=content_type)
    response["Cache-Control"] = "public, max-age=3600"
    return response


@require_GET
def candidate_photo(request, candidate_id):
    candidate = get_object_or_404(UserProfile.objects.exclude(photo=""), pk=candidate_id)
    content_type = mimetypes.guess_type(candidate.photo.name)[0] or "application/octet-stream"
    response = FileResponse(candidate.photo.open("rb"), content_type=content_type)
    response["Cache-Control"] = "public, max-age=3600"
    return response


@require_http_methods(["POST", "DELETE"])
def candidate_profile_photo(request):
    """Replace or remove the signed-in candidate's profile picture."""
    candidate, response = authenticated_profile(request, UserProfile.Role.CANDIDATE)
    if response:
        return response

    if request.method == "DELETE":
        if candidate.photo:
            storage = candidate.photo.storage
            old_name = candidate.photo.name
            candidate.photo = ""
            candidate.save(update_fields=["photo"])
            storage.delete(old_name)
        return JsonResponse({"photo_url": ""})

    photo, photo_error = prepare_profile_photo(request.FILES.get("photo"))
    if photo_error:
        return photo_error

    storage = candidate.photo.storage
    old_name = candidate.photo.name if candidate.photo else ""
    candidate.photo = photo
    candidate.save(update_fields=["photo"])
    if old_name and old_name != candidate.photo.name:
        storage.delete(old_name)
    return JsonResponse({
        "photo_url": (
            f"/api/candidates/{candidate.id}/photo/"
            f"?v={quote(candidate.photo.name, safe='')}"
        ),
    })


@csrf_exempt
@require_http_methods(["POST"])
def candidate_swipe(request, job_id):
    data = request_json(request)
    if data is None:
        return error("Body must be valid JSON")
    candidate = request_candidate(request, data.get("candidate_id"))
    if candidate is None:
        return error("candidate_id must belong to a candidate", 403)
    if data.get("decision") not in {"right", "left"}:
        return error("decision must be 'right' or 'left'")
    job = get_object_or_404(Job, pk=job_id, is_active=True)
    selected_resume = None
    if data["decision"] == "right" and request.user.is_authenticated:
        resume_id = data.get("resume_id")
        resumes = Resume.objects.filter(user=request.user)
        selected_resume = get_object_or_404(resumes, pk=resume_id) if resume_id else resumes.filter(is_default=True).first()
        if selected_resume is None:
            return error("Create a resume before applying to a job.", 409)
    application, _ = Application.objects.get_or_create(job=job, candidate=candidate, defaults={"candidate_decision": "skipped"})
    if application.recruiter_decision != Application.RecruiterDecision.PENDING:
        return error("This application has already been reviewed", 409)
    application.candidate_decision = "applied" if data["decision"] == "right" else "skipped"
    if data["decision"] == "right":
        application.stage = Application.Stage.APPLIED
        application.resume = selected_resume
    application.save(update_fields=["candidate_decision", "stage", "resume", "updated_at"])
    return JsonResponse({"application_id": application.id, "status": application.candidate_decision, "sent_to_recruiter": data["decision"] == "right"})


@require_GET
def recruiter_dashboard(request):
    recruiter, response = authenticated_profile(request, UserProfile.Role.RECRUITER)
    if response:
        return response

    jobs = recruiter_jobs_queryset(recruiter)
    applications = Application.objects.filter(
        job__recruiter=recruiter,
        candidate_decision=Application.CandidateDecision.APPLIED,
    ).select_related("candidate", "job__company", "resume").order_by("-applied_at")

    stats = {
        "open_positions": jobs.filter(is_active=True).count(),
        "new_applicants": applications.filter(
            recruiter_decision=Application.RecruiterDecision.PENDING,
        ).count(),
        "interviews": applications.filter(stage=Application.Stage.INTERVIEW).count(),
        "offers": applications.filter(stage=Application.Stage.OFFER).count(),
    }
    return JsonResponse({
        "stats": stats,
        "jobs": [serialize_recruiter_job(job) for job in jobs],
        "candidates": [serialize_recruiter_candidate(item) for item in applications],
    })


@require_http_methods(["GET", "POST"])
def recruiter_jobs(request):
    recruiter, response = authenticated_profile(request, UserProfile.Role.RECRUITER)
    if response:
        return response
    if request.method == "GET":
        jobs = recruiter_jobs_queryset(recruiter)
        return JsonResponse({"jobs": [serialize_recruiter_job(job) for job in jobs]})

    data = recruiter_job_request_data(request)
    if not isinstance(data, dict):
        return error("Job data must be valid JSON.")

    photo, photo_error = prepare_job_photo(request.FILES.get("photo"))
    if photo_error:
        return photo_error

    required_fields = {
        "company_name": 120,
        "title": 160,
        "description": None,
        "location": 120,
        "compensation": 120,
        "employment_type": 60,
    }
    values = {}
    for field, max_length in required_fields.items():
        value = data.get(field)
        if not isinstance(value, str) or not value.strip():
            return error(f"{field.replace('_', ' ').capitalize()} is required.")
        value = value.strip()
        if max_length and len(value) > max_length:
            return error(f"{field.replace('_', ' ').capitalize()} is too long.")
        values[field] = value

    requirements = data.get("requirements", [])
    if not isinstance(requirements, list) or not all(isinstance(item, str) for item in requirements):
        return error("Requirements must be a list of text values.")
    requirements = [item.strip() for item in requirements if item.strip()]
    if len(requirements) > 20 or any(len(item) > 100 for item in requirements):
        return error("Add no more than 20 requirements of 100 characters each.")

    logo_url = data.get("logo_url", "")
    website = data.get("website", "")
    if not isinstance(logo_url, str) or not isinstance(website, str):
        return error("Company links must be text values.")

    company = Company.objects.filter(name__iexact=values["company_name"]).first()
    if company is None:
        company = Company.objects.create(
            name=values["company_name"],
            logo_url=logo_url.strip(),
            website=website.strip(),
        )
    else:
        changed_fields = []
        if logo_url.strip() and company.logo_url != logo_url.strip():
            company.logo_url = logo_url.strip()
            changed_fields.append("logo_url")
        if website.strip() and company.website != website.strip():
            company.website = website.strip()
            changed_fields.append("website")
        if changed_fields:
            company.save(update_fields=changed_fields)

    job = Job.objects.create(
        company=company,
        recruiter=recruiter,
        title=values["title"],
        description=values["description"],
        location=values["location"],
        compensation=values["compensation"],
        employment_type=values["employment_type"],
        requirements=requirements,
        photo=photo,
        is_active=True,
    )
    return JsonResponse({"job": serialize_recruiter_job(job)}, status=201)


@require_http_methods(["GET", "PATCH"])
def recruiter_job_detail(request, job_id):
    """Read or update one job owned by the signed-in recruiter."""
    recruiter, response = authenticated_profile(request, UserProfile.Role.RECRUITER)
    if response:
        return response

    job = get_object_or_404(
        Job.objects.select_related("company"),
        pk=job_id,
        recruiter=recruiter,
    )
    if request.method == "GET":
        return JsonResponse({"job": serialize_recruiter_job(job)})

    data = request_json(request)
    if not isinstance(data, dict):
        return error("Job data must be valid JSON.")

    text_fields = {
        "title": 160,
        "description": None,
        "location": 120,
        "compensation": 120,
        "employment_type": 60,
    }
    changed_fields = []
    for field, max_length in text_fields.items():
        if field not in data:
            continue
        value = data[field]
        if not isinstance(value, str) or not value.strip():
            return error(f"{field.replace('_', ' ').capitalize()} is required.")
        value = value.strip()
        if max_length and len(value) > max_length:
            return error(f"{field.replace('_', ' ').capitalize()} is too long.")
        setattr(job, field, value)
        changed_fields.append(field)

    if "requirements" in data:
        requirements = data["requirements"]
        if not isinstance(requirements, list) or not all(isinstance(item, str) for item in requirements):
            return error("Requirements must be a list of text values.")
        requirements = [item.strip() for item in requirements if item.strip()]
        if len(requirements) > 20 or any(len(item) > 100 for item in requirements):
            return error("Add no more than 20 requirements of 100 characters each.")
        job.requirements = requirements
        changed_fields.append("requirements")

    if "is_active" in data:
        if not isinstance(data["is_active"], bool):
            return error("Active status must be true or false.")
        job.is_active = data["is_active"]
        changed_fields.append("is_active")

    if "company_name" in data:
        company_name = data["company_name"]
        if not isinstance(company_name, str) or not company_name.strip():
            return error("Company name is required.")
        company_name = company_name.strip()
        if len(company_name) > 120:
            return error("Company name is too long.")
        company = Company.objects.filter(name__iexact=company_name).first()
        if company is None:
            company = Company.objects.create(name=company_name)
        job.company = company
        changed_fields.append("company")

    if not changed_fields:
        return error("Provide at least one job field to update.")

    job.save(update_fields=list(dict.fromkeys(changed_fields)))
    return JsonResponse({"job": serialize_recruiter_job(job)})


@require_http_methods(["POST", "DELETE"])
def recruiter_job_photo(request, job_id):
    """Replace or remove the photo for a job owned by the signed-in recruiter."""
    recruiter, response = authenticated_profile(request, UserProfile.Role.RECRUITER)
    if response:
        return response
    job = get_object_or_404(
        Job.objects.select_related("company"),
        pk=job_id,
        recruiter=recruiter,
    )

    if request.method == "DELETE":
        if job.photo:
            storage = job.photo.storage
            old_name = job.photo.name
            job.photo = ""
            job.save(update_fields=["photo"])
            storage.delete(old_name)
        return JsonResponse({"job": serialize_recruiter_job(job)})

    photo, photo_error = prepare_job_photo(request.FILES.get("photo"))
    if photo_error:
        return photo_error
    if photo is None:
        return error("Choose a job photo to upload.")

    storage = job.photo.storage
    old_name = job.photo.name if job.photo else ""
    job.photo = photo
    job.save(update_fields=["photo"])
    if old_name and old_name != job.photo.name:
        storage.delete(old_name)
    return JsonResponse({"job": serialize_recruiter_job(job)})


@require_GET
def recruiter_candidate_deck(request, job_id):
    recruiter = get_user(request.GET.get("recruiter_id"), UserProfile.Role.RECRUITER)
    if recruiter is None:
        return error("recruiter_id must belong to a recruiter", 403)
    job = get_object_or_404(Job.objects.select_related("company"), pk=job_id, recruiter=recruiter)
    applications = Application.objects.filter(job=job, candidate_decision="applied", recruiter_decision="pending").select_related("candidate").order_by("applied_at")
    return JsonResponse({"job": serialize_job(job), "candidates": [{
        "application_id": app.id, "id": app.candidate_id, "name": app.candidate.name,
        "headline": app.candidate.headline, "bio": app.candidate.bio, "skills": app.candidate.skills,
        "applied_at": app.applied_at.isoformat(),
    } for app in applications]})


@require_http_methods(["POST"])
def recruiter_swipe(request, application_id):
    data = request_json(request)
    if data is None:
        return error("Body must be valid JSON")
    recruiter, response = authenticated_profile(request, UserProfile.Role.RECRUITER)
    if response:
        return response
    if data.get("decision") not in {"right", "left"}:
        return error("decision must be 'right' or 'left'")
    app = get_object_or_404(Application.objects.select_related("job"), pk=application_id, job__recruiter=recruiter)
    if app.candidate_decision != "applied" or app.recruiter_decision != "pending":
        return error("This application cannot be reviewed", 409)
    app.recruiter_decision = "selected" if data["decision"] == "right" else "rejected"
    app.stage = Application.Stage.OFFER if data["decision"] == "right" else Application.Stage.REJECTED
    app.save(update_fields=["recruiter_decision", "stage", "updated_at"])
    if app.is_match:
        Message.objects.create(
            application=app,
            sender=recruiter,
            body=(
                f"Great news! You matched with {app.job.company.name} "
                f"for the {app.job.title} role. Start the conversation here."
            ),
        )
    return JsonResponse({
        "application_id": app.id,
        "status": app.recruiter_decision,
        "stage": app.stage,
        "stage_label": app.get_stage_display(),
        "messaging_unlocked": app.is_match,
    })


@require_GET
def recruiter_application_resume(request, application_id):
    """Render the submitted resume only for the recruiter who owns the job."""
    recruiter, response = authenticated_profile(request, UserProfile.Role.RECRUITER)
    if response:
        return response
    application = get_object_or_404(
        Application.objects.select_related("candidate", "job", "resume"),
        pk=application_id,
        job__recruiter=recruiter,
        candidate_decision=Application.CandidateDecision.APPLIED,
    )
    resume = candidate_resume_for_application(application)
    if resume is None:
        return error("This candidate did not submit a resume.", 404)
    try:
        image = compile_png(resume.latex.encode("utf-8"))
    except LatexError as exc:
        return JsonResponse({"error": str(exc), "details": exc.details}, status=exc.status)
    response = HttpResponse(image, content_type="image/png")
    response["Cache-Control"] = "private, max-age=300"
    return response


@require_GET
def candidate_applications(request):
    candidate = request_candidate(request, request.GET.get("candidate_id"))
    if candidate is None:
        return error("candidate_id must belong to a candidate", 403)
    applications = Application.objects.filter(
        candidate=candidate, candidate_decision=Application.CandidateDecision.APPLIED,
    ).select_related("job__company").order_by("-updated_at")
    return JsonResponse({"applications": [serialize_application(application) for application in applications]})


def messaging_participant(request, application_id):
    account = authenticated_user(request)
    if account is None:
        return None, error("Sign in to use messages.", 401)
    user = ensure_user_profile(account)
    app = get_object_or_404(
        Application.objects.select_related("job__company", "candidate"),
        pk=application_id,
    )
    if user.id not in {app.candidate_id, app.job.recruiter_id}:
        return None, error("You are not a participant in this application", 403)
    if not app.is_match:
        return None, error("Messaging unlocks only after recruiter selection", 403)
    return app, user


def serialize_conversation(application, participant):
    partner = application.job.recruiter if participant.id == application.candidate_id else application.candidate
    messages = list(application.messages.all())
    latest = messages[-1] if messages else None
    return {
        "application_id": application.id,
        "company": application.job.company.name,
        "role": application.job.title,
        "participant": {"id": partner.id, "name": partner.name},
        "latest_message": ({
            "id": latest.id,
            "sender_id": latest.sender_id,
            "body": latest.body,
            "created_at": latest.created_at.isoformat(),
        } if latest else None),
    }


@require_GET
def conversations(request):
    account = authenticated_user(request)
    if account is None:
        return error("Sign in to use messages.", 401)
    participant = ensure_user_profile(account)
    applications = Application.objects.filter(
        Q(candidate=participant) | Q(job__recruiter=participant),
        candidate_decision=Application.CandidateDecision.APPLIED,
        recruiter_decision=Application.RecruiterDecision.SELECTED,
    ).select_related("candidate", "job__company", "job__recruiter").prefetch_related("messages").order_by("-updated_at")
    return JsonResponse({"conversations": [serialize_conversation(app, participant) for app in applications]})


@require_GET
def messages(request, application_id):
    app, user_or_response = messaging_participant(request, application_id)
    if app is None:
        return user_or_response
    return JsonResponse({"messages": [{"id": msg.id, "sender_id": msg.sender_id, "body": msg.body, "created_at": msg.created_at.isoformat()} for msg in app.messages.all()]})


@require_http_methods(["POST"])
def send_message(request, application_id):
    data = request_json(request)
    if data is None:
        return error("Body must be valid JSON")
    app, user_or_response = messaging_participant(request, application_id)
    if app is None:
        return user_or_response
    text = str(data.get("body", "")).strip()
    if not text:
        return error("body cannot be empty")
    message = Message.objects.create(application=app, sender=user_or_response, body=text)
    return JsonResponse({"id": message.id, "sender_id": message.sender_id, "body": message.body, "created_at": message.created_at.isoformat()}, status=201)


@require_GET
def csrf_token(request):
    return JsonResponse({"csrfToken": get_token(request)})


@require_POST
def render_resume(request):
    upload = request.FILES.get("file")
    if not upload or not upload.name.lower().endswith(".tex"):
        return JsonResponse({"error": "Choose a .tex file to import."}, status=400)
    if upload.size > 1024 * 1024:
        return JsonResponse({"error": "Choose a .tex file smaller than 1 MB."}, status=400)
    source = upload.read()
    if not source.strip():
        return JsonResponse({"error": "The uploaded file is empty."}, status=400)
    try:
        image = compile_png(source)
    except LatexError as error:
        return JsonResponse({"error": str(error), "details": error.details}, status=error.status)
    response = HttpResponse(image, content_type="image/png")
    response["Content-Disposition"] = 'inline; filename="resume.png"'
    response["Cache-Control"] = "no-store"
    return response


@require_POST
def build_resume(request):
    try:
        data = json.loads(request.body)
        if not isinstance(data, dict):
            raise ValueError
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"error": "Send resume details as JSON."}, status=400)
    try:
        image = compile_png(build_latex_resume(data))
    except ValueError as error:
        return JsonResponse({"error": str(error)}, status=400)
    except LatexError as error:
        return JsonResponse({"error": str(error), "details": error.details}, status=error.status)
    response = HttpResponse(image, content_type="image/png")
    response["Content-Disposition"] = 'inline; filename="resume.png"'
    response["Cache-Control"] = "no-store"
    return response
