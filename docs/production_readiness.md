# Production Readiness Guide

This version is a production-oriented hardening pass over the Rubber Supply Chain MIS. It is still a student/final-year project codebase, but the loose workflow problems have been tightened so the system behaves more like a real operational application.

## What was hardened

### Backend

- Strict production environment validation.
- JWT secret must be configured and strong in production.
- Configurable JWT expiry.
- CORS allow-list support through `CORS_ORIGIN`.
- Helmet security headers.
- `X-Powered-By` disabled.
- Request ID generated for every request and returned in errors.
- Basic in-memory rate limiting for auth and API traffic.
- Centralized error response with request ID.
- Graceful shutdown with Prisma disconnect.
- Health endpoint: `/api/health`.
- Readiness endpoint: `/api/ready`.
- Safer image upload filenames using UUIDs.
- File MIME type and extension validation.
- Configurable upload size limit.
- Stronger email, password, date, grade, weight, and price validation.
- Factory workflow status is now cleaner: owner approval moves records directly into `PENDING_FACTORY_GRADING`.
- Factory can only grade pending factory grading records.
- Completed transactions cannot be repeated.
- Daily price is required before completing a transaction.
- Revenue-sharing assignment is required before completing a transaction.
- ML grade override requires a reason.

### Frontend

- Global API 401 handling redirects the user to login when token expires.
- Client request header marks requests as web-client traffic.
- UI error boundary prevents a single page crash from blanking the full app.
- Factory workflow labels are clearer.

### ML service

- Health and readiness endpoints.
- Request ID middleware.
- Image content-type validation.
- Image file size validation.
- Empty/corrupted image detection.
- Minimum image resolution check.
- Explicit warning when mock mode is enabled.

### Deployment

- Dockerfiles added for frontend, backend, and ML service.
- Docker Compose added for MySQL + backend + frontend + ML service.
- Nginx SPA config added for frontend.
- Environment templates updated.

## Important commercial limitations still remaining

A true commercial production system also needs these before real business use:

1. Use object storage such as AWS S3, Azure Blob, or Cloudinary instead of local `uploads/`.
2. Use Redis-backed rate limiting instead of in-memory rate limiting for multi-server deployments.
3. Add refresh-token rotation and token revocation.
4. Add password reset with email verification.
5. Add email/SMS notification delivery.
6. Add full automated integration tests and CI/CD pipeline.
7. Add real trained ML model with documented dataset, metrics, and model validation.
8. Add database backup automation and restore drills.
9. Add role permission tests for every endpoint.
10. Add centralized logging/monitoring such as Grafana, Loki, Sentry, or ELK.
11. Add HTTPS reverse proxy in production.
12. Add audit log retention policy.
13. Add data privacy policy and user consent flows.
14. Add real payment settlement integration if money will actually be transferred.

## Production deployment checklist

Before deploying:

- Change all default passwords.
- Set `NODE_ENV=production`.
- Use a strong `JWT_SECRET` with at least 32 characters.
- Set `CORS_ORIGIN` to the exact frontend domain.
- Use HTTPS.
- Run `npx prisma migrate deploy`.
- Run seed only in demo/staging, not in real production.
- Back up MySQL before every migration.
- Keep `MOCK_MODE=true` only for demo. Use `MOCK_MODE=false` only after a real model is trained.
- Store uploaded images outside the backend container in production.

## Recommended production workflow test

1. Admin creates one estate owner, one tapper, and one factory manager.
2. Admin creates estate and assigns estate owner.
3. Admin creates factory and assigns factory manager.
4. Admin assigns tapper to estate and configures revenue share.
5. Factory manager adds today’s Q1/Q2/Q3 prices.
6. Tapper submits production with image.
7. Estate owner approves the record.
8. Factory manager sees the record under Pending Factory Grading.
9. Factory manager runs ML prediction or selects manual grade.
10. Factory manager confirms final grade and final weight.
11. System completes transaction, updates inventory, sends notifications, and records audit log.
12. Reports export successfully as PDF and Excel.
