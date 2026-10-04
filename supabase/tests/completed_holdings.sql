-- Authenticated personal owners and granted fund reviewers use rolled-back fixtures.
begin;
create temporary table holding_ids as select gen_random_uuid() owner,gen_random_uuid() reviewer,null::uuid fund,null::uuid member,null::text shared_slug;
create temporary table holding_results(test text,passed boolean);
grant select,update on holding_ids to authenticated;
grant select,insert on holding_results to authenticated;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)
 select owner,owner::text||'@example.invalid',now(),'{}'::jsonb from holding_ids
 union all select reviewer,reviewer::text||'@example.invalid',now(),'{}'::jsonb from holding_ids;
select set_config('request.jwt.claims',jsonb_build_object('sub',owner,'role','authenticated','app_metadata',jsonb_build_object('workspace_role','analyst'))::text,true) from holding_ids;
set local role authenticated;
insert into public.vc_companies(owner_id,slug,domain,data)
 select owner,'holding-fixture','holding-fixture.invalid',jsonb_build_object('id','holding-fixture','name','Temporary holding',
 'opportunities','[{"id":"closed-deal","name":"Recorded seed investment","round":"Seed","stage":"Closed","rationale":"Completed investment documented in the selected source.","approval_reference":"Reviewed external investment approval document.","invested":500000,"ownership":0.05,"closed_on":"2020-01-31","source_ids":["S03"],"updated_at":"2020-02-01T00:00:00Z","updated_by":"Original reviewer"},{"id":"active-deal","stage":"Research"}]'::jsonb) from holding_ids;
update holding_ids set fund=(public.whistle_fund_action('create','{"name":"Holding regression fixture"}')->>'id')::uuid;
update holding_ids set shared_slug=public.whistle_fund_action('publish',jsonb_build_object('fund_id',fund,'company_id','holding-fixture','revision',1,'disclosure_confirmed',true))->>'id';
update holding_ids set member=(public.whistle_fund_action('member',jsonb_build_object('fund_id',fund,'email',reviewer::text||'@example.invalid','role','Reviewer'))->>'member_id')::uuid;
select public.whistle_fund_action('grant',jsonb_build_object('fund_id',fund,'slug',shared_slug,'member_id',member,'role','Reviewer')) from holding_ids;

do $$
declare target text; mutation record; variant integer; original jsonb; proposed jsonb; actual jsonb;
 record_slug text; actor uuid; before_revision integer; after_revision integer; before_audit integer; after_audit integer;
begin
 foreach target in array array['vc_companies','whistle_fund_companies'] loop
  select case when target='vc_companies' then owner else reviewer end,
   case when target='vc_companies' then 'holding-fixture' else shared_slug end into actor,record_slug from holding_ids;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','app_metadata',jsonb_build_object('workspace_role','analyst'))::text,true);
  execute format('select data,revision from public.%I where slug=$1',target) into original,before_revision using record_slug;
  execute format('select count(*) from public.%I',case when target='vc_companies' then 'vc_audit' else 'whistle_fund_audit' end) into before_audit;
  for mutation in select * from (values
   ('ownership','0.9'::jsonb),('invested','900000'::jsonb),('closed_on','"2020-03-01"'::jsonb),
   ('stage','"Research"'::jsonb),('name','"Rewritten name"'::jsonb),('round','"Series A"'::jsonb),
   ('rationale','"Rewritten reason"'::jsonb),('approval_reference','"Rewritten approval"'::jsonb),
   ('currency','"EUR"'::jsonb),('source_ids','[]'::jsonb),('rejection_reason','"Lost allocation"'::jsonb),
   ('id','"replacement"'::jsonb),('updated_at','"2020-03-01T00:00:00Z"'::jsonb),('updated_by','"Other reviewer"'::jsonb)
  ) changes(key,value) loop
   proposed=jsonb_set(original,array['opportunities','0',mutation.key],mutation.value);
   begin
    execute format('update public.%I set data=$1,revision=revision+1,last_action=''direct_holding_probe'' where slug=$2',target) using proposed,record_slug;
    insert into holding_results values(target||' / rejected field '||mutation.key,false);
   exception when insufficient_privilege then
    insert into holding_results values(target||' / rejected field '||mutation.key,true);
   end;
  end loop;
  for variant in 1..8 loop
   proposed=case variant
    when 1 then original-'opportunities'
    when 2 then jsonb_set(original,'{opportunities}','null'::jsonb)
    when 3 then jsonb_set(original,'{opportunities}','{}'::jsonb)
    when 4 then jsonb_set(original,'{opportunities}','"Closed"'::jsonb)
    when 5 then jsonb_set(original,'{opportunities}','[]'::jsonb)
    when 6 then jsonb_set(original,'{opportunities}',jsonb_build_array(original->'opportunities'->1))
    when 7 then jsonb_set(original,'{opportunities}',(original->'opportunities')||jsonb_build_array(original->'opportunities'->0))
    else jsonb_set(original,'{opportunities}',(original->'opportunities')||jsonb_build_array((original->'opportunities'->0)||'{"stage":"Research"}'::jsonb)) end;
   begin
    execute format('update public.%I set data=$1,revision=revision+1,last_action=''direct_holding_probe'' where slug=$2',target) using proposed,record_slug;
    insert into holding_results values(target||' / rejected collection variant '||variant,false);
   exception when insufficient_privilege then
    insert into holding_results values(target||' / rejected collection variant '||variant,true);
   end;
  end loop;
  execute format('select data,revision from public.%I where slug=$1',target) into actual,after_revision using record_slug;
  execute format('select count(*) from public.%I',case when target='vc_companies' then 'vc_audit' else 'whistle_fund_audit' end) into after_audit;
  insert into holding_results values(target||' / failed writes preserve data revision and audit',actual=original and before_revision=after_revision and before_audit=after_audit);
  proposed=jsonb_set(original,'{opportunities}',jsonb_build_array((original->'opportunities'->1)||'{"stage":"Diligence"}'::jsonb,original->'opportunities'->0))||'{"description":"New review context","sources":[{"id":"S03","availability":"Unavailable"}]}'::jsonb;
  execute format('update public.%I set data=$1,revision=revision+1 where slug=$2',target) using proposed,record_slug;
  execute format('select data from public.%I where slug=$1',target) into actual using record_slug;
  insert into holding_results values(target||' / active edit reorder and unrelated update allowed',actual=proposed and actual->'opportunities'->1=original->'opportunities'->0);
  proposed=jsonb_set(actual,'{opportunities,0}',(actual->'opportunities'->0)||'{"stage":"Closed","invested":100000,"ownership":0.02,"closed_on":"2020-03-01"}'::jsonb);
  execute format('update public.%I set data=$1,revision=revision+1 where slug=$2',target) using proposed,record_slug;
  execute format('select data from public.%I where slug=$1',target) into actual using record_slug;
  insert into holding_results values(target||' / active deal can become completed holding',actual=proposed);
  begin
   execute format('update public.%I set data=jsonb_set(data,''{opportunities,0,ownership}'',''0.9''::jsonb),revision=revision+1 where slug=$1',target) using record_slug;
   insert into holding_results values(target||' / newly completed holding is protected',false);
  exception when insufficient_privilege then
   insert into holding_results values(target||' / newly completed holding is protected',true);
  end;
  proposed=jsonb_set(actual,'{opportunities}',(actual->'opportunities')||'[{"id":"next-round","stage":"Research"}]'::jsonb);
  execute format('update public.%I set data=$1,revision=revision+1 where slug=$2',target) using proposed,record_slug;
  execute format('select data from public.%I where slug=$1',target) into actual using record_slug;
  insert into holding_results values(target||' / new opportunity allowed alongside completed holdings',actual=proposed);
  execute format('update public.%I set data=data,revision=revision+1 where slug=$1',target) using record_slug;
  execute format('select data from public.%I where slug=$1',target) into proposed using record_slug;
  insert into holding_results values(target||' / unchanged holding resave allowed',actual=proposed);
 end loop;
end $$;
reset role;
do $$begin if not(select bool_and(passed) from holding_results) then raise exception 'Completed holding integrity check failed'; end if; end $$;
select * from holding_results order by test;
rollback;
