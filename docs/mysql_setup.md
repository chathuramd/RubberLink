# MySQL Setup

```sql
CREATE DATABASE rubber_supply_chain;
```

Then update `backend/.env`:

```env
DATABASE_URL="mysql://root:password@localhost:3306/rubber_supply_chain"
```

Run:

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev
```
