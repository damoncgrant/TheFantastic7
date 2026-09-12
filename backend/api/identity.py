from .models import UserProfile


def ensure_user_profile(account):
    """Return the matching-domain profile for an authenticated account."""
    role = (
        UserProfile.Role.RECRUITER
        if account.role in {"employer", "recruiter"}
        else UserProfile.Role.CANDIDATE
    )
    profile, _ = UserProfile.objects.get_or_create(
        email__iexact=account.email,
        defaults={"email": account.email, "name": account.name or account.email, "role": role},
    )

    changed_fields = []
    desired_name = account.name or profile.name
    if profile.name != desired_name:
        profile.name = desired_name
        changed_fields.append("name")
    if profile.role != role:
        profile.role = role
        changed_fields.append("role")
    if changed_fields:
        profile.save(update_fields=changed_fields)
    return profile
