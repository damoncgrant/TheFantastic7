# Job matching API

This hackathon API accepts a profile ID in each request rather than production authentication. Create `UserProfile`, `Company`, and `Job` rows through Django admin or the Django shell before using the decks.

For local development, run `python manage.py seed_demo` after `python manage.py migrate` to create a candidate and sample jobs. It prints the candidate ID; put that value in `frontend/.env.local` as `VITE_CANDIDATE_ID` (the first run uses `1`).

Candidate flow:

- `GET /api/jobs/deck/?candidate_id=<id>` returns job cards. Left-swiped cards are returned after new cards.
- `POST /api/jobs/<job_id>/swipe/` with `{"candidate_id": 1, "decision": "right"}` applies; use `"left"` to defer the job.

Recruiter flow:

- `GET /api/recruiter/jobs/<job_id>/candidates/?recruiter_id=<id>` returns only candidates who applied and are awaiting review.
- `POST /api/applications/<application_id>/swipe/` with `{"recruiter_id": 2, "decision": "right"}` selects the candidate; `"left"` rejects them.

Messaging is guarded by a successful match:

- `GET /api/applications/<application_id>/messages/?user_id=<id>`
- `POST /api/applications/<application_id>/messages/send/` with `{"user_id": 1, "body": "Hello"}`

Both endpoints return `403` until the recruiter has selected an applicant, and also reject non-participants.
