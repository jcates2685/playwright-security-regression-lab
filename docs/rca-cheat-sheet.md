# Root Cause Analysis (RCA) Cheat Sheet

This cheat sheet is used to analyze functional bugs and security vulnerabilities
by focusing on system behavior, failed assumptions, and prevention.

---

## Step 0: Define the Invariant

What must never happen?

Examples:

- A user accesses another user's data
- An unauthenticated user performs a privileged action
- Input is executed as code
- Sensitive data is exposed

---

## Step 1: Observed Failure (Facts Only)

Describe exactly what happened. No theories.

---

## Step 2: Where the Decision Should Have Happened

Identify the most likely layer:

- UI
- API endpoint
- Service layer
- Authorization helper
- Database query

---

## Step 3: Root Cause Category

Most issues fall into one of these buckets:

- Missing check
- Wrong scope (role vs ownership)
- Wrong layer (UI-only vs backend)
- Incorrect trust (client input, token claims)
- Inconsistent logic (bypassed helper)

---

## Step 4: Root Cause Statement

Use this sentence:

> The system validated **_ but failed to validate _**.

Examples:

- validated authentication but not authorization
- validated object existence but not ownership

---

## Step 5: Why It Escaped Detection

Examples:

- single-user test data
- happy-path bias
- no abuse-case tests
- no regression guard

---

## Step 6: Prevention and Regression

Be specific:

- enforce checks at service layer
- centralize authorization logic
- add invariant-based automated test
- log and alert on violations
