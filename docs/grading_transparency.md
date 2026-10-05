# Grading Transparency Upgrade

This upgrade makes the factory grading workflow auditable and easier to trust.

## Why this was needed

The earlier grading flow was too black-box:

1. Upload image
2. Receive Q1/Q2/Q3 prediction
3. Confirm final grade

For a commercial rubber supply-chain MIS, users need to see how the grade decision was handled, especially because payment depends on the grade.

## Added features

### 1. Clear decision rule

The UI now states that ML is advisory only. The factory manager is responsible for the final confirmed grade.

### 2. Grade definitions

The grading page now shows Q1, Q2, and Q3 definitions before the manager completes a transaction.

### 3. Image and prediction transparency

The prediction response now includes:

- image name
- file size
- resolution
- preprocessing steps
- model mode: mock / real_model / manual_fallback
- confidence threshold
- class probabilities when available
- decision trace
- mock-mode warning

### 4. Physical inspection checklist

Factory manager must confirm at least 3 physical inspection checklist items before completing the transaction.

Checklist items:

- color and surface uniformity
- contamination check
- drying check
- thickness consistency
- damage check

### 5. Inspector notes

Inspector notes are required when:

- ML service is unavailable
- ML prediction confidence is low

### 6. Override reason

Override reason is still required when the final grade differs from the ML suggestion.

### 7. Database auditability

FactoryTransaction now stores:

- inspectorNotes
- gradingChecklist
- gradingDecisionSource

The backend also adds this data to the audit log during transaction completion.

## Database change

Run a new migration after replacing files:

```bash
cd backend
npx prisma generate
npx prisma migrate dev --name add_grading_transparency
```

## Important note

This does not make the ML model academically explainable like Grad-CAM or heatmaps. It makes the business workflow transparent and auditable. For a stronger final-year ML explanation, Grad-CAM can be added later after a real trained model is available.
