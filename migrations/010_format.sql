-- Markdown. Additive only: everything written before this is marked 'plain' and keeps rendering
-- exactly as it did. New posts and replies are written as 'markdown'.
alter table posts add column format text not null default 'plain' check (format in ('plain', 'markdown'));
alter table replies add column format text not null default 'plain' check (format in ('plain', 'markdown'));
