# Session-based auth API: CSRF bootstrap, signup, login, logout, and the
# "who am I" check the frontend uses to decide which screen to show.
import json

from django.contrib.auth import authenticate, get_user_model, login, logout
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST

User = get_user_model()


def _user_payload(user):
    return {"email": user.email, "name": user.name, "role": user.role}


def _parse_body(request):
    try:
        return json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return {}


@require_GET
@ensure_csrf_cookie
def csrf(request):
    return JsonResponse({"detail": "CSRF cookie set"})


@require_POST
def signup(request):
    data = _parse_body(request)
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    name = (data.get("name") or "").strip()
    role = data.get("role") or ""

    if not email or not password:
        return JsonResponse({"error": "Email and password are required."}, status=400)
    if not name:
        return JsonResponse({"error": "Name is required."}, status=400)
    if role not in User.Role.values:
        return JsonResponse({"error": "Select whether you're an applicant or an employer."}, status=400)
    if len(password) < 8:
        return JsonResponse({"error": "Password must be at least 8 characters."}, status=400)
    if User.objects.filter(email=email).exists():
        return JsonResponse({"error": "An account with this email already exists."}, status=400)

    user = User.objects.create_user(email=email, password=password, name=name, role=role)
    login(request, user)
    return JsonResponse(_user_payload(user), status=201)


@require_POST
def login_view(request):
    data = _parse_body(request)
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    user = authenticate(request, username=email, password=password)
    if user is None:
        return JsonResponse({"error": "Invalid email or password."}, status=401)

    login(request, user)
    return JsonResponse(_user_payload(user))


@require_POST
def logout_view(request):
    logout(request)
    return JsonResponse({"detail": "Logged out."})


@require_GET
def me(request):
    if not request.user.is_authenticated:
        return JsonResponse({"user": None})
    return JsonResponse({"user": _user_payload(request.user)})
