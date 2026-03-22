# Fuel Auto-Approval API Documentation

## Overview

This document describes the auto-approval system for fuel requests. Contractors can request fuel through a self-service flow, and the system automatically approves or rejects based on configured rules.

## Architecture

```
Contractor → Request Fuel → Auto-Approval Logic → Unique Code → Pump Validates → Fill & Log
```

### Auto-Approval Rules

The system checks these conditions before approving:

1. **Vehicle Validation**: Vehicle exists, belongs to contractor, and is active
2. **Pump Authorization**: Selected pump is in contractor's approved list
3. **Auto-Approval Enabled**: Feature toggle is ON for contractor
4. **Monthly Budget**: Remaining budget >= estimated amount
5. **Per-Request Limits**: Amount <= max amount AND liters <= max liters
6. **Daily Frequency**: Fills today < max fills per vehicle per day
7. **Time Between Fills**: Hours since last fill >= minimum hours

If any check fails → **Manual Review Required**
If all checks pass → **Auto-Approved with Unique Code**

---

## API Endpoints

### 1. Request Fuel (Auto-Approval)

**POST** `/api/contractor/fuel-requests`

Submit a fuel request for auto-approval validation.

#### Request Body

```json
{
  "vehicle_id": "uuid",
  "pump_id": "uuid",
  "requested_liters": 50,
  "requested_notes": "Optional notes"
}
```

#### Validation Rules

- `vehicle_id`: Must be valid UUID
- `pump_id`: Must be valid UUID
- `requested_liters`: 0.01 - 500 liters
- `requested_notes`: Max 500 characters (optional)

#### Response (Auto-Approved)

```json
{
  "success": true,
  "approved": true,
  "approval": {
    "id": "approval-uuid",
    "approval_code": "FA-260320-0001",
    "max_amount": 5000,
    "max_liters": 50,
    "valid_until": "2026-03-21T12:00:00Z",
    "vehicle": {
      "vehicle_number": "KA01AB1234",
      "vehicle_type": "Truck"
    },
    "pump": {
      "pump_name": "Indian Oil - Koramangala",
      "address": "123, 80 Feet Road",
      "city": "Bangalore",
      "contact_person": "Rajesh Kumar",
      "contact_phone": "9876543210"
    }
  },
  "message": "Fuel request auto-approved. Share the approval code with your driver."
}
```

#### Response (Rejected - Budget Exceeded)

```json
{
  "success": false,
  "approved": false,
  "reason": "Insufficient monthly budget. Remaining: Rs 2000, Required: Rs 5000"
}
```

#### Response (Rejected - Daily Limit)

```json
{
  "success": false,
  "approved": false,
  "reason": "Daily limit reached. Maximum 1 fill(s) per vehicle per day."
}
```

#### Response (Rejected - Too Soon)

```json
{
  "success": false,
  "approved": false,
  "reason": "Too soon since last fill. Please wait 8.5 more hours."
}
```

#### Error Responses

| Status | Error |
|--------|-------|
| 400 | Invalid request body (validation error) |
| 401 | Not authenticated |
| 404 | Contractor profile not found |
| 500 | Internal server error |

---

### 2. List Fuel Requests

**GET** `/api/contractor/fuel-requests?status=pending&vehicle_id=xxx&limit=20&offset=0`

List all fuel approvals for the authenticated contractor.

#### Query Parameters

- `status` (optional): Filter by status (`pending`, `filled`, `expired`, `cancelled`)
- `vehicle_id` (optional): Filter by vehicle UUID
- `limit` (optional): Results per page (default: 50)
- `offset` (optional): Pagination offset (default: 0)

#### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "approval-uuid",
      "approval_code": "FA-260320-0001",
      "vehicle_id": "vehicle-uuid",
      "pump_id": "pump-uuid",
      "max_amount": 5000,
      "max_liters": 50,
      "valid_from": "2026-03-20T12:00:00Z",
      "valid_until": "2026-03-21T12:00:00Z",
      "status": "pending",
      "request_type": "contractor_requested",
      "auto_approved": true,
      "requested_notes": "Urgent project delivery",
      "filled_at": null,
      "filled_quantity": null,
      "filled_amount": null,
      "pump_notes": null,
      "created_at": "2026-03-20T12:00:00Z",
      "vehicles": {
        "vehicle_number": "KA01AB1234",
        "vehicle_type": "Truck"
      },
      "fuel_pumps": {
        "pump_name": "Indian Oil - Koramangala",
        "city": "Bangalore"
      }
    }
  ],
  "pagination": {
    "total": 45,
    "limit": 50,
    "offset": 0
  }
}
```

---

### 3. Get Fuel Settings

**GET** `/api/contractor/fuel-settings`

Get fuel settings and monthly budget status.

#### Response

```json
{
  "success": true,
  "data": {
    "settings": {
      "monthly_fuel_budget": 50000,
      "per_request_max_amount": 10000,
      "per_request_max_liters": 100,
      "max_fills_per_vehicle_per_day": 1,
      "min_hours_between_fills": 12,
      "auto_approve_enabled": true
    },
    "budget_status": {
      "budget": 50000,
      "spent": 15000,
      "remaining": 35000
    },
    "approved_pumps_count": 5
  }
}
```

#### Response (No Settings Configured)

```json
{
  "success": true,
  "data": {
    "settings": null,
    "budget_status": {
      "budget": 0,
      "spent": 0,
      "remaining": 0
    },
    "message": "Fuel settings not configured. Please contact admin."
  }
}
```

---

### 4. Get Approved Pumps

**GET** `/api/contractor/approved-pumps`

List all fuel pumps approved for this contractor.

#### Response

```json
{
  "success": true,
  "data": [
    {
      "approval_id": "contractor-pump-uuid",
      "pump_id": "pump-uuid",
      "id": "pump-uuid",
      "pump_name": "Indian Oil Petrol Pump - Koramangala",
      "address": "123, 80 Feet Road, Koramangala 4th Block",
      "city": "Bangalore",
      "state": "Karnataka",
      "pincode": "560034",
      "contact_person": "Rajesh Kumar",
      "contact_phone": "9876543210",
      "contact_email": "koramangala@indianoil.in"
    }
  ]
}
```

---

## Approval Code Format

**Format**: `FA-DDMMYY-NNNN`

**Examples**:
- `FA-260320-0001` → First fuel approval on 26th March 2020
- `FA-260320-0042` → 42nd fuel approval on 26th March 2020

**Components**:
- `FA`: Fuel Approval prefix
- `DDMMYY`: Date in Day-Month-Year format
- `NNNN`: Sequential number (resets daily)

**Validation**: Pump owner validates this code before filling fuel

---

## Approval Status Flow

```
pending → filled
        → expired (if not used within validity period)
        → cancelled (manual cancellation)
```

### Status Definitions

| Status | Description |
|--------|-------------|
| `pending` | Approval issued, waiting for fuel fill |
| `filled` | Fuel filled and logged by pump |
| `expired` | Approval not used within validity period (24 hours) |
| `cancelled` | Cancelled by contractor or admin |

---

## Default Settings

When a contractor is onboarded, these defaults are applied:

```javascript
{
  monthly_fuel_budget: 50000,              // Rs 50,000/month
  per_request_max_amount: 10000,           // Rs 10,000/request
  per_request_max_liters: 100,             // 100L/request
  max_fills_per_vehicle_per_day: 1,        // 1 fill/vehicle/day
  min_hours_between_fills: 12,             // 12 hours minimum
  auto_approve_enabled: true               // Auto-approval ON
}
```

Admins can customize these per contractor.

---

## Example Workflows

### Workflow 1: Successful Auto-Approval

```javascript
// 1. Contractor requests fuel
POST /api/contractor/fuel-requests
{
  "vehicle_id": "vehicle-123",
  "pump_id": "pump-456",
  "requested_liters": 50
}

// 2. System validates all rules → PASS
// 3. Response with approval code
{
  "approved": true,
  "approval": {
    "approval_code": "FA-260320-0001",
    "max_amount": 5000,
    "max_liters": 50,
    "valid_until": "2026-03-21T12:00:00Z"
  }
}

// 4. Contractor shares code with driver
// 5. Driver goes to pump, provides code
// 6. Pump validates code in their dashboard
// 7. Pump fills fuel (50L max, Rs 5000 max)
// 8. Pump logs filled amount in dashboard
```

### Workflow 2: Rejected (Budget Exceeded)

```javascript
// 1. Contractor requests fuel
POST /api/contractor/fuel-requests
{
  "vehicle_id": "vehicle-123",
  "pump_id": "pump-456",
  "requested_liters": 150  // Needs Rs 15,000
}

// 2. System checks monthly budget
// Spent: Rs 48,000, Budget: Rs 50,000, Remaining: Rs 2,000
// Required: Rs 15,000 → FAIL

// 3. Response with rejection
{
  "approved": false,
  "reason": "Insufficient monthly budget. Remaining: Rs 2000, Required: Rs 15000"
}

// 4. Contractor must wait for next month OR contact admin for budget increase
```

### Workflow 3: Rejected (Daily Limit)

```javascript
// 1. Contractor already filled fuel for this vehicle today
// 2. Tries to request again
POST /api/contractor/fuel-requests
{
  "vehicle_id": "vehicle-123",
  "pump_id": "pump-456",
  "requested_liters": 50
}

// 3. System checks daily frequency
// Fills today: 1, Max allowed: 1 → FAIL

// 4. Response
{
  "approved": false,
  "reason": "Daily limit reached. Maximum 1 fill(s) per vehicle per day."
}

// 5. Contractor must wait until tomorrow OR contact admin for exception
```

---

## Frontend Integration

### Step 1: Fetch Settings & Budget

```typescript
const response = await fetch('/api/contractor/fuel-settings');
const { data } = await response.json();

console.log(`Budget: Rs ${data.budget_status.budget}`);
console.log(`Spent: Rs ${data.budget_status.spent}`);
console.log(`Remaining: Rs ${data.budget_status.remaining}`);
```

### Step 2: Fetch Approved Pumps

```typescript
const response = await fetch('/api/contractor/approved-pumps');
const { data: pumps } = await response.json();

// Display pump dropdown
<select>
  {pumps.map(pump => (
    <option key={pump.pump_id} value={pump.pump_id}>
      {pump.pump_name} - {pump.city}
    </option>
  ))}
</select>
```

### Step 3: Submit Fuel Request

```typescript
const response = await fetch('/api/contractor/fuel-requests', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    vehicle_id: selectedVehicle,
    pump_id: selectedPump,
    requested_liters: 50,
  }),
});

const result = await response.json();

if (result.approved) {
  // Show approval code to user
  alert(`Approved! Code: ${result.approval.approval_code}`);
} else {
  // Show rejection reason
  alert(`Rejected: ${result.reason}`);
}
```

### Step 4: View Past Requests

```typescript
const response = await fetch('/api/contractor/fuel-requests?status=pending');
const { data: requests } = await response.json();

// Display table of pending approvals
requests.forEach(req => {
  console.log(`Code: ${req.approval_code}, Valid Until: ${req.valid_until}`);
});
```

---

## Security

### Authentication
- All endpoints require Clerk authentication
- Contractor ID resolved from Clerk user token
- Row Level Security (RLS) on database enforces contractor isolation

### Validation
- All inputs validated with Zod schemas
- UUID validation for IDs
- Numeric range validation for liters
- Auto-approval logic prevents budget/limit bypass

### Rate Limiting (Future)
- TODO: Add rate limiting per contractor
- Suggested: Max 10 requests per minute

---

## Testing Checklist

### Manual Testing

- [ ] Request fuel with valid data → auto-approved
- [ ] Request exceeding monthly budget → rejected
- [ ] Request exceeding per-request limit → rejected
- [ ] Request second fill same day → rejected (if max=1)
- [ ] Request within 12 hours of last fill → rejected
- [ ] Request for unauthorized pump → rejected
- [ ] Request for inactive vehicle → rejected
- [ ] View settings shows correct budget status
- [ ] View approved pumps shows all pumps
- [ ] View fuel requests shows all with correct status

### Edge Cases

- [ ] Settings not configured → friendly error
- [ ] No approved pumps → empty list
- [ ] Approval code uniqueness (test 100+ codes same day)
- [ ] Concurrent requests (2 requests at same time)
- [ ] Timezone handling (validity period)

---

## Next Steps

1. **Contractor UI** - Create request fuel page (/dashboard/contractor/fuel/request)
2. **Pump Dashboard** - Create pump owner portal to validate codes
3. **Admin Configuration** - Create UI to manage settings per contractor
4. **Analytics** - Add fuel spend analytics dashboard
5. **Notifications** - Send WhatsApp/email on approval/fill

---

## Database Tables Reference

### fuel_approvals

Primary table storing all approval records.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| approval_code | VARCHAR(50) | Unique code (FA-DDMMYY-NNNN) |
| vehicle_id | UUID | References vehicles table |
| contractor_id | UUID | References contractors table |
| pump_id | UUID | References fuel_pumps table |
| max_amount | DECIMAL | Maximum amount in Rs |
| max_liters | DECIMAL | Maximum liters allowed |
| valid_from | TIMESTAMPTZ | Start of validity period |
| valid_until | TIMESTAMPTZ | End of validity period (24h) |
| status | ENUM | pending/filled/expired/cancelled |
| auto_approved | BOOLEAN | True if auto-approved |
| filled_at | TIMESTAMPTZ | When fuel was filled (null if pending) |
| filled_quantity | DECIMAL | Actual liters filled |
| filled_amount | DECIMAL | Actual amount paid |

### contractor_fuel_settings

Settings and limits per contractor.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| contractor_id | UUID | - | Primary key |
| monthly_fuel_budget | DECIMAL | 50000 | Rs/month |
| per_request_max_amount | DECIMAL | 10000 | Rs/request |
| per_request_max_liters | DECIMAL | 100 | Liters/request |
| max_fills_per_vehicle_per_day | INT | 1 | Fills/vehicle/day |
| min_hours_between_fills | INT | 12 | Hours between fills |
| auto_approve_enabled | BOOLEAN | true | Auto-approval toggle |

---

## FAQ

**Q: Can a contractor request fuel for any pump?**
A: No, only pumps in their approved list.

**Q: What happens if pump fills less than approved amount?**
A: Pump logs actual filled amount. Contractor charged for actual, not max.

**Q: Can approval be cancelled after creation?**
A: Yes, via admin dashboard (future feature).

**Q: How long is approval code valid?**
A: 24 hours by default.

**Q: What if monthly budget runs out?**
A: All requests rejected until next month OR admin increases budget.

**Q: Can settings be changed mid-month?**
A: Yes, admin can adjust anytime. New rules apply immediately.

**Q: What if auto-approval is disabled?**
A: All requests go to admin for manual review (future feature).
