# Security Notes

## Implemented

- Password hashing using bcrypt.
- JWT authentication.
- Role-based backend authorization.
- Role-based frontend route protection.
- Helmet security headers.
- CORS allow-list support.
- Request ID for tracing errors.
- File type and size validation.
- Backend-only payment calculation.
- Audit logs for important actions.
- Basic rate limiting.

## Still needed for a real paying customer

- Redis or API gateway rate limiting.
- Refresh token storage and revocation.
- Password reset flow.
- MFA for admin and factory manager roles.
- Cloud object storage with signed URLs.
- Antivirus/media scanning for uploaded files.
- Centralized logs and alerting.
- Security testing using OWASP ZAP or similar.
- CI/CD secret scanning.
- Database backup and encryption strategy.
