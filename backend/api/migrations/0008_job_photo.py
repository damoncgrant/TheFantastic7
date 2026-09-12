from django.db import migrations, models


TRIGGER_SQL = """
    CREATE TRIGGER application_status_notification
    AFTER UPDATE OF stage ON api_application
    WHEN OLD.stage <> NEW.stage AND NEW.candidate_decision = 'applied'
    BEGIN
        INSERT INTO api_notification (
            recipient_id, application_id, message_id, kind, body,
            previous_stage, new_stage, read_at, created_at
        )
        SELECT NEW.candidate_id, NEW.id, NULL, 'status',
            'Your application for ' || job.title || ' at ' || company.name ||
            ' changed from ' || upper(substr(OLD.stage, 1, 1)) || substr(OLD.stage, 2) ||
            ' to ' || upper(substr(NEW.stage, 1, 1)) || substr(NEW.stage, 2) || '.',
            OLD.stage, NEW.stage, NULL, strftime('%Y-%m-%d %H:%M:%f', 'now')
        FROM api_job AS job
        JOIN api_company AS company ON company.id = job.company_id
        WHERE job.id = NEW.job_id;
    END;
"""

DROP_TRIGGER_SQL = "DROP TRIGGER IF EXISTS application_status_notification;"


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0007_merge_20260912_2051"),
    ]

    operations = [
        # SQLite rebuilds the job table to add this field. The notification
        # trigger references that table, so remove and restore it around the rebuild.
        migrations.RunSQL(sql=DROP_TRIGGER_SQL, reverse_sql=TRIGGER_SQL),
        migrations.AddField(
            model_name="job",
            name="photo",
            field=models.FileField(blank=True, upload_to="job_photos/"),
        ),
        migrations.RunSQL(sql=TRIGGER_SQL, reverse_sql=DROP_TRIGGER_SQL),
    ]
