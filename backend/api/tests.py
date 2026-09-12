import json
import tempfile

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase

from .models import Application, Company, Job, UserProfile


class MatchingFlowTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.candidate = UserProfile.objects.create(name="Ava", email="ava@example.com", role="candidate")
        self.recruiter = UserProfile.objects.create(name="Riley", email="riley@example.com", role="recruiter")
        self.recruiter_account = user_model.objects.create_user(
            email=self.recruiter.email,
            password="test-password",
            name=self.recruiter.name,
            role=user_model.Role.EMPLOYER,
        )
        self.candidate_account = user_model.objects.create_user(
            email=self.candidate.email,
            password="test-password",
            name=self.candidate.name,
            role=user_model.Role.APPLICANT,
        )
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

        self.client.force_login(self.recruiter_account)
        selected = self.post(f"/api/applications/{application_id}/swipe/", {"decision": "right"})
        self.assertTrue(selected.json()["messaging_unlocked"])
        self.client.force_login(self.candidate_account)
        applications = self.client.get(f"/api/applications/?candidate_id={self.candidate.id}")
        self.assertEqual(applications.json()["applications"][0]["stage"], "offer")
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


class RecruiterDatabaseTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.recruiter_account = user_model.objects.create_user(
            email="recruiter@example.com",
            password="test-password",
            name="Riley Recruiter",
            role=user_model.Role.EMPLOYER,
        )
        self.applicant_account = user_model.objects.create_user(
            email="applicant@example.com",
            password="test-password",
            name="Ava Applicant",
            role=user_model.Role.APPLICANT,
        )
        self.recruiter = UserProfile.objects.create(
            name="Old Recruiter Name",
            email=self.recruiter_account.email,
            role=UserProfile.Role.RECRUITER,
        )
        self.candidate = UserProfile.objects.create(
            name="Ava Applicant",
            email=self.applicant_account.email,
            role=UserProfile.Role.CANDIDATE,
            headline="Frontend developer",
            skills=["React", "JavaScript"],
        )
        self.company = Company.objects.create(name="Northstar")
        self.existing_job = Job.objects.create(
            company=self.company,
            recruiter=self.recruiter,
            title="Frontend Developer",
            description="Build accessible interfaces.",
            location="Edmonton, AB",
            compensation="$80k",
            requirements=["React"],
        )
        self.application = Application.objects.create(
            job=self.existing_job,
            candidate=self.candidate,
            candidate_decision=Application.CandidateDecision.APPLIED,
            stage=Application.Stage.INTERVIEW,
        )

    def post_json(self, url, payload):
        return self.client.post(url, data=json.dumps(payload), content_type="application/json")

    def test_dashboard_uses_recruiter_jobs_applicants_and_stats(self):
        self.client.force_login(self.recruiter_account)

        response = self.client.get("/api/recruiter/dashboard/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["stats"], {
            "open_positions": 1,
            "new_applicants": 1,
            "interviews": 1,
            "offers": 0,
        })
        self.assertEqual(payload["jobs"][0]["title"], "Frontend Developer")
        self.assertEqual(payload["candidates"][0]["name"], "Ava Applicant")
        self.assertEqual(payload["candidates"][0]["job_id"], self.existing_job.id)

    def test_recruiter_can_create_job_that_appears_in_candidate_deck(self):
        self.client.force_login(self.recruiter_account)

        response = self.post_json("/api/recruiter/jobs/", {
            "company_name": "Aurora Labs",
            "title": "Product Engineer",
            "description": "Build a polished job search experience.",
            "location": "Remote",
            "compensation": "$90k-$110k",
            "employment_type": "Full-time",
            "requirements": ["React", "Python"],
        })

        self.assertEqual(response.status_code, 201)
        created_job = Job.objects.get(pk=response.json()["job"]["id"])
        self.assertEqual(created_job.recruiter, self.recruiter)
        self.assertTrue(created_job.is_active)

        self.client.force_login(self.applicant_account)
        deck = self.client.get(f"/api/jobs/deck/?candidate_id={self.candidate.id}")
        self.assertEqual(deck.status_code, 200)
        self.assertEqual(deck.json()["jobs"][0]["id"], created_job.id)

    def test_recruiter_can_upload_photo_shown_in_candidate_deck(self):
        self.client.force_login(self.recruiter_account)
        photo = SimpleUploadedFile(
            "office.png",
            b"\x89PNG\r\n\x1a\n" + b"prototype-image",
            content_type="image/png",
        )

        with tempfile.TemporaryDirectory() as media_root, self.settings(MEDIA_ROOT=media_root):
            response = self.client.post("/api/recruiter/jobs/", data={
                "company_name": "Photo Labs",
                "title": "Visual Designer",
                "description": "Design product experiences.",
                "location": "Remote",
                "compensation": "$85k",
                "employment_type": "Full-time",
                "requirements": json.dumps(["Figma"]),
                "photo": photo,
            })

            self.assertEqual(response.status_code, 201)
            created_job = Job.objects.get(pk=response.json()["job"]["id"])
            self.assertTrue(created_job.photo)

            self.client.force_login(self.applicant_account)
            deck = self.client.get(f"/api/jobs/deck/?candidate_id={self.candidate.id}")
            deck_job = next(job for job in deck.json()["jobs"] if job["id"] == created_job.id)
            self.assertTrue(deck_job["photo_url"].startswith(f"/api/jobs/{created_job.id}/photo/?v="))

            photo_response = self.client.get(deck_job["photo_url"])
            self.assertEqual(photo_response.status_code, 200)
            self.assertEqual(photo_response["Content-Type"], "image/png")
            self.assertTrue(b"".join(photo_response.streaming_content).startswith(b"\x89PNG"))

            old_name = created_job.photo.name
            old_storage = created_job.photo.storage
            replacement = SimpleUploadedFile(
                "replacement.jpg",
                b"\xff\xd8\xff" + b"replacement-image",
                content_type="image/jpeg",
            )
            self.client.force_login(self.recruiter_account)
            replace_response = self.client.post(
                f"/api/recruiter/jobs/{created_job.id}/photo/",
                data={"photo": replacement},
            )
            self.assertEqual(replace_response.status_code, 200)
            created_job.refresh_from_db()
            self.assertNotEqual(created_job.photo.name, old_name)
            self.assertFalse(old_storage.exists(old_name))

            remove_response = self.client.delete(f"/api/recruiter/jobs/{created_job.id}/photo/")
            self.assertEqual(remove_response.status_code, 200)
            created_job.refresh_from_db()
            self.assertFalse(created_job.photo)

    def test_candidate_profile_photo_is_saved_and_visible_to_recruiter(self):
        self.client.force_login(self.applicant_account)
        photo = SimpleUploadedFile(
            "candidate.png",
            b"\x89PNG\r\n\x1a\n" + b"candidate-image",
            content_type="image/png",
        )

        with tempfile.TemporaryDirectory() as media_root, self.settings(MEDIA_ROOT=media_root):
            upload = self.client.post("/api/candidate/profile/photo/", data={"photo": photo})
            self.assertEqual(upload.status_code, 200)
            self.candidate.refresh_from_db()
            self.assertTrue(self.candidate.photo)
            self.assertTrue(upload.json()["photo_url"].startswith(f"/api/candidates/{self.candidate.id}/photo/"))

            current_user = self.client.get("/api/auth/me/")
            self.assertEqual(current_user.json()["user"]["picture_url"], upload.json()["photo_url"])

            self.client.force_login(self.recruiter_account)
            dashboard = self.client.get("/api/recruiter/dashboard/")
            self.assertEqual(dashboard.json()["candidates"][0]["photo_url"], upload.json()["photo_url"])

            stored_photo = self.client.get(upload.json()["photo_url"])
            self.assertEqual(stored_photo.status_code, 200)
            self.assertTrue(b"".join(stored_photo.streaming_content).startswith(b"\x89PNG"))

    def test_applicant_cannot_create_recruiter_job(self):
        self.client.force_login(self.applicant_account)

        response = self.post_json("/api/recruiter/jobs/", {
            "company_name": "Aurora Labs",
            "title": "Product Engineer",
            "description": "Build products.",
            "location": "Remote",
            "compensation": "$90k",
            "employment_type": "Full-time",
            "requirements": [],
        })

        self.assertEqual(response.status_code, 403)
        self.assertFalse(Job.objects.filter(title="Product Engineer").exists())

    def test_dashboard_requires_login(self):
        response = self.client.get("/api/recruiter/dashboard/")

        self.assertEqual(response.status_code, 401)

    def test_right_swipe_creates_offer_visible_to_applicant(self):
        self.client.force_login(self.recruiter_account)

        response = self.post_json(
            f"/api/applications/{self.application.id}/swipe/",
            {"decision": "right"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["stage"], Application.Stage.OFFER)
        self.application.refresh_from_db()
        self.assertEqual(self.application.stage, Application.Stage.OFFER)
        self.assertEqual(
            self.application.recruiter_decision,
            Application.RecruiterDecision.SELECTED,
        )

        self.client.force_login(self.applicant_account)
        applicant_view = self.client.get(f"/api/applications/?candidate_id={self.candidate.id}")
        self.assertEqual(applicant_view.status_code, 200)
        self.assertEqual(applicant_view.json()["applications"][0]["stage"], "offer")

    def test_recruiter_swipe_requires_login(self):
        response = self.post_json(
            f"/api/applications/{self.application.id}/swipe/",
            {"decision": "right"},
        )

        self.assertEqual(response.status_code, 401)
        self.application.refresh_from_db()
        self.assertEqual(self.application.stage, Application.Stage.INTERVIEW)

    def test_recruiter_can_edit_and_close_owned_job(self):
        managed_job = Job.objects.create(
            company=self.company,
            recruiter=self.recruiter,
            title="QA Engineer",
            description="Test the product.",
            location="Edmonton, AB",
            compensation="$75k",
            requirements=["Testing"],
        )
        self.client.force_login(self.recruiter_account)

        response = self.client.patch(
            f"/api/recruiter/jobs/{managed_job.id}/",
            data=json.dumps({
                "title": "Senior QA Engineer",
                "location": "Remote",
                "is_active": False,
            }),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        managed_job.refresh_from_db()
        self.assertEqual(managed_job.title, "Senior QA Engineer")
        self.assertEqual(managed_job.location, "Remote")
        self.assertFalse(managed_job.is_active)

        self.client.force_login(self.applicant_account)
        deck = self.client.get(f"/api/jobs/deck/?candidate_id={self.candidate.id}")
        self.assertNotIn(managed_job.id, [job["id"] for job in deck.json()["jobs"]])

    def test_applicant_cannot_manage_recruiter_job(self):
        self.client.force_login(self.applicant_account)

        response = self.client.patch(
            f"/api/recruiter/jobs/{self.existing_job.id}/",
            data=json.dumps({"is_active": False}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 403)
        self.existing_job.refresh_from_db()
        self.assertTrue(self.existing_job.is_active)
