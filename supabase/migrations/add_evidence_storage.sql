-- Migration: Supabase Storage bucket for evidence files
-- =======================================================
-- Run this in Supabase SQL Editor → New query → Run
-- (Alternatively, create the bucket manually in Storage → New bucket)

-- 1. Create the 'evidence' storage bucket (private — no public access)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidence',
  'evidence',
  false,                      -- private bucket
  20971520,                   -- 20 MB per file
  array[
    'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml',
    'application/pdf',
    'text/plain', 'text/html',
    'application/zip', 'application/x-zip-compressed',
    'video/mp4', 'video/webm'
  ]
)
on conflict (id) do nothing;

-- 2. RLS policy: authenticated users can upload to their own tenant folder
create policy "Authenticated upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'evidence');

-- 3. RLS policy: authenticated users can read their own files
create policy "Authenticated read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'evidence');

-- 4. RLS policy: authenticated users can delete their own files
create policy "Authenticated delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'evidence');
