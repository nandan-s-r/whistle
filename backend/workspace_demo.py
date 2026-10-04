"""Fictional research scenario. No demo source is represented as a real website."""
from datetime import datetime, timedelta, timezone
from backend.workspace_schema import Company, now


def demo_companies(owner):
    companies = []
    for index, (slug, name, founder, employer, sector, score, description) in enumerate([
        ("atlasops", "AtlasOps", "Aarav Mehta", "McKinsey", "B2B SaaS", 86, "An operating layer for procurement teams at India's mid-market manufacturers."),
        ("ledgermesh", "LedgerMesh", "Nisha Rao", "BCG", "B2B SaaS", 81, "Reconciliation infrastructure for finance teams managing multi-entity operations."),
        ("infrapilot", "InfraPilot", "Kabir Shah", "Google", "DevTools", 78, "Cloud cost controls for engineering teams moving from startup to scale."),
        ("coreledger", "CoreLedger", "Riya Sen", "Microsoft", "FinTech", 74, "A shared ledger for businesses collecting payments across multiple channels."),
    ]):
        at = now()
        captured = (datetime.now(timezone.utc) - timedelta(days=3+index)).isoformat()
        statements = [
            f"{founder} is the founder and CEO, with prior experience at {employer}.",
            "The company serves India-based business customers.",
            "Annual recurring revenue is $600,000, reported by the founder.",
            "Median sales cycle is below 60 days.",
            "Net revenue retention exceeds 120%.",
            "Expansion is repeatable across customer cohorts.",
        ]
        sources = [
            {"id": "S01", "title": "Founder biography", "file": f"demo://{slug}/biography", "captured_at": captured, "excerpt": statements[0], "method": "Illustrative company-site excerpt"},
            {"id": "S02", "title": "Product and customer overview", "file": f"demo://{slug}/product", "captured_at": captured, "excerpt": description + " " + statements[1], "method": "Illustrative product-page excerpt"},
            {"id": "S03", "title": "Founder seed deck", "file": f"demo://{slug}/deck", "captured_at": captured, "excerpt": "ARR $600k; median sales cycle 45 days; NRR 125%. These figures are founder-reported.", "method": "Illustrative deck extraction"},
            {"id": "S04", "title": "Customer reference notes", "file": f"demo://{slug}/reference", "captured_at": captured, "excerpt": "Procurement took 92 days. The customer expanded seats once; broader cohort evidence is unavailable.", "method": "Illustrative analyst call notes"},
            {"id": "S05", "title": "September portfolio update", "file": f"demo://{slug}/update", "captured_at": captured, "excerpt": "Cash $1.2m; net monthly burn $120k; NRR 108%.", "method": "Illustrative founder update"},
        ]
        evidence = []
        claims = []
        states = ["Verified", "Verified", "Founder-reported", "Conflicted", "Conflicted", "Missing"]
        mapping = [["S01"], ["S02"], ["S03"], ["S03", "S04"], ["S03", "S05"], []]
        questions = ["Confirm employment dates and responsibilities.", "Speak to three target customers.", "Reconcile ARR with billing records.", "What is the sales cycle by cohort?", "Reconcile retention definitions and periods.", "Which cohorts demonstrate repeatable expansion?"]
        for i, statement in enumerate(statements):
            cid = f"C{i+1:02d}"
            ids = []
            for sid in mapping[i]:
                eid = f"E{len(evidence)+1:02d}"
                ids.append(eid)
                evidence.append({"id": eid, "source_id": sid, "claim_id": cid, "confidence": 85 if i < 2 else 55, "reviewer": owner if i < 2 else None, "last_reviewed_at": at if i < 2 else None})
            claims.append({"id": cid, "statement": statement, "state": states[i], "evidence_ids": ids, "owner": owner, "question": questions[i], "topic": "founder" if i == 0 else "company" if i == 1 else "traction"})
        values = [("pre_money", "Entry valuation", 8000000, "USD", None), ("check", "Initial investment", 500000, "USD", None), ("dilution", "Subsequent dilution", .35, "ratio", None), ("follow_on", "Follow-on investment", 350000, "USD", None), ("follow_on_post_money", "Follow-on post-money", 20000000, "USD", None), ("years", "Holding period", 5, "years", None), ("arr", "Year 5 ARR", 18000000, "USD", None), ("multiple", "Exit ARR multiple", 7, "x", None)]
        companies.append(Company(
            id=slug, name=name, domain=f"{slug}.example", sector=sector, geography="India", stage="Seed", owner=owner,
            description=description, why_now="Fragmented workflows and pressure on operating efficiency create a credible entry wedge.",
            next_action="Complete three customer references and reconcile sales-cycle evidence.",
            in_pipeline=index in (1, 3), portfolio=index==3, signal_at=captured, founder_signal="New venture",
            fit_score=score, fit_dimensions={"Thesis alignment": 30-index*2, "Prior operator experience": 25-index, "Founder signal": 20, "Evidence coverage": score-(75-index*3)},
            reason_codes=["India-based business software", f"Prior operator: {employer}", "Current founder / CEO", "New venture signal"],
            people=[{"id": f"P{index+1}", "name": founder, "role": "Founder / CEO", "previous_employer": employer, "confidence": 85}],
            sources=sources, evidence=evidence, claims=claims,
            assumptions=[{"id": k, "label": label, "value": value, "unit": unit, "source_id": source, "rationale": "Illustrative founder deck" if source else "Analyst scenario assumption; requires validation", "owner": owner, "modified_at": at} for k,label,value,unit,source in values],
            metrics=[{"id": "runway", "label": "Cash runway", "definition": "Cash / net monthly burn", "period": "September 2026", "value": 10, "expected": 14, "unit": "months", "state": "Calculated", "source_id": "S05"}, {"id": "nrr", "label": "Net revenue retention", "definition": "Ending recurring revenue / beginning revenue for the same cohort", "period": "September 2026", "value": 108, "expected": 120, "unit": "%", "state": "Founder-reported", "source_id": "S05"}],
            triggers=[{"id": "T01", "label": "Revisit financing plan below 12 months runway", "metric_id": "runway", "operator": "lt", "threshold": 12, "owner": owner}],
            risks=[{"id": "R01", "title": "Procurement exceeds the underwriting case", "severity": "High", "claim_id": "C04", "question": questions[3], "owner": owner, "due_date": (datetime.now(timezone.utc)+timedelta(days=7)).date().isoformat()}, {"id": "R02", "title": "Expansion remains unproven", "severity": "Medium", "claim_id": "C06", "question": questions[5], "owner": owner, "due_date": (datetime.now(timezone.utc)+timedelta(days=10)).date().isoformat()}],
            interactions=[{"id": "I01", "kind": "Source capture", "note": "Illustrative research scenario initialized; no public data was crawled.", "actor": owner, "at": at}],
        ))
    return companies
