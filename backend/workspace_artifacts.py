"""Cited analyst templates use only the selected company's records."""
from backend.workspace_schema import EvidenceState
import hashlib
import json
import csv
import io
import zipfile


def research_hash(company):
    data=company.model_dump(mode="json")
    fields=("name","domain","description","why_now","disposition","next_action","sources","claims","evidence","assumptions","risks","diligence_tasks","decisions")
    scoped={k:data[k] for k in fields}
    for source in scoped['sources']:
        for key, default in {'published_on':None,'observed_on':None,'origin_source_id':None,'rights':'Unknown','rights_note':'','availability':'Available'}.items():
            if source.get(key) == default: source.pop(key,None)
    for key in ('observations','conditions','viewpoints','opportunities','operating_models'):
        if data[key]: scoped[key]=data[key]
    affiliations=[{'id':p['id'],'affiliations':p['affiliations']} for p in data['people'] if p['affiliations']]
    if affiliations: scoped['affiliations']=affiliations
    for task in scoped['diligence_tasks']:
        for key, default in {'decision_impact':'','effort_hours':None,'changed_view':'Not assessed','impact_rationale':''}.items():
            if task.get(key) == default: task.pop(key,None)
    # Additive defaults must not mark old, unchanged research as revised.
    for risk in scoped["risks"]:
        for key, default in {"status":"Open","rationale":"","outcome":"","source_ids":[],"updated_at":None,"updated_by":None}.items():
            if risk.get(key) == default:
                risk.pop(key, None)
    scoped["model"]=data["models"][-1] if data["models"] else None
    return hashlib.sha256(json.dumps(scoped,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()


def review_pack(company,revision,memo=None):
    """Portable owned research; current work and frozen memo remain distinct."""
    output=io.BytesIO()
    def table(rows):
        stream=io.StringIO(newline='');writer=csv.writer(stream)
        for row in rows:
            writer.writerow([("'"+v if v.lstrip().startswith(('=','+','-','@')) or v.startswith(('\t','\r')) else v) if isinstance(v,str) else v for v in row])
        return stream.getvalue()
    model=next((m for m in company.models if m['version']==memo['model_version']),None) if memo else (company.models[-1] if company.models else None)
    with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as bundle:
        def document(name,value): bundle.writestr(name,json.dumps(value,ensure_ascii=False,indent=2))
        document('manifest.json',{'company':company.name,'company_revision':revision,'illustrative':company.illustrative,'memo_version':memo['version'] if memo else None,'model_version':model['version'] if model else None,'memo_matches_current_research':memo.get('research_hash')==research_hash(company) if memo and memo.get('research_hash') else None,'scope':'Current research and selected frozen artifacts; no external fetch or sharing.'})
        bundle.writestr('README.txt','Whistle review pack\n'+('FICTIONAL DEMONSTRATION\n' if company.illustrative else 'MANUAL RESEARCH\n')+'current-company.json, claims.csv and diligence.csv describe the current record.\nA selected memo and its linked model are frozen historical artifacts and may differ from current research.\nTask completion does not verify a claim. Missing facts remain missing. Pending AI drafts remain proposals.\nPDF memo is included when a memo is selected; editable PowerPoint is included up to 500 slides, otherwise presentation-omitted.txt explains the limit; Excel is included only when a financial model exists.\nReview source excerpts, dates and original URLs before relying on any claim.\n')
        document('current-company.json',company.model_dump(mode='json'))
        bundle.writestr('claims.csv',table([['Claim ID','Statement','State','Question','Sources']]+[[c.id,c.statement,c.state.value,c.question,'; '.join(e.source_id for e in company.evidence if e.claim_id==c.id)] for c in company.claims]))
        bundle.writestr('sources.csv',table([['Source ID','Title','URL','Captured','Published','Observed','Origin','Rights','Rights note','Availability','Method','Excerpt']]+[[s.id,s.title,s.url or s.file,s.captured_at,s.published_on,s.observed_on,s.origin_source_id,s.rights,s.rights_note,s.availability,s.method,s.excerpt] for s in company.sources]))
        bundle.writestr('observations.csv',table([['ID','Metric','Definition','Unit','Currency','Period from','Period to','Value','Expected','State','Source','Review basis','Recorded by','Recorded at']]+[[o.id,o.metric_id,o.definition,o.unit,o.currency,o.period_from,o.period_to,o.value,o.expected,o.state,o.source_id,o.rationale,o.recorded_by,o.recorded_at] for o in company.observations]))
        bundle.writestr('conditions.csv',table([['ID','Decision','Metric','Definition','Operator','Threshold','Owner','Due','Status','Resolution','Sources','Acknowledged by']]+[[c.id,c.decision_id,c.metric_id,c.metric_definition,c.operator,c.threshold,c.owner,c.due_date,c.status,c.resolution,'; '.join(c.source_ids),c.acknowledged_by] for c in company.conditions]))
        bundle.writestr('opportunities.csv',table([['ID','Name','Round','Stage','Reason','Currency','Completed amount','Ownership','Closed on','Approval basis','Sources']]+[[o.id,o.name,o.round,o.stage,o.rejection_reason,o.currency,o.invested,o.ownership,o.closed_on,o.approval_reference,'; '.join(o.source_ids)] for o in company.opportunities]))
        bundle.writestr('diligence.csv',table([['Task ID','Claim ID','Question','Owner','Due date','Status','Outcome','Sources','Decision impact','Estimated hours','Reviewed effect','Impact rationale']]+[[t.id,t.claim_id,t.question,t.owner,t.due_date,t.status,t.outcome,'; '.join(t.source_ids),t.decision_impact,t.effort_hours,t.changed_view,t.impact_rationale] for t in company.diligence_tasks]))
        if company.operating_models: document('operating-forecasts.json',[p.model_dump() for p in company.operating_models])
        if company.screening: bundle.writestr('screening.txt',company.screening)
        if memo:
            document('frozen-memo.json',memo);bundle.writestr('memo.txt',memo['text'])
            from backend.workspace_exports import memo_pdf,presentation_content,presentation_pptx
            slides=presentation_content(company,revision,memo)
            bundle.writestr('memo.pdf',memo_pdf(company,memo))
            if len(slides)<=500: bundle.writestr('investment-review.pptx',presentation_pptx(slides))
            else: bundle.writestr('presentation-omitted.txt','This memo exceeds the 500-slide limit. The complete PDF and text remain included; create a shorter memo for PowerPoint.')
            document('memo-comments.json',[c.model_dump() for c in company.memo_comments if c.memo_version==memo['version']])
        if model:
            document('frozen-model.json',model)
            from backend.workspace_exports import model_xlsx
            bundle.writestr('underwriting.xlsx',model_xlsx(company,model,memo['sources'] if memo else None))
            bundle.writestr('returns.csv',table([['Scenario','MOIC','IRR']]+[[name,s['moic'],s['irr']] for name,s in model['scenarios'].items()]))
    return output.getvalue()


def citations(company, claim):
    return " ".join(f"[{e.source_id}]" for e in company.evidence if e.claim_id == claim.id) or "[No evidence]"


def memo_text(company, revision):
    approved = [c for c in company.claims if c.state == EvidenceState.verified]
    def section(topic, missing):
        selected = [c for c in approved if c.topic == topic or (company.illustrative and c.id == {"founder":"C01", "company":"C02"}.get(topic))]
        return "\n".join(f"• {c.statement} {citations(company,c)}" for c in selected) or missing
    last = company.decisions[-1] if company.decisions else None
    return "\n\n".join([
        f"INVESTMENT COMMITTEE · {company.name}\n{'Illustrative scenario · ' if company.illustrative else ''}Draft for analyst review",
        f"EXECUTIVE RECOMMENDATION\n{company.disposition}. {last.rationale if last else 'No formal analyst rationale recorded yet.'}",
        f"WHY NOW\n{company.why_now or 'No why-now thesis recorded.'} [Analyst hypothesis; requires validation]",
        "WHY THIS TEAM\n" + section("founder", "No approved founder-background claim. Verification required."),
        "WHY THIS MARKET\n" + section("market", "Market size, customer budgets and the market map remain unverified."),
        "WHY THE COMPANY CAN WIN\nDurable differentiation has not been established by verification alone. An analyst must explain how the approved company facts support a competitive advantage.\n" + section("company", "No approved company/product claim. Differentiation requires diligence."),
        "REVIEWED EVIDENCE BEHIND THE RECOMMENDATION\n" + ("\n".join(f"• {c.statement} {citations(company,c)}" for c in approved) or "No approved material claims."),
        "MATERIAL RISKS / COUNTER-CASE\n" + ("\n".join(f"• {r.title}: {r.question} [{r.claim_id}] {r.severity} / {r.status}. Owner: {r.owner}; due {r.due_date}." + (f" Assessment: {r.rationale}" if r.rationale else " Assessment rationale not recorded.") + (f" Outcome: {r.outcome}" if r.outcome else "") + (" Sources: " + " ".join(f"[{s}]" for s in r.source_ids) if r.source_ids else "") for r in company.risks) or "No material risk assessment recorded. This is missing work, not evidence of low risk."),
        "DILIGENCE WORK / OUTCOMES\n" + ("\n".join(f"• {t.title} [{t.claim_id}] — {t.status}; owner {t.owner}; due {t.due_date}. {t.outcome or 'Outcome not yet recorded.'} "+(' '.join(f'[{s}]' for s in t.source_ids) or '[No outcome source]') for t in company.diligence_tasks) or "No editable diligence plan recorded. Questions remain unresolved until researched and reviewed."),
        "OPEN ASSUMPTIONS\n" + "\n".join(f"• {a.label}: {format(a.value, ',.2f') if a.value is not None else 'Missing'} {a.unit} — {a.rationale}" for a in company.assumptions),
        'OPERATING FORECAST / NOT VERIFIED FACTS\n' + ('\n'.join(f'{p.name} / v{p.version}: {p.currency}; terminal ARR {p.rows[-1]["arr"]:,.2f}; revenue {p.rows[-1]["revenue"]:,.2f}. {p.rationale}\n{p.method}' for p in company.operating_models[-1:]) or 'No operating forecast recorded.'),
        "RETURN SCENARIOS\n" + ("\n".join(f"{name}: {s['moic']:.2f}x MOIC, {s['irr']:.1%} IRR" for name,s in company.models[-1]["scenarios"].items()) if company.models else "No return model prepared. This Pass decision relies on the documented evidence and rationale; missing financial inputs have not been invented."),
        f"DISSENT / OBJECTIONS\n{last.objections if last and last.objections else 'Dissent not yet recorded.'}",
        "REVIEWER VIEWPOINTS / NOT VERIFIED FACTS\n" + ('\n'.join(f'{v.author} / {v.position}: {v.case}\nAssumption: {v.assumption}\nResolving question: {v.resolving_question}' for v in company.viewpoints) or 'No individual viewpoints recorded.'),
        "DECISION CONDITIONS\n" + ('\n'.join(f'{c.title}: decision {c.decision_id}; {c.metric_id} {c.operator} {c.threshold} {c.metric_unit}; definition: {c.metric_definition}; {c.status}; owner {c.owner}; due {c.due_date}. {c.resolution}' for c in company.conditions) or 'No decision-linked measurable condition recorded.'),
        "OBSERVATIONS / REPORTING DEFINITIONS\n" + ('\n'.join(f'{o.label}: {o.value} {o.unit}; {o.period_from} to {o.period_to}; {o.state}; [{o.source_id}]. Definition: {o.definition}' for o in company.observations) or 'No new dated observation history recorded.'),
        "OPPORTUNITIES / RECORDED EXTERNAL STATUS\n" + ('\n'.join(f'{o.name}: {o.round} / {o.stage}. {o.rationale}' for o in company.opportunities) or 'No separately reviewed investment round recorded.'),
        "DECISION HISTORY\n" + ("\n".join(f"{d.at} · {d.author} · {d.disposition}: {d.rationale}" for d in company.decisions) or "No formal decision history."),
        f"CONDITIONS THAT WOULD REVERSE THE DECISION\n{company.next_action}",
        "MONITORING TRIGGERS\n" + ("\n".join(f"• {t.label}; {t.metric_id} {t.operator} {t.threshold}; owner {t.owner}." for t in company.triggers) or "No measurable monitoring rule recorded. Convert the reversal condition into a metric and threshold."),
        f"MODEL / EVIDENCE SNAPSHOT\n{'Frozen model v'+str(len(company.models)) if company.models else 'No financial model frozen'}; company revision {revision}. Later edits do not rewrite this memo's sources or calculations.",
    ])
