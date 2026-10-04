import type { Company } from './workspace';
import type { Source } from './workspace';
export interface Observation {
  id:string; metric_id:string; label:string; definition:string; unit:string; currency:string|null;
  period_from:string; period_to:string; value:number; expected:number|null; source_id:string;
  state:'Verified'|'Founder-reported'|'Calculated'; rationale:string; calculation:string;
  meeting_id:string|null; recorded_at:string; recorded_by:string;
}
export interface DecisionCondition {
  id:string; title:string; decision_id:string; metric_id:string; operator:'lt'|'gt'|'lte'|'gte';threshold:number;
  owner:string;due_date:string;rationale:string;status:'Active'|'Resolved'|'Paused';resolution:string;source_ids:string[];
  metric_definition:string;metric_unit:string;metric_currency:string|null;baseline_observation_id:string|null;
  acknowledged_at:string|null;acknowledged_by:string|null;updated_at:string;updated_by:string;
  evaluation_version:number;
  owner_identity:string|null;
}
export interface Viewpoint {id:string;position:'For'|'Against'|'Undecided';case:string;assumption:string;resolving_question:string;claim_ids:string[];memo_version:number|null;author:string;at:string;company_revision:number}
export interface Opportunity {id:string;name:string;round:string;stage:'Research'|'Diligence'|'IC review'|'Approved'|'Committed'|'Closed'|'Rejected';rationale:string;approval_reference:string;currency:string;invested:number|null;ownership:number|null;closed_on:string|null;source_ids:string[];rejection_reason:string|null;updated_at:string;updated_by:string}
export interface Affiliation {id:string;person_id:string;company_name:string;company_domain:string;role:string;started_on:string;ended_on:string|null;source_id:string;rationale:string;at:string;author:string}
export interface AlertReview {id:string;condition_id:string;observation_id:string;classification:string;rationale:string;at:string;author:string;evaluation_version:number}
export function latestObservation(company:Company,metricId:string) {
  return (company.observations??[]).filter(o=>o.metric_id===metricId).sort((a,b)=>b.period_to.localeCompare(a.period_to)||b.recorded_at.localeCompare(a.recorded_at)||b.id.localeCompare(a.id))[0];
}
export function sourceOrigin(company:Company,id:string) {
  const seen=new Set<string>();let current=id;
  while(!seen.has(current)){seen.add(current);const next=company.sources.find(s=>s.id===current)?.origin_source_id;if(!next)return current;current=next;}
  return id;
}
export function personIdentity(profile:string|null) {
  if(!profile)return null;
  try {const u=new URL(profile);return `${u.hostname.toLowerCase().replace(/^www\./,'')}${u.pathname.replace(/\/$/,'').toLowerCase()}`;}catch{return null;}
}
export function repeatedSources(sources:Source[]) {
  const urls=new Map<string,string>();const excerpts=new Map<string,string>();
  const suggestions:{source:string;original:string;basis:string}[]=[];
  for(const source of sources){
    let url='';try{if(source.url){const u=new URL(source.url);u.hash='';
      for(const key of [...u.searchParams.keys()])if(/^utm_|^(fbclid|gclid|msclkid)$/i.test(key))u.searchParams.delete(key);
      u.searchParams.sort();url=u.toString();}}catch{}
    const excerpt=source.excerpt.trim().toLowerCase().replace(/\s+/g,' ');
    const original=(url&&urls.get(url))||(excerpt.length>=120&&excerpts.get(excerpt));
    if(original&&original!==source.origin_source_id)suggestions.push({source:source.id,original,basis:url&&urls.has(url)?'Same source URL':'Same captured excerpt'});
    if(url&&!urls.has(url))urls.set(url,source.id);
    if(excerpt.length>=120&&!excerpts.has(excerpt))excerpts.set(excerpt,source.id);
  }
  return suggestions;
}
export function reviewOutcomes(companies:Company[]) {
 const runs=companies.flatMap(c=>c.ai_runs);const reviewed=runs.filter(r=>r.status!=='Draft');
 const completed=companies.flatMap(c=>c.diligence_tasks).filter(t=>t.status==='Complete');
 const assessed=completed.filter(t=>t.changed_view&&t.changed_view!=='Not assessed');
 return {drafts:runs.length,pending:runs.length-reviewed.length,reviewed:reviewed.length,approved:reviewed.filter(r=>r.status==='Approved').length,
   completed:completed.length,assessed:assessed.length,changed:assessed.filter(t=>['Strengthened','Weakened','Changed decision'].includes(t.changed_view!)).length,
   unacknowledged:companies.flatMap(c=>c.conditions??[]).filter(c=>c.status==='Active'&&!c.acknowledged_at).length};
}
