# Frontend

React + TypeScript frontend for Vocab-Track.

## Prerequisite
Make sure you have Node.js installed:

- **Node.js version:** 20.13.1
- **NPM version:** 10.7.0 (comes with Node.js)

You can check your versions with:

```bash
node -v
npm -v
```

## Setup
```bash
cd frontend
npm install
npm run dev
```

## Testing
The frontend uses Vitest with React Testing Library and jsdom for component tests (UI-level integration in jsdom).

If Vitest not installed: 
```bash
npm install -D vitest
```

Run tests once (CI-style):
```bash
npm run test:run
```

Run tests with coverage:
```bash
npm run test:coverage
```

Run in watch mode (reruns on file changes):
```bash
npm test
```

Current FE UI tests live next to the components/pages in `frontend/src/pages/`:
- `frontend/src/pages/starting_page.test.tsx`
- `frontend/src/pages/login_page.test.tsx`
- `frontend/src/pages/signup_page.test.tsx`

App-level tests live at:
- `frontend/src/App.test.tsx`

## CI
Frontend tests run in GitHub Actions via the `Frontend Tests` workflow.
- Triggers: pull requests and pushes to `main` (only when `frontend/**` or the workflow file changes)
- Manual runs: available via Actions → `Frontend Tests` (requires the workflow to be on `main`)
- Command used: `npm run test:run`
