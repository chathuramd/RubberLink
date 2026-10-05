# Developer Handover Fix — Workflow Stabilized Version

This version fixes the loose workflow problem by connecting the screens and backend rules as one real process.

## Fixed workflow

1. **Admin setup**
   - Create users by role.
   - Create estates and assign an estate owner.
   - Create factories and assign a factory manager.
   - Assign tappers to estates with tapper/owner revenue percentage.

2. **Tapper workflow**
   - Tapper can only submit to assigned estates.
   - Rubber sheet image is required.
   - Record goes to `PENDING_OWNER_APPROVAL`.
   - Tapper can edit only pending or rejected records.
   - Rejected records can be corrected and resubmitted.

3. **Estate owner workflow**
   - Owner sees only records for estates they own.
   - Owner can approve/reject only pending records.
   - Approved records are locked and sent to factory queue.
   - Rejected records require a reason and return to tapper.

4. **Factory manager workflow**
   - Factory manager must set today's Q1/Q2/Q3 prices.
   - Factory sees owner-approved batches under **Pending Factory Grading**.
   - Factory can run ML prediction or complete with manual grade if ML is unavailable.
   - Backend calculates payment and revenue split.
   - Completed transactions update inventory and disappear from pending queue.

5. **Reports**
   - Tapper, estate, and factory reports now render row data correctly.
   - PDF and Excel export work through authenticated requests.

## Files changed

- `backend/server.js`
- `frontend/src/main.jsx`
- `docs/developer_handover_fix.md`

## Correct demo testing order

1. Login as Admin.
2. Confirm users, estate, factory, and assignment exist.
3. Login as Factory Manager and save today's daily prices.
4. Login as Tapper and add production with image.
5. Login as Estate Owner and approve the record.
6. Login as Factory Manager.
7. Open **Pending Factory Grading**.
8. Click **Grade Now**.
9. Upload image and run ML prediction, or choose manual grade.
10. Complete transaction.
11. Check inventory, reports, notifications, and audit logs.
