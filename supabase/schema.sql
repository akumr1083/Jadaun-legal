-- =========================================================
-- Jadaun Legal — careers application schema
-- ---------------------------------------------------------
-- Run this once in the Supabase SQL Editor.
--
-- Security model:
--   * RLS is enabled and no anon/authenticated policies exist.
--   * The public form never talks to Postgres or Storage directly.
--   * The submit-application Edge Function uses the service role
--     to upload the CV and insert the row.
--   * The resumes bucket is private. The firm reviews candidates
--     in the Supabase dashboard (Table Editor + Storage), which
--     is authenticated and bypasses RLS.
-- =========================================================

create extension if not exists "pgcrypto";

create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  client_token text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  full_name text not null,
  email text not null,
  mobile text not null,
  city text not null,

  position text not null check (
    position in (
      'Internship',
      'Jr. Legal Associates',
      'Filing/Appearing Counsel',
      'Clerk',
      'Administrator',
      'Steno/Typist'
    )
  ),
  qualification text not null,
  college text,
  graduation_year text,
  experience text,
  current_organization text,

  cover_letter text,
  skills text,
  notice_period text,

  resume_path text not null,
  resume_name text not null,
  resume_type text,
  resume_size bigint,

  status text not null default 'new' check (
    status in ('new', 'reviewing', 'shortlisted', 'interview', 'rejected', 'hired')
  ),
  internal_notes text,
  source text default 'careers-page',
  ip_hash text,
  user_agent text
);

comment on table public.job_applications is
  'Careers applications submitted through the Jadaun Legal website. Candidate data and resumes are private.';
comment on column public.job_applications.resume_path is
  'Object path inside the private resumes storage bucket.';

create index if not exists job_applications_created_at_idx
  on public.job_applications (created_at desc);
create index if not exists job_applications_position_idx
  on public.job_applications (position, created_at desc);
create index if not exists job_applications_email_idx
  on public.job_applications (lower(email));
create index if not exists job_applications_status_idx
  on public.job_applications (status, created_at desc);
create index if not exists job_applications_ip_hash_idx
  on public.job_applications (ip_hash, created_at desc);

-- Keep updated_at accurate when the firm changes a status or note.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists job_applications_touch_updated_at on public.job_applications;
create trigger job_applications_touch_updated_at
  before update on public.job_applications
  for each row execute function public.touch_updated_at();

-- No public read/write policies. The Edge Function uses the service role.
alter table public.job_applications enable row level security;
revoke all on public.job_applications from anon, authenticated;
grant all on public.job_applications to service_role;

-- Private storage bucket for resumes. No storage policies are added,
-- so anon/authenticated cannot list, read, upload or delete objects.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes',
  'resumes',
  false,
  5242880,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Handy review queries (run in the SQL Editor as an authenticated admin):
--
--   select position, count(*) as total
--   from public.job_applications
--   group by position
--   order by total desc;
--
--   select full_name, email, mobile, position, created_at, status
--   from public.job_applications
--   where position = 'Internship'
--   order by created_at desc;
--
--   select * from public.job_applications where status = 'new' order by created_at;
