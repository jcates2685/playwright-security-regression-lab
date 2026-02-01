## Addresss Access Control Verification (Detail Endpoint)

- Endpoint: GET /api/Addresss/{id}
- Finding: Endpoint requires valid auth token and enforces user ownership.
- Evidence:
  - Cross-user request (User B requesting User A address ID) rejected (401/403)
- Note:
  - Early 200 response was traced to wrong auth context (token belonged to User A)
