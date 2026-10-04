"""Compare recorded premises, without grading historical decisions by hindsight."""


def premise_changes(before, after):
    changes = []
    for field in ('description', 'why_now'):
        if before.get(field) != after.get(field):
            changes.append({'kind':'Company context','record':field,'before':before.get(field), 'after':after.get(field)})
    definitions = {
        'claims': ('Claim', ('statement','state','question','evidence_ids')),
        'sources': ('Source', ('title','url','file','excerpt','published_on','observed_on','origin_source_id','availability','rights','rights_note')),
        'assumptions': ('Assumption', ('label','value','unit','source_id','rationale')),
        'metrics': ('Metric', ('definition','period','value','expected','unit','source_id','state')),
        'risks': ('Risk', ('title','severity','status','rationale','outcome','source_ids')),
        'diligence_tasks': ('Diligence work', ('question','status','outcome','source_ids','decision_impact','effort_hours','changed_view','impact_rationale')),
    }
    source_defaults={'published_on':None,'observed_on':None,'origin_source_id':None,'availability':'Available','rights':'Unknown','rights_note':''}
    for collection, (kind, fields) in definitions.items():
        old={v['id']:v for v in before.get(collection,[])}; new={v['id']:v for v in after.get(collection,[])}
        for identity in sorted(old.keys()|new.keys()):
            prior, current = old.get(identity), new.get(identity)
            def select(item):
                if item is None: return None
                defaults=source_defaults if collection=='sources' else {'decision_impact':'','effort_hours':None,'changed_view':'Not assessed','impact_rationale':''} if collection=='diligence_tasks' else {}
                return {f:item.get(f,defaults.get(f)) for f in fields}
            if select(prior)!=select(current):
                changes.append({'kind':kind,'record':identity,'before':select(prior),'after':select(current)})
    for collection, kind in (('observations','Observation'),('viewpoints','Reviewer view'),('opportunities','Opportunity'),('conditions','Decision condition')):
        old={v['id']:v for v in before.get(collection,[])}
        for item in after.get(collection,[]):
            if old.get(item['id'])!=item:
                changes.append({'kind':kind,'record':item['id'],'before':old.get(item['id']),'after':item})
    versions={p['version'] for p in before.get('operating_models',[])}
    for p in after.get('operating_models',[]):
        if p['version'] not in versions:
            changes.append({'kind':'Operating forecast','record':str(p['version']),'before':None,'after':p})
    return changes
