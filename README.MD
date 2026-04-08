# MASTER_API_WRITE_GUIDE

Companion to `MASTER_API.md`.

This file is focused on `POST`, `PUT`, `PATCH`, and `DELETE` APIs so a developer or tester can implement requests in Postman quickly.

## How To Use This Guide

- `MASTER_API.md` remains the master endpoint index.
- This file adds starter request bodies, common response shapes, content types, and source implementation references.
- Example payloads below are based on the current controller / service layer.
- Some services accept additional optional keys beyond the examples shown here.
- For final field-level truth, check the source files listed in each section.

## Global Rules

- Base URL: `http://localhost:3004`
- Default header:
  - `Content-Type: application/json`
  - `Authorization: Bearer <TOKEN>`
- Replace path params before testing:
  - `:id`
  - `:taskId`
  - `:requestNumber`
  - `:grnNo`
  - `:quotationNo`
  - `:username`

## Standard Response Patterns

Typical create / update success:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {}
}
```

Typical delete success:

```json
{
  "success": true,
  "message": "Deleted successfully"
}
```

Typical validation error:

```json
{
  "success": false,
  "message": "Validation failed"
}
```

Typical auth error:

```json
{
  "success": false,
  "message": "Unauthorized"
}
```

Typical DB/server error:

```json
{
  "success": false,
  "error": "Internal Server Error"
}
```
# MASTER_API

Generated on: 2026-03-09T13:12:00.000Z

## Base URL
- `http://localhost:3004`

## Detailed Write API Guide
- `MASTER_API_WRITE_GUIDE.md` contains starter request/response examples for `POST`, `PUT`, `PATCH`, and `DELETE` APIs.
- Use `MASTER_API.md` as the endpoint index and `MASTER_API_WRITE_GUIDE.md` as the Postman / implementation companion.

## Single Login (Use One Token For All Modules)
1. Login once: `POST /api/auth/login`
2. Copy token from response: `data.token`
3. Pass token in every API: `Authorization: Bearer <TOKEN>`

## Login Request
```json
{
  "user_name": "your_user_or_employee_id",
  "password": "your_password"
}
```

## Login Response
```json
{
  "success": true,
  "data": {
    "user": {},
    "token": "<JWT_TOKEN>"
  }
}
```

## Common Headers
- `Content-Type: application/json`
- `Authorization: Bearer <TOKEN>`

## Runtime Notes
- `401` = token missing/invalid.
- `500` DB connect error = route loaded, but DB/tunnel/network issue.
- Quick mount check: `/api/store/health`, `/api/document/health`, `/api/master/health`, `/api/hrfms/health`, `/api/gatepass/health`, `/api/checklist/health`.
- `Checklist/Mainatce/Houskeeping` routes are JWT-protected. Use `Authorization: Bearer <TOKEN>` from login for every request.

## Shared Auth APIs (3)

| Method | Endpoint |
|---|---|
| GET | `/api/auth/crm-users` |
| POST | `/api/auth/login` |
| POST | `/api/auth/logout` |

## Checklist Auth APIs (4)

Note: These are public auth endpoints. Remaining Checklist/Mainatce/Houskeeping endpoints require token.


## Checklist APIs (67)

Note: Token required on all Checklist routes.

| Method | Endpoint |
|---|---|
| GET | `/api/checklist/health` |
| GET | `/api/checklist/dashboard` |
| GET | `/api/checklist/dashboard/total` |
| GET | `/api/checklist/dashboard/completed` |
| GET | `/api/checklist/dashboard/pending` |
| GET | `/api/checklist/dashboard/pendingtoday` |
| GET | `/api/checklist/dashboard/completedtoday` |
| GET | `/api/checklist/dashboard/overdue` |
| GET | `/api/checklist/dashboard/upcoming` |
| GET | `/api/checklist/dashboard/notdone` |
| GET | `/api/checklist/dashboard/notdone/list` |
| GET | `/api/checklist/dashboard/departments` |
| GET | `/api/checklist/dashboard/staff` |
| GET | `/api/checklist/dashboard/staff-summary` |
| GET | `/api/checklist/dashboard/checklist/date-range` |
| GET | `/api/checklist/dashboard/checklist/date-range/stats` |
| GET | `/api/checklist/dashboard/checklist/date-range/count` |
| GET | `/api/checklist/dashboard/count` |
| GET | `/api/checklist/dashboard/division-wise-counts` |
| GET | `/api/checklist/assign-task/departments/:user_name` |
| GET | `/api/checklist/assign-task/divisions` |
| GET | `/api/checklist/assign-task/given-by` |
| GET | `/api/checklist/assign-task/doer/:department` |
| GET | `/api/checklist/assign-task/working-days` |
| POST | `/api/checklist/assign-task/assign` |
| GET | `/api/checklist/pending` |
| GET | `/api/checklist/history` |
| POST | `/api/checklist/update` |
| POST | `/api/checklist/user-status` |
| PATCH | `/api/checklist/admin-status` |
| POST | `/api/checklist/admin-done` |
| PATCH | `/api/checklist/admin-role` |
| PATCH | `/api/checklist/reject-role` |
| GET | `/api/checklist/hr-manager` |
| GET | `/api/checklist/departments` |
| GET | `/api/checklist/doers` |
| GET | `/api/checklist/delegation` |
| GET | `/api/checklist/delegation-done` |
| POST | `/api/checklist/delegation/submit` |
| GET | `/api/checklist/settings/users` |
| GET | `/api/checklist/settings/users/:id` |
| POST | `/api/checklist/settings/users` |
| PUT | `/api/checklist/settings/users/:id` |
| DELETE | `/api/checklist/settings/users/:id` |
| GET | `/api/checklist/settings/departments` |
| GET | `/api/checklist/settings/departments-only` |
| GET | `/api/checklist/settings/given-by` |
| POST | `/api/checklist/settings/departments` |
| PUT | `/api/checklist/settings/departments/:id` |
| DELETE | `/api/checklist/settings/departments/:id` |
| PATCH | `/api/checklist/settings/users/:id/system_access` |
| PATCH | `/api/checklist/settings/users/:id/verify-access` |
| PATCH | `/api/checklist/settings/users/:id/verify-access-dept` |
| GET | `/api/checklist/staff-tasks/tasks` |
| GET | `/api/checklist/staff-tasks/tasks/export` |
| GET | `/api/checklist/staff-tasks/count` |
| GET | `/api/checklist/staff-tasks/users-count` |
| POST | `/api/checklist/tasks/checklist` |
| POST | `/api/checklist/tasks/delegation` |
| POST | `/api/checklist/tasks/delete-checklist` |
| POST | `/api/checklist/tasks/delete-delegation` |
| POST | `/api/checklist/tasks/update-checklist` |
| GET | `/api/checklist/tasks/users` |
| GET | `/api/checklist/logs/device-sync` |
| GET | `/api/checklist/user-score` |
| GET | `/api/checklist/user-score/:id` |
| POST | `/api/checklist/add-new-task` |

## Houskeeping APIs (26)

Note: Same endpoints are also available via `/api/housekeeping/...` alias. Token required.

| Method | Endpoint |
|---|---|
| GET | `/api/houskeeping/assigntask/generate` |
| POST | `/api/houskeeping/assigntask/generate` |
| GET | `/api/houskeeping/assigntask/generate/stats` |
| GET | `/api/houskeeping/assigntask/generate/overdue` |
| GET | `/api/houskeeping/assigntask/generate/not-done` |
| GET | `/api/houskeeping/assigntask/generate/today` |
| GET | `/api/houskeeping/assigntask/generate/tomorrow` |
| GET | `/api/houskeeping/assigntask/generate/today/count` |
| GET | `/api/houskeeping/assigntask/generate/tomorrow/count` |
| GET | `/api/houskeeping/assigntask/generate/overdue/count` |
| GET | `/api/houskeeping/assigntask/generate/not-done/count` |
| GET | `/api/houskeeping/assigntask/generate/pending` |
| GET | `/api/houskeeping/assigntask/generate/history` |
| POST | `/api/houskeeping/assigntask/generate/delete` |
| POST | `/api/houskeeping/assigntask/generate/confirm/bulk` |
| POST | `/api/houskeeping/assigntask/generate/:id/confirm` |
| GET | `/api/houskeeping/assigntask/generate/:id` |
| PATCH | `/api/houskeeping/assigntask/generate/:id` |
| DELETE | `/api/houskeeping/assigntask/generate/:id` |
| POST | `/api/houskeeping/uploads/image` |
| GET | `/api/houskeeping/working-days` |
| GET | `/api/houskeeping/dashboard/summary` |
| GET | `/api/houskeeping/dashboard/departments` |
| GET | `/api/houskeeping/dashboard/debug` |
| GET | `/api/houskeeping/locations` |
| POST | `/api/houskeeping/locations` |

## Mainatce APIs (38)

Note: Same endpoints are also available via `/api/maintenance/...` alias. Token required.

| Method | Endpoint |
|---|---|
| GET | `/api/mainatce/tasks` |
| GET | `/api/mainatce/tasks/pending` |
| GET | `/api/mainatce/tasks/completed` |
| PUT | `/api/mainatce/tasks/:taskId` |
| PUT | `/api/mainatce/tasks/bulk/update` |
| GET | `/api/mainatce/machines/unique` |
| GET | `/api/mainatce/personnel/unique` |
| GET | `/api/mainatce/statistics` |
| GET | `/api/mainatce/departments/unique` |
| GET | `/api/mainatce/doers/unique` |
| POST | `/api/mainatce/maintenance-tasks` |
| POST | `/api/mainatce/maintenance-tasks/bulk` |
| GET | `/api/mainatce/maintenance-tasks` |
| GET | `/api/mainatce/form-responses` |
| GET | `/api/mainatce/dropdown` |
| GET | `/api/mainatce/machine-details` |
| GET | `/api/mainatce/machine-details/tag/:tagNo/history` |
| GET | `/api/mainatce/machine-details/tag/:tagNo` |
| PUT | `/api/mainatce/machine-details/tag/:tagNo` |
| GET | `/api/mainatce/machine-details/:serialNo/history` |
| GET | `/api/mainatce/machine-details/:serialNo` |
| PUT | `/api/mainatce/machine-details/:serialNo` |
| GET | `/api/mainatce/working-days` |
| POST | `/api/mainatce/working-days` |
| POST | `/api/mainatce/machines` |
| GET | `/api/mainatce/machines` |
| GET | `/api/mainatce/master` |
| GET | `/api/mainatce/departments` |
| GET | `/api/mainatce/dashboard/stats` |
| GET | `/api/mainatce/dashboard/data` |
| GET | `/api/mainatce/dashboard/today-tasks` |
| GET | `/api/mainatce/dashboard/upcoming-tasks` |
| GET | `/api/mainatce/dashboard/overdue-tasks` |
| GET | `/api/mainatce/dashboard/maintenance-costs` |
| GET | `/api/mainatce/dashboard/department-costs` |
| GET | `/api/mainatce/dashboard/frequencies` |
| GET | `/api/mainatce/dashboard/departments` |
| GET | `/api/mainatce/dashboard/staff` |

## Store APIs (63)

| Method | Endpoint |
|---|---|
| GET | `/api/store/auth/hod/:department` |
| GET | `/api/store/cost-location` |
| GET | `/api/store/cost-location/co` |
| GET | `/api/store/cost-location/pm` |
| GET | `/api/store/cost-location/rp` |
| GET | `/api/store/dashboard` |
| GET | `/api/store/departments` |
| POST | `/api/store/departments` |
| DELETE | `/api/store/departments/:id` |
| PUT | `/api/store/departments/:id` |
| GET | `/api/store/erp-indent` |
| GET | `/api/store/health` |
| GET | `/api/store/indent` |
| POST | `/api/store/indent` |
| GET | `/api/store/indent/:requestNumber` |
| PATCH | `/api/store/indent/:requestNumber/indent-number` |
| PUT | `/api/store/indent/:requestNumber/status` |
| GET | `/api/store/indent/all` |
| GET | `/api/store/indent/filter` |
| GET | `/api/store/indent/status/:statusType` |
| GET | `/api/store/items` |
| GET | `/api/store/po/history` |
| GET | `/api/store/po/history/download` |
| GET | `/api/store/po/pending` |
| GET | `/api/store/po/pending/download` |
| GET | `/api/store/repair-followup` |
| POST | `/api/store/repair-followup` |
| DELETE | `/api/store/repair-followup/:id` |
| GET | `/api/store/repair-followup/:id` |
| PUT | `/api/store/repair-followup/:id` |
| PATCH | `/api/store/repair-followup/:id/stage2` |
| GET | `/api/store/repair-gate-pass/counts` |
| GET | `/api/store/repair-gate-pass/history` |
| GET | `/api/store/repair-gate-pass/pending` |
| GET | `/api/store/repair-gate-pass/pending/download` |
| GET | `/api/store/repair-gate-pass/received` |
| GET | `/api/store/returnable/details` |
| GET | `/api/store/returnable/stats` |
| GET | `/api/store/settings/users` |
| PATCH | `/api/store/settings/users/:id/store-access` |
| GET | `/api/store/stock` |
| GET | `/api/store/store-grn-approval` |
| PATCH | `/api/store/store-grn-approval/approve-gm/:grnNo` |
| PATCH | `/api/store/store-grn-approval/close-bill/:grnNo` |
| POST | `/api/store/store-grn-approval/send-bill` |
| GET | `/api/store/store-grn/pending` |
| POST | `/api/store/store-indent` |
| PUT | `/api/store/store-indent/approve` |
| GET | `/api/store/store-indent/dashboard` |
| GET | `/api/store/store-indent/history` |
| GET | `/api/store/store-indent/history/download` |
| GET | `/api/store/store-indent/pending` |
| GET | `/api/store/store-indent/pending/download` |
| GET | `/api/store/store-indent/products` |
| GET | `/api/store/store-indent/vendors` |
| GET | `/api/store/store-issue` |
| POST | `/api/store/three-party-approval/approve` |
| GET | `/api/store/three-party-approval/history` |
| GET | `/api/store/three-party-approval/pending` |
| GET | `/api/store/uom` |
| POST | `/api/store/vendor-rate-update` |
| GET | `/api/store/vendor-rate-update/history` |
| GET | `/api/store/vendor-rate-update/pending` |

## HRFMS APIs (38)

| Method | Endpoint |
|---|---|
| GET | `/api/hrfms/dashboard` |
| GET | `/api/hrfms/dashboard/employee/:employeeId` |
| GET | `/api/hrfms/employees` |
| POST | `/api/hrfms/employees` |
| DELETE | `/api/hrfms/employees/:id` |
| GET | `/api/hrfms/employees/:id` |
| PUT | `/api/hrfms/employees/:id` |
| GET | `/api/hrfms/employees/departments` |
| GET | `/api/hrfms/employees/designations` |
| POST | `/api/hrfms/employees/verify-token` |
| GET | `/api/hrfms/health` |
| GET | `/api/hrfms/leave-requests` |
| POST | `/api/hrfms/leave-requests` |
| DELETE | `/api/hrfms/leave-requests/:id` |
| GET | `/api/hrfms/leave-requests/:id` |
| PUT | `/api/hrfms/leave-requests/:id` |
| GET | `/api/hrfms/leave-requests/status/:status` |
| GET | `/api/hrfms/plant-visitors` |
| POST | `/api/hrfms/plant-visitors` |
| DELETE | `/api/hrfms/plant-visitors/:id` |
| GET | `/api/hrfms/plant-visitors/:id` |
| PUT | `/api/hrfms/plant-visitors/:id` |
| GET | `/api/hrfms/requests` |
| POST | `/api/hrfms/requests` |
| DELETE | `/api/hrfms/requests/:id` |
| GET | `/api/hrfms/requests/:id` |
| PUT | `/api/hrfms/requests/:id` |
| GET | `/api/hrfms/resumes` |
| POST | `/api/hrfms/resumes` |
| DELETE | `/api/hrfms/resumes/:id` |
| GET | `/api/hrfms/resumes/:id` |
| PUT | `/api/hrfms/resumes/:id` |
| GET | `/api/hrfms/resumes/selected` |
| GET | `/api/hrfms/tickets` |
| POST | `/api/hrfms/tickets` |
| DELETE | `/api/hrfms/tickets/:id` |
| GET | `/api/hrfms/tickets/:id` |
| PUT | `/api/hrfms/tickets/:id` |

## O2D APIs (28)

| Method | Endpoint |
|---|---|
| GET | `/api/o2d/client` |
| POST | `/api/o2d/client` |
| DELETE | `/api/o2d/client/:id` |
| GET | `/api/o2d/client/:id` |
| PUT | `/api/o2d/client/:id` |
| GET | `/api/o2d/client/count` |
| GET | `/api/o2d/client/marketing-users` |
| GET | `/api/o2d/dashboard/customer-feedback` |
| GET | `/api/o2d/dashboard/metrics` |
| GET | `/api/o2d/dashboard/summary` |
| GET | `/api/o2d/delivery/report` |
| GET | `/api/o2d/delivery/stats` |
| GET | `/api/o2d/delivery/stats/salesperson` |
| GET | `/api/o2d/followup` |
| POST | `/api/o2d/followup` |
| DELETE | `/api/o2d/followup/:id` |
| GET | `/api/o2d/followup/:id` |
| PUT | `/api/o2d/followup/:id` |
| GET | `/api/o2d/followup/performance` |
| GET | `/api/o2d/followup/stats` |
| GET | `/api/o2d/orders/history` |
| GET | `/api/o2d/orders/pending` |
| GET | `/api/o2d/process/timeline` |
| GET | `/api/o2d/size-master` |
| GET | `/api/o2d/size-master/:id` |
| GET | `/api/o2d/size-master/enquiries/all` |
| POST | `/api/o2d/size-master/enquiry` |
| GET | `/api/o2d/size-master/report/current-month` |

## Batchcode APIs (16)

| Method | Endpoint |
|---|---|
| GET | `/api/batchcode/admin/overview` |
| GET | `/api/batchcode/admin/overview/:unique_code` |
| POST | `/api/batchcode/auth/logout` |
| GET | `/api/batchcode/auth/register` |
| POST | `/api/batchcode/auth/register` |
| DELETE | `/api/batchcode/auth/register/:id` |
| GET | `/api/batchcode/auth/register/:id` |
| PUT | `/api/batchcode/auth/register/:id` |
| GET | `/api/batchcode/dashboard` |
| GET | `/api/batchcode/hot-coil/:unique_code` |
| GET | `/api/batchcode/laddle-checklist/:unique_code` |
| GET | `/api/batchcode/laddle-return/:unique_code` |
| GET | `/api/batchcode/pipe-mill/:unique_code` |
| GET | `/api/batchcode/qc-lab-samples/:unique_code` |
| GET | `/api/batchcode/re-coiler/:unique_code` |
| GET | `/api/batchcode/tundish-checklist/:unique_code` |

## Lead-To-Order APIs (39)

| Method | Endpoint |
|---|---|
| POST | `/api/lead-to-order/auth/create-user` |
| GET | `/api/lead-to-order/auth/data` |
| POST | `/api/lead-to-order/auth/verify-token` |
| GET | `/api/lead-to-order/dashboard/charts` |
| GET | `/api/lead-to-order/dashboard/metrics` |
| POST | `/api/lead-to-order/enquiry-to-order` |
| GET | `/api/lead-to-order/enquiry-to-order/dropdowns` |
| GET | `/api/lead-to-order/enquiry-tracker/direct-pending` |
| GET | `/api/lead-to-order/enquiry-tracker/dropdowns/:column` |
| POST | `/api/lead-to-order/enquiry-tracker/form` |
| GET | `/api/lead-to-order/enquiry-tracker/history` |
| GET | `/api/lead-to-order/enquiry-tracker/pending` |
| GET | `/api/lead-to-order/enquiry-tracker/view/:type/:id` |
| GET | `/api/lead-to-order/follow-up/dropdowns` |
| POST | `/api/lead-to-order/follow-up/followup` |
| GET | `/api/lead-to-order/follow-up/history` |
| GET | `/api/lead-to-order/follow-up/pending` |
| GET | `/api/lead-to-order/followup/dropdowns` |
| POST | `/api/lead-to-order/followup/followup` |
| GET | `/api/lead-to-order/followup/history` |
| GET | `/api/lead-to-order/followup/pending` |
| GET | `/api/lead-to-order/lead-dropdown` |
| POST | `/api/lead-to-order/leads` |
| GET | `/api/lead-to-order/products` |
| GET | `/api/lead-to-order/quotation-leads/lead-details/:leadNo` |
| GET | `/api/lead-to-order/quotation-leads/lead-numbers` |
| GET | `/api/lead-to-order/quotation-leads/quotation-details/:quotationNo` |
| GET | `/api/lead-to-order/quotation-leads/quotation-numbers` |
| GET | `/api/lead-to-order/quotations/dropdowns` |
| GET | `/api/lead-to-order/quotations/get-next-number` |
| POST | `/api/lead-to-order/quotations/quotation` |
| GET | `/api/lead-to-order/quotations/quotation/:quotationNo` |
| POST | `/api/lead-to-order/quotations/upload-pdf` |
| GET | `/api/lead-to-order/users` |
| POST | `/api/lead-to-order/users` |
| DELETE | `/api/lead-to-order/users/:id` |
| GET | `/api/lead-to-order/users/:id` |
| PUT | `/api/lead-to-order/users/:id` |
| GET | `/api/lead-to-order/users/departments` |

## Master APIs (20)

| Method | Endpoint |
|---|---|
| GET | `/api/master/attendence` |
| GET | `/api/master/dashboard/completed` |
| GET | `/api/master/dashboard/completedtoday` |
| GET | `/api/master/dashboard/overdue` |
| GET | `/api/master/dashboard/pending` |
| GET | `/api/master/dashboard/pendingtoday` |
| GET | `/api/master/dashboard/total` |
| GET | `/api/master/health` |
| GET | `/api/master/settings/users` |
| GET | `/api/master/settings/users/:id` |
| PATCH | `/api/master/settings/users/:id/system_access` |
| GET | `/api/master/systems` |
| POST | `/api/master/systems` |
| GET | `/api/master/systems/:id` |
| PUT | `/api/master/systems/:id` |
| GET | `/api/master/user-score` |
| GET | `/api/master/user-score/:id` |
| GET | `/api/master/user-score/test` |
| PATCH | `/api/master/users/:id/emp-image` |

## Gatepass APIs (23)

| Method | Endpoint |
|---|---|
| GET | /api/gatepass/approval|
| PATCH | /api/gatepass/approval/:id|
| GET | /api/gatepass/gatepass|
| PATCH | /api/gatepass/gatepass/:id|
| GET | /api/gatepass/persons|
| POST | /api/gatepass/persons|
| DELETE | /api/gatepass/persons/:id|
| PUT | /api/gatepass/persons/:id|
| POST | /api/gatepass/visits|
| GET | /api/gatepass/visits|
| GET | /api/gatepass/visits/admin|
| GET | /api/gatepass/visits/by-mobile/:mobile|

## Document APIs (72)

| Method | Endpoint |
|---|---|
| GET | `/api/document/dashboard/all` |
| GET | `/api/document/dashboard/dashboard` |
| GET | `/api/document/dashboard/dashboard-all` |
| GET | `/api/document/dashboard/dashboards` |
| GET | `/api/document/dashboard/mine` |
| POST | `/api/document/document-share/send` |
| GET | `/api/document/documents` |
| GET | `/api/document/documents/:id` |
| PUT | `/api/document/documents/:id` |
| GET | `/api/document/documents/category/:category` |
| POST | `/api/document/documents/create` |
| POST | `/api/document/documents/create-multiple` |
| GET | `/api/document/documents/renewal` |
| GET | `/api/document/documents/stats` |
| GET | `/api/document/health` |
| GET | `/api/document/loan` |
| POST | `/api/document/loan` |
| DELETE | `/api/document/loan/:id` |
| GET | `/api/document/loan/:id` |
| PUT | `/api/document/loan/:id` |
| GET | `/api/document/loan/foreclosure-eligible` |
| GET | `/api/document/loan/foreclosure/history` |
| GET | `/api/document/loan/foreclosure/pending-noc` |
| POST | `/api/document/loan/foreclosure/request` |
| POST | `/api/document/loan/noc` |
| GET | `/api/document/loan/noc/all` |
| GET | `/api/document/loan/noc/history` |
| GET | `/api/document/loan/noc/pending` |
| DELETE | `/api/document/master` |
| GET | `/api/document/master` |
| POST | `/api/document/master` |
| GET | `/api/document/master/categories` |
| GET | `/api/document/master/company-names` |
| GET | `/api/document/master/document-types` |
| GET | `/api/document/my-subscriptions` |
| DELETE | `/api/document/payment-fms/:id` |
| GET | `/api/document/payment-fms/:id` |
| PUT | `/api/document/payment-fms/:id` |
| GET | `/api/document/payment-fms/all` |
| PATCH | `/api/document/payment-fms/approval/:id/process` |
| GET | `/api/document/payment-fms/approval/history` |
| GET | `/api/document/payment-fms/approval/pending` |
| POST | `/api/document/payment-fms/create` |
| GET | `/api/document/payment-fms/generate-unique-no` |
| PATCH | `/api/document/payment-fms/make-payment/:id/process` |
| GET | `/api/document/payment-fms/make-payment/history` |
| GET | `/api/document/payment-fms/make-payment/pending` |
| GET | `/api/document/payment-fms/tally-entry/history` |
| GET | `/api/document/payment-fms/tally-entry/pending` |
| POST | `/api/document/payment-fms/tally-entry/process` |
| GET | `/api/document/renewal/history` |
| GET | `/api/document/renewal/pending` |
| POST | `/api/document/renewal/submit` |
| GET | `/api/document/settings/users` |
| GET | `/api/document/settings/users/:id` |
| PUT | `/api/document/settings/users/:id/access` |
| GET | `/api/document/subscription-approvals/history` |
| GET | `/api/document/subscription-approvals/pending` |
| POST | `/api/document/subscription-approvals/submit` |
| GET | `/api/document/subscription-payment/history` |
| GET | `/api/document/subscription-payment/pending` |
| POST | `/api/document/subscription-payment/submit` |
| GET | `/api/document/subscriptions/all` |
| POST | `/api/document/subscriptions/create` |
| GET | `/api/document/subscriptions/generate-number` |
| PUT | `/api/document/subscriptions/update/:id` |
| GET | `/api/document/users` |
| GET | `/api/document/users-list` |
| GET | `/api/document/users/auth/me` |
| POST | `/api/document/users/create` |
| DELETE | `/api/document/users/delete/:username` |
| PUT | `/api/document/users/update/:username` |



## Content-Type Matrix

Use `application/json` for most write APIs.

Use `multipart/form-data` for:

- `/api/houskeeping/uploads/image`
- `/api/lead-to-order/quotations/upload-pdf`
- `/api/hrfms/employees`
- `/api/hrfms/employees/:id`
- `/api/hrfms/resumes`
- `/api/hrfms/resumes/:id`
- `/api/hrfms/tickets`
- `/api/hrfms/tickets/:id`
- `/api/mainatce/tasks/:taskId`
- `/api/master/users/:id/emp-image`
- Gatepass visitor photo upload endpoint family

## Auth

Source:

- `src/auth/routes/login.routes.js`

### `POST /api/auth/login`

```json
{
  "user_name": "your_user_or_employee_id",
  "password": "your_password"
}
```

```json
{
  "success": true,
  "data": {
    "user": {},
    "token": "<JWT_TOKEN>"
  }
}
```

### `POST /api/auth/logout`

No request body required in normal usage. Send the Bearer token.

```json
{
  "success": true,
  "message": "Logout successful"
}
```

## Checklist / Housekeeping / Maintenance

Source:

- `src/checklist-maintenance-housekeeping/controllers/assignTaskController.js`
- `src/checklist-maintenance-housekeeping/controllers/checklistController.js`
- `src/checklist-maintenance-housekeeping/controllers/settingController.js`
- `src/checklist-maintenance-housekeeping/controllers/maintenance-controller/MaintenanceTaskController.js`
- `src/checklist-maintenance-housekeeping/controllers/housekepping-controller/assignTaskController.js`
- `src/checklist-maintenance-housekeeping/controllers/housekepping-controller/locationController.js`

### Checklist task assignment

Used by:

- `POST /api/checklist/assign-task/assign`

```json
[
  {
    "department": "Production",
    "givenBy": "HR",
    "doer": "rahul",
    "description": "Check safety register",
    "frequency": "daily",
    "enableReminders": true,
    "requireAttachment": false,
    "taskStartDate": "2026-03-20",
    "division": "Mill"
  }
]
```

Typical response:

```json
{
  "message": "Tasks inserted",
  "count": 1
}
```

### Checklist submit / status / admin action payloads

Used by:

- `POST /api/checklist/update`
- `POST /api/checklist/user-status`
- `PATCH /api/checklist/admin-status`
- `POST /api/checklist/admin-done`
- `PATCH /api/checklist/admin-role`
- `PATCH /api/checklist/reject-role`

User submit example:

```json
[
  {
    "taskId": 101,
    "status": "yes",
    "remarks": "Completed and verified"
  }
]
```

Admin done example:

```json
[
  {
    "task_id": 101
  }
]
```

Role confirm / reject example:

```json
[
  {
    "taskId": 101
  }
]
```

Typical response:

```json
{
  "message": "Checklist submitted successfully"
}
```

### Delegation submit

Used by:

- `POST /api/checklist/delegation/submit`

Starter payload:

```json
{
  "selectedData": [
    {
      "task_id": 201,
      "status": "Done",
      "remark": "Delegation completed"
    }
  ]
}
```

### Checklist settings user create / update

Used by:

- `POST /api/checklist/settings/users`
- `PUT /api/checklist/settings/users/:id`

```json
{
  "username": "test_user",
  "password": "123456",
  "email": "test@example.com",
  "phone": "9876543210",
  "department": "HR",
  "givenBy": "Admin",
  "employee_id": "EMP001",
  "role": "user",
  "status": "active",
  "user_access": "HR",
  "user_access1": "HR",
  "system_access": "CHECKLIST",
  "page_access": "dashboard,history",
  "division": "Corporate",
  "designation": "Executive"
}
```

Patch access examples:

```json
{
  "system_access": "CHECKLIST"
}
```

```json
{
  "verify_access": true
}
```

```json
{
  "verify_access_dept": "HR"
}
```

Delete endpoints:

- `DELETE /api/checklist/settings/users/:id`
- `DELETE /api/checklist/settings/departments/:id`

Do not require a request body.

### Checklist settings department create / update

Used by:

- `POST /api/checklist/settings/departments`
- `PUT /api/checklist/settings/departments/:id`

Create:

```json
{
  "name": "Stores",
  "givenBy": "Admin"
}
```

Update:

```json
{
  "department": "Stores",
  "given_by": "GM"
}
```

### Quick task helper APIs

Used by:

- `POST /api/checklist/tasks/checklist`
- `POST /api/checklist/tasks/delegation`
- `POST /api/checklist/tasks/delete-checklist`
- `POST /api/checklist/tasks/delete-delegation`
- `POST /api/checklist/tasks/update-checklist`

Filter payload:

```json
{
  "page": 1,
  "pageSize": 20,
  "nameFilter": "rahul",
  "startDate": "2026-03-01",
  "endDate": "2026-03-31"
}
```

Delete checklist payload:

```json
{
  "tasks": [101, 102]
}
```

Delete delegation payload:

```json
{
  "taskIds": [201, 202]
}
```

Update checklist payload:

```json
{
  "updatedTask": {
    "task_id": 101,
    "status": "yes"
  },
  "originalTask": {
    "task_id": 101
  }
}
```

### Add new checklist task

Used by:

- `POST /api/checklist/add-new-task`

```json
{
  "department": "HR",
  "task_description": "Verify visitor register",
  "name": "rahul",
  "frequency": "daily",
  "division": "Corporate"
}
```

### Housekeeping task generate / update / confirm / delete

Used by:

- `POST /api/houskeeping/assigntask/generate`
- `POST /api/houskeeping/assigntask/generate/confirm/bulk`
- `POST /api/houskeeping/assigntask/generate/:id/confirm`
- `PATCH /api/houskeeping/assigntask/generate/:id`
- `DELETE /api/houskeeping/assigntask/generate/:id`
- `POST /api/houskeeping/assigntask/generate/delete`

Create starter:

```json
{
  "department": "Housekeeping",
  "location": "Admin Block",
  "task_description": "Lobby cleaning",
  "doer_name": "sandeep",
  "frequency": "daily",
  "task_start_date": "2026-03-20",
  "remark": "Morning shift"
}
```

Bulk confirm:

```json
{
  "ids": [1, 2, 3],
  "remark": "Verified"
}
```

Delete bulk:

```json
{
  "ids": [1, 2, 3]
}
```

### Housekeeping image upload

Used by:

- `POST /api/houskeeping/uploads/image`

Use `multipart/form-data`:

- key: `image`
- type: file

Typical response:

```json
{
  "url": "/uploads/example-file.png"
}
```

### Housekeeping location create

Used by:

- `POST /api/houskeeping/locations`

```json
{
  "location": "Admin Block"
}
```

### Maintenance task create / bulk create

Used by:

- `POST /api/mainatce/maintenance-tasks`
- `POST /api/mainatce/maintenance-tasks/bulk`

Single create:

```json
{
  "serial_no": "MC-1001",
  "machine_name": "Rolling Machine",
  "given_by": "Manager",
  "doer_name": "Rakesh",
  "task_type": "Preventive",
  "machine_area": "Section A",
  "part_name": "Motor",
  "need_sound_test": "Yes",
  "temperature": "Normal",
  "enable_reminders": "Yes",
  "require_attachment": "No",
  "task_start_date": "2026-03-20T09:00:00",
  "frequency": "monthly",
  "description": "Monthly preventive check",
  "priority": "High",
  "machine_department": "Maintenance",
  "doer_department": "Maintenance",
  "division": "Mill"
}
```

Bulk create:

```json
{
  "tasks": [
    {
      "serial_no": "MC-1001",
      "machine_name": "Rolling Machine",
      "given_by": "Manager",
      "doer_name": "Rakesh",
      "task_type": "Preventive",
      "task_start_date": "2026-03-20T09:00:00",
      "frequency": "monthly"
    }
  ]
}
```

### Maintenance task update

Used by:

- `PUT /api/mainatce/tasks/:taskId`
- `PUT /api/mainatce/tasks/bulk/update`

Single update uses `multipart/form-data` if image is uploaded:

- key: `image`
- other keys: normal form fields

JSON-style fields:

```json
{
  "status": "done",
  "remark": "Task completed",
  "temperature": "38",
  "sound_test": "ok"
}
```

Bulk update:

```json
{
  "tasks": [
    {
      "taskId": 1001,
      "status": "done",
      "remark": "Completed"
    }
  ]
}
```

### Maintenance working day / machine details

Used by:

- `POST /api/mainatce/working-days`
- `POST /api/mainatce/machines`
- `PUT /api/mainatce/machine-details/tag/:tagNo`
- `PUT /api/mainatce/machine-details/:serialNo`

Working day:

```json
{
  "working_date": "2026-03-20",
  "day": "Thursday",
  "week_num": 3,
  "month": "March"
}
```

Machine create / update starter:

```json
{
  "serial_no": "MC-1001",
  "tag_no": "TAG-1001",
  "machine_name": "Rolling Machine",
  "department": "Maintenance",
  "division": "Mill"
}
```

## Store

Source:

- `src/store/src/controllers/indent.controller.js`
- `src/store/src/controllers/storeIndent.controller.js`
- `src/store/src/controllers/department.controller.js`
- `src/store/src/controllers/repairFollowup.controller.js`
- `src/store/src/controllers/settings.controller.js`
- `src/store/src/controllers/storeGRNApproval.controller.js`
- `src/store/src/controllers/vendorRateUpdate.controller.js`
- `src/store/src/controllers/threePartyApproval.controller.js`

### Store indent create

Used by:

- `POST /api/store/store-indent`

```json
{
  "timestamp": "2026-03-20T10:00:00.000Z",
  "indenterName": "Amit",
  "department": "Stores",
  "groupHead": "GM",
  "itemCode": "ITM001",
  "productName": "Bearing",
  "quantity": 10,
  "uom": "Nos",
  "specifications": "SKF 6205",
  "indentApprovedBy": "GM",
  "indentType": "Regular",
  "attachment": null
}
```

Approve store indent:

```json
{
  "indentNumber": "SI-0001",
  "itemCode": "ITM001",
  "vendorType": "LOCAL",
  "approvedQuantity": 10
}
```

### PostgreSQL indent create / status / indent number

Used by:

- `POST /api/store/indent`
- `PUT /api/store/indent/:requestNumber/status`
- `PATCH /api/store/indent/:requestNumber/indent-number`

Create:

```json
{
  "department": "Mechanical",
  "group_name": "Plant",
  "item_name": "Oil Seal",
  "required_qty": 5,
  "remark": "Urgent"
}
```

Update status:

```json
{
  "status": "APPROVED",
  "approved_by": "purchase_head",
  "remark": "Approved for procurement"
}
```

Bulk status update:

```json
{
  "items": [
    {
      "status": "APPROVED",
      "approved_by": "purchase_head"
    }
  ]
}
```

Update indent number:

```json
{
  "indent_number": "IND-2026-001",
  "actual_1": "2026-03-20T10:30:00"
}
```

### Department CRUD / store access patch

Used by:

- `POST /api/store/departments`
- `PUT /api/store/departments/:id`
- `DELETE /api/store/departments/:id`
- `PATCH /api/store/settings/users/:id/store-access`

Department:

```json
{
  "department": "Mechanical"
}
```

Store access patch:

```json
{
  "store_access": "YES"
}
```

### Repair followup

Used by:

- `POST /api/store/repair-followup`
- `PUT /api/store/repair-followup/:id`
- `PATCH /api/store/repair-followup/:id/stage2`

Starter payload:

```json
{
  "item_name": "Motor",
  "vendor_name": "ABC Engineering",
  "issue_detail": "Bearing noise",
  "status": "OPEN"
}
```

Stage 2 patch:

```json
{
  "stage2_status": "DONE",
  "stage2_remark": "Received after repair"
}
```

### Store GRN approval

Used by:

- `POST /api/store/store-grn-approval/send-bill`
- `PATCH /api/store/store-grn-approval/approve-gm/:grnNo`
- `PATCH /api/store/store-grn-approval/close-bill/:grnNo`

Send bill:

```json
{
  "grn_no": "GRN-1001",
  "bill_no": "BILL-88",
  "bill_date": "2026-03-20",
  "vendor_name": "XYZ Suppliers"
}
```

GM approval / close bill usually do not need a body. The `:grnNo` path param is the primary input.

### Vendor rate update / three-party approval

Used by:

- `POST /api/store/vendor-rate-update`
- `POST /api/store/three-party-approval/approve`

Vendor rate update:

```json
{
  "indentNumber": "IND-2026-001",
  "vendors": [
    {
      "vendorName": "ABC Traders",
      "rate": 1250,
      "paymentTerm": "30 Days"
    }
  ]
}
```

Three-party approval:

```json
{
  "indentNumber": "IND-2026-001",
  "vendorName": "ABC Traders",
  "rate": 1250,
  "paymentTerm": "30 Days"
}
```

## HRFMS

Source:

- `src/hrfms/src/controllers/employeeController.js`
- `src/hrfms/src/controllers/resumeController.js`
- `src/hrfms/src/controllers/ticketBookController.js`
- `src/hrfms/src/services/requestService.js`
- `src/hrfms/src/services/leaveRequestService.js`
- `src/hrfms/src/services/planeVisitorService.js`

### Employee create / update

Used by:

- `POST /api/hrfms/employees`
- `PUT /api/hrfms/employees/:id`

Use `multipart/form-data`.

Text fields:

- `employee_id` required
- `password` required
- optional: `email_id`, `department`, `designation`, `page_access`, `role`, `status`

File fields:

- `profile_img` single file
- `document_img` multiple files

Starter form fields:

```json
{
  "employee_id": "EMP1001",
  "password": "123456",
  "email_id": "emp1001@example.com",
  "department": "HR",
  "designation": "Executive",
  "page_access": ["dashboard", "requests"]
}
```

Verify token:

- `POST /api/hrfms/employees/verify-token`
- No special body required, only Bearer token

### Generic HR request

Used by:

- `POST /api/hrfms/requests`
- `PUT /api/hrfms/requests/:id`

Travel-related example:

```json
{
  "employee_code": "EMP1001",
  "request_status": "Open",
  "type_of_travel": "Official",
  "reason_for_travel": "Vendor visit",
  "from_city": "Raipur",
  "to_city": "Bhilai",
  "from_date": "2026-03-20",
  "to_date": "2026-03-21",
  "no_of_person": 1
}
```

### Leave request

Used by:

- `POST /api/hrfms/leave-requests`
- `PUT /api/hrfms/leave-requests/:id`

```json
{
  "employee_id": "EMP1001",
  "from_date": "2026-03-20",
  "to_date": "2026-03-22",
  "reason": "Medical leave",
  "mobilenumber": "9876543210",
  "urgent_mobilenumber": "9876500000",
  "approved_by_status": "PENDING"
}
```

### Plant visitor

Used by:

- `POST /api/hrfms/plant-visitors`
- `PUT /api/hrfms/plant-visitors/:id`

```json
{
  "person_name": "Vikas Sharma",
  "employee_code": "EMP1001",
  "reason_for_visit": "Site inspection",
  "no_of_person": 2,
  "from_date": "2026-03-20",
  "to_date": "2026-03-20",
  "requester_name": "Amit",
  "request_status": "PENDING"
}
```

### Resume create / update

Used by:

- `POST /api/hrfms/resumes`
- `PUT /api/hrfms/resumes/:id`

Use `multipart/form-data`.

File field:

- `resume`

Text starter fields:

```json
{
  "candidate_name": "Ravi Kumar",
  "candidate_email": "ravi@example.com",
  "mobile_no": "9876543210",
  "experience": "3",
  "previous_salary": 35000,
  "status": "applied"
}
```

### Ticket create / update

Used by:

- `POST /api/hrfms/tickets`
- `PUT /api/hrfms/tickets/:id`

Use `multipart/form-data`.

File field:

- `upload_bill_image`

Starter text fields:

```json
{
  "employee_id": "EMP1001",
  "travel_from": "Raipur",
  "travel_to": "Delhi",
  "charges": 2500,
  "per_ticket_amount": 2500,
  "total_amount": 2500
}
```

## O2D

Source:

- `src/o2d/controllers/client.controller.js`
- `src/o2d/controllers/followup.controller.js`
- `src/o2d/controllers/sizeMaster.controller.js`

### Client create / update

Used by:

- `POST /api/o2d/client`
- `PUT /api/o2d/client/:id`

Starter payload:

```json
{
  "client_name": "ABC Pipes",
  "contact_person": "Rohit",
  "mobile_no": "9876543210",
  "city": "Raipur",
  "state": "Chhattisgarh"
}
```

### Followup create / update

Used by:

- `POST /api/o2d/followup`
- `PUT /api/o2d/followup/:id`

```json
{
  "client_id": 1,
  "followup_date": "2026-03-20",
  "remark": "Customer requested revised quote",
  "status": "pending"
}
```

### Size master enquiry sync

Used by:

- `POST /api/o2d/size-master/enquiry`

Single or array payload is accepted.

```json
[
  {
    "item_type": "Pipe",
    "size": "4 inch",
    "thickness": "3 mm",
    "enquiry_date": "2026-03-20",
    "customer": "ABC Industries",
    "quantity": 12,
    "sales_executive": "Rahul"
  }
]
```

## Batchcode

Source:

- `src/batchcode/routes/auth.routes.js`
- `src/batchcode/validations/auth.validation.js`

### Register create / update

Used by:

- `POST /api/batchcode/auth/register`
- `PUT /api/batchcode/auth/register/:id`

Create:

```json
{
  "user_name": "batch_admin",
  "password": "123456",
  "role": "admin",
  "employee_id": "EMP1001",
  "email": "batch@example.com",
  "number": "9876543210",
  "department": "Production",
  "status": "active"
}
```

Update may include any subset of the same fields.

### Register delete / logout

Used by:

- `DELETE /api/batchcode/auth/register/:id`
- `POST /api/batchcode/auth/logout`

Delete does not require a body. Logout uses the Bearer token.

## Lead-To-Order

Source:

- `src/lead-to-order/controllers/auth.controller.js`
- `src/lead-to-order/controllers/users.controller.js`
- `src/lead-to-order/controllers/leadsController.js`
- `src/lead-to-order/controllers/quotation.controller.js`
- `src/lead-to-order/controllers/followup.controller.js`
- `src/lead-to-order/controllers/enquiryTrackerForm.controller.js`

### Auth create user / verify token

Used by:

- `POST /api/lead-to-order/auth/create-user`
- `POST /api/lead-to-order/auth/verify-token`

Create user:

```json
{
  "username": "crm_user",
  "password": "123456",
  "usertype": "user"
}
```

Verify-token endpoint is token-driven and normally does not need a custom body.

### User create / update

Used by:

- `POST /api/lead-to-order/users`
- `PUT /api/lead-to-order/users/:id`

```json
{
  "user_name": "crm_user",
  "password": "123456",
  "email_id": "crm@example.com",
  "number": "9876543210",
  "department": "CRM",
  "role": "user",
  "status": "active",
  "user_access": "CRM",
  "remark": "Created for sales team",
  "employee_id": "EMP1001",
  "page_access": "dashboard,followup",
  "system_access": "LEAD_TO_ORDER"
}
```

### Lead create

Used by:

- `POST /api/lead-to-order/leads`

```json
{
  "receiverName": "Amit",
  "scName": "Rahul",
  "source": "Website",
  "companyName": "ABC Industries",
  "phoneNumber": "9876543210",
  "salespersonName": "Rohit",
  "location": "Raipur",
  "email": "abc@example.com",
  "state": "Chhattisgarh",
  "address": "Industrial Area",
  "nob": "Pipes",
  "notes": "Hot lead"
}
```

### Enquiry-to-order / enquiry-tracker form

Used by:

- `POST /api/lead-to-order/enquiry-to-order`
- `POST /api/lead-to-order/enquiry-tracker/form`

Starter payload:

```json
{
  "company_name": "ABC Industries",
  "client_name": "Rohit",
  "client_contact_no": "9876543210",
  "state": "Chhattisgarh",
  "billing_address": "Industrial Area"
}
```

### Followup submit

Used by:

- `POST /api/lead-to-order/follow-up/followup`
- `POST /api/lead-to-order/followup/followup`

```json
{
  "leadNo": "LD-1001",
  "customer_say": "Need revised rate",
  "lead_status": "warm",
  "enquiry_received_status": "yes",
  "enquiry_received_date": "2026-03-20",
  "enquiry_approach": "phone",
  "project_value": 150000,
  "item_qty": [
    {
      "item": "Pipe",
      "qty": 10
    }
  ],
  "total_qty": 10,
  "next_action": "Send quotation",
  "next_call_date": "2026-03-22",
  "next_call_time": "11:00"
}
```

### Quotation create / upload PDF

Used by:

- `POST /api/lead-to-order/quotations/quotation`
- `POST /api/lead-to-order/quotations/upload-pdf`

Quotation starter:

```json
{
  "quotationNo": "QN-001",
  "quotationDate": "2026-03-20",
  "preparedBy": "Rahul",
  "companyName": "ABC Industries",
  "consigneeAddress": "Industrial Area",
  "contactName": "Rohit",
  "contactNo": "9876543210",
  "validity": "7 days",
  "paymentTerms": "Advance",
  "delivery": "2 weeks",
  "freight": "Extra",
  "taxes": "GST Extra",
  "items": [
    {
      "itemName": "Pipe",
      "qty": 10,
      "rate": 2500
    }
  ],
  "grandTotal": 25000
}
```

Upload PDF uses `multipart/form-data`:

- key: `pdf`

## Master

Source:

- `src/master/controllers/systemsController.js`
- `src/master/controllers/settingController.js`
- `src/master/routes/userRoutes.js`

### System create / update

Used by:

- `POST /api/master/systems`
- `PUT /api/master/systems/:id`

```json
{
  "system_name": "Document",
  "display_name": "Document Management",
  "status": "active"
}
```

Delete:

- no request body required

### User system access patch

Used by:

- `PATCH /api/master/settings/users/:id/system_access`

```json
{
  "system_access": "DOCUMENT"
}
```

### Employee image patch

Used by:

- `PATCH /api/master/users/:id/emp-image`

Use `multipart/form-data`:

- key: `emp_image`

## Gatepass

Source:

- `src/gatepass/controllers/requestController.js`
- `src/gatepass/controllers/personController.js`
- `src/gatepass/controllers/approveController.js`
- `src/gatepass/controllers/closePassController.js`

Note:

- `MASTER_API.md` lists request/person/approve/close endpoint families.
- Use the same payload patterns below for the mounted alias available in your environment.

### Person create / update

Used by:

- `POST /api/gatepass/person`
- `PUT /api/gatepass/person/:id`
- `POST /api/gatepass/persons`
- `PUT /api/gatepass/persons/:id`

```json
{
  "personToMeet": "HR Manager",
  "phone": "9876543210"
}
```

Delete person endpoints do not require a body.

### Gatepass request create

Used by:

- `POST /api/gatepass/request`
- `POST /api/gatepass/requests`

Use `multipart/form-data`.

Text fields:

```json
{
  "visitorName": "Ramesh",
  "mobileNumber": "9876543210",
  "visitorAddress": "Raipur",
  "purposeOfVisit": "Meeting",
  "personToMeet": "HR Manager",
  "dateOfVisit": "2026-03-20",
  "timeOfEntry": "10:30"
}
```

File field:

- `photoData`

Typical response:

```json
{
  "success": true,
  "visitorId": 101,
  "message": "Visit request created successfully"
}
```

### Approval / close patch

Used by:

- `PATCH /api/gatepass/approve/:id`
- `PATCH /api/gatepass/approvals/:id`
- `PATCH /api/gatepass/close/:id`
- `PATCH /api/gatepass/close-pass/:id`

Approval example:

```json
{
  "status": "APPROVED",
  "approvedBy": "security_admin"
}
```

Close example:

```json
{
  "status": "CLOSED",
  "closedBy": "security_admin"
}
```

## Document

Source:

- `src/document/routes/master.js`
- `src/document/controllers/document-controller/documentController.js`
- `src/document/controllers/loanController.js`
- `src/document/controllers/payment-fms-controller.js`
- `src/document/controllers/renewalController.js`
- `src/document/controllers/subscriptionController.js`
- `src/document/controllers/subscriptionApprovalController.js`
- `src/document/routes/subscription-pyament.routes.js`
- `src/document/controllers/userController.js`
- `src/document/controllers/settingsController.js`
- `src/document/controllers/documentShare.controller.js`

### Document master create / delete

Used by:

- `POST /api/document/master`
- `DELETE /api/document/master`

Create:

```json
{
  "company_name": "ABC Industries",
  "document_type": "Insurance",
  "category": "Renewal",
  "renewal_filter": true
}
```

Delete:

```json
{
  "company_name": "ABC Industries",
  "document_type": "Insurance",
  "category": "Renewal"
}
```

### Document create / bulk create / update

Used by:

- `POST /api/document/documents/create`
- `POST /api/document/documents/create-multiple`
- `PUT /api/document/documents/:id`

Single create:

```json
{
  "document_name": "Factory Insurance",
  "company_name": "ABC Industries",
  "document_type": "Insurance",
  "category": "Renewal",
  "renewal_date": "2026-12-31",
  "image": null
}
```

Bulk create:

```json
{
  "documents": [
    {
      "document_name": "Factory Insurance",
      "company_name": "ABC Industries",
      "document_type": "Insurance",
      "category": "Renewal"
    }
  ]
}
```

Update uses the same object shape with partial fields.

### Loan / foreclosure / NOC

Used by:

- `POST /api/document/loan`
- `PUT /api/document/loan/:id`
- `DELETE /api/document/loan/:id`
- `POST /api/document/loan/foreclosure/request`
- `POST /api/document/loan/noc`

Loan create / update:

```json
{
  "loan_name": "Vehicle Loan",
  "company_name": "ABC Industries",
  "loan_amount": 500000,
  "start_date": "2026-01-01",
  "end_date": "2028-01-01",
  "upload_document": null
}
```

Foreclosure request:

```json
{
  "loan_id": 1,
  "requested_by": "finance_user",
  "remark": "Need early closure"
}
```

NOC:

```json
{
  "loan_id": 1,
  "noc_status": "COLLECTED",
  "remark": "Original NOC received"
}
```

### Payment FMS

Used by:

- `POST /api/document/payment-fms/create`
- `PUT /api/document/payment-fms/:id`
- `DELETE /api/document/payment-fms/:id`
- `PATCH /api/document/payment-fms/approval/:id/process`
- `PATCH /api/document/payment-fms/make-payment/:id/process`
- `POST /api/document/payment-fms/tally-entry/process`

Create / update starter:

```json
{
  "request_no": "REQ-0001",
  "department": "Accounts",
  "vendor_name": "ABC Suppliers",
  "amount": 15000,
  "purpose": "Subscription renewal"
}
```

Approval patch:

```json
{
  "status": "approved",
  "stageRemarks": "Approved by accounts head"
}
```

Make payment patch:

```json
{
  "paymentType": "NEFT"
}
```

Tally entry bulk process:

```json
{
  "ids": [1, 2, 3]
}
```

### Renewal / subscription approval / subscription payment

Used by:

- `POST /api/document/renewal/submit`
- `POST /api/document/subscription-approvals/submit`
- `POST /api/document/subscription-payment/submit`

Renewal submit:

```json
{
  "subscription_no": "SUB-0001",
  "renewal_status": "approved",
  "approved_by": "admin",
  "price": 15000,
  "company_name": "ABC Industries",
  "subscriber_name": "Rahul",
  "subscription_name": "Trade Journal",
  "frequency": "Yearly",
  "end_date": "2027-03-31"
}
```

Subscription approval submit:

```json
{
  "subscriptionNo": "SUB-0001",
  "approval": "approved",
  "note": "Approved by department head",
  "approvedBy": "admin",
  "requestedOn": "2026-03-20",
  "companyName": "ABC Industries",
  "subscriberName": "Rahul",
  "subscriptionName": "Trade Journal",
  "price": 15000,
  "frequency": "Yearly",
  "purpose": "Reference"
}
```

Subscription payment submit:

```json
{
  "subscriptionNo": "SUB-0001",
  "paymentMethod": "NEFT",
  "transactionId": "TXN12345",
  "price": 15000,
  "startDate": "2026-04-01",
  "endDate": "2027-03-31",
  "reason": "Annual renewal",
  "insuranceDocument": null,
  "companyName": "ABC Industries",
  "subscriberName": "Rahul",
  "subscriptionName": "Trade Journal",
  "frequency": "Yearly",
  "purpose": "Reference"
}
```

### Subscription create / update

Used by:

- `POST /api/document/subscriptions/create`
- `PUT /api/document/subscriptions/update/:id`

```json
{
  "subscription_no": "SUB-0001",
  "company_name": "ABC Industries",
  "subscriber_name": "Rahul",
  "subscription_name": "Trade Journal",
  "price": 15000,
  "frequency": "Yearly",
  "purpose": "Reference"
}
```

### Document settings user access

Used by:

- `PUT /api/document/settings/users/:id/access`

```json
{
  "systems": ["subscription", "payment-fms"],
  "pages": ["dashboard", "history", "approvals"]
}
```

### Document users create / update / delete

Used by:

- `POST /api/document/users/create`
- `PUT /api/document/users/update/:username`
- `DELETE /api/document/users/delete/:username`

Create:

```json
{
  "username": "doc_admin",
  "name": "Document Admin",
  "email": "doc@example.com",
  "password": "123456",
  "role": "admin"
}
```

Update uses the same object shape with partial fields.

### Document share by WhatsApp

Used by:

- `POST /api/document/document-share/send`

```json
{
  "phone": "9876543210",
  "documentName": "Factory Insurance",
  "documentUrl": "https://example.com/file.pdf",
  "documentType": "Insurance",
  "category": "Renewal",
  "companyName": "ABC Industries",
  "needsRenewal": "Yes",
  "renewalDate": "2026-12-31",
  "message": "Please review the shared document"
}
```

## Final Note

- Use the examples in this file as starter payloads.
- Use the listed controller / service / validation files as implementation references.
- If you want the next step, this guide can be expanded into one section per write endpoint with field-by-field required / optional markers.
