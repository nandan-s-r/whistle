-- Synthetic users and records stay inside this transaction. No emails or
-- messages are sent. The final rollback preserves the project's real records.
begin;
create temporary table whistle_test_ids as select gen_random_uuid() a,gen_random_uuid() b,gen_random_uuid() outsider,
 null::uuid fund,null::uuid second_fund,null::uuid member,null::uuid company,null::text slug;
create temporary table whistle_test_results(test text,passed boolean);
grant select,update on whistle_test_ids to authenticated,anon;
grant select,insert on whistle_test_results to authenticated,anon;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)
 select a,a::text||'@example.invalid',now(),'{"full_name":"Admin fixture"}'::jsonb from whistle_test_ids
 union all select b,b::text||'@example.invalid',now(),'{"full_name":"Reviewer fixture"}'::jsonb from whistle_test_ids
 union all select outsider,outsider::text||'@example.invalid',now(),'{}'::jsonb from whistle_test_ids;
select set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated','app_metadata',jsonb_build_object('workspace_role','analyst'))::text,true) from whistle_test_ids;
set local role authenticated;
insert into public.vc_companies(owner_id,slug,domain,data) select a,'fund-test-personal','fund-test.invalid','{"id":"fund-test-personal","name":"Original personal research"}' from whistle_test_ids;
update whistle_test_ids set fund=(public.whistle_fund_action('create','{"name":"Temporary fund fixture"}')->>'id')::uuid;
update whistle_test_ids set slug=public.whistle_fund_action('publish',jsonb_build_object('fund_id',fund,'company_id','fund-test-personal','revision',1,'disclosure_confirmed',true))->>'id';
update whistle_test_ids set company=(select id from public.whistle_fund_records where slug=whistle_test_ids.slug);
update whistle_test_ids set member=(public.whistle_fund_action('member',jsonb_build_object('fund_id',fund,'email',b::text||'@example.invalid','role','Viewer','active',true))->>'member_id')::uuid;
insert into whistle_test_results select 'administrator sees fund copy',count(*)=1 from public.whistle_fund_records where id=(select company from whistle_test_ids);
insert into whistle_test_results select 'personal original stays separate',count(*)=1 from public.vc_companies where slug='fund-test-personal' and revision=1;
select set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated','app_metadata',jsonb_build_object('workspace_role','analyst'))::text,true) from whistle_test_ids;
insert into whistle_test_results select 'membership alone exposes no deal',count(*)=0 from public.whistle_fund_records;
insert into whistle_test_results select 'nonadmin sees no teammate directory',jsonb_array_length(public.whistle_fund_details(fund)->'members')=0 from whistle_test_ids;
do $$begin
 begin
  perform public.whistle_fund_action('member',(select jsonb_build_object('fund_id',fund,'email',a::text||'@example.invalid','role','Admin') from whistle_test_ids));
  insert into whistle_test_results values('nonadmin cannot change membership',false);
 exception when insufficient_privilege then insert into whistle_test_results values('nonadmin cannot change membership',true);
 end;
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated','app_metadata',jsonb_build_object('workspace_role','analyst'))::text,true) from whistle_test_ids;
select public.whistle_fund_action('grant',jsonb_build_object('fund_id',fund,'slug',slug,'member_id',member,'role','Reviewer')) from whistle_test_ids;
select set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated','app_metadata',jsonb_build_object('workspace_role','analyst'))::text,true) from whistle_test_ids;
insert into whistle_test_results select 'viewer membership clamps reviewer grant',count(*)=1 and bool_and(not can_write) from public.whistle_fund_records;
do $$declare changed integer;begin
 update public.whistle_fund_companies set revision=revision+1,data=jsonb_set(data,'{description}','"Unauthorized edit"');
 get diagnostics changed=row_count;
 insert into whistle_test_results values('viewer cannot change record',changed=0);
 begin
  insert into public.whistle_fund_grants(company_id,member_id,role) select company,member,'Reviewer' from whistle_test_ids;
  insert into whistle_test_results values('direct grant writes denied',false);
 exception when insufficient_privilege then insert into whistle_test_results values('direct grant writes denied',true);
 end;
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated','app_metadata',jsonb_build_object('workspace_role','analyst'))::text,true) from whistle_test_ids;
select public.whistle_fund_action('member',jsonb_build_object('fund_id',fund,'email',b::text||'@example.invalid','role','Reviewer','active',true)) from whistle_test_ids;
select set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated','app_metadata',jsonb_build_object('workspace_role','analyst'))::text,true) from whistle_test_ids;
update public.whistle_fund_companies set revision=revision+1,last_action='fixture_review',data=jsonb_set(data,'{description}','"Reviewed fund update"') where id=(select company from whistle_test_ids);
insert into whistle_test_results select 'reviewer grant permits revisioned edit',count(*)=1 from public.whistle_fund_records where revision=3 and data->>'description'='Reviewed fund update';
insert into whistle_test_results select 'audit retains original fund snapshot',count(*)=1 from public.whistle_fund_audit where previous_revision=2 and snapshot->>'name'='Original personal research' and actor_id=(select b from whistle_test_ids);
do $$begin
 begin
  update public.whistle_fund_companies set fund_id=gen_random_uuid(),revision=revision+1;
  insert into whistle_test_results values('fund reassignment denied',false);
 exception when insufficient_privilege or raise_exception then insert into whistle_test_results values('fund reassignment denied',true);
 end;
 begin
  update public.whistle_fund_audit set action='rewritten';
  insert into whistle_test_results values('fund audit cannot be rewritten',false);
 exception when insufficient_privilege then insert into whistle_test_results values('fund audit cannot be rewritten',true);
 end;
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated','app_metadata',jsonb_build_object('workspace_role','viewer'),'user_metadata',jsonb_build_object('workspace_role','admin'))::text,true) from whistle_test_ids;
insert into whistle_test_results select 'editable metadata does not grant write',count(*)=1 and bool_and(not can_write) from public.whistle_fund_records;
select set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated','app_metadata',jsonb_build_object('workspace_role','analyst'))::text,true) from whistle_test_ids;
update whistle_test_ids set second_fund=(public.whistle_fund_action('create','{"name":"Second temporary fund"}')->>'id')::uuid;
do $$begin
 begin
  perform public.whistle_fund_action('grant',(select jsonb_build_object('fund_id',second_fund,'slug',slug,'member_id',member,'role','Reviewer') from whistle_test_ids));
  insert into whistle_test_results values('cross-fund grants denied',false);
 exception when insufficient_privilege then insert into whistle_test_results values('cross-fund grants denied',true);
 end;
 begin
  perform public.whistle_fund_action('publish',(select jsonb_build_object('fund_id',fund,'company_id','fund-test-personal','revision',1,'disclosure_confirmed',false) from whistle_test_ids));
  insert into whistle_test_results values('disclosure confirmation required',false);
 exception when raise_exception then insert into whistle_test_results values('disclosure confirmation required',true);
 end;
end $$;
select public.whistle_fund_action('member',jsonb_build_object('fund_id',fund,'email',b::text||'@example.invalid','role','Reviewer','active',false)) from whistle_test_ids;
insert into whistle_test_results select 'organization retains research after departure',count(*)=1 from public.whistle_fund_records where id=(select company from whistle_test_ids);
select set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated','app_metadata',jsonb_build_object('workspace_role','analyst'))::text,true) from whistle_test_ids;
insert into whistle_test_results select 'revoked member cannot read records',count(*)=0 from public.whistle_fund_records;
insert into whistle_test_results select 'revoked member cannot read history',count(*)=0 from public.whistle_fund_audit;
select set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated','app_metadata',jsonb_build_object('workspace_role','analyst'))::text,true) from whistle_test_ids;
select public.whistle_fund_action('member',jsonb_build_object('fund_id',fund,'email',b::text||'@example.invalid','role','Reviewer','active',true)) from whistle_test_ids;
select set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated','app_metadata',jsonb_build_object('workspace_role','analyst'))::text,true) from whistle_test_ids;
insert into whistle_test_results select 'reactivation does not restore old grants',count(*)=0 from public.whistle_fund_records;
select set_config('request.jwt.claims',jsonb_build_object('sub',outsider,'role','authenticated','app_metadata',jsonb_build_object('workspace_role','analyst'))::text,true) from whistle_test_ids;
insert into whistle_test_results select 'outsider cannot see funds',count(*)=0 from public.whistle_funds;
set local role anon;
select set_config('request.jwt.claims','{}',true);
do $$begin
 begin
  perform id from public.whistle_fund_records;
  insert into whistle_test_results values('anonymous fund access denied',false);
 exception when insufficient_privilege then insert into whistle_test_results values('anonymous fund access denied',true);
 end;
end $$;
reset role;
do $$begin if not(select bool_and(passed) from whistle_test_results) then raise exception 'Fund permission check failed'; end if; end $$;
select * from whistle_test_results order by test;
rollback;
