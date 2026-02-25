# security-lab

A small, local-only security testing lab built around intentionally vulnerable applications (starting with OWASP Juice Shop).

This repo is **not** a pentesting guide and does **not** target real systems. The focus is:

- security-flavored testing (abuse cases + invariants)
- root cause analysis (RCA) and clear writeups
- regression prevention (tests that encode “this must never happen”)
- a purple-team loop: **break → observe → explain → prevent → re-test**

## Scope and safety

- Targets run **only on localhost** in a disposable container.
- No scanning external hosts, no real-world exploitation.
- The purpose is learning and demonstrating professional testing and analysis.

## How to review this repo

Start here:

1. `docs/rca-cheat-sheet.md`
2. `TESTING.md` (explains test suites and expected failures)
3. `docs/scenarios/` (scenario writeups as they’re added)

## Scenarios and Tests

**Scenarios** (`docs/scenarios/`) describe security vulnerabilities found in the application. Each scenario documents what went wrong, how to reproduce it, and the OWASP category.

**Test cases** (`docs/test-cases/`) translate scenarios into automated checks. Each test case is linked to the scenario it guards against, ensuring regressions are caught early.

The workflow is: **find vulnerability → write scenario → create test case → prevent regression**.

## Project status

Active and evolving.

Current state:
- Local Juice Shop lab orchestration is in place.
- Multiple scenario docs and linked automated tests exist.
- Test strategy is split between:
  - evidence tests (`@evidence-pass`) that pass when vulnerable behavior is observed
  - secure-invariant tests (`@secure-invariant-fail`) that fail on vulnerable targets

Near-term focus:
- continue improving deterministic setup for stateful scenarios
- tighten scenario-to-test-case traceability and CI suite wiring
