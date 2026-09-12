# Generated manually for the authenticated resume library.
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0002_user_name"),
        ("api", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Resume",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=150)),
                ("latex", models.TextField()),
                ("builder_data", models.JSONField(blank=True, null=True)),
                ("is_default", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="resumes", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-is_default", "-updated_at", "-id"]},
        ),
        migrations.AddConstraint(
            model_name="resume",
            constraint=models.UniqueConstraint(condition=Q(("is_default", True)), fields=("user",), name="one_default_resume_per_user"),
        ),
    ]
