# CloudShield API Error Contract

This table documents the stable error codes returned by the Flask error handlers in `server.py` and route blueprints.

## Error Codes

| Error Code | HTTP Status | Meaning | Client Action |
|---|---|---|---|
| `VALIDATION_ERROR` | 400 | Request payload failed Pydantic schema validation. | Highlight the invalid fields returned in `details` and ask the user to correct input before retrying. |
| `DUPLICATE_EMAIL` | 409 | Email already registered within this organization. | Show "email already in use" message; do not retry with the same address. |
| `INVALID_REQUEST` | 400 | Route rejected the request due to a semantic error (e.g., invalid ID format). | Parse `details` for a human-readable explanation and present it to the user. |
| `BAD_JSON` | 400 | Request body could not be parsed as valid JSON. | Ensure `Content-Type: application/json` and that the body is well-formed JSON. |
| `DB_UNAUTHORIZED` | 403 | Database rejected the operation due to insufficient privileges. | Surface as a generic permissions error; do not retry automatically. |
| `DB_OPERATION_FAILURE` | 500 | Database operation failed for a non-auth reason. | Show generic server error; log `request_id`; allow user to retry once. |
| `RATE_LIMITED` | 429 | Request rate exceeded the configured limit for this endpoint. | Back off and retry using exponential backoff; do not hammer the endpoint. |
| `INTERNAL_ERROR` | 500 | Unhandled server-side failure. | Show a generic error message; log `request_id`; allow safe retry. |
| `BILLING_PROVIDER_ERROR` | 400 | Upstream Stripe API call failed. | Inform the user the billing operation failed; offer a manual retry. |
| `BAD_WEBHOOK_SIGNATURE` | 400 | Stripe webhook HMAC signature verification failed. | Verify the webhook signing secret is correct; check Stripe dashboard for delivery logs. |
| `BAD_REQUEST` | 400 | Content-Type is not `application/json` on a write request. | Set `Content-Type: application/json` header and resend. |
| `HTTP_401` | 401 | Authentication failed or Bearer token is missing/expired. | Re-authenticate and retry with a fresh token. |
| `HTTP_403` | 403 | Authenticated but not authorized for this resource or action. | Hide or disable the forbidden action; prompt for elevated access if needed. |
| `HTTP_404` | 404 | Requested resource or route was not found. | Verify the identifier/URL; show a not-found message to the user. |
| `HTTP_405` | 405 | HTTP method not allowed for this endpoint. | Use the correct HTTP method documented for that route. |
| `HTTP_<N>` | N | Generic HTTP error not covered by a specific handler above. | Handle as the corresponding HTTP status code; `details` contains the werkzeug description. |

## Response Shape

All error responses share this JSON envelope:

```json
{
  "error": "Human-readable summary",
  "code": "MACHINE_READABLE_CODE",
  "details": "Additional context or validation errors",
  "request_id": "uuid-for-log-correlation"
}
```

- **`code`** — stable, machine-readable string from the table above; safe to `switch` on in client code.
- **`details`** — may be a string, list of Pydantic error dicts (`VALIDATION_ERROR`), or `null`.
- **`request_id`** — echoed from the `X-Request-ID` request header (or server-generated); include this in bug reports.
- **`error`** — duplicates `message` in route-level responses for backward compatibility; prefer `code` for branching logic.

## Per-Route Rate Limits

| Route | Limit |
|---|---|
| `POST /api/auth/signup` | 5 requests / minute per IP |
| `POST /api/auth/login` | 10 requests / minute per IP |
| All other routes | 200 requests / minute, 1000 requests / hour (default) |
