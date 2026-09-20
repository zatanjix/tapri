-- In-flight email verifications. Short-lived: deleted on success, lockout or expiry.
-- The email address itself is never stored; only the same keyed hash used by issuances.
create table verifications (
  id          text primary key,
  email_hmac  bytea not null,
  semester    text not null,
  blinded_msg bytea not null,
  otp_hash    bytea not null,
  attempts    int not null default 0,
  expires_at  timestamptz not null
);
create index verifications_email_idx on verifications (email_hmac);
create index verifications_expiry_idx on verifications (expires_at);
