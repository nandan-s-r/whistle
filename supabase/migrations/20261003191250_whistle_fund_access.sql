-- Fund research is organization-owned. Personal vc_* policies stay unchanged.
create table public.whistle_funds (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 2 and 160),
 created_at timestamptz not null default now()
);
create table public.whistle_fund_members (
 id uuid primary key default gen_random_uuid(), fund_id uuid not null references public.whistle_funds(id),
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('Admin','Reviewer','Viewer')), active boolean not null default true,
 unique(fund_id,user_id)
);
create index whistle_members_user_fund on public.whistle_fund_members(user_id,fund_id) where active;
create table public.whistle_fund_companies (
 id uuid primary key default gen_random_uuid(), fund_id uuid not null references public.whistle_funds(id),
 slug text not null unique, revision integer not null check(revision>=1), data jsonb not null,
 last_action text not null default 'review', created_at timestamptz not null default now(),
 check(data->>'id'=slug)
);
create index whistle_companies_fund on public.whistle_fund_companies(fund_id,id);
create table public.whistle_fund_grants (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.whistle_fund_companies(id),
 member_id uuid not null references public.whistle_fund_members(id),
 role text not null check(role in ('Reviewer','Viewer')), unique(company_id,member_id)
);
create index whistle_grants_member on public.whistle_fund_grants(member_id,company_id);
create table public.whistle_fund_audit (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.whistle_fund_companies(id),
 actor text not null, actor_id uuid, action text not null, at timestamptz not null default now(),
 previous_revision integer not null, revision integer not null, snapshot jsonb not null
);
create index whistle_audit_company_revision on public.whistle_fund_audit(company_id,previous_revision);
create table public.whistle_fund_access_audit (
 id uuid primary key default gen_random_uuid(), fund_id uuid not null references public.whistle_funds(id),
 actor_id uuid not null, action text not null, detail jsonb not null, at timestamptz not null default now()
);
create index whistle_access_audit_fund on public.whistle_fund_access_audit(fund_id,at desc);

-- These private lookups prevent recursive policies. Each binds to auth.uid(),
-- live membership and account status. Display metadata never authorizes access.
create function vc_private.whistle_account_active() returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null
   and coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false
   and exists(select 1 from auth.users u where u.id=auth.uid()
       and (u.banned_until is null or u.banned_until<=now()))
$$;
create function vc_private.whistle_fund_role(target uuid) returns text
language sql stable security definer set search_path='' as $$
 select m.role from public.whistle_fund_members m
 where vc_private.whistle_account_active() and m.fund_id=target and m.user_id=auth.uid() and m.active
$$;
create function vc_private.whistle_deal_access(target uuid, writing boolean default false) returns boolean
language sql stable security definer set search_path='' as $$
 select vc_private.whistle_account_active() and (not writing or public.vc_can_write()) and exists(
  select 1 from public.whistle_fund_companies c
  join public.whistle_fund_members m on m.fund_id=c.fund_id
  where c.id=target and m.user_id=auth.uid() and m.active and
    (m.role='Admin' or (m.role in ('Reviewer','Viewer') and (not writing or m.role='Reviewer') and exists(
      select 1 from public.whistle_fund_grants g where g.company_id=c.id and g.member_id=m.id
       and (not writing or g.role='Reviewer'))))
 )
$$;
revoke all on function vc_private.whistle_account_active(),vc_private.whistle_fund_role(uuid),vc_private.whistle_deal_access(uuid,boolean) from public,anon;
grant usage on schema vc_private to authenticated;
grant execute on function vc_private.whistle_account_active(),vc_private.whistle_fund_role(uuid),vc_private.whistle_deal_access(uuid,boolean) to authenticated;

alter table public.whistle_funds enable row level security;
alter table public.whistle_fund_members enable row level security;
alter table public.whistle_fund_companies enable row level security;
alter table public.whistle_fund_grants enable row level security;
alter table public.whistle_fund_audit enable row level security;
alter table public.whistle_fund_access_audit enable row level security;
create policy fund_read on public.whistle_funds for select to authenticated using(vc_private.whistle_fund_role(id) is not null);
create policy member_read on public.whistle_fund_members for select to authenticated
 using(vc_private.whistle_fund_role(fund_id)='Admin' or (user_id=(select auth.uid()) and active and vc_private.whistle_account_active()));
create policy fund_company_read on public.whistle_fund_companies for select to authenticated using(vc_private.whistle_deal_access(id));
create policy fund_company_write on public.whistle_fund_companies for update to authenticated
 using(vc_private.whistle_deal_access(id,true)) with check(vc_private.whistle_deal_access(id,true));
create policy fund_grant_read on public.whistle_fund_grants for select to authenticated
 using(exists(select 1 from public.whistle_fund_companies c where c.id=company_id and vc_private.whistle_fund_role(c.fund_id)='Admin'));
create policy fund_audit_read on public.whistle_fund_audit for select to authenticated using(vc_private.whistle_deal_access(company_id));
create policy fund_access_audit_read on public.whistle_fund_access_audit for select to authenticated using(vc_private.whistle_fund_role(fund_id)='Admin');
revoke all on public.whistle_funds,public.whistle_fund_members,public.whistle_fund_companies,public.whistle_fund_grants,public.whistle_fund_audit,public.whistle_fund_access_audit from public,anon,authenticated;
grant select on public.whistle_funds,public.whistle_fund_members,public.whistle_fund_companies,public.whistle_fund_grants,public.whistle_fund_audit,public.whistle_fund_access_audit to authenticated;
grant update(data,revision,last_action) on public.whistle_fund_companies to authenticated;

create function vc_private.whistle_audit_company() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if not vc_private.whistle_deal_access(old.id,true) then raise exception 'Deal write access required' using errcode='42501'; end if;
 if new.id<>old.id or new.fund_id<>old.fund_id or new.slug<>old.slug or new.revision<>old.revision+1 or new.data->>'id'<>new.slug then
   raise exception 'Record identity is immutable and revisions must advance by one';
 end if;
 insert into public.whistle_fund_audit(company_id,actor,actor_id,action,previous_revision,revision,snapshot)
 values(old.id,auth.uid()::text,auth.uid(),new.last_action,old.revision,new.revision,old.data);
 return new;
end $$;
revoke all on function vc_private.whistle_audit_company() from public,anon,authenticated;
create trigger whistle_company_audit before update on public.whistle_fund_companies for each row execute function vc_private.whistle_audit_company();
create view public.whistle_fund_records with(security_invoker=true) as
 select id,fund_id,slug,revision,data,created_at,vc_private.whistle_deal_access(id,true) as can_write from public.whistle_fund_companies;
revoke all on public.whistle_fund_records from public,anon,authenticated;
grant select on public.whistle_fund_records to authenticated;

-- Narrow admin operations need an auth.users lookup to resolve a supplied
-- teammate email. The private function checks the live administrator row first;
-- its public wrapper is an invoker and exposes no arbitrary SQL or user lookup.
create function vc_private.whistle_fund_action(kind text,payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 fid uuid; mid uuid; cid uuid; teammate uuid; record_slug text; result jsonb; assigned_role text;
 current_member public.whistle_fund_members; original public.vc_companies; shared public.whistle_fund_companies;
 is_active boolean; audit_kind text;
begin
 if not vc_private.whistle_account_active() or not public.vc_can_write() then
   raise exception 'An active writing account is required' using errcode='42501';
 end if;
 if kind='create' then
   if length(trim(payload->>'name')) not between 2 and 160 then raise exception 'Fund name is required'; end if;
   insert into public.whistle_funds(name) values(trim(payload->>'name')) returning id into fid;
   insert into public.whistle_fund_members(fund_id,user_id,role) values(fid,auth.uid(),'Admin');
   result=jsonb_build_object('id',fid,'name',trim(payload->>'name'),'role','Admin');audit_kind='fund_created';
 else
   fid=(payload->>'fund_id')::uuid;
   select * into current_member from public.whistle_fund_members where fund_id=fid and user_id=auth.uid() and active for update;
   if not found or current_member.role<>'Admin' then raise exception 'Fund administrator required' using errcode='42501'; end if;
   if kind='member' then
     assigned_role=payload->>'role';is_active=coalesce((payload->>'active')::boolean,true);
     if assigned_role not in ('Admin','Reviewer','Viewer') then raise exception 'Invalid membership role'; end if;
     select id into teammate from auth.users where lower(email)=lower(trim(payload->>'email'))
        and (banned_until is null or banned_until<=now()) and email_confirmed_at is not null;
     if not found then raise exception 'Use an existing active confirmed account email'; end if;
     if teammate=auth.uid() and (not is_active or assigned_role<>'Admin') then raise exception 'Another administrator must manage your departure'; end if;
     insert into public.whistle_fund_members(fund_id,user_id,role,active) values(fid,teammate,assigned_role,is_active)
       on conflict(fund_id,user_id) do update set role=excluded.role,active=excluded.active returning id into mid;
     if not is_active then delete from public.whistle_fund_grants where member_id=mid; end if;
     result=jsonb_build_object('member_id',mid,'role',assigned_role,'active',is_active);audit_kind='membership_changed';
   elsif kind='publish' then
     if (payload->>'disclosure_confirmed')::boolean is distinct from true then raise exception 'Review the entire record and history before sharing'; end if;
     select * into original from public.vc_companies where owner_id=auth.uid() and slug=payload->>'company_id' for share;
     if not found then raise exception 'Select your owned personal record' using errcode='42501'; end if;
     if original.revision<>(payload->>'revision')::integer then raise exception 'Record changed; review its current contents' using errcode='40001'; end if;
     cid=gen_random_uuid();record_slug='fund-'||replace(cid::text,'-','');
     insert into public.whistle_fund_companies(id,fund_id,slug,revision,data)
       values(cid,fid,record_slug,original.revision+1,jsonb_set(original.data,'{id}',to_jsonb(record_slug))) returning * into shared;
     insert into public.whistle_fund_audit(company_id,actor,action,at,previous_revision,revision,snapshot)
       select cid,actor,action,at,previous_revision,revision,snapshot from public.vc_audit where company_id=original.id;
     insert into public.whistle_fund_audit(company_id,actor,actor_id,action,previous_revision,revision,snapshot)
       values(cid,auth.uid()::text,auth.uid(),'published_to_fund',original.revision,original.revision+1,original.data);
     result=jsonb_build_object('id',record_slug,'name',original.data->>'name','revision',shared.revision);audit_kind='record_published';
   elsif kind='grant' then
     assigned_role=payload->>'role';mid=(payload->>'member_id')::uuid;
     if assigned_role not in ('Reviewer','Viewer','Remove') then raise exception 'Invalid deal grant'; end if;
     select id into cid from public.whistle_fund_companies where fund_id=fid and slug=payload->>'slug';
     if not found or not exists(select 1 from public.whistle_fund_members where id=mid and fund_id=fid and active) then
       raise exception 'Select a record and active member from this fund' using errcode='42501';
     end if;
     if assigned_role='Remove' then delete from public.whistle_fund_grants where company_id=cid and member_id=mid;
     else insert into public.whistle_fund_grants(company_id,member_id,role) values(cid,mid,assigned_role)
       on conflict(company_id,member_id) do update set role=excluded.role;
     end if;
     result=jsonb_build_object('saved',true);audit_kind='deal_access_changed';
   else raise exception 'Unknown fund action';
   end if;
 end if;
 insert into public.whistle_fund_access_audit(fund_id,actor_id,action,detail)
 values(fid,auth.uid(),audit_kind,jsonb_build_object('member_id',mid,'company_id',cid,'role',assigned_role,'active',is_active));
 return result;
end $$;
create function public.whistle_fund_action(kind text,payload jsonb) returns jsonb
language sql security invoker set search_path='' as $$ select vc_private.whistle_fund_action(kind,payload) $$;
revoke all on function vc_private.whistle_fund_action(text,jsonb),public.whistle_fund_action(text,jsonb) from public,anon;
grant execute on function vc_private.whistle_fund_action(text,jsonb),public.whistle_fund_action(text,jsonb) to authenticated;

create function vc_private.whistle_fund_details(target uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare role_name text; result jsonb;
begin
 role_name=vc_private.whistle_fund_role(target);
 if role_name is null then raise exception 'Active fund membership required' using errcode='42501'; end if;
 select jsonb_build_object('id',f.id,'name',f.name,'role',role_name,
  'records',coalesce((select jsonb_agg(jsonb_build_object('id',c.slug,'name',c.data->>'name','revision',c.revision,'can_write',vc_private.whistle_deal_access(c.id,true)))
     from public.whistle_fund_companies c where c.fund_id=target and vc_private.whistle_deal_access(c.id)),'[]'::jsonb),
  'members',case when role_name='Admin' then coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'email',u.email,'name',coalesce(u.raw_user_meta_data->>'full_name','Member'),'role',m.role,'active',m.active))
     from public.whistle_fund_members m join auth.users u on u.id=m.user_id where m.fund_id=target),'[]'::jsonb) else '[]'::jsonb end,
  'grants',case when role_name='Admin' then coalesce((select jsonb_agg(jsonb_build_object('company_id',g.company_id,'member_id',g.member_id,'role',g.role))
     from public.whistle_fund_grants g join public.whistle_fund_companies c on c.id=g.company_id where c.fund_id=target),'[]'::jsonb) else '[]'::jsonb end,
  'events',case when role_name='Admin' then coalesce((select jsonb_agg(jsonb_build_object('action',a.action,'actor_id',a.actor_id,'detail',a.detail,'at',a.at)) from
     (select * from public.whistle_fund_access_audit where fund_id=target order by at desc limit 30) a),'[]'::jsonb) else '[]'::jsonb end)
 into result from public.whistle_funds f where f.id=target;
 return result;
end $$;
create function public.whistle_fund_details(target uuid) returns jsonb
language sql stable security invoker set search_path='' as $$ select vc_private.whistle_fund_details(target) $$;
revoke all on function vc_private.whistle_fund_details(uuid),public.whistle_fund_details(uuid) from public,anon;
grant execute on function vc_private.whistle_fund_details(uuid),public.whistle_fund_details(uuid) to authenticated;
