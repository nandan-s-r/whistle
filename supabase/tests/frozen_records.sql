-- Regression fixtures are rolled back; no real account or research is changed.
begin;
create temporary table frozen_ids as select gen_random_uuid() owner,gen_random_uuid() reviewer,null::uuid fund,null::uuid member,null::text shared_slug;
create temporary table frozen_results(test text,passed boolean);
grant select,update on frozen_ids to authenticated;
grant select,insert on frozen_results to authenticated;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)
 select owner,owner::text||'@example.invalid',now(),'{}'::jsonb from frozen_ids
 union all select reviewer,reviewer::text||'@example.invalid',now(),'{}'::jsonb from frozen_ids;
select set_config('request.jwt.claims',jsonb_build_object('sub',owner,'role','authenticated','app_metadata',jsonb_build_object('workspace_role','analyst'))::text,true) from frozen_ids;
set local role authenticated;
insert into public.vc_companies(owner_id,slug,domain,data)
 select owner,'frozen-fixture','frozen-fixture.invalid',jsonb_build_object('id','frozen-fixture','name','Temporary research') ||
 (select jsonb_object_agg(key,'[{"version":1,"text":"Original frozen item"},{"version":2,"text":"Second frozen item"}]'::jsonb)
  from unnest(array['models','memos','decisions','observations','alert_reviews','viewpoints','operating_models']) key) from frozen_ids;
update frozen_ids set fund=(public.whistle_fund_action('create','{"name":"Frozen regression fixture"}')->>'id')::uuid;
update frozen_ids set shared_slug=public.whistle_fund_action('publish',jsonb_build_object('fund_id',fund,'company_id','frozen-fixture','revision',1,'disclosure_confirmed',true))->>'id';
update frozen_ids set member=(public.whistle_fund_action('member',jsonb_build_object('fund_id',fund,'email',reviewer::text||'@example.invalid','role','Reviewer'))->>'member_id')::uuid;
select public.whistle_fund_action('grant',jsonb_build_object('fund_id',fund,'slug',shared_slug,'member_id',member,'role','Reviewer')) from frozen_ids;
do $$
declare target text; key text; variant integer; original jsonb; proposed jsonb; items jsonb; record_slug text; actor uuid; before_audit integer; after_audit integer;
begin
 foreach target in array array['vc_companies','whistle_fund_companies'] loop
  select case when target='vc_companies' then owner else reviewer end,
   case when target='vc_companies' then 'frozen-fixture' else shared_slug end into actor,record_slug from frozen_ids;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','app_metadata',jsonb_build_object('workspace_role','analyst'))::text,true);
  execute format('select data from public.%I where slug=$1',target) into original using record_slug;
  execute format('select count(*) from public.%I',case when target='vc_companies' then 'vc_audit' else 'whistle_fund_audit' end) into before_audit;
  foreach key in array array['models','memos','decisions','observations','alert_reviews','viewpoints','operating_models'] loop
   for variant in 1..6 loop
    items=original->key;
    proposed=case variant
     when 1 then jsonb_set(original,array[key,'0','text'],'"Rewritten frozen item"'::jsonb)
     when 2 then jsonb_set(original,array[key],jsonb_build_array(items->0))
     when 3 then jsonb_set(original,array[key],jsonb_build_array(items->1,items->0))
     when 4 then jsonb_set(original,array[key],'null'::jsonb)
     when 5 then jsonb_set(original,array[key],'{}'::jsonb)
     else original-key end;
    begin
     execute format('update public.%I set data=$1,revision=revision+1,last_action=''direct_fixture_write'' where slug=$2',target) using proposed,record_slug;
     insert into frozen_results values(target||' / '||key||' / rejected variant '||variant,false);
    exception when insufficient_privilege then
     insert into frozen_results values(target||' / '||key||' / rejected variant '||variant,true);
    end;
   end loop;
  end loop;
  execute format('select count(*) from public.%I',case when target='vc_companies' then 'vc_audit' else 'whistle_fund_audit' end) into after_audit;
  insert into frozen_results values(target||' / failed writes leave audit unchanged',before_audit=after_audit);
  foreach key in array array['models','memos','decisions','observations','alert_reviews','viewpoints','operating_models'] loop
   execute format('update public.%I set data=jsonb_set(data,$1,(data->$2)||''[{"version":3,"text":"New version"}]''::jsonb),revision=revision+1 where slug=$3',target) using array[key],key,record_slug;
   execute format('select data->$1 from public.%I where slug=$2',target) into items using key,record_slug;
   insert into frozen_results values(target||' / '||key||' / append allowed',jsonb_array_length(items)=3 and items->0=original->key->0 and items->1=original->key->1);
  end loop;
  execute format('update public.%I set data=data||''{"description":"New review note","conditions":[{"status":"Resolved"}],"opportunities":[{"stage":"Diligence"}],"sources":[{"rights":"Private research"}]}''::jsonb,revision=revision+1 where slug=$1',target) using record_slug;
  execute format('select data from public.%I where slug=$1',target) into proposed using record_slug;
  insert into frozen_results values(target||' / mutable workflow updates allowed',proposed->>'description'='New review note' and proposed->'conditions'->0->>'status'='Resolved');
 end loop;
end $$;
reset role;
do $$begin if not(select bool_and(passed) from frozen_results) then raise exception 'Frozen research integrity check failed'; end if; end $$;
select * from frozen_results order by test;
rollback;
