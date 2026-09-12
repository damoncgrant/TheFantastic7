from .models import UserProfile


def matching_profile(user):
    role = UserProfile.Role.CANDIDATE if user.role == "applicant" else UserProfile.Role.RECRUITER
    profile, _ = UserProfile.objects.get_or_create(
        email__iexact=user.email,
        defaults={"email": user.email, "name": user.name, "role": role},
    )
    return profile
