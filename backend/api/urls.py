from django.urls import path

from . import views
from . import notification_views

urlpatterns = [
    path("notifications/", notification_views.notifications, name="notifications"),
    path("notifications/read-all/", notification_views.mark_all_read, name="notifications-read-all"),
    path("notifications/<int:notification_id>/read/", notification_views.mark_read, name="notification-read"),
    path("hello/", views.hello, name="hello"),
    path("jobs/deck/", views.candidate_job_deck, name="candidate-job-deck"),
    path("jobs/<int:job_id>/photo/", views.job_photo, name="job-photo"),
    path("candidates/<int:candidate_id>/photo/", views.candidate_photo, name="candidate-photo"),
    path("candidate/profile/photo/", views.candidate_profile_photo, name="candidate-profile-photo"),
    path("jobs/<int:job_id>/swipe/", views.candidate_swipe, name="candidate-swipe"),
    path("applications/", views.candidate_applications, name="candidate-applications"),
    path("recruiter/dashboard/", views.recruiter_dashboard, name="recruiter-dashboard"),
    path("recruiter/jobs/", views.recruiter_jobs, name="recruiter-jobs"),
    path("recruiter/jobs/<int:job_id>/", views.recruiter_job_detail, name="recruiter-job-detail"),
    path("recruiter/jobs/<int:job_id>/photo/", views.recruiter_job_photo, name="recruiter-job-photo"),
    path("recruiter/jobs/<int:job_id>/candidates/", views.recruiter_candidate_deck, name="recruiter-candidate-deck"),
    path("applications/<int:application_id>/swipe/", views.recruiter_swipe, name="recruiter-swipe"),
    path("applications/<int:application_id>/resume/", views.recruiter_application_resume, name="recruiter-application-resume"),
    path("applications/<int:application_id>/messages/", views.messages, name="messages"),
    path("applications/<int:application_id>/messages/send/", views.send_message, name="send-message"),
    path("csrf/", views.csrf_token, name="csrf"),
    path("resumes/", views.resumes, name="resumes"),
    path("resumes/<int:resume_id>/", views.resume_detail, name="resume-detail"),
    path("resumes/<int:resume_id>/default/", views.set_default_resume, name="set-default-resume"),
    path("resumes/render/", views.render_resume, name="render-resume"),
    path("resumes/build/", views.build_resume, name="build-resume"),
]
