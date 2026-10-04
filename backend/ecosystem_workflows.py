"""Apply validated local handoffs through the existing owned revision transaction."""
from uuid import uuid4
from fastapi import HTTPException
from backend.workspace_schema import Metric, Interaction
from backend.ecosystem_schema import Observation, DecisionCondition, AlertReview, Viewpoint, Opportunity, Affiliation


def observation_for(company, condition):
    records = [o for o in company.observations if o.metric_id == condition.metric_id]
    return max(records, key=lambda o: (o.period_to, o.recorded_at, o.id)) if records else None


def condition_state(company, condition):
    if condition.status != 'Active': return condition.status
    observation = observation_for(company, condition)
    if not observation: return 'Missing observation'
    if (observation.definition, observation.unit, observation.currency) != (condition.metric_definition, condition.metric_unit, condition.metric_currency):
        return 'Definition changed'
    if observation.state == 'Founder-reported': return 'Needs evidence review'
    value = observation.value
    crossed = {'lt': value < condition.threshold, 'gt': value > condition.threshold,
               'lte': value <= condition.threshold, 'gte': value >= condition.threshold}[condition.operator]
    if not crossed: return 'Watching'
    review = next((r for r in reversed(company.alert_reviews) if r.condition_id == condition.id and r.observation_id == observation.id and r.evaluation_version == condition.evaluation_version), None)
    return 'Reviewed observation' if review else 'Review required'


def apply_ecosystem(company, payload, user, at, revision):
    uid = uuid4().hex[:12]
    sources = {s.id for s in company.sources}
    action = payload.action
    if action == 'source_context':
        data = payload.source_context
        source = next((s for s in company.sources if data and s.id == data.source_id), None)
        if not source: raise HTTPException(422, 'Select a source from this company')
        if data.origin_source_id and data.origin_source_id not in sources:
            raise HTTPException(422, 'Select an original source from this company')
        for key, value in data.model_dump(exclude={'source_id'}).items(): setattr(source, key, value)
        note = f'{source.id}: origin, dates, rights and availability reviewed; captured excerpt retained.'
    elif action == 'observation':
        data = payload.observation
        if not data or data.source_id not in sources or (data.meeting_id and data.meeting_id not in {m.id for m in company.meetings}):
            raise HTTPException(422, 'Link this observation to a captured source and optional owned meeting')
        metric = next((m for m in company.metrics if m.id == data.metric_id), None)
        if data.metric_id and not metric: raise HTTPException(422, 'Select an owned metric')
        if metric and (metric.definition != data.definition or metric.unit != data.unit):
            raise HTTPException(422, 'Create a separate metric when its definition or unit changes')
        prior = [o for o in company.observations if o.metric_id == data.metric_id]
        if prior and prior[-1].currency != data.currency:
            raise HTTPException(422, 'Create a separate metric when currency changes')
        mid = metric.id if metric else 'K'+uid
        observation = Observation(**{**data.model_dump(), 'id':'O'+uid, 'metric_id':mid, 'recorded_at':at, 'recorded_by':user.full_name})
        company.observations.append(observation)
        latest = max([o for o in company.observations if o.metric_id == mid], key=lambda o:(o.period_to,o.recorded_at,o.id))
        updated = Metric(id=mid,label=latest.label,definition=latest.definition,period=f'{latest.period_from} to {latest.period_to}',
                         value=latest.value,expected=latest.expected,unit=latest.unit,state=latest.state,source_id=latest.source_id)
        company.metrics = [updated if m.id == mid else m for m in company.metrics] if metric else [*company.metrics, updated]
        note = f'{observation.id}: {data.label}; {data.period_from} to {data.period_to}; {data.state}. Earlier observations retained.'
    elif action == 'condition':
        data = payload.condition
        metric = next((m for m in company.metrics if data and m.id == data.metric_id), None)
        if not data or not metric or data.decision_id not in {d.id for d in company.decisions} or not set(data.source_ids).issubset(sources):
            raise HTTPException(422, 'Link the condition to this company decision, metric and sources')
        old = next((c for c in company.conditions if c.id == data.id), None)
        if data.id and not old: raise HTTPException(404, 'Condition not found')
        if old and (data.metric_id != old.metric_id or data.decision_id != old.decision_id):
            raise HTTPException(422, 'Create a new condition for a different metric or decision')
        observation = observation_for(company, type('MetricRef', (), {'metric_id':metric.id})())
        item = DecisionCondition(**{**data.model_dump(), 'id':old.id if old else 'T'+uid,
            'metric_definition':old.metric_definition if old else metric.definition,
            'metric_unit':old.metric_unit if old else metric.unit,
            'metric_currency':old.metric_currency if old else observation.currency if observation else None,
            'baseline_observation_id':old.baseline_observation_id if old else observation.id if observation else None,
            'acknowledged_at':old.acknowledged_at if old and old.owner == data.owner else None,
            'acknowledged_by':old.acknowledged_by if old and old.owner == data.owner else None,
            'owner_identity':old.owner_identity if old and old.owner == data.owner and old.owner_identity else str(user.id) if data.owner.casefold()==user.full_name.casefold() else None,
            'updated_at':at,'updated_by':user.full_name,
            'evaluation_version':old.evaluation_version + int((old.operator,old.threshold)!=(data.operator,data.threshold)) if old else 1})
        company.conditions = [item if c.id == item.id else c for c in company.conditions] if old else [*company.conditions,item]
        note = f'{item.id}: {data.status}; decision {data.decision_id}; {data.rationale}'
    elif action == 'acknowledge_condition':
        item = next((c for c in company.conditions if c.id == payload.condition_id), None)
        if not item: raise HTTPException(404, 'Condition not found')
        if item.owner_identity != str(user.id):
            raise HTTPException(403, 'Only the assigned account can acknowledge this responsibility; review the assignment first')
        item.acknowledged_at, item.acknowledged_by = at, user.full_name
        note = f'{item.id}: review responsibility acknowledged.'
    elif action == 'alert_review':
        data = payload.alert_review
        condition = next((c for c in company.conditions if data and c.id == data.condition_id), None)
        observation = next((o for o in company.observations if data and o.id == data.observation_id), None)
        if not condition or not observation or observation.metric_id != condition.metric_id:
            raise HTTPException(422, 'Select the observation evaluated by this condition')
        if any(r.condition_id == condition.id and r.observation_id == observation.id and r.evaluation_version == condition.evaluation_version for r in company.alert_reviews):
            raise HTTPException(409, 'This observation alert already has a recorded review')
        company.alert_reviews.append(AlertReview(**{**data.model_dump(),'id':'A'+uid,'at':at,'author':user.full_name,'evaluation_version':condition.evaluation_version}))
        note = f'{condition.id} / {observation.id}: {data.classification}. {data.rationale}. Decision and source unchanged.'
    elif action == 'viewpoint':
        data = payload.viewpoint
        if not data or len(set(data.claim_ids)) != len(data.claim_ids) or not set(data.claim_ids).issubset({c.id for c in company.claims}) or (data.memo_version and data.memo_version not in {m['version'] for m in company.memos}):
            raise HTTPException(422, 'Reference claims and a memo version from this company')
        company.viewpoints.append(Viewpoint(**{**data.model_dump(),'id':'V'+uid,'author':user.full_name,'at':at,'company_revision':revision}))
        note = f'{data.position}: {data.case}. Separate reviewer view; no automatic decision.'
    elif action == 'opportunity':
        data = payload.opportunity
        if not data or not set(data.source_ids).issubset(sources):
            raise HTTPException(422, 'Use documentary sources captured in this company')
        old = next((o for o in company.opportunities if o.id == data.id), None)
        if data.id and not old: raise HTTPException(404, 'Opportunity not found')
        if old and old.stage == 'Closed' and data.model_dump(exclude={'id'}) != old.model_dump(exclude={'id','updated_at','updated_by'}):
            raise HTTPException(422, 'A completed holding is retained; record a new opportunity instead of rewriting it')
        item = old if old and old.stage == 'Closed' else Opportunity(**{**data.model_dump(),'id':old.id if old else 'D'+uid,'updated_at':at,'updated_by':user.full_name})
        company.opportunities = [item if o.id == item.id else o for o in company.opportunities] if old else [*company.opportunities,item]
        if data.stage == 'Closed': company.portfolio = True
        note = f'{item.id}: {data.round} / {data.stage}. {data.rationale}. Recorded external status; no transaction executed.'
    elif action == 'affiliation':
        data = payload.affiliation
        person = next((p for p in company.people if data and p.id == data.person_id), None)
        if not person or data.source_id not in sources: raise HTTPException(422, 'Link a recorded person and source')
        if any(a.company_domain == data.company_domain and a.role == data.role and a.started_on == data.started_on for a in person.affiliations):
            raise HTTPException(409, 'This employment period is already recorded')
        person.affiliations.append(Affiliation(**{**data.model_dump(),'id':'P'+uid,'at':at,'author':user.full_name}))
        note = f'{person.name}: sourced {data.role} at {data.company_name}; employment is not automatically verified.'
    else: return False
    company.interactions.append(Interaction(id=uid,kind='Review workflow',note=note,actor=user.full_name,at=at))
    return True
