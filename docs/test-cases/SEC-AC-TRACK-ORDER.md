# Test Case: Prevent Cross-User Access to Order Tracking

## Test ID

SEC-AC-TRACK-ORDER

## Category

Security / Access Control

## Related Scenario

SCN-01-track-order-idor

---

## Purpose

Verify that a user cannot view another user’s order details by supplying a valid order tracking ID that does not belong to them.

This test ensures enforcement of object-level authorization on the order tracking endpoint.

---

## Security Invariant

A user must only be able to view order details for orders they own.

---

## Preconditions

- Two user accounts exist:
    - **User A**
    - **User B**
- Sessions are isolated (e.g., separate browser profiles or incognito window)
- User A has successfully placed at least one order
- The order tracking ID for User A’s order is known

---

## Test Data

- `orderId_A`: Tracking ID for an order placed by User A

---

## Test Steps

### Step 1 – Confirm identity (control)

1. Log in as **User A**
2. Request:
    - `GET /rest/user/whoami`
3. Confirm the response identifies User A

---

### Step 2 – Positive control (expected pass)

1. While logged in as **User A**, request:
    - `GET /rest/track-order/{orderId_A}`
2. Observe the response

**Expected Result:**

- HTTP status is **200 OK**
- Response includes order details such as:
    - product list
    - total price
    - delivery status

---

### Step 3 – Cross-user access attempt (security check)

1. Log in as **User B** in a separate session
2. Request:
    - `GET /rest/track-order/{orderId_A}`

**Expected Result:**

- HTTP status is **401 Unauthorized**, **403 Forbidden**, or **404 Not Found**
- Response does **not** include:
    - product details
    - pricing information
    - addressId
    - paymentId
    - any order-specific data

---

## Actual Result (Observed)

- HTTP status: **200 OK**
- Full order details for User A were returned while authenticated as User B

---

## Security Impact

- Unauthorized disclosure of another user’s purchase history
- Exposure of order metadata and internal references
- Tracking IDs may be shared, logged, or guessed, enabling abuse at scale

---

## Likely Root Cause

The backend validates that the order exists but does not verify that the authenticated user is authorized to view the order.

---

## Suggested Remediation

- Enforce ownership checks on `/rest/track-order/{orderId}`
- Require authentication (if appropriate for tracking)
- Validate that the order belongs to the requesting user
- Return a safe error response for unauthorized access

---

## Regression Value

This test should be retained as a regression guard to ensure:

- future changes do not reintroduce cross-user order exposure
- access control rules are consistently enforced on tracking endpoints

---

## Automation Notes (Future)

- Can be automated at the API layer
- Requires deterministic test data seeding:
    - user creation
    - order placement
    - capture of `orderId`
- Suitable for nightly runs initially, then CI once stable
