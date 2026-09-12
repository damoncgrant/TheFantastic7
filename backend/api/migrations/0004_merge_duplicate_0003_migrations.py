from django.db import migrations


class Migration(migrations.Migration):
    # Both 0003 files merge the same parallel model changes. This no-op merge
    # gives Django one migration tip without altering the database schema.
    dependencies = [
        ("api", "0003_merge_0002_application_stage_0002_resume"),
        ("api", "0003_merge_application_stage_resume"),
    ]

    operations = []
