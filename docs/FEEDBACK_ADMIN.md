# Parent feedback and super-admin operations

The feedback API accepts authenticated parent accounts only. A `super_admin`
account can read the feedback inbox but cannot use parent-only routes. Feedback
is stored in PostgreSQL for the in-app super-admin inbox. No email delivery is
used. Replaying the same `clientRequestId` with the same content
returns the original record; reusing it with different content is rejected.

The same dashboard includes a read-only registered-user directory. The
`GET /api/admin/users` endpoint is protected by the live-database
`super_admin` guard, uses opaque cursor pagination, and returns only `email`,
`role`, and `createdAt`. It never returns password hashes, student records,
subscription fields, or bulk-export data. API responses use `Cache-Control:
no-store`, and every request remains covered by the existing access log.

## Bootstrap a super admin

The bootstrap command accepts no command-line arguments and never accepts a
password environment variable. For a new account, set `SUPER_ADMIN_EMAIL` and
point `SUPER_ADMIN_PASSWORD_FILE` at a protected file. Build the API image/code,
then run the following command in a private API container/session:

```text
npm run bootstrap:super-admin
```

If `SUPER_ADMIN_PASSWORD_FILE` is omitted, the command requires a private
interactive terminal and reads the password without echoing it. On Unix, a
password file with group/other permissions is rejected.

The create mode fails if the account already exists. To promote an existing
parent without reading or changing its password, set
`SUPER_ADMIN_PROMOTE_EXISTING=true`; promotion mode fails if the account does
not exist. Never run the bootstrap automatically during container startup.

## Release checks

Run type checking, focused feedback/auth tests, the full test suite and the
application build. When a dedicated loopback `exam_qa*` PostgreSQL database is
available, `server/feedbackStore.integration.test.ts` verifies the additive
migrations, constraints, idempotency and persisted rate limit. Do not point that
test at production.
