# Testing Strategy

This repo demonstrates security-focused testing against intentionally vulnerable apps running locally.

## Test suites

### 1) Security Acceptance (Expected to Pass)
These tests validate baseline security behaviors and must pass in CI.

Examples:
- invalid login does not create a session
- logout invalidates the current session/token
- basic authorization boundaries that should be enforced

### 2) Known Vulnerabilities (Expected to Fail)
These tests encode security invariants that a real production application should enforce.
They may fail against OWASP Juice Shop because it is intentionally vulnerable.

Known-vulnerability tests will be marked explicitly in code (e.g., “expected failure”) and linked to scenario docs in `docs/scenarios/`.

## CI philosophy (future)
- PR CI runs only the “Expected to Pass” suite and stays green.
- Nightly runs both suites and publishes reports/artifacts.
