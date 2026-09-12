import json

from django.db.models import Case, IntegerField, Value, When
from django.http import HttpResponse, JsonResponse
from django.middleware.csrf import get_token
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods, require_POST

from .latex import LatexError, compile_png
from .models import Application, Job, Message, UserProfile
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


def get_user(user_id, role=None):
    try:
        user = get_object_or_404(UserProfile, pk=user_id)
    except (TypeError, ValueError):
        return None
    return user if not role or user.role == role else None


def serialize_job(job, application=None):
    return {
        "id": job.id, "title": job.title, "description": job.description,
        "location": job.location, "compensation": job.compensation,
        "employment_type": job.employment_type, "requirements": job.requirements,
        "company": {"id": job.company_id, "name": job.company.name, "logo_url": job.company.logo_url},
        "swipe_status": application.candidate_decision if application else "new",
    }


@require_GET
def candidate_job_deck(request):
    candidate = get_user(request.GET.get("candidate_id"), UserProfile.Role.CANDIDATE)
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
    return JsonResponse({"jobs": [serialize_job(job, applications.get(job.id)) for job in jobs]})


@csrf_exempt
@require_http_methods(["POST"])
def candidate_swipe(request, job_id):
    data = request_json(request)
    if data is None:
        return error("Body must be valid JSON")
    candidate = get_user(data.get("candidate_id"), UserProfile.Role.CANDIDATE)
    if candidate is None:
        return error("candidate_id must belong to a candidate", 403)
    if data.get("decision") not in {"right", "left"}:
        return error("decision must be 'right' or 'left'")
    job = get_object_or_404(Job, pk=job_id, is_active=True)
    application, _ = Application.objects.get_or_create(job=job, candidate=candidate, defaults={"candidate_decision": "skipped"})
    if application.recruiter_decision != Application.RecruiterDecision.PENDING:
        return error("This application has already been reviewed", 409)
    application.candidate_decision = "applied" if data["decision"] == "right" else "skipped"
    application.save(update_fields=["candidate_decision", "updated_at"])
    return JsonResponse({"application_id": application.id, "status": application.candidate_decision, "sent_to_recruiter": data["decision"] == "right"})


def application_status(app):
    if app.recruiter_decision == Application.RecruiterDecision.SELECTED:
        return "Interview"
    if app.recruiter_decision == Application.RecruiterDecision.REJECTED:
        return "Rejected"
    return "Applied"


def serialize_application(app):
    return {
        "id": app.id,
        "company": app.job.company.name,
        "role": app.job.title,
        "date": app.applied_at.strftime("%b %d").replace(" 0", " "),
        "status": application_status(app),
        "profile": app.job.company.logo_url or None,
    }


@require_GET
def candidate_applications(request):
    candidate = get_user(request.GET.get("candidate_id"), UserProfile.Role.CANDIDATE)
    if candidate is None:
        return error("candidate_id must belong to a candidate", 403)
    applications = Application.objects.filter(
        candidate=candidate, candidate_decision=Application.CandidateDecision.APPLIED,
    ).select_related("job__company").order_by("-applied_at")
    return JsonResponse({"applications": [serialize_application(app) for app in applications]})


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


@csrf_exempt
@require_http_methods(["POST"])
def recruiter_swipe(request, application_id):
    data = request_json(request)
    if data is None:
        return error("Body must be valid JSON")
    recruiter = get_user(data.get("recruiter_id"), UserProfile.Role.RECRUITER)
    if recruiter is None:
        return error("recruiter_id must belong to a recruiter", 403)
    if data.get("decision") not in {"right", "left"}:
        return error("decision must be 'right' or 'left'")
    app = get_object_or_404(Application.objects.select_related("job"), pk=application_id, job__recruiter=recruiter)
    if app.candidate_decision != "applied" or app.recruiter_decision != "pending":
        return error("This application cannot be reviewed", 409)
    app.recruiter_decision = "selected" if data["decision"] == "right" else "rejected"
    app.save(update_fields=["recruiter_decision", "updated_at"])
    return JsonResponse({"application_id": app.id, "status": app.recruiter_decision, "messaging_unlocked": app.is_match})


def messaging_participant(application_id, user_id):
    app = get_object_or_404(Application.objects.select_related("job"), pk=application_id)
    user = get_user(user_id)
    if user is None or user.id not in {app.candidate_id, app.job.recruiter_id}:
        return None, error("You are not a participant in this application", 403)
    if not app.is_match:
        return None, error("Messaging unlocks only after recruiter selection", 403)
    return app, user


@require_GET
def messages(request, application_id):
    app, user_or_response = messaging_participant(application_id, request.GET.get("user_id"))
    if app is None:
        return user_or_response
    return JsonResponse({"messages": [{"id": msg.id, "sender_id": msg.sender_id, "body": msg.body, "created_at": msg.created_at.isoformat()} for msg in app.messages.all()]})


@csrf_exempt
@require_http_methods(["POST"])
def send_message(request, application_id):
    data = request_json(request)
    if data is None:
        return error("Body must be valid JSON")
    app, user_or_response = messaging_participant(application_id, data.get("user_id"))
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
