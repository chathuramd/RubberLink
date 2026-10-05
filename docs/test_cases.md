# Test Cases

| ID | Module | Test | Expected |
|---|---|---|---|
| TC_01 | Auth | Login valid user | Token returned |
| TC_02 | Auth | Wrong password | Error |
| TC_03 | RBAC | Tapper opens admin API | 403 |
| TC_04 | Admin | Create user | User saved |
| TC_05 | Tapper | Submit production | Pending Owner Approval |
| TC_06 | Tapper | Zero weight | Validation error |
| TC_07 | Owner | Approve record | Locked Owner Approved |
| TC_08 | Owner | Reject without reason | Error |
| TC_09 | Owner | Reject with reason | Owner Rejected |
| TC_10 | Factory | Save daily price | Price stored |
| TC_11 | Factory | ML prediction | Grade/confidence returned |
| TC_12 | Factory | ML unavailable | Manual fallback possible |
| TC_13 | Factory | Override without reason | Error |
| TC_14 | Factory | Complete transaction | Payment calculated |
| TC_15 | Inventory | Transaction completed | Inventory updated |
| TC_16 | Reports | Export PDF | PDF downloaded |
| TC_17 | Reports | Export Excel | Excel downloaded |
| TC_18 | Audit | Important action | Audit log stored |
| TC_19 | Notifications | Owner approval | Notification shown |
| TC_20 | Security | Edit approved record | Blocked |
