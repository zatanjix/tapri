-- Random addresses for threads, so a shared link says nothing about how many posts exist or in
-- what order they were written. Additive: a new column, filled for existing posts, which keep
-- working at their old numeric addresses through a redirect.
alter table posts add column slug text;
update posts set slug = substr(md5(random()::text || clock_timestamp()::text || id::text), 1, 16) where slug is null;
alter table posts alter column slug set not null;
alter table posts alter column slug set default substr(md5(random()::text || clock_timestamp()::text), 1, 16);
create unique index posts_slug_idx on posts (slug);
