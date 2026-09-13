# Replaceable demo photos

These files are the source images used by the demo seed commands. They are kept
separate from `backend/media/`, which contains runtime copies and can be deleted.

To use your own photos:

1. Replace any JPG below while keeping its filename.
2. Keep each file at or below 5 MB.
3. Run `python manage.py seed_demo --refresh-images` from `backend/`.

If you clear the database first, plain `python manage.py seed_demo` is enough.

## Job photo mapping

| File | Job posting |
| --- | --- |
| `job_photos/demo-job-01.jpg` | Assistant to the Regional Manager — Dunder Mifflin |
| `job_photos/demo-job-02.jpg` | Coffeehouse Barista & Couch Guardian — Central Perk |
| `job_photos/demo-job-03.jpg` | Deputy Director of Tiny Parks — Pawnee Parks |
| `job_photos/demo-job-04.jpg` | Detective, Cool Motive Division — NYPD 99th Precinct |
| `job_photos/demo-job-05.jpg` | Model Home Operations Coordinator — Bluth Company |
| `job_photos/demo-job-06.jpg` | Marketing Coordinator / Wildcard — Paddy's Pub |
| `job_photos/demo-job-07.jpg` | Senior Burger Quality Tester — Krusty Burger |
| `job_photos/demo-job-08.jpg` | Sector 7G Safety Monitor — Springfield Nuclear Power Plant |
| `job_photos/demo-job-09.jpg` | Interplanetary Delivery Specialist — Planet Express |
| `job_photos/demo-job-10.jpg` | Burger of the Day Copywriter — Bob's Burgers |

## Candidate photo mapping

| File | Candidate |
| --- | --- |
| `profile_photos/demo-candidate-01.jpg` | Michael Scott |
| `profile_photos/demo-candidate-02.jpg` | Dwight Schrute |
| `profile_photos/demo-candidate-03.jpg` | Rachel Green |
| `profile_photos/demo-candidate-04.jpg` | Joey Tribbiani |
| `profile_photos/demo-candidate-05.jpg` | Phoebe Buffay |
| `profile_photos/demo-candidate-06.jpg` | Jake Peralta |
| `profile_photos/demo-candidate-07.jpg` | Rosa Diaz |
| `profile_photos/demo-candidate-08.jpg` | Leslie Knope |
| `profile_photos/demo-candidate-09.jpg` | Ron Swanson |
| `profile_photos/demo-candidate-10.jpg` | Peter Griffin |

The bundled placeholders were downloaded from Lorem Picsum and Wikimedia
Commons. If you keep them, review the relevant source licences before sharing
the project outside the hackathon. If you replace them, record the source and
usage rights for your new images here.
