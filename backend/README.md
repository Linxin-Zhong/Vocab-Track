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
source .venv/bin/activate
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

6. (Optional) Create a superuser:

```bash
python manage.py createsuperuser
```

7. Run the development server:

```bash
python manage.py runserver
```

## Notes and tips
- To reset a local database (dangerous, destructive):

```bash
rm db.sqlite3
python manage.py migrate
```