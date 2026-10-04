-- All fixtures, including auth rows, are rolled back. No confirmation emails are sent.
begin;
create temporary table vc_test_ids as select gen_random_uuid() a,gen_random_uuid() b;
create temporary table vc_test_results(test text, passed boolean);
grant select on vc_test_ids to authenticated,anon;
grant insert,select on vc_test_results to authenticated,anon;
insert into auth.users(id,email) select a,a::text||'@example.invalid' from vc_test_ids
 union all select b,b::text||'@example.invalid' from vc_test_ids;
select set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated','app_metadata',jsonb_build_object('workspace_role','analyst'))::text,true) from vc_test_ids;
set local role authenticated;
insert into public.vc_companies(owner_id,slug,domain,data) select a,'rls-fixture','rls.example','{"name":"RLS fixture"}' from vc_test_ids;
insert into vc_test_results select 'owner can read',count(*)=1 from public.vc_companies where slug='rls-fixture';
update public.vc_companies set data='{"name":"Revision two"}',revision=2,last_action='note' where slug='rls-fixture';
insert into vc_test_results select 'audit preserves original',count(*)=1 from public.vc_audit where previous_revision=1 and snapshot->>'name'='RLS fixture';
do $$ begin
 begin
  update public.vc_companies set owner_id=(select b from vc_test_ids),revision=3 where slug='rls-fixture';
  insert into vc_test_results values('owner reassignment denied',false);
 exception when insufficient_privilege or raise_exception then
  insert into vc_test_results values('owner reassignment denied',true);
 end;
 begin
  update public.vc_audit set action='rewritten';
  insert into vc_test_results values('audit immutable',false);
 exception when insufficient_privilege then insert into vc_test_results values('audit immutable',true);
 end;
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated','app_metadata','{}'::jsonb)::text,true) from vc_test_ids;
insert into vc_test_results select 'other user cannot read',count(*)=0 from public.vc_companies where slug='rls-fixture';
insert into vc_test_results select 'other user cannot see audit',count(*)=0 from public.vc_audit;
insert into public.vc_companies(owner_id,slug,domain,data) select b,'rls-fixture-b','rls-b.example','{"name":"Other user"}' from vc_test_ids;
insert into storage.objects(bucket_id,name) select 'vc-evidence',b::text||'/source.txt' from vc_test_ids;
reset role;
insert into public.vc_chunks(owner_id,company_id,source_id,content,content_hash,embedding,embedding_model)
 select owner_id,id,'Sfixture','Scoped fixture source','fixture-'||owner_id::text,
   (array[1.0]||array_fill(0.0,array[767]))::extensions.vector,'gemini-embedding-001'
 from public.vc_companies where slug in ('rls-fixture','rls-fixture-b');
set local role authenticated;
insert into vc_test_results select 'vector search returns only own source',count(*)=1
 from public.vc_match_evidence((array[1.0]||array_fill(0.0,array[767]))::extensions.vector,8);
do $$ declare changed integer; begin
 update public.vc_companies set data='{}',revision=3 where slug='rls-fixture';
 get diagnostics changed=row_count;
 insert into vc_test_results values('other user cannot update',changed=0);
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated','app_metadata',jsonb_build_object('workspace_role','viewer'),'user_metadata',jsonb_build_object('workspace_role','admin'))::text,true) from vc_test_ids;
insert into vc_test_results select 'private storage hides other user files',count(*)=0 from storage.objects where bucket_id='vc-evidence';
insert into vc_test_results select 'vector index hides other owner chunks',count(*)=1 from public.vc_chunks;
do $$ declare changed integer; begin
 update public.vc_companies set data='{}',revision=3 where slug='rls-fixture';
 get diagnostics changed=row_count;
 insert into vc_test_results values('viewer cannot escalate through user metadata',changed=0);
end $$;
set local role anon;
select set_config('request.jwt.claims','{}',true);
do $$ begin
 begin
  perform id from public.vc_companies;
  insert into vc_test_results values('anonymous access denied',false);
 exception when insufficient_privilege then insert into vc_test_results values('anonymous access denied',true);
 end;
end $$;
reset role;
do $$ begin
 if not (select bool_and(passed) from vc_test_results) then raise exception 'An owner-isolation check failed'; end if;
end $$;
select jsonb_agg(to_jsonb(r)) as checks, bool_and(passed) as all_passed from vc_test_results r;
rollback;
