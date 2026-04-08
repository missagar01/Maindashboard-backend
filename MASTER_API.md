# MASTER_API

Generated on: 2026-03-28T00:00:00.000Z

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
- Quick mount check: `/api/store/health`, `/api/document/health`, `/api/master/health`, `/api/hrfms/health`, `/api/gatepass/health`, `/api/checklist/health`, `/api/project/health`.
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

## Project APIs (16)

Note: Token required on all Project routes. Use shared login token in `Authorization: Bearer <TOKEN>`. Write endpoints with `auth.manager` require manager/admin access.

| Method | Endpoint |
|---|---|
| GET | `/api/project/health` |
| GET | `/api/projects` |
| POST | `/api/projects` |
| GET | `/api/work-areas/:projectId` |
| POST | `/api/work-areas` |
| GET | `/api/tasks` |
| GET | `/api/tasks/:structureId` |
| POST | `/api/tasks` |
| GET | `/api/logs/:activityId` |
| POST | `/api/logs` |
| GET | `/api/materials` |
| POST | `/api/materials` |
| POST | `/api/materials/inward` |
| POST | `/api/materials/consumption` |
| GET | `/api/materials/logs` |
| GET | `/api/analytics/operational-summary` |

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





