-- Official posts and replies from "Tapri" itself. Additive only: existing rows default to false.
alter table posts add column official boolean not null default false;
alter table replies add column official boolean not null default false;

-- The system account official content belongs to. Its secret hash is 32 zero bytes, which no
-- recovery key can ever hash to, so nobody can sign in as it. It is separate from every person's
-- account, so official posts are never linked to whoever wrote them.
insert into accounts (id, secret_hash, valid_until, status)
values ('00000000-0000-0000-0000-000000000001', decode(repeat('00', 32), 'hex'), '9999-12-31', 'active')
on conflict (id) do nothing;
