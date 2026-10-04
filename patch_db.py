import sys
sys.path.append('.')
from dotenv import load_dotenv
load_dotenv()
from database.db import SessionLocal
from database.models import SourcingLead, Startup, Meeting, Portfolio, MonitoringEvent, OutreachEmail, Founder
from datetime import datetime, timedelta
import random

db = SessionLocal()

# ── Seed sourcing leads if empty ──────────────────────────────────────────────
if db.query(SourcingLead).count() == 0:
    leads_data = [
        ("NeuroFlow AI", "https://neuroflow.ai", "Real-time neural interface SDK for BCI applications. Repo gained 1.4K stars in 72h.", "GitHub", 96, "New"),
        ("DataScale", "https://datascale.io", "Distributed ML training infra — 10x cost reduction vs AWS SageMaker.", "HN Launch", 91, "Screening"),
        ("Apex Security", "https://apexsec.io", "AI-powered zero-trust network — ex-Crowdstrike team, $2M pre-seed.", "Network", 88, "New"),
        ("HealthSync", "https://healthsync.ai", "Real-time patient vitals AI for ICUs. 3 hospital pilots signed.", "HN", 84, "Contacted"),
        ("Seam Social", "https://seam.so", "Creator economy platform — UGC monetization. 36% D30 retention.", "Product Hunt", 79, "New"),
        ("FinServe Inc", "https://finserve.io", "B2B payments infrastructure for emerging markets. $800K ARR.", "Twitter", 76, "Screening"),
        ("VaultAI", "https://vaultai.io", "Compliance automation for fintech — SOC2 in 48h. YC W24.", "YC", 93, "New"),
        ("LogicLoop", "https://logicloop.dev", "No-code internal tools builder for data teams. 400 paying teams.", "GitHub", 82, "New"),
    ]
    for name, web, desc, src, score, status in leads_data:
        lead = SourcingLead(
            company_name=name,
            website=web,
            description=desc,
            source=src,
            signal_score=score,
            status=status,
            discovered_at=datetime.now() - timedelta(days=random.randint(0, 14))
        )
        db.add(lead)
    db.commit()
    print(f"Seeded {len(leads_data)} sourcing leads")
else:
    print(f"Leads already seeded: {db.query(SourcingLead).count()}")

# ── Verify all counts ─────────────────────────────────────────────────────────
print("=== FINAL DB COUNTS ===")
print("Startups:", db.query(Startup).count())
print("Founders:", db.query(Founder).count())
print("Meetings:", db.query(Meeting).count())
print("Portfolio:", db.query(Portfolio).count())
print("Events:", db.query(MonitoringEvent).count())
print("Outreach:", db.query(OutreachEmail).count())
print("Leads:", db.query(SourcingLead).count())

db.close()
print("DONE")
