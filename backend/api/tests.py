import json

from django.test import TestCase

from .models import Company, Job, UserProfile


class MatchingFlowTests(TestCase):
    def setUp(self):
        self.candidate = UserProfile.objects.create(name="Ava", email="ava@example.com", role="candidate")
        self.recruiter = UserProfile.objects.create(name="Riley", email="riley@example.com", role="recruiter")
        company = Company.objects.create(name="Northstar", logo_url="https://example.com/logo.png")
        self.job = Job.objects.create(company=company, recruiter=self.recruiter, title="Backend Developer", description="Build APIs", location="Edmonton, AB", compensation="$80k", requirements=["Python"])

    def post(self, url, payload):
        return self.client.post(url, data=json.dumps(payload), content_type="application/json")

    def test_match_unlocks_messaging(self):
        response = self.post(f"/api/jobs/{self.job.id}/swipe/", {"candidate_id": self.candidate.id, "decision": "right"})
        self.assertEqual(response.status_code, 200)
        application_id = response.json()["application_id"]

        deck = self.client.get(f"/api/recruiter/jobs/{self.job.id}/candidates/?recruiter_id={self.recruiter.id}")
        self.assertEqual(deck.json()["candidates"][0]["application_id"], application_id)

        selected = self.post(f"/api/applications/{application_id}/swipe/", {"recruiter_id": self.recruiter.id, "decision": "right"})
        self.assertTrue(selected.json()["messaging_unlocked"])
        message = self.post(f"/api/applications/{application_id}/messages/send/", {"user_id": self.candidate.id, "body": "Thanks!"})
        self.assertEqual(message.status_code, 201)

    def test_left_swipe_is_retained_at_end(self):
        self.post(f"/api/jobs/{self.job.id}/swipe/", {"candidate_id": self.candidate.id, "decision": "left"})
        deck = self.client.get(f"/api/jobs/deck/?candidate_id={self.candidate.id}")
        self.assertEqual(deck.json()["jobs"][0]["swipe_status"], "skipped")

    def test_swipe_endpoint_accepts_spa_json_without_csrf_cookie(self):
        client = self.client_class(enforce_csrf_checks=True)
        response = client.post(
            f"/api/jobs/{self.job.id}/swipe/",
            data=json.dumps({"candidate_id": self.candidate.id, "decision": "right"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
