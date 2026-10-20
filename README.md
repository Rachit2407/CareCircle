# CareCircle web (Phase 1)

React + TypeScript + Vite + Tailwind. Phase 1: scaffold, app shell, UI primitives, auth, mock layer.

## Run

```bash
npm install
cp .env.example .env.local   # VITE_USE_MOCKS=true by default
npm run dev                  # http://localhost:5173
npm run check                # tsc + eslint + prettier + unused-exports
npm run build
```

Demo sign-in (mock mode): `demo@carecircle.test` / `Demo-pass-123`.

## Triggering every state

Mock mode shows a **Mock backend** button (bottom-left). It switches the simulated response for
every request. It lives in its own React root; the app cannot tell mocks from a real API.

| To see                        | Do this                                                             |
| ----------------------------- | ------------------------------------------------------------------- |
| Skeleton / pending            | Mock backend: **Slow**, then sign in (button says "Signing in…")    |
| Empty                         | **Empty**, then sign in: header shows "No care circle yet"          |
| 422 field errors              | **422 validation**, then submit sign-in or register                 |
| Wrong credentials / 401       | Wrong password, or **401 unauthorized**                             |
| Session expired mid-use       | Sign in, pick **401 unauthorized**, open the account menu, Sign out |
| 500                           | **500 server error**                                                |
| Timeout / unconfirmed write   | **Timeout**, submit a form, wait for `VITE_API_TIMEOUT_MS`          |
| Dirty-form prompt             | Type in sign-in, then click "Create an account"                     |
| Loading / empty / error+retry | `/dev/kit` (dev builds only): "Simulate this result"                |

Production builds (`VITE_USE_MOCKS=false`) contain no mock code, demo credentials or `/dev/kit`.

## Rules enforced by ESLint

No `fetch` outside `src/services/api-client.ts`; no `localStorage`/`sessionStorage` (mock marker
excepted); no `console.*`; no raw hex colours outside `src/styles/tokens.ts`; no `any`.
