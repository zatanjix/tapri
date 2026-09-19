create table categories (
  id          serial primary key,
  slug        text not null unique,
  name        text not null,
  description text not null,
  sort_order  int not null
);

insert into categories (slug, name, description, sort_order) values
  ('academics',      'Academics',      'Courses, grading, deadlines, TAs and academic committees.', 1),
  ('hostel-mess',    'Hostel & Mess',  'Food, rooms, WiFi, water, maintenance and hostel councils.', 2),
  ('wellbeing',      'Wellbeing',      'Stress, loneliness, pressure, and anything on your mind.', 3),
  ('harassment',     'Harassment',     'Harassment, ragging and situations that feel unsafe.', 4),
  ('administration', 'Administration', 'Rules, fees, offices and institute decisions.', 5),
  ('placements',     'Placements',     'Internships, placements and careers.', 6),
  ('general',        'General',        'Everything else.', 7);

create table posts (
  id           bigserial primary key,
  category_id  int not null references categories (id),
  account_id   uuid not null references accounts (id) on delete cascade,
  kind         text not null check (kind in ('grievance', 'conversation')),
  title        text not null,
  body         text not null,
  published_on timestamptz not null default now(),
  status       text not null default 'published' check (status in ('published', 'deleted', 'removed')),
  upvotes      int not null default 0,
  metoo        int not null default 0,
  reply_count  int not null default 0
);
create index posts_feed_idx on posts (status, published_on desc);
create index posts_category_idx on posts (category_id, status, published_on desc);

create table replies (
  id           bigserial primary key,
  post_id      bigint not null references posts (id) on delete cascade,
  parent_id    bigint references replies (id) on delete cascade,
  account_id   uuid not null references accounts (id) on delete cascade,
  body         text not null,
  published_on timestamptz not null default now(),
  status       text not null default 'published' check (status in ('published', 'deleted', 'removed')),
  upvotes      int not null default 0
);
create index replies_post_idx on replies (post_id);

create table votes (
  account_id  uuid not null references accounts (id) on delete cascade,
  target_type text not null check (target_type in ('post', 'reply')),
  target_id   bigint not null,
  primary key (account_id, target_type, target_id)
);

create table metoos (
  account_id uuid not null references accounts (id) on delete cascade,
  post_id    bigint not null references posts (id) on delete cascade,
  primary key (account_id, post_id)
);
