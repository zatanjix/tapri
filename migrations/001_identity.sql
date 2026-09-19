create table accounts (
  id          uuid primary key default gen_random_uuid(),
  secret_hash bytea not null unique,
  created_on  date not null default current_date,
  valid_until date not null,
  status      text not null default 'active' check (status in ('active', 'suspended', 'banned'))
);

create table sessions (
  token_hash bytea primary key,
  account_id uuid not null references accounts (id) on delete cascade,
  expires_at timestamptz not null
);
create index sessions_expires_idx on sessions (expires_at);

-- No account link, ever: the server must never be able to map an email to an account.
create table issuances (
  email_hmac bytea not null,
  semester   text not null,
  primary key (email_hmac, semester)
);

create table spent_tokens (
  token_hash bytea primary key,
  key_id     text not null
);
