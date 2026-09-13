from django.db import migrations


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
            ' to ' || upper(substr(NEW.stage, 1, 1)) || substr(NEW.stage, 2) || '.' ||
            CASE
                WHEN NEW.stage = 'rejected' AND length(trim(COALESCE(NEW.rejection_reason, ''))) > 0
                THEN ' Rejection reason: ' || trim(NEW.rejection_reason)
                ELSE ''
            END,
            OLD.stage, NEW.stage, NULL, strftime('%Y-%m-%d %H:%M:%f', 'now')
        FROM api_job AS job
        JOIN api_company AS company ON company.id = job.company_id
        WHERE job.id = NEW.job_id;
    END;
"""


class Migration(migrations.Migration):
    dependencies = [("api", "0012_application_rejection_reason")]

    operations = [
        migrations.RunSQL(
            sql="DROP TRIGGER IF EXISTS application_status_notification;",
            reverse_sql="DROP TRIGGER IF EXISTS application_status_notification;",
        ),
        migrations.RunSQL(
            sql=TRIGGER_SQL,
            reverse_sql="DROP TRIGGER IF EXISTS application_status_notification;",
        ),
    ]
