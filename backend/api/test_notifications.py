import json

from django.contrib.auth import get_user_model
from django.db import connection, transaction
from django.test import Client, TestCase

from .models import Application, Company, Job, Message, Notification, Resume, UserProfile


class NotificationTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(email="ava@example.com", name="Ava", role="applicant")
        self.candidate = UserProfile.objects.create(name="Ava", email=self.user.email, role="candidate")
        self.recruiter = UserProfile.objects.create(name="Riley", email="riley@example.com", role="recruiter")
        self.recruiter_user = get_user_model().objects.create_user(
            email=self.recruiter.email,
            name=self.recruiter.name,
            role="employer",
        )
        company = Company.objects.create(name="Northstar")
        self.job = Job.objects.create(company=company, recruiter=self.recruiter, title="Developer", description="Build APIs", location="Edmonton", compensation="$80k")
        self.application = Application.objects.create(job=self.job, candidate=self.candidate, candidate_decision="applied")
        self.client.force_login(self.user)

    def test_each_status_transition_notifies_once(self):
        self.assertEqual(Notification.objects.count(), 0)
        for stage in ["interview", "offer", "rejected", "applied"]:
            previous_stage = self.application.stage
            self.application.stage = stage
            self.application.save(update_fields=["stage", "updated_at"])
            notification = Notification.objects.first()
            self.assertEqual(notification.recipient, self.candidate)
            self.assertEqual(notification.previous_stage, previous_stage)
            self.assertEqual(notification.new_stage, stage)
            self.assertIn("Northstar", notification.body)
            self.assertIsNone(notification.read_at)
            self.application.save()
        self.assertEqual(Notification.objects.count(), 4)

    def test_unsaved_stage_and_skipped_applications_do_not_notify(self):
        self.application.stage = "offer"
        self.application.save(update_fields=["updated_at"])
        self.assertFalse(Notification.objects.exists())
        self.application.candidate_decision = "skipped"
        self.application.save()
        self.assertFalse(Notification.objects.exists())

    def test_direct_sql_changes_notify_without_model_save(self):
        with connection.cursor() as cursor:
            for stage in ["interview", "offer", "offer", "rejected"]:
                cursor.execute("UPDATE api_application SET stage = %s WHERE id = %s", [stage, self.application.id])
        self.assertEqual(Notification.objects.count(), 3)
        response = self.client.get("/api/notifications/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["unreadCount"], 3)
        self.assertEqual(response.json()["notifications"][0]["previousStage"], "offer")
        self.assertEqual(response.json()["notifications"][0]["newStage"], "rejected")
        self.assertIsNotNone(Notification.objects.first().created_at)

    def test_bulk_updates_and_raw_sql_rollback(self):
        Application.objects.filter(pk=self.application.pk).update(stage="offer")
        self.assertEqual(Notification.objects.get().new_stage, "offer")
        with self.assertRaises(RuntimeError):
            with transaction.atomic(), connection.cursor() as cursor:
                cursor.execute("UPDATE api_application SET stage = %s WHERE id = %s", ["rejected", self.application.id])
                raise RuntimeError("Roll back direct edit")
        self.assertEqual(Notification.objects.count(), 1)
        self.application.refresh_from_db()
        self.assertEqual(self.application.stage, "offer")

    def test_only_new_recruiter_messages_notify(self):
        Message.objects.create(application=self.application, sender=self.candidate, body="Hello")
        self.assertFalse(Notification.objects.exists())
        message = Message.objects.create(application=self.application, sender=self.recruiter, body="Interview tomorrow?")
        notification = Notification.objects.get()
        self.assertEqual(notification.message, message)
        self.assertEqual(notification.recipient, self.candidate)
        self.assertEqual(notification.body, "Interview tomorrow?")
        self.assertEqual(notification.kind, "message")
        message.body = "Edited message"
        message.save()
        self.assertEqual(Notification.objects.count(), 1)

    def test_rolled_back_events_do_not_leave_notifications(self):
        with self.assertRaises(RuntimeError):
            with transaction.atomic():
                self.application.stage = "interview"
                self.application.save()
                Message.objects.create(application=self.application, sender=self.recruiter, body="Hello")
                raise RuntimeError("Roll back")
        self.assertFalse(Notification.objects.exists())
        self.application.refresh_from_db()
        self.assertEqual(self.application.stage, "applied")

    def test_recruiter_endpoints_create_status_and_message_notifications(self):
        self.client.force_login(self.recruiter_user)
        response = self.client.post(f"/api/applications/{self.application.id}/swipe/",
                                    json.dumps({"decision": "right"}), content_type="application/json")
        self.assertEqual(response.status_code, 200)
        response = self.client.post(f"/api/applications/{self.application.id}/messages/send/",
                                    json.dumps({"user_id": self.recruiter.id, "body": "Welcome!"}), content_type="application/json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(list(Notification.objects.values_list("kind", flat=True)), ["message", "message", "status"])
        self.client.force_login(self.user)
        response = self.client.get("/api/notifications/")
        self.assertEqual(response.json()["unreadCount"], 3)
        self.assertEqual(response.json()["notifications"][0]["sender"], "Riley")

    def test_read_states_persist_and_are_scoped_to_logged_in_applicant(self):
        first = Message.objects.create(application=self.application, sender=self.recruiter, body="First").notification
        second = Message.objects.create(application=self.application, sender=self.recruiter, body="Second").notification
        response = self.client.get("/api/notifications/")
        self.assertEqual([item["id"] for item in response.json()["notifications"]], [second.id, first.id])
        self.assertEqual(self.client.post(f"/api/notifications/{first.id}/read/").status_code, 200)
        first.refresh_from_db()
        read_at = first.read_at
        self.assertIsNotNone(read_at)
        self.client.post(f"/api/notifications/{first.id}/read/")
        first.refresh_from_db()
        self.assertEqual(first.read_at, read_at)
        self.assertEqual(self.client.get("/api/notifications/").json()["unreadCount"], 1)
        outsider = get_user_model().objects.create_user(email="other@example.com", role="applicant")
        self.client.force_login(outsider)
        self.assertEqual(self.client.get("/api/notifications/", {"candidate_id": self.candidate.id}).json()["notifications"], [])
        self.assertEqual(self.client.post(f"/api/notifications/{second.id}/read/").status_code, 404)
        self.client.post("/api/notifications/read-all/")
        second.refresh_from_db()
        self.assertIsNone(second.read_at)
        self.client.force_login(self.user)
        self.client.post("/api/notifications/read-all/")
        self.assertEqual(self.client.get("/api/notifications/").json()["unreadCount"], 0)

    def test_permissions_methods_and_csrf(self):
        self.client.logout()
        self.assertEqual(self.client.get("/api/notifications/").status_code, 401)
        self.client.force_login(self.recruiter_user)
        self.assertEqual(self.client.get("/api/notifications/").status_code, 403)
        self.client.force_login(self.user)
        self.assertEqual(self.client.get("/api/notifications/read-all/").status_code, 405)
        client = Client(enforce_csrf_checks=True)
        client.force_login(self.user)
        self.assertEqual(client.post("/api/notifications/read-all/").status_code, 403)
        client.get("/api/auth/csrf/")
        self.assertEqual(client.post("/api/notifications/read-all/", HTTP_X_CSRFTOKEN=client.cookies["csrftoken"].value).status_code, 200)

    def test_login_payload_links_the_correct_candidate(self):
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.json()["user"]["candidateId"], self.candidate.id)
        self.assertEqual(response.json()["user"]["profile_id"], self.candidate.id)
        other = get_user_model().objects.create_user(email="new@example.com", name="New", role="applicant")
        self.client.force_login(other)
        payload = self.client.get("/api/auth/me/").json()["user"]
        self.assertNotEqual(payload["candidateId"], self.candidate.id)
        self.assertEqual(UserProfile.objects.get(pk=payload["candidateId"]).email, other.email)
        self.assertEqual(self.client.get("/api/auth/me/").json()["user"]["candidateId"], payload["candidateId"])

    def test_applicant_requests_ignore_missing_stale_or_other_candidate_ids(self):
        for candidate_id in [None, "undefined", 999999, self.recruiter.id]:
            with self.subTest(candidate_id=candidate_id):
                params = {} if candidate_id is None else {"candidate_id": candidate_id}
                self.assertEqual(self.client.get("/api/jobs/deck/", params).status_code, 200)
                response = self.client.get("/api/applications/", params)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json()["applications"][0]["id"], self.application.id)

    def test_existing_session_without_matching_profile_can_apply(self):
        user = get_user_model().objects.create_user(email="unlinked@example.com", name="New", role="applicant")
        Resume.objects.create(
            user=user,
            name="Default resume",
            latex="\\documentclass{article}\\begin{document}New applicant\\end{document}",
            is_default=True,
        )
        self.client.force_login(user)
        response = self.client.get("/api/jobs/deck/", {"candidate_id": "undefined"})
        self.assertEqual(response.status_code, 200)
        candidate = UserProfile.objects.get(email=user.email)
        response = self.client.post(f"/api/jobs/{self.job.id}/swipe/",
                                    json.dumps({"candidate_id": self.candidate.id, "decision": "right"}), content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Application.objects.get(pk=response.json()["application_id"]).candidate, candidate)
