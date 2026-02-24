---
id: SCN-01
owasp_primary: 'A01:2025 - Broken Access Control'
owasp_secondary: []
---

# SCN-01: Track Order lets one user view another user’s order (IDOR)

## What should be true

If I am logged in as User B, I should not be able to view User A’s order details.

## What happened

User B was able to view User A’s order by using User A’s tracking link (order ID in the URL).

## How to reproduce (read-only)

Preconditions:

- Two users exist: User A and User B
- User A has placed an order
- Sessions are isolated (User A in normal window, User B in incognito)

Steps:

1. As User A, place an order.
2. Open the tracking page and copy the `id` value from the URL:
   `/#/track-result?id=<orderId>`
3. As User B (separate session), request:
   `GET /rest/track-order/<orderId>`

Example:

- `GET /rest/track-order/27bc-979c0f24ed9a3153`

## Expected result

The server rejects the request (401/403), or returns a safe response that does not reveal order details.

## Actual result

The server returns `200 OK` and includes order details for User A, such as:

- products purchased
- total price
- delivery status/ETA
- masked email (still identifies the owner)
- internal references (addressId, paymentId)

## Why this matters

Anyone who gets a tracking ID (shared link, screenshot, logs, guessing) can view another user’s purchase details.

## Likely root cause

The endpoint checks “does this order ID exist?” but does not check “is the requester allowed to see this order?”

## Suggested fix

Enforce authorization on `/rest/track-order/<orderId>`:

- require authentication (if appropriate)
- verify the order belongs to the authenticated user
- return 401/403 (or a safe generic response) when unauthorized

## Regression guard (test idea)

Given a User A orderId, when User B requests `/rest/track-order/<orderId>`, assert:

- status is 401/403
- response does not contain order details (products, totalPrice, addressId, paymentId)

## OWASP Top 10 (2025) Mapping

- Category: **A01:2025 - Broken Access Control**
- Rationale: IDOR allows an authenticated user to read another user’s order details without any ownership checks.
- Reference: https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/
