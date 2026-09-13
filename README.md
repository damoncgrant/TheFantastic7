# TheFantastic7

Barebones React (JavaScript + Vite) frontend and Django backend.

## Requirements

- Node.js 22.12+ (or 20.19+)
- Python 3.10+

## Run locally

From the repository root, start Django in one terminal:

```sh
cd backend
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
python3 manage.py migrate
python3 manage.py runserver
```

On Windows, use `python` instead of `python3` and activate with
`.venv\Scripts\Activate.ps1` in PowerShell.

In a second terminal, also starting from the repository root:

```sh
cd frontend
npm ci
npm run dev
```

Open http://localhost:5173. You should see **Hello from Django!** beneath
the React heading. Stop either server with Ctrl+C.

React fetches `/api/hello/`; Vite proxies `/api` requests to Django at
`http://127.0.0.1:8000`. You can also open
http://127.0.0.1:8000/api/hello/ to see the JSON directly:

```json
{ "message": "Hello from Django!" }
```

If the page cannot reach Django, check that the backend is running on port 8000
and refresh the page.

## Resume image preview

Open the **Resume** navigation tab (or http://localhost:5173/#resume), click
**Import .tex file**, and select `frontend/src/resume_builder/template.tex`.
Django immediately compiles the LaTeX to PDF, converts its first page to a PNG,
and displays it above the options with a download link.
The builder option is a placeholder for the next step; **Skip for now** returns home.

The upload accepts one self-contained `.tex` file up to 1 MB. Files compile with
pdfLaTeX; custom files requiring XeLaTeX, LuaLaTeX, extra images, or private `.sty`
files are not supported in this first version. Files and generated previews are temporary and
aren't saved to the database. Downloads should be saved before leaving the tab.

### LaTeX setup (one time per developer)

Django needs `pdflatex` in addition to the Python requirements. You can use an
existing TeX Live/MacTeX/MiKTeX installation on your PATH, or set `PDFLATEX_PATH`
to the full executable path before starting Django.

For a project-local macOS install, run these commands from the repository root:

```sh
mkdir -p backend/.tools/TinyTeX
curl -fL https://github.com/rstudio/tinytex-releases/releases/download/v2026.09/TinyTeX-1-darwin-v2026.09.tar.xz -o /tmp/tinytex-resume.tar.xz
tar -xf /tmp/tinytex-resume.tar.xz -C backend/.tools/TinyTeX --strip-components=1
"$PWD/backend/.tools/TinyTeX/bin/universal-darwin/tlmgr" install preprint titlesec marvosym enumitem fancyhdr babel-english fontawesome5 changepage paracol needspace bookmark lastpage eso-pic sourcesans ly1
```

Django automatically finds this project-local installation; `.tools/` is ignored
by Git. For Windows/Linux installation, see the [TinyTeX instructions](https://yihui.org/tinytex/faq/).
Install the same additional packages with `tlmgr install preprint titlesec marvosym enumitem fancyhdr babel-english fontawesome5 changepage paracol needspace bookmark lastpage eso-pic sourcesans ly1`.
Restart Django after installing a compiler or changing its PATH.

The API uses `GET /api/csrf/` followed by a multipart `POST /api/resumes/render/`
with field `file` and the `X-CSRFToken` header. Success returns `image/png`;
errors return JSON with `error` and optional compiler `details`. Each compilation
uses a temporary folder and two passes with a 20-second timeout each, with shell
execution disabled. This local hackathon implementation is not an isolated
compilation service for public uploads.

### Resume files

- `frontend/src/resume_builder/ResumePage.jsx`: entry options, upload, and preview.
- `frontend/src/resume_builder/template.tex`: sample LaTeX resume used for import testing.
- `backend/api/latex.py`: compilation and temporary-file cleanup.
- `backend/api/tests.py`: upload, CSRF, error handling, and actual template checks.

## Application files

- `frontend/src/App.jsx`: React page and API request.
- `frontend/vite.config.js`: development API proxy.
- `backend/api/views.py`: API response.
- `backend/api/urls.py`: API routes.
- `backend/config/settings.py`: Django settings.

Database migrations are committed with the project. For normal setup and after
pulling schema changes, run `python manage.py migrate` from `backend/` with the
virtual environment active. `makemigrations` is only needed when intentionally
changing a Django model, and the resulting migration should be committed.

## Demo data scripts

Run these from `backend/` with the virtual environment active:

```sh
# Prepare all 10 jobs, 10 candidates, resumes, applications, and photos.
python manage.py seed_demo

# Or seed each half separately (jobs must come first).
python manage.py seed_demo_jobs
python manage.py seed_demo_candidates

# Check that everything needed for the demo exists.
python manage.py demo_summary

# Clear every database row. This asks you to type "clear" before continuing.
python manage.py clear_local_data
```

The seed commands are repeatable: they update their own `@jobbler.demo` records
instead of duplicating them. Images are copied from the version-controlled files
under `backend/demo_assets/`; the seed commands do not access the web. Replace
those files with your own JPG images while keeping the same filenames, then add
`--refresh-images` to update an already-seeded database. Use `--no-images` to
seed text-only records.

For example, after replacing the files:

```sh
python manage.py seed_demo --refresh-images
```

See `backend/demo_assets/README.md` for the exact job and candidate filename
mapping. Keep each image at or below 5 MB.

The demo recruiter login is `recruiter@jobbler.demo` / `demo1234`. Every seeded
candidate uses the same password and an email ending in `@jobbler.demo`.

Three candidate logins you can use during the demo are:

- Michael Scott: `michael.scott@jobbler.demo` / `demo1234`
- Rachel Green: `rachel.green@jobbler.demo` / `demo1234`
- Jake Peralta: `jake.peralta@jobbler.demo` / `demo1234`

`clear_local_data` only targets the project's expected local SQLite database and
does not remove uploaded files by default. Pass `--media` to remove those files
too, and `--yes` only when you intentionally want to skip the confirmation.

## Checks

```sh
# From backend/, with the virtual environment active:
python manage.py check
python manage.py test

# From frontend/:
npm run build
```

This template is for local development. Deployment needs production Django
settings (including a private secret key and `DEBUG=False`), a production server,
and hosting that serves the frontend build and routes `/api` to Django.

Reference: [React setup](https://react.dev/learn/build-a-react-app-from-scratch),
[Vite guide](https://vite.dev/guide/), and
[Django tutorial](https://docs.djangoproject.com/en/5.2/intro/tutorial01/).
