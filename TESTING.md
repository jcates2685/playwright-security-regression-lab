# Testing Strategy

This repo demonstrates security-focused testing against intentionally vulnerable apps running locally.

## Test suites

### 1) Vulnerability Evidence (Expected to Pass)

Tagged `@evidence-pass`, these tests document that vulnerable behavior is currently observable.
They pass when evidence of the vulnerability is captured.

Examples:

- insecure request design observed in UI/API traffic
- server returns known-bad error semantics for specific API-direct inputs

### 2) Secure Invariants (Expected to Fail on vulnerable targets)

Tagged `@secure-invariant-fail`, these tests assert the secure behavior a production system should enforce.
On intentionally vulnerable targets like Juice Shop, these are expected to fail until fixed.

Examples:

- user cannot access another user's order
- cross-user basket writes are rejected

## CI philosophy (future)

- PR CI runs only the expected-to-pass suites and stays green.
- Nightly runs both suites and publishes reports/artifacts.

## Handy commands

- `npm run test:evidence` -> run `@evidence-pass`
- `npm run test:invariants` -> run `@secure-invariant-fail`

## Test-user credentials

- Default lab-only passwords are defined for local use.
- Optional overrides: `USER_A_PASSWORD`, `USER_B_PASSWORD`, `USER_PW_MUTATOR_PASSWORD`.
- Safety guard: when defaults are in use, global setup refuses to run against non-local `LAB_BASE_URL`.
