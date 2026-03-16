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

- `DELETE /api/master/systems/:id`
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
