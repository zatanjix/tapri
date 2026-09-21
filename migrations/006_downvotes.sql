-- Downvotes. Additive only: every existing vote was an upvote, so the new direction column
-- defaults to +1 and the new counters default to 0. Nothing existing is rewritten.
alter table votes add column value smallint not null default 1 check (value in (-1, 1));
alter table posts add column downvotes int not null default 0;
alter table replies add column downvotes int not null default 0;
