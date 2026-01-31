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

## Project status
Early scaffold. Next milestone: bring up Juice Shop via Docker Compose and add the first “expected-to-pass” security hygiene test.
