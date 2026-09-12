from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0008_job_photo"),
    ]

    operations = [
        migrations.AddField(
            model_name="userprofile",
            name="photo",
            field=models.FileField(blank=True, upload_to="profile_photos/"),
        ),
    ]
