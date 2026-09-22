-- Following threads. Additive only: a new table. "New replies" is the post's reply count minus
-- seen_replies, so Tapri records how many replies you've seen, never when you read anything.
create table follows (
  account_id   uuid   not null references accounts (id) on delete cascade,
  post_id      bigint not null references posts (id) on delete cascade,
  seen_replies int    not null default 0,
  primary key (account_id, post_id)
);
create index follows_post_idx on follows (post_id);
