"""Explainable query interpretation over owned records, never a web search."""
import re

EMPLOYERS = {'mbb': {'McKinsey','BCG','Bain'}, 'top tech': {'Google','Microsoft','Amazon','Meta','Apple','NVIDIA'}}


def query_constraints(query):
    q=query.casefold()
    rules=[('india','geography',{'India'}),('devtools','sector',{'DevTools'}),('fintech','sector',{'FinTech'}),('b2b saas','sector',{'B2B SaaS'}),('b2b','sector',{'B2B SaaS'}),('pre-series a','stage',{'Pre-seed','Seed'}),('pre series a','stage',{'Pre-seed','Seed'}),('pre-seed','stage',{'Pre-seed'}),('series a','stage',{'Series A'}),('seed','stage',{'Seed'}),('mbb','employer',EMPLOYERS['mbb']),('top tech','employer',EMPLOYERS['top tech']),('top-tech','employer',EMPLOYERS['top tech'])]
    rules += [(name.casefold(),'employer',{name}) for name in ['McKinsey','BCG','Bain','Google','Microsoft','Amazon','Meta','Apple','NVIDIA']]
    constraints={}; interpreted=[]
    remaining=q
    for phrase,key,values in rules:
        pattern=r'(?<!\w)'+re.escape(phrase)+r'(?!\w)'
        if re.search(pattern,remaining):
            constraints.setdefault(key,set()).update(values);interpreted.append(phrase)
            remaining=re.sub(pattern,' ',remaining)
    stop={'founder','founders','ceo','saas','ex','or','and','with','prior','experience','building','build','in','based','of','at','a','the','for','new','venture','companies','company','find','startups','startup','operator','operators'}
    terms=[t for t in re.findall(r'[\w]+',remaining) if t not in stop]
    return constraints,terms,interpreted


def person_matches(person, filters, constraints):
    employers=constraints.get('employer')
    if employers and person.previous_employer not in employers: return False
    if filters.employer!='All' and person.previous_employer not in EMPLOYERS.get(filters.employer.casefold(),{filters.employer}): return False
    if filters.role!='All' and filters.role.casefold() not in person.role.casefold(): return False
    return True
