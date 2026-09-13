# Job matching API

This hackathon API accepts a profile ID in each request rather than production authentication. Create `UserProfile`, `Company`, and `Job` rows through Django admin or the Django shell before using the decks.

For local development, run `python manage.py seed_demo` after `python manage.py migrate` to create a candidate and sample jobs. Login responses now include `candidateId`, linking the applicant's login email to their matching `UserProfile` (creating it when needed). The frontend uses that ID for applications and swiping. To use the seeded candidate's applications, create an applicant login with `candidate@jobbler.demo`.

Candidate flow:

- `GET /api/jobs/deck/?candidate_id=<id>` returns job cards. Left-swiped cards are returned after new cards.
- `POST /api/jobs/<job_id>/swipe/` with `{"candidate_id": 1, "decision": "right"}` applies; use `"left"` to defer the job.

Recruiter flow:

- `GET /api/recruiter/jobs/<job_id>/candidates/?recruiter_id=<id>` returns only candidates who applied and are awaiting review.
- `POST /api/applications/<application_id>/swipe/` with `{"recruiter_id": 2, "decision": "right"}` selects the candidate; `"left"` rejects them.

Messaging is guarded by a successful match:

- `GET /api/conversations/` lists the signed-in person's matched conversations.
- `GET /api/applications/<application_id>/messages/`
- `POST /api/applications/<application_id>/messages/send/` with `{"body": "Hello"}`

Message endpoints use the signed-in session, return `403` until the recruiter has selected an applicant, and reject non-participants.

## Notifications

Notifications use the authenticated Django session. Applicants and recruiters
can access only their own notifications; recipient IDs and browser-local profile
emails are not accepted as authorization.

- `GET /api/notifications/` returns newest-first `notifications` and `unreadCount`.
- `POST /api/notifications/<id>/read/` marks one notification as read.
- `POST /api/notifications/read-all/` marks the applicant's notifications as read.

POST requests require the CSRF cookie and `X-CSRFToken` header, obtained through
`GET /api/auth/csrf/`. Read state is stored in the database. The applicant's
`/#notifications` tab and navigation badge refresh every 3 seconds.

Changing `Application.stage` for an applied application creates a status
notification through a SQLite trigger (migration `0005`). This includes ORM
saves, bulk updates, and committed SQL changes in external database tools.
Repeated writes of the same stage do not create duplicates, and rolling back
the change also rolls back its notification. Future SQLite migrations that
rebuild `api_application` must reinstall this trigger.

Direct messages do not create notifications for either participant. Existing
message notifications are excluded from notification lists and unread counts;
messages remain available in the Messages tab.
Notifications cover new events after installation, without backfilling history.

Signed-in applicant requests resolve their candidate from the login session,
creating the matching profile if needed; missing or stale client candidate IDs
are ignored. ID-based matching requests remain available to standalone clients
without a login session.
