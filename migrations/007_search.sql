-- Full-text search over posts. Additive only: a generated column Postgres keeps in step with
-- every insert and edit (titles weighted above bodies), and an index to make lookups fast.
alter table posts add column search tsvector generated always as (
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(body, '')), 'B')
) stored;

create index posts_search_idx on posts using gin (search);
