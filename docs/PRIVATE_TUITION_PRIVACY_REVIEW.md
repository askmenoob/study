# Tuition access and retention review

Technical review, 14 October 2026. This records software behavior and open decisions; it is not a legal compliance determination.

| Data | Access and use | Deletion / retention |
| --- | --- | --- |
| Child profile and practice history | Guardian owns it; scoped study session identifies one child | Existing guardian deletion flow remains; tuition foreign keys must not block it |
| Booking and attendance | Original/current guardian, its scoped child, assigned active teacher | Deleted with child; associated booking events and in-app notifications cascade. Aggregate slots do not contain child identity |
| Homework instructions and rubric | Owned active teacher; related active class/session learners | Class material remains teacher-authored. Guardian deletion removes the child's submission, not the class assignment |
| Homework answer, mark and feedback | Scoped child/guardian; owning active teacher | Submission deleted with child. Version checks protect updates. Audit retains action, actor and a now-unlinked random entity ID; no answer/name is copied into the audit |
| Teacher profile | Public safe projection to authenticated guardians, active approved teachers only | Contacts and full legal identity excluded. Published qualifications/experience require an admin review note |
| Teacher application and identity-review note | Applicant and super admin | Existing manual verification workflow; no new upload of identity documents. Business retention period remains unset |
| Safety reports and feedback | Submitting guardian, super admin; never public or learner-wide | Existing scoped support records. Personal pupil information discouraged. Retention period remains unset |
| AI homework context | Existing free AI boundary after live ownership/class checks | Filter known student name and common contact identifiers; replace internal homework source ID in provider references. Do not send account/session IDs or other children’s records. Existing tutor-log retention remains unchanged |
| ToyyibPay data | Sandbox adapter only, no active checkout | Bill creation uses order/reference and exact cents; no child name/contact fields. Payment ledger/tax retention is not yet implemented |

## Evidence and controls

- Parent-only booking API, teacher-owned mutation APIs, scoped student-only answer submission and super-admin-only profile publication.
- Live user-role and teacher-status checks protect newly introduced store operations. Suspended teachers cannot publish slots, accept requests, assign/review homework or retain learner access through public slot listing.
- Pending bookings reserve capacity and student time. Profile/slot/student locks serialize concurrent requests. Reusing a request key with another child/slot is a conflict.
- A historical single tuition booking cannot reveal future class homework. Ended/revoked study-session checks remain in the shared authentication hook.
- No pupil PII in directory projections. Unexpected tuition errors expose stable codes and exclude database detail from new route logs.
- Child-deletion regression is tested with real PostgreSQL, including booking, attendance and homework records. No automated purge or speculative retention duration is introduced.

## Decisions still required

The operator must define retention periods for support reports, application evidence, tutor logs, pseudonymous learning audits and future financial records; specify the person responsible for access/deletion requests; and determine how backup rotation meets the selected policy. Existing backups are protected and recovery-tested, but older backup copies are not erased by a child deletion. No global purge is authorized by this implementation.

Consent for booking is versioned and recorded. Teacher privacy attestation is stored for homework. External email/WhatsApp notifications need separately recorded channel consent and provider configuration before delivery. Third-party video and payment provider data flows remain disabled until their configuration and acceptance checks are available.
