# URL routes for the accounts auth endpoints, mounted under /api/auth/.
from django.urls import path

from .views import csrf, login_view, logout_view, me, signup

urlpatterns = [
    path("csrf/", csrf, name="csrf"),
    path("signup/", signup, name="signup"),
    path("login/", login_view, name="login"),
    path("logout/", logout_view, name="logout"),
    path("me/", me, name="me"),
]
