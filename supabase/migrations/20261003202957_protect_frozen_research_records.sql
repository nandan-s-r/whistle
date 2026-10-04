-- REST writes must enforce the same frozen-history boundary as app actions.
-- Missing legacy collections are empty; existing items retain their exact
-- ordered JSONB representation. New versions may only be appended.
create function vc_private.protect_frozen_research() returns trigger
language plpgsql security invoker set search_path='' as $$
declare
 collection text; before_items jsonb; after_items jsonb; previous_count integer;
begin
 if jsonb_typeof(new.data) is distinct from 'object' then
   raise exception 'Research data must be an object' using errcode='42501';
 end if;
 foreach collection in array array['models','memos','decisions','observations','alert_reviews','viewpoints','operating_models'] loop
   before_items=coalesce(old.data->collection,'[]'::jsonb);
   after_items=coalesce(new.data->collection,'[]'::jsonb);
   if jsonb_typeof(before_items) is distinct from 'array' or jsonb_typeof(after_items) is distinct from 'array' then
     raise exception 'Frozen research collections must be arrays' using errcode='42501';
   end if;
   previous_count=jsonb_array_length(before_items);
   if jsonb_array_length(after_items)<previous_count or exists(
     select 1 from jsonb_array_elements(before_items) with ordinality item(value,position)
     where item.value is distinct from after_items->((item.position-1)::integer)
   ) then
     raise exception 'Frozen research cannot be changed or removed; append a new version' using errcode='42501';
   end if;
 end loop;
 return new;
end $$;
revoke all on function vc_private.protect_frozen_research() from public,anon,authenticated;
create trigger vc_frozen_research before update on public.vc_companies
 for each row execute function vc_private.protect_frozen_research();
create trigger whistle_frozen_research before update on public.whistle_fund_companies
 for each row execute function vc_private.protect_frozen_research();
