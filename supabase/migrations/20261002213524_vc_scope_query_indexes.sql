create index vc_audit_company on public.vc_audit(company_id,at desc);
create index vc_jobs_company on public.vc_jobs(company_id);
create index vc_chunks_company on public.vc_chunks(company_id);
alter policy company_read on public.vc_companies
 using (owner_id = (select auth.uid()) and not coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false));
