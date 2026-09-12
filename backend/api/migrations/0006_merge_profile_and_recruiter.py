from django.db import migrations


class Migration(migrations.Migration):
    # Both branches merged the same 0002 migrations under different names.
    dependencies = [
        ("api", "0003_merge_application_stage_resume"),
        ("api", "0005_application_status_trigger"),
    ]

    operations = []
