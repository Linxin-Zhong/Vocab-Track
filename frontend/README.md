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

Run tests once (CI-style):
```bash
npm run test:run
```

Run in watch mode (reruns on file changes):
```bash
npm test
```

Current tests live next to the components/pages in `frontend/src/pages/`:
- `frontend/src/pages/starting_page.test.tsx`
- `frontend/src/pages/login_page.test.tsx`
