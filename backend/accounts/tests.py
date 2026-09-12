import json

from django.contrib.auth import get_user_model
from django.test import TestCase

from api.models import UserProfile


class RecruiterAuthenticationTests(TestCase):
    def test_login_returns_the_saved_recruiter_role(self):
        user_model = get_user_model()
        user_model.objects.create_user(
            email="recruiter@example.com",
            password="test-password",
            name="Riley",
            role=user_model.Role.EMPLOYER,
        )

        response = self.client.post(
            "/api/auth/login/",
            data=json.dumps({"email": "recruiter@example.com", "password": "test-password"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["role"], user_model.Role.EMPLOYER)
        profile = UserProfile.objects.get(email="recruiter@example.com")
        self.assertEqual(response.json()["profile_id"], profile.id)
        self.assertEqual(profile.role, UserProfile.Role.RECRUITER)
