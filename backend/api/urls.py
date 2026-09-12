from django.urls import path

from . import views

urlpatterns = [
    path("hello/", views.hello, name="hello"),
    path("jobs/deck/", views.candidate_job_deck, name="candidate-job-deck"),
    path("jobs/<int:job_id>/swipe/", views.candidate_swipe, name="candidate-swipe"),
    path("recruiter/jobs/<int:job_id>/candidates/", views.recruiter_candidate_deck, name="recruiter-candidate-deck"),
    path("applications/<int:application_id>/swipe/", views.recruiter_swipe, name="recruiter-swipe"),
    path("applications/<int:application_id>/messages/", views.messages, name="messages"),
    path("applications/<int:application_id>/messages/send/", views.send_message, name="send-message"),
]
