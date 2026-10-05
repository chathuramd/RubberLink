# API Documentation

Base URL: `http://localhost:5000/api`

Main endpoints:
- Auth: `POST /auth/login`, `POST /auth/register`, `GET /auth/me`
- Admin: `/admin/users`, `/admin/estates`, `/admin/factories`, `/admin/assignments`, `/admin/audit-logs`
- Tapper: `/tapper/records`, `/tapper/dashboard`, `/tapper/assignments`
- Owner: `/owner/records`, `/owner/records/:id/approve`, `/owner/records/:id/reject`
- Factory: `/factory/prices`, `/factory/approved-batches`, `/factory/records/:id/predict`, `/factory/records/:id/complete-transaction`, `/factory/inventory`
- Reports: `/reports/tapper`, `/reports/estate`, `/reports/factory`

Add `?format=pdf` or `?format=excel` to report endpoints.
