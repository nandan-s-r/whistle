create schema if not exists extensions;
create extension if not exists vector with schema extensions;
create schema if not exists vc_private;
revoke all on schema vc_private from public, anon, authenticated;

create function public.vc_can_write() returns boolean
language sql stable security invoker set search_path = '' as $$
 select auth.uid() is not null
   and coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false
   and coalesce(auth.jwt()->'app_metadata'->>'workspace_role', 'analyst') in ('analyst','partner','admin')
$$;
revoke all on function public.vc_can_write() from public, anon;
grant execute on function public.vc_can_write() to authenticated;

create table public.vc_companies (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 slug text not null check (length(slug) between 1 and 120), domain text not null,
 revision integer not null default 1 check (revision > 0), data jsonb not null,
 last_action text not null default 'company_intake', created_at timestamptz not null default now(),
 unique(owner_id, slug), unique(owner_id, domain), check (jsonb_typeof(data) = 'object')
);
create table public.vc_searches (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 name text not null check (length(name) between 1 and 120), filters jsonb not null,
 created_at timestamptz not null default now(), unique(owner_id, name)
);
create table public.vc_audit (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.vc_companies(id),
 owner_id uuid not null references auth.users(id), actor text not null, action text not null,
 at timestamptz not null default now(), previous_revision integer not null, revision integer not null,
 snapshot jsonb not null
);
create index vc_audit_owner_company on public.vc_audit(owner_id, company_id, at desc);

-- Only this internal trigger can append audit snapshots. No client can rewrite them.
create function vc_private.audit_company() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null or auth.uid() <> new.owner_id then
   raise exception 'Authenticated owner required';
 end if;
 if tg_op = 'UPDATE' then
   if new.owner_id <> old.owner_id or new.id <> old.id or new.slug <> old.slug
      or new.revision <> old.revision + 1 then
     raise exception 'Identity is immutable and revision must advance once';
   end if;
   insert into public.vc_audit(company_id,owner_id,actor,action,previous_revision,revision,snapshot)
     values(new.id,new.owner_id,auth.uid()::text,new.last_action,old.revision,new.revision,old.data);
 else
   if new.revision <> 1 then raise exception 'Initial revision must be one'; end if;
   insert into public.vc_audit(company_id,owner_id,actor,action,previous_revision,revision,snapshot)
     values(new.id,new.owner_id,auth.uid()::text,'company_intake',0,1,'{}'::jsonb);
 end if;
 return new;
end $$;
revoke all on function vc_private.audit_company() from public, anon, authenticated;
create trigger vc_company_audit after insert or update on public.vc_companies
 for each row execute function vc_private.audit_company();

create table public.vc_jobs (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 company_id uuid not null references public.vc_companies(id), company_revision integer not null,
 kind text not null check (kind in ('web_capture','research_draft','index_evidence')),
 state text not null default 'Queued' check (state in ('Queued','Running','Succeeded','Failed','Cancelled')),
 payload jsonb not null, result jsonb, error text, cancelled boolean not null default false,
 attempts integer not null default 0, lease_until timestamptz, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index vc_jobs_owner_created on public.vc_jobs(owner_id,created_at desc);
create index vc_jobs_queue on public.vc_jobs(state,lease_until,created_at) where state in ('Queued','Running');

create table public.vc_chunks (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 company_id uuid not null references public.vc_companies(id), source_id text not null,
 content text not null check (length(content) between 1 and 12000), content_hash text not null,
 embedding extensions.vector(768) not null, embedding_model text not null,
 created_at timestamptz not null default now(), unique(owner_id,company_id,source_id,content_hash,embedding_model)
);
create index vc_chunks_owner_company on public.vc_chunks(owner_id,company_id);
create index vc_chunks_embedding on public.vc_chunks using hnsw (embedding extensions.vector_cosine_ops);

alter table public.vc_companies enable row level security;
alter table public.vc_searches enable row level security;
alter table public.vc_audit enable row level security;
alter table public.vc_jobs enable row level security;
alter table public.vc_chunks enable row level security;

create policy company_read on public.vc_companies for select to authenticated
 using (owner_id = (select auth.uid()) and not coalesce((select (auth.jwt()->>'is_anonymous')::boolean),false));
create policy company_insert on public.vc_companies for insert to authenticated
 with check (owner_id = (select auth.uid()) and (select public.vc_can_write()));
create policy company_update on public.vc_companies for update to authenticated
 using (owner_id = (select auth.uid()) and (select public.vc_can_write()))
 with check (owner_id = (select auth.uid()) and (select public.vc_can_write()));
create policy search_read on public.vc_searches for select to authenticated using (owner_id = (select auth.uid()));
create policy search_insert on public.vc_searches for insert to authenticated
 with check (owner_id = (select auth.uid()) and (select public.vc_can_write()));
create policy search_update on public.vc_searches for update to authenticated
 using (owner_id = (select auth.uid()) and (select public.vc_can_write()))
 with check (owner_id = (select auth.uid()) and (select public.vc_can_write()));
create policy audit_read on public.vc_audit for select to authenticated using (owner_id = (select auth.uid()));
create policy job_read on public.vc_jobs for select to authenticated using (owner_id = (select auth.uid()));
create policy job_insert on public.vc_jobs for insert to authenticated
 with check (owner_id = (select auth.uid()) and (select public.vc_can_write()) and state = 'Queued'
   and exists (select 1 from public.vc_companies c where c.id = company_id and c.owner_id = (select auth.uid())));
create policy job_cancel on public.vc_jobs for update to authenticated
 using (owner_id = (select auth.uid()) and (select public.vc_can_write()))
 with check (owner_id = (select auth.uid()) and (select public.vc_can_write()));
create policy chunk_read on public.vc_chunks for select to authenticated using (owner_id = (select auth.uid()));
-- Chunk writes are performed by a server worker after matching the job's company and owner.

revoke all on public.vc_companies, public.vc_searches, public.vc_audit, public.vc_jobs, public.vc_chunks from anon, authenticated;
grant select, insert, update on public.vc_companies, public.vc_searches to authenticated;
grant select on public.vc_audit, public.vc_jobs, public.vc_chunks to authenticated;
grant insert(owner_id,company_id,company_revision,kind,payload) on public.vc_jobs to authenticated;
grant update(cancelled) on public.vc_jobs to authenticated;
grant all on public.vc_companies, public.vc_searches, public.vc_audit, public.vc_jobs, public.vc_chunks to service_role;

create function public.vc_match_evidence(query_embedding extensions.vector(768), match_count integer default 8)
returns table (company_id uuid, source_id text, content text, similarity double precision)
language sql stable security invoker set search_path = '' as $$
 select c.company_id,c.source_id,c.content,1-(c.embedding OPERATOR(extensions.<=>) query_embedding) as similarity
 from public.vc_chunks c where c.owner_id = (select auth.uid())
 order by c.embedding OPERATOR(extensions.<=>) query_embedding limit greatest(1,least(match_count,20))
$$;
revoke all on function public.vc_match_evidence(extensions.vector,integer) from public, anon;
grant execute on function public.vc_match_evidence(extensions.vector,integer) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('vc-evidence','vc-evidence',false,20971520,array['application/pdf','text/plain'])
 on conflict(id) do nothing;
create policy vc_file_read on storage.objects for select to authenticated
 using (bucket_id = 'vc-evidence' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy vc_file_insert on storage.objects for insert to authenticated
 with check (bucket_id = 'vc-evidence' and (storage.foldername(name))[1] = (select auth.uid())::text and (select public.vc_can_write()));
-- Files are immutable; replacement creates a new UUID path and preserves the earlier document.

alter publication supabase_realtime add table public.vc_companies, public.vc_jobs;
