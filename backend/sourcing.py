"""Legacy sourcing compatibility: only explicit, deterministic illustrative records."""
from datetime import datetime
from database.db import SessionLocal
from database.models import SourcingLead

def run_crawlers_and_evaluate():
    """Historical function name retained for callers. No crawling or inference occurs."""
    fixtures = [
        ("AtlasOps (illustrative)", "https://atlasops.example", "Fictional India B2B procurement software; founder background is illustrative.", 86),
        ("LedgerMesh (illustrative)", "https://ledgermesh.example", "Fictional finance reconciliation software; no external sources were retrieved.", 81),
        ("InfraPilot (illustrative)", "https://infrapilot.example", "Fictional cloud cost controls; demonstration fit rubric only.", 78),
    ]
    with SessionLocal() as db:
        count=0
        for name,url,description,score in fixtures:
            if db.query(SourcingLead).filter_by(company_name=name).first():
                continue
            db.add(SourcingLead(company_name=name, website=url, description=description, source="Illustrative demo fixture (no crawl)", signal_score=score, status="New", discovered_at=datetime.utcnow()))
            count+=1
        db.commit()
        return count

def evaluate_customer_obsession(name: str, description: str) -> tuple[int, str]:
    return 0, "Unverified: no customer evidence supplied"
