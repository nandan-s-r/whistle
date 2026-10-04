-- The allowance lives outside the Data API and cannot be reset by a client.
create table vc_private.work_allowances (
 bucket text primary key, window_start bigint not null, used integer not null check (used > 0)
);
alter table vc_private.work_allowances enable row level security;
revoke all on vc_private.work_allowances from public,anon,authenticated,service_role;

create function vc_private.reserve_work(for_owner uuid, category text) returns void
language plpgsql security definer set search_path = '' as $$
declare
 rule record; bucket_name text; starts bigint; granted integer;
 at_second bigint := floor(extract(epoch from clock_timestamp()));
begin
 -- One global row lock per category serializes quota updates and job admission.
 for rule in select * from (values
   ('global',60::bigint,60),('global',86400::bigint,1000),
   ('owner:'||for_owner::text,60::bigint,10),('owner:'||for_owner::text,86400::bigint,100)
 ) as rules(subject,period,ceiling)
 loop
   bucket_name := category||':'||rule.subject||':'||rule.period::text;
   starts := at_second / rule.period * rule.period;
   granted := null;
   insert into vc_private.work_allowances as allowance(bucket,window_start,used)
     values(bucket_name,starts,1)
   on conflict(bucket) do update set window_start=greatest(allowance.window_start,excluded.window_start),
     used=case when allowance.window_start>=excluded.window_start then allowance.used+1 else 1 end
   where allowance.window_start<excluded.window_start or allowance.used<rule.ceiling
   returning used into granted;
   if granted is null then raise sqlstate 'PT429' using message='Work allowance exhausted'; end if;
 end loop;
end $$;
revoke all on function vc_private.reserve_work(uuid,text) from public,anon,authenticated,service_role;

create function public.vc_reserve_provider_call(for_owner uuid default null) returns void
language plpgsql security definer set search_path = '' as $$
declare owner uuid;
begin
 if auth.jwt()->>'role' = 'service_role' then
   owner := for_owner;
 else
   owner := auth.uid();
   if owner is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
      or (for_owner is not null and for_owner<>owner) then
     raise insufficient_privilege using message='Authenticated work owner required';
   end if;
 end if;
 if owner is null or not exists(select 1 from auth.users where id=owner) then
   raise insufficient_privilege using message='Authenticated work owner required';
 end if;
 perform vc_private.reserve_work(owner,'provider');
end $$;
revoke all on function public.vc_reserve_provider_call(uuid) from public,anon;
grant execute on function public.vc_reserve_provider_call(uuid) to authenticated,service_role;

create function vc_private.admit_job() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 if not coalesce(auth.jwt()->>'role'='service_role',false) and
    (auth.uid() is null or new.owner_id<>auth.uid() or not public.vc_can_write()) then
   raise insufficient_privilege using message='Authenticated writer required';
 end if;
 if new.state<>'Queued' or new.attempts<>0 or new.cancelled or new.result is not null
    or new.error is not null or new.lease_until is not null
    or jsonb_typeof(new.payload)<>'object' or octet_length(new.payload::text)>4096
    or not exists(select 1 from public.vc_companies c where c.id=new.company_id
      and c.owner_id=new.owner_id and c.revision=new.company_revision
      and c.slug=new.payload->>'company_slug')
    or coalesce(new.payload->>'task','') not in ('Challenge this claim','Find the weakest assumption',
      'Draft customer-reference questions','Identify conflicting evidence','Explain what changed') then
   raise check_violation using message='Invalid queued job';
 end if;
 if new.kind='web_capture' and (coalesce(new.payload->>'url','') not like 'https://%'
      or length(new.payload->>'url')>2000) then
   raise check_violation using message='Invalid capture URL';
 end if;
 perform vc_private.reserve_work(new.owner_id,'job');
 if (select count(*) from public.vc_jobs where owner_id=new.owner_id and state in ('Queued','Running'))>=5
    or (select count(*) from public.vc_jobs where state in ('Queued','Running'))>=100 then
   raise sqlstate 'PT429' using message='Finish or cancel pending jobs';
 end if;
 return new;
end $$;
revoke all on function vc_private.admit_job() from public,anon,authenticated,service_role;
create trigger vc_job_admission before insert on public.vc_jobs
 for each row execute function vc_private.admit_job();
notify pgrst,'reload schema';
