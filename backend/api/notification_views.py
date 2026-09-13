from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_GET, require_POST

from .models import Notification


def user_notifications(request):
    if not request.user.is_authenticated:
        return None, JsonResponse({"error": "Sign in to view notifications."}, status=401)
    # Never accept a recipient ID from the client. Matching profiles use the
    # signed-in account email, not an editable browser-local contact email.
    return Notification.objects.filter(
        recipient__email__iexact=request.user.email,
    ), None


@require_GET
def notifications(request):
    queryset, error = user_notifications(request)
    if error is not None:
        return error
    records = list(queryset.select_related("application__job__company", "message__sender"))
    return JsonResponse({
        "unreadCount": sum(item.read_at is None for item in records),
        "notifications": [{
            "id": item.id, "kind": item.kind, "body": item.body,
            "applicationId": item.application_id, "messageId": item.message_id,
            "company": item.application.job.company.name,
            "jobTitle": item.application.job.title,
            "sender": item.message.sender.name if item.message_id else None,
            "previousStage": item.previous_stage, "newStage": item.new_stage,
            "readAt": item.read_at.isoformat() if item.read_at else None,
            "createdAt": item.created_at.isoformat(),
        } for item in records],
    })


@require_POST
def mark_read(request, notification_id):
    queryset, error = user_notifications(request)
    if error is not None:
        return error
    notification = queryset.filter(pk=notification_id).first()
    if notification is None:
        return JsonResponse({"error": "Notification not found."}, status=404)
    queryset.filter(pk=notification_id, read_at__isnull=True).update(read_at=timezone.now())
    return JsonResponse({"unreadCount": queryset.filter(read_at__isnull=True).count()})


@require_POST
def mark_all_read(request):
    queryset, error = user_notifications(request)
    if error is not None:
        return error
    queryset.filter(read_at__isnull=True).update(read_at=timezone.now())
    return JsonResponse({"unreadCount": queryset.filter(read_at__isnull=True).count()})
