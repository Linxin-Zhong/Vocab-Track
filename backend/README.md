# Backend — Local development (Django)

This document explains how to run the Django backend locally for development.

Prerequisites
- Python 3.10+ installed
- git, pip

Quick start

1. Open a terminal and change to the backend directory:

```bash
cd backend
```

2. Create and activate a virtual environment:

```bash
python -m venv .venv
```
If with MacOS system, run this command:
```bash
source .venv/bin/activate
```
If with Windows, run this in git bash instead:
```bash
source .venv/Scripts/activate
```

3. Install Python dependencies:

```bash
pip install -r requirements.txt
```

4. (Optional) Configure environment variables

- Copy or create a `.env` file in `backend/` with at minimum a `SECRET_KEY` and `DEBUG`.

5. Run migrations:

```bash
python manage.py migrate
```

6. (Optional) Create a superuser and setup password:

```bash
python manage.py createsuperuser --email admin@example.com
```

7. Run the development server:

```bash
python manage.py runserver
```

8. (Optional) View the Django admin dashboard
http://127.0.0.1:8000/admin/

## Testing
Run backend tests:

```bash
python manage.py test
```

Run tests for a specific app:
```bash
python manage.py test book
python manage.py test user
python manage.py test review
```

Run a specific test class or method:
```bash
python manage.py test book.tests.BookViewSetTest
python manage.py test book.tests.BookViewSetTest.test_create_book_successfully
```

Run tests with coverage and generate HTML report:

```bash
pip install coverage
coverage run --source=. manage.py test
coverage report --show-missing
coverage html
open htmlcov/index.html   # macOS
```

Notes:
- `.coverage` is a binary data file used by coverage tools.
- Human-readable report is `htmlcov/index.html`.

## CI (GitHub Actions)
Backend tests run in `Backend Tests` workflow:
- Triggers: pull requests and pushes to `main` when `backend/**` or `.github/workflows/backend-tests.yml` changes
- Manual run: Actions -> `Backend Tests` -> `Run workflow`
- Artifact: `backend-coverage-html` (after downloading, extract and open `backend/htmlcov/index.html`)

## Notes and tips
- To reset a local database (dangerous, destructive):

```bash
rm db.sqlite3
python manage.py migrate
```
