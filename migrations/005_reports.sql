create table reports (
  id          bigserial primary key,
  target_type text not null check (target_type in ('post', 'reply')),
  target_id   bigint not null,
  reason      text not null check (reason in ('hate', 'identifying', 'spam', 'danger', 'other')),
  note        text not null default '',
  reporter_id uuid not null references accounts (id) on delete cascade,
  reported_on timestamptz not null default now(),
  handled     boolean not null default false
);

-- One report per person per thing, and a cheap lookup for what still needs attention.
create unique index reports_once_idx on reports (reporter_id, target_type, target_id);
create index reports_open_idx on reports (handled, reported_on desc);
