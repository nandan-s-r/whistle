-- Active opportunities remain editable. A previously completed holding must
-- survive every direct REST or application UPDATE exactly once and unchanged.
create function vc_private.protect_completed_holdings() returns trigger
language plpgsql security invoker set search_path='' as $$
declare
 before_items jsonb; after_items jsonb; holding jsonb; matching_count integer;
begin
 before_items=coalesce(old.data->'opportunities','[]'::jsonb);
 after_items=coalesce(new.data->'opportunities','[]'::jsonb);
 if jsonb_typeof(after_items) is distinct from 'array' or jsonb_typeof(before_items) is distinct from 'array' then
   raise exception 'Opportunities must remain an array' using errcode='42501';
 end if;
 for holding in select value from jsonb_array_elements(before_items) where value->>'stage'='Closed' loop
   if jsonb_typeof(holding->'id') is distinct from 'string' or holding->>'id'='' then
     raise exception 'A completed holding requires a stable identity' using errcode='42501';
   end if;
   select count(*) into matching_count from jsonb_array_elements(after_items) item
     where item->'id'=holding->'id';
   if matching_count<>1 or not exists(
     select 1 from jsonb_array_elements(after_items) item where item=holding
   ) then
     raise exception 'A completed holding cannot be changed or removed; record a new opportunity' using errcode='42501';
   end if;
 end loop;
 return new;
end $$;
revoke all on function vc_private.protect_completed_holdings() from public,anon,authenticated;
create trigger vc_completed_holdings before update on public.vc_companies
 for each row execute function vc_private.protect_completed_holdings();
create trigger whistle_completed_holdings before update on public.whistle_fund_companies
 for each row execute function vc_private.protect_completed_holdings();
