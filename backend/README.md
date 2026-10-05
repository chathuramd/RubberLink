# Backend

Run:

```bash
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev
```

API: `http://localhost:5000/api`

The backend includes JWT auth, role-based access control, uploads, production workflow, owner approval, factory grading, payment calculation, revenue sharing, inventory, audit logs, notifications, and report export.
