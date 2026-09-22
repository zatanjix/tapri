-- Images on posts. Additive only: a new table. No account column and no timestamps: an image
-- belongs to a post, and the id is random (it is also the name of the stored file).
create table post_images (
  id       text     primary key,
  post_id  bigint   not null references posts (id) on delete cascade,
  position smallint not null check (position between 0 and 3),
  width    int      not null,
  height   int      not null,
  bytes    int      not null,
  unique (post_id, position)
);
