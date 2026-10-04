-- Preserve the checked quota boundary while keeping privileged execution out
-- of the exposed Data API schema. No caller can change quota counters directly.
create function vc_private.reserve_provider_call(for_owner uuid default null) returns void
language plpgsql security definer set search_path='' as $$
declare owner uuid;
begin
 if auth.jwt()->>'role'='service_role' then owner:=for_owner;
 else
   owner:=auth.uid();
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
revoke all on function vc_private.reserve_provider_call(uuid) from public,anon;
grant usage on schema vc_private to authenticated,service_role;
grant execute on function vc_private.reserve_provider_call(uuid) to authenticated,service_role;
create or replace function public.vc_reserve_provider_call(for_owner uuid default null) returns void
language sql security invoker set search_path='' as $$ select vc_private.reserve_provider_call(for_owner) $$;
revoke all on function public.vc_reserve_provider_call(uuid) from public,anon;
grant execute on function public.vc_reserve_provider_call(uuid) to authenticated,service_role;
notify pgrst,'reload schema';
