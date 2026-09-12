from django.db import migrations


class Migration(migrations.Migration):
    # Both 0002 migrations add independent schema features from parallel branches.
    dependencies = [
        ("api", "0002_application_stage"),
        ("api", "0002_resume"),
    ]

    operations = []
