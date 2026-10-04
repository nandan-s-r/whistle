-- CI stand-ins for managed Supabase helpers; production uses Supabase's own schemas.
create role anon;
create role authenticated;
create role service_role bypassrls;
-- Managed Supabase grants this schema's usage to its API roles.
create schema extensions;
grant usage on schema extensions to anon,authenticated,service_role;
create schema auth;
create table auth.users(id uuid primary key,email text,banned_until timestamptz,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}'::jsonb);
create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
grant usage on schema auth to anon,authenticated,service_role;
grant execute on all functions in schema auth to anon,authenticated,service_role;
create schema storage;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid default gen_random_uuid() primary key,bucket_id text references storage.buckets(id),name text not null);
alter table storage.objects enable row level security;
grant usage on schema storage to authenticated;
grant select,insert,update,delete on storage.objects to authenticated;
create function storage.foldername(name text) returns text[] language sql immutable as $$select string_to_array(name,'/')$$;
grant execute on function storage.foldername(text) to authenticated;
create publication supabase_realtime;
