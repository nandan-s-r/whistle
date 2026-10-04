-- Synthetic users and counters roll back; no emails or provider calls occur.
begin;
create temporary table budget_ids as select gen_random_uuid() a,gen_random_uuid() b;
create temporary table budget_results(test text,passed boolean);
grant select on budget_ids to authenticated,service_role;
grant insert,select on budget_results to authenticated,service_role;
insert into auth.users(id,email) select a,a::text||'@example.invalid' from budget_ids
 union all select b,b::text||'@example.invalid' from budget_ids;
select set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated','app_metadata',jsonb_build_object('workspace_role','analyst'))::text,true) from budget_ids;
set local role authenticated;
insert into public.vc_companies(owner_id,slug,domain,data)
 select a,'budget-fixture','budget.example','{"id":"budget-fixture","name":"Quota fixture"}' from budget_ids;
do $$ declare i integer; begin
 for i in 1..5 loop
   insert into public.vc_jobs(owner_id,company_id,company_revision,kind,payload)
    select owner_id,id,revision,'research_draft','{"company_slug":"budget-fixture","task":"Challenge this claim"}'
    from public.vc_companies where slug='budget-fixture';
 end loop;
 begin
   insert into public.vc_jobs(owner_id,company_id,company_revision,kind,payload)
    select owner_id,id,revision,'research_draft','{"company_slug":"budget-fixture","task":"Challenge this claim"}'
    from public.vc_companies where slug='budget-fixture';
   insert into budget_results values('direct table admission rejects sixth active job',false);
 exception when sqlstate 'PT429' then insert into budget_results values('direct table admission rejects sixth active job',true);
 end;
 begin
   insert into public.vc_jobs(owner_id,company_id,company_revision,kind,payload)
    select owner_id,id,revision,'research_draft','{"company_slug":"budget-fixture","task":"Unauthorized task"}'
    from public.vc_companies where slug='budget-fixture';
   insert into budget_results values('direct payload validation',false);
 exception when check_violation then insert into budget_results values('direct payload validation',true);
 end;
 for i in 1..10 loop perform public.vc_reserve_provider_call(); end loop;
 begin
   perform public.vc_reserve_provider_call();
   insert into budget_results values('provider allowance rejects eleventh call',false);
 exception when sqlstate 'PT429' then insert into budget_results values('provider allowance rejects eleventh call',true);
 end;
 begin
   update vc_private.work_allowances set used=1;
   insert into budget_results values('client cannot reset allowance',false);
 exception when insufficient_privilege then insert into budget_results values('client cannot reset allowance',true);
 end;
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated','app_metadata',jsonb_build_object('workspace_role','viewer'),'user_metadata',jsonb_build_object('workspace_role','admin'))::text,true) from budget_ids;
do $$ begin
 begin
   perform public.vc_reserve_provider_call((select a from budget_ids));
   insert into budget_results values('other owner allowance denied',false);
 exception when insufficient_privilege then insert into budget_results values('other owner allowance denied',true);
 end;
 perform public.vc_reserve_provider_call();
 insert into budget_results values('viewer knowledge search allowance preserved',true);
end $$;
reset role;
insert into budget_results select 'anonymous RPC grant denied',not has_function_privilege('anon','public.vc_reserve_provider_call(uuid)','EXECUTE');
-- Force only the synthetic transaction's global counter to exercise account evasion.
update vc_private.work_allowances set used=60 where bucket='provider:global:60';
set local role authenticated;
do $$ begin
 begin
   perform public.vc_reserve_provider_call();
   insert into budget_results values('global cap rejects fresh owner',false);
 exception when sqlstate 'PT429' then insert into budget_results values('global cap rejects fresh owner',true);
 end;
end $$;
reset role;
do $$ begin
 if not (select bool_and(passed) from budget_results) then raise exception 'A work-budget check failed'; end if;
end $$;
select jsonb_agg(to_jsonb(r)) as checks,bool_and(passed) as all_passed from budget_results r;
rollback;
