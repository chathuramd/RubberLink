# Operator Runbook

## Local startup

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run seed
npm run dev
```

```bash
cd ml-service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

```bash
cd frontend
npm install
npm run dev
```

## Docker startup

```bash
docker compose up --build
```

Open:

- Frontend: http://localhost:3000
- Backend health: http://localhost:5000/api/health
- Backend ready: http://localhost:5000/api/ready
- ML ready: http://localhost:8000/ready

## Common operational errors

### Factory manager sees no pending records

Check:

1. Tapper submitted record.
2. Estate owner approved it.
3. Record status is `PENDING_FACTORY_GRADING`.
4. Transaction does not already exist.

### Transaction completion fails

Check:

1. Factory manager added today’s prices.
2. Final weight is greater than 0.
3. Final grade is Q1, Q2, or Q3.
4. Tapper-estate assignment exists and revenue share equals 100%.
5. Override reason is filled if final grade differs from ML grade.

### ML service fails

The system supports manual grading. Factory manager can still choose final grade manually. For demo, keep `MOCK_MODE=true`. For real ML, train model and set `MOCK_MODE=false`.

### Upload fails

Allowed images:

- JPG/JPEG
- PNG
- WEBP

Default max size is 5MB. Change with `UPLOAD_MAX_MB` in backend and `MAX_IMAGE_MB` in ML service.

## Backup recommendation

Use MySQL dump before migrations:

```bash
mysqldump -u root -p rubber_mis > backup_rubber_mis.sql
```

Restore:

```bash
mysql -u root -p rubber_mis < backup_rubber_mis.sql
```
