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

## Where to start

- `frontend/src/App.jsx`: React page and API request.
- `frontend/vite.config.js`: development API proxy.
- `backend/api/views.py`: API response.
- `backend/api/urls.py`: API routes.
- `backend/config/settings.py`: Django settings.

No database setup is needed for this endpoint. SQLite is configured for when
you add models; then run `python manage.py makemigrations` and
`python manage.py migrate` from `backend/` with the virtual environment active.

## Checks

```sh
# From backend/, with the virtual environment active:
python manage.py check

# From frontend/:
npm run build
```

This template is for local development. Deployment needs production Django
settings (including a private secret key and `DEBUG=False`), a production server,
and hosting that serves the frontend build and routes `/api` to Django.

Reference: [React setup](https://react.dev/learn/build-a-react-app-from-scratch),
[Vite guide](https://vite.dev/guide/), and
[Django tutorial](https://docs.djangoproject.com/en/5.2/intro/tutorial01/).
