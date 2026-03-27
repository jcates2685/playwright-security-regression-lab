# API Support Helpers

This folder contains thin domain-specific wrappers around Playwright `APIRequestContext`.

The goal is to centralize repeated API interaction patterns without hiding the exploit mechanics that make a security test understandable.

## What belongs here

- shared auth and session bootstrap helpers
- stable endpoint wrappers such as account, basket, and order APIs
- response parsing or normalization that would otherwise be repeated across specs

## What should stay in scenario specs

- malformed or ambiguous payloads
- exploit-specific parameter combinations
- assertions that explain why a behavior is a security finding

## Design rules

- prefer small domain clients over one generic API client
- prefer `APIRequestContext` for API tests
- keep method names descriptive and boring
- keep security-relevant payload construction visible in the spec when that shape is part of the evidence

Example:

- `basket-api.ts` owns snapshot reads and standard basket item mutations
- `scn-04-ambiguous-parameters-cross-user-basket.spec.ts` still builds the duplicate-`BasketId` body inline
