import sys
import os
from datetime import datetime, timedelta

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.db import SessionLocal, engine
from database.models import Base, Startup, Founder, Meeting, Note, Score, Deck, Task, Deal, Portfolio, MonitoringEvent, SourcingLead, OutreachEmail

def seed_db():
    print("Seeding database...")
    db = SessionLocal()
    
    # Clean up existing tables
    print("Clearing existing data...")
    db.query(Startup).delete()
    db.query(Founder).delete()
    db.query(Meeting).delete()
    db.query(Note).delete()
    db.query(Score).delete()
    db.query(Deck).delete()
    db.query(Task).delete()
    db.query(Deal).delete()
    db.query(Portfolio).delete()
    db.query(MonitoringEvent).delete()
    db.query(SourcingLead).delete()
    db.query(OutreachEmail).delete()
    db.commit()

    # 1. Startups
    print("Creating startups...")
    startups = [
        Startup(
            name="DataScale",
            sector="AI / ML",
            stage="Series A",
            website="https://datascale.ai",
            linkedin="https://linkedin.com/company/datascale",
            team_size=42,
            location="San Francisco, CA",
            founded_year=2023,
            description="Distributed training data pipeline infrastructure for fine-tuning open-source LLMs.",
            problem="Fine-tuning frontier LLMs requires massive pre-processed datasets, causing GPU idle times during data loading.",
            solution="Zero-copy data loading protocol streaming directly from cloud objects to GPU memory caches.",
            moat="Proprietary RDMA kernel bypass drivers and exclusive partnerships with 3 major data labeling agencies.",
            gtm="Developer-led bottom-up adoption, targeting MLEs at mid-market tech companies.",
            revenue_arr="$2,100,000",
            revenue_growth_pct="180% YoY",
            last_round="Seed",
            valuation="$15,000,000",
            pipeline_stage="IC Review",
            priority=3,
            assigned_partner="Alex Reed",
            ai_score=78,
            investment_verdict="INVEST",
            ai_summary="Strong product-market fit in developer tooling. Exceptional engineering velocity. Potential valuation misalignment as founder asks for $40M pre-money.",
            tags=["AI Infra", "SaaS", "GPU Optimization"]
        ),
        Startup(
            name="NeuroFlow AI",
            sector="AI / ML",
            stage="Pre-seed",
            website="https://neuroflow.ai",
            linkedin="https://linkedin.com/company/neuroflow",
            team_size=4,
            location="New York, NY",
            founded_year=2025,
            description="Self-healing AI agent orchestration framework for back-office enterprise workflows.",
            problem="Existing workflow automation breaks when interface formats change, requiring manual developer intervention.",
            solution="Dynamic DOM-repair and execution path synthesis on the fly based on runtime state evaluations.",
            moat="First-mover advantage in self-healing graph execution. Proprietary fine-tuned web-agent models.",
            gtm="Direct outreach to Fortune 500 COOs, starting with insurance claim processing trials.",
            revenue_arr="N/A",
            revenue_growth_pct="N/A",
            last_round="N/A",
            valuation="N/A",
            pipeline_stage="Sourced",
            priority=2,
            assigned_partner="Sarah Jenkins",
            ai_score=82,
            investment_verdict="INVEST",
            ai_summary="High-conviction pre-seed lead. Founder previously built and sold an API infrastructure startup to Stripe. Repository showing anomalous star growth.",
            tags=["AI Agents", "Pre-revenue", "Repeat Founder"]
        ),
        Startup(
            name="FinServe Inc.",
            sector="FinTech",
            stage="Series B",
            website="https://finserve.co",
            linkedin="https://linkedin.com/company/finserve",
            team_size=112,
            location="Chicago, IL",
            founded_year=2021,
            description="Real-time multi-ledger reconciliation engine for regional banks and credit unions.",
            problem="Reconciliation is still batches-based and prone to error, taking hours to settle every day.",
            solution="Distributed ledger integration that queries core systems in real-time, providing immediate settlement alerts.",
            moat="Deep software integrations into legacy core systems like FIS and Fiserv that take years to replicate.",
            gtm="Enterprise sales directly to regional banks. Contract value averages $250k ACV.",
            revenue_arr="$8,400,000",
            revenue_growth_pct="35% YoY",
            last_round="Series A",
            valuation="$62,000,000",
            pipeline_stage="Portfolio Monitoring",
            priority=1,
            assigned_partner="David Cole",
            ai_score=68,
            investment_verdict="STRONG MAYBE",
            ai_summary="Portfolio company facing burn rate escalation due to aggressive cloud spending. Active mitigation required.",
            tags=["FinTech", "Enterprise", "B2B"]
        ),
        Startup(
            name="HealthSync",
            sector="HealthTech",
            stage="Series A",
            website="https://healthsync.io",
            linkedin="https://linkedin.com/company/healthsync",
            team_size=38,
            location="Boston, MA",
            founded_year=2022,
            description="Automated clinical documentation and EHR integration for private practices.",
            problem="Doctors spend up to 40% of their working day manually typing notes into legacy EHR systems.",
            solution="Ambient clinical voice intelligence that transcribes consultations and formats EHR-ready schemas.",
            moat="HIPAA-compliant custom LLM layers that maintain zero-latency local context.",
            gtm="Direct sales to medium-sized clinics, shifting to regional hospital group contracts.",
            revenue_arr="$1,500,000",
            revenue_growth_pct="120% YoY",
            last_round="Seed",
            valuation="$12,000,000",
            pipeline_stage="Portfolio Monitoring",
            priority=2,
            assigned_partner="Alex Reed",
            ai_score=72,
            investment_verdict="INVEST",
            ai_summary="Portfolio company showing high employee attrition in core engineering team. Flagged as risk item.",
            tags=["HealthTech", "Ambient AI", "SaaS"]
        ),
        Startup(
            name="Apex Security",
            sector="DevTools / Infra",
            stage="Seed",
            website="https://apexsec.dev",
            linkedin="https://linkedin.com/company/apex-security",
            team_size=12,
            location="Austin, TX",
            founded_year=2024,
            description="eBPF-powered real-time security auditing and firewalling for Kubernetes clusters.",
            problem="Traditional security agents introduce high CPU overhead and miss zero-day exploits at the kernel level.",
            solution="Non-intrusive eBPF network taps executing safety policies directly inside the Linux kernel.",
            moat="Highly proprietary eBPF filter rule compiler. Complex kernel engineering skills hard to replicate.",
            gtm="Open-source CLI tool driving enterprise sales for control plane integrations.",
            revenue_arr="$350,000",
            revenue_growth_pct="210% YoY",
            last_round="Pre-seed",
            valuation="$6,500,000",
            pipeline_stage="Due Diligence",
            priority=3,
            assigned_partner="Sarah Jenkins",
            ai_score=87,
            investment_verdict="STRONG INVEST",
            ai_summary="Extremely high technical quality. Early metrics indicate exceptional organic traction. Strong recommend to lead the Seed round.",
            tags=["DevTools", "eBPF", "Cybersecurity"]
        )
    ]
    
    for s in startups:
        db.add(s)
    db.commit()
    
    # Refresh to get IDs
    for s in startups:
        db.refresh(s)
        
    # 2. Founders
    print("Creating founders...")
    founders = [
        Founder(
            startup_id=startups[0].id,
            name="Ethan Chen",
            email="ethan@datascale.ai",
            linkedin="https://linkedin.com/in/ethanchen-ds",
            twitter="https://twitter.com/ethan_datascale",
            title="CEO & Co-founder",
            background="PhD in Distributed Systems from Stanford. Former Principal Engineer at Databricks leading unified memory architectures.",
            previous_companies=["Databricks", "Google"],
            education="Stanford University (PhD)",
            trust_score=85,
            responsiveness_score=92,
            execution_score=89,
            notes="Extremely sharp technically. Good communicator, though is demanding on valuation."
        ),
        Founder(
            startup_id=startups[1].id,
            name="Marcus Vance",
            email="marcus@neuroflow.ai",
            linkedin="https://linkedin.com/in/marcus-vance-ai",
            twitter="https://twitter.com/marcusv_ai",
            title="CEO",
            background="Repeat founder. Previously built API-integration platform sold to Stripe in 2022. Ex-Meta AI Researcher.",
            previous_companies=["Stripe", "Meta"],
            education="MIT (BS)",
            trust_score=95,
            responsiveness_score=98,
            execution_score=96,
            notes="Elite category builder. Responsive on WhatsApp. Highly focused on operational execution."
        ),
        Founder(
            startup_id=startups[2].id,
            name="Robert Vance",
            email="robert@finserve.co",
            linkedin="https://linkedin.com/in/robertvance-fs",
            title="CEO",
            background="20 years in financial enterprise software. Ex-Managing Director at Fiserv.",
            previous_companies=["Fiserv", "Goldman Sachs"],
            education="Wharton (MBA)",
            trust_score=75,
            responsiveness_score=60,
            execution_score=78,
            notes="Experienced executive. Tends to overspend on enterprise sales reps."
        ),
        Founder(
            startup_id=startups[3].id,
            name="Dr. Amanda Ross",
            email="amanda@healthsync.io",
            linkedin="https://linkedin.com/in/amanda-ross-hs",
            title="CEO & Founder",
            background="MD from Harvard Medical School. Former Chief Medical Officer at Boston General.",
            previous_companies=["Boston General Hospital"],
            education="Harvard Medical School",
            trust_score=90,
            responsiveness_score=85,
            execution_score=80,
            notes="Incredible medical domain expert. Lacks deep SaaS sales experience, relying on consultants."
        ),
        Founder(
            startup_id=startups[4].id,
            name="Jared Stone",
            email="jared@apexsec.dev",
            linkedin="https://linkedin.com/in/jaredstone-ebpf",
            title="CEO & Founder",
            background="Creator of 3 popular open-source Linux kernel networking drivers. Ex-Cloudflare Kernel Engineer.",
            previous_companies=["Cloudflare", "RedHat"],
            education="UT Austin (BS)",
            trust_score=90,
            responsiveness_score=90,
            execution_score=92,
            notes="Pure hacker mentality. Built the prototype in 3 months. Needs solid GTM partner."
        )
    ]
    
    for f in founders:
        db.add(f)
    db.commit()

    # 3. Meetings
    print("Creating meetings...")
    meetings = [
        Meeting(
            startup_id=startups[0].id,
            founder_ids=[1],
            meeting_type="Partner Meeting",
            scheduled_at=datetime.utcnow() - timedelta(days=2),
            duration_minutes=45,
            raw_transcript="Ethan Chen: Thanks for having me today. Let's go over our Q1 revenue growth. We are sitting at $2.1M ARR. Sarah Jenkins: What are your GTM loops? Ethan Chen: We are primarily developer-driven. We are getting a lot of organic signups because of our open-source loaders. Sarah Jenkins: And the pre-money valuation ask of $40M? Ethan Chen: Yes, we believe our moat justifies it. Our zero-copy driver is 4x faster than anything in the market...",
            ai_summary="Ethan Chen presented DataScale's Series A deck. Confirmed $2.1M ARR, growing at 180% YoY. Developer-led motion is working well. The valuation of $40M is controversial, comps show $28M is market rate.",
            key_concerns=["Founder asking for top-of-market valuation.", "Integration friction with non-K8s workflows."],
            action_items=["Analyze competitive landscape of zero-copy loaders.", "Schedule expert call with ex-Databricks VP of Engineering."],
            founder_score=85,
            live_mode_used=False
        ),
        Meeting(
            startup_id=startups[1].id,
            founder_ids=[2],
            meeting_type="Intro Call",
            scheduled_at=datetime.utcnow() - timedelta(days=1),
            duration_minutes=30,
            raw_transcript="Marcus Vance: Great to chat again. We just launched our open-source repo for self-healing AI agents. Sarah Jenkins: How has developer traction been? Marcus Vance: We hit 1.4k stars in 72 hours, completely organic. We are raising a $2M pre-seed at a $10M cap. Sarah Jenkins: Let's schedule a deep dive. Who else is in the round? Marcus Vance: Sequoia is tracking, but we want to lead with an operator...",
            ai_summary="Introductory call with repeat founder Marcus Vance. Pitching NeuroFlow AI pre-seed. Traction is impressive, 1,420 GitHub stars in 3 days. Seeking $2M pre-seed at $10M cap.",
            key_concerns=["Extremely early stage, execution risk.", "High market noise in AI agents space."],
            action_items=["Run GitHub traffic analysis.", "Review Marcus's previous Stripe track record."],
            founder_score=95,
            live_mode_used=True
        ),
        Meeting(
            startup_id=startups[4].id,
            founder_ids=[5],
            meeting_type="Due Diligence",
            scheduled_at=datetime.utcnow() - timedelta(days=5),
            duration_minutes=60,
            raw_transcript="Jared Stone: I can show you the kernel trace logs. As you can see, our eBPF filter operates at 100ns latency, which is basically noise. Traditional sidecars like Istio are at 2-5ms. Sarah Jenkins: What are your integration hurdles? Jared Stone: Right now you need Linux kernel 5.8 or higher. That covers 90% of cloud environments but some legacy banks are stuck on 4.x...",
            ai_summary="Technical due diligence session with Jared Stone. Confirmed eBPF engine performance claims. The latency overhead is practically negligible compared to existing sidecars. Requires modern Linux kernel.",
            key_concerns=["Requires modern Linux kernel, locking out some legacy bank enterprise clients.", "Founder is sole developer, key man risk."],
            action_items=["Verify kernel requirements across our portfolio network.", "Draft terms sheet template."],
            founder_score=88,
            live_mode_used=False
        )
    ]
    
    for m in meetings:
        db.add(m)
    db.commit()

    # 4. Scores
    print("Creating scores...")
    scores = [
        Score(
            startup_id=startups[0].id,
            dimensions={
                "Team & Founder Quality": 9,
                "Market Size & Timing": 8,
                "Product & Technology": 8,
                "Traction & Revenue Quality": 7,
                "Growth Rate & Momentum": 8,
                "Business Model & Unit Economics": 7,
                "Competitive Moat & Defensibility": 7,
                "GTM & Distribution": 8,
                "Execution Speed": 9,
                "Fundraising Quality & Terms": 5
            },
            total_score=78,
            verdict="INVEST",
            rationale="Exceptional founder pedigree and fast execution speed. The technical moat is strong. Valuation terms are currently suboptimal ($40M ask vs $28M target)."
        ),
        Score(
            startup_id=startups[1].id,
            dimensions={
                "Team & Founder Quality": 10,
                "Market Size & Timing": 9,
                "Product & Technology": 7,
                "Traction & Revenue Quality": 6,
                "Growth Rate & Momentum": 9,
                "Business Model & Unit Economics": 6,
                "Competitive Moat & Defensibility": 7,
                "GTM & Distribution": 9,
                "Execution Speed": 10,
                "Fundraising Quality & Terms": 8
            },
            total_score=82,
            verdict="INVEST",
            rationale="Elite tier-1 founder who previously exited. Product is early but traction metrics (Github velocity) are anomalous. Pre-seed valuation of $10M cap is reasonable for this caliber."
        ),
        Score(
            startup_id=startups[4].id,
            dimensions={
                "Team & Founder Quality": 9,
                "Market Size & Timing": 8,
                "Product & Technology": 10,
                "Traction & Revenue Quality": 7,
                "Growth Rate & Momentum": 9,
                "Business Model & Unit Economics": 8,
                "Competitive Moat & Defensibility": 9,
                "GTM & Distribution": 6,
                "Execution Speed": 9,
                "Fundraising Quality & Terms": 9
            },
            total_score=87,
            verdict="STRONG INVEST",
            rationale="Exceptional product and technology core. The eBPF kernel layer represents a durable competitive moat. Seed pricing is very attractive."
        )
    ]
    
    for s_sc in scores:
        db.add(s_sc)
    db.commit()

    # 5. Deals
    print("Creating deals...")
    deals = [
        Deal(
            startup_id=startups[0].id,
            round_type="Series A",
            round_size="$8,000,000",
            valuation_cap="N/A",
            check_size="$2,500,000",
            ownership_pct=16.6,
            safe_terms_json={"type": "Priced Equity", "liquidation_preference": "1x Non-Participating", "board_seats": 1},
            status="In Review"
        ),
        Deal(
            startup_id=startups[1].id,
            round_type="Pre-seed",
            round_size="$2,000,000",
            valuation_cap="$10,000,000",
            check_size="$500,000",
            ownership_pct=5.0,
            safe_terms_json={"type": "Post-Money SAFE", "discount": "N/A", "mfn": False},
            status="Drafting"
        ),
        Deal(
            startup_id=startups[4].id,
            round_type="Seed",
            round_size="$3,000,000",
            valuation_cap="$12,000,000",
            check_size="$1,500,000",
            ownership_pct=12.5,
            safe_terms_json={"type": "Post-Money SAFE", "discount": "20%", "mfn": True},
            status="Approved"
        )
    ]
    
    for d in deals:
        db.add(d)
    db.commit()

    # 6. Portfolio
    print("Creating portfolio records...")
    portfolios = [
        Portfolio(
            startup_id=startups[2].id, # FinServe
            current_valuation="$62,000,000",
            current_ownership=12.4,
            runway_months=4,
            burn_rate="$600,000",
            risk_level="High",
            last_update_date=datetime.utcnow() - timedelta(days=1)
        ),
        Portfolio(
            startup_id=startups[3].id, # HealthSync
            current_valuation="$12,000,000",
            current_ownership=15.0,
            runway_months=14,
            burn_rate="$120,000",
            risk_level="Medium",
            last_update_date=datetime.utcnow() - timedelta(days=2)
        )
    ]
    
    for p in portfolios:
        db.add(p)
    db.commit()

    # 7. Monitoring Events
    print("Creating monitoring events...")
    events = [
        MonitoringEvent(
            startup_id=startups[2].id, # FinServe
            event_type="Cost Anomaly",
            event_data={"service": "AWS Cloud", "monthly_spike": "+314%", "current_cost": "$212,400/mo"},
            ai_summary="FinServe AWS cloud compute spend spiked by 314% MoM. Attributed to unoptimized testing of new vector indexing clusters.",
            importance_score=9,
            detected_at=datetime.utcnow() - timedelta(hours=2)
        ),
        MonitoringEvent(
            startup_id=startups[3].id, # HealthSync
            event_type="Engineering Attrition",
            event_data={"role": "Software Engineer", "departures": 4, "timeframe": "14 Days", "key_loss": "VP of Architecture"},
            ai_summary="HealthSync lost 4 key engineers in 14 days, including their VP of Architecture. Glassdoor reviews cite management disagreements.",
            importance_score=8,
            detected_at=datetime.utcnow() - timedelta(hours=14)
        ),
        MonitoringEvent(
            startup_id=startups[0].id, # DataScale
            event_type="Patent Filing",
            event_data={"patent_title": "GPU Memory Bypass for High-Throughput Tensor Slicing", "authority": "USPTO"},
            ai_summary="DataScale filed a critical patent on GPU memory bypass, reinforcing their technical moat.",
            importance_score=7,
            detected_at=datetime.utcnow() - timedelta(days=1)
        )
    ]
    
    for e in events:
        db.add(e)
    db.commit()

    # 8. Sourcing Leads
    print("Creating sourcing leads...")
    leads = [
        SourcingLead(
            company_name="LlamaOps",
            website="https://github.com/llamaops/core",
            description="Self-hosting management tier for local Llama-3 models. 3,500 stars on Github. Trending #1 on Hacker News.",
            source="Github Crawler",
            signal_score=88,
            status="New"
        ),
        SourcingLead(
            company_name="SimulateAI",
            website="https://simulate.ai",
            description="Physics-informed neural networks simulating fluid dynamics. Founded by Stanford PhDs. Raised $150k from YC.",
            source="YC Crawler",
            signal_score=82,
            status="Screening"
        ),
        SourcingLead(
            company_name="ZeroTrustLLM",
            website="https://zerotrustllm.co",
            description="Local proxy sanitizing LLM prompts and masking PII at 2ms latency. Seed stage. Founder is ex-Okta VP.",
            source="Twitter Signal",
            signal_score=91,
            status="Outreached"
        )
    ]
    
    for l in leads:
        db.add(l)
    db.commit()

    # 9. Tasks
    print("Creating tasks...")
    tasks = [
        Task(
            title="Review DataScale's cap table",
            startup_id=startups[0].id,
            assignee="Sarah Jenkins",
            due_date=datetime.utcnow() + timedelta(days=2),
            priority="High",
            status="Pending",
            source="IC Feedback"
        ),
        Task(
            title="Schedule sync with FinServe CEO regarding AWS spend",
            startup_id=startups[2].id,
            assignee="David Cole",
            due_date=datetime.utcnow() + timedelta(days=1),
            priority="Critical",
            status="Pending",
            source="Cost Monitor Alert"
        ),
        Task(
            title="Draft term sheet for Apex Security",
            startup_id=startups[4].id,
            assignee="Alex Reed",
            due_date=datetime.utcnow() + timedelta(days=3),
            priority="High",
            status="In Progress",
            source="Partner Verdict"
        )
    ]
    
    for t in tasks:
        db.add(t)
    db.commit()

    # 10. Outreach Emails
    print("Creating outreach emails...")
    emails = [
        OutreachEmail(
            startup_id=startups[1].id,
            founder_id=2,
            template_type="Repeat Founder Warm Intro",
            subject="NeuroFlow AI / SR Capital",
            body="Hey Marcus,\n\nSaw you just launched the new self-healing agent framework on Github—congrats on hitting 1.4k stars so quickly! Loved what you did at Stripe. I lead deep-tech at SR Capital (we just closed our $450M Fund II). Would love to sync for 15 mins to hear about the vision and how we can support you.\n\nBest,\nSarah Jenkins\nPartner, SR Capital",
            sent_at=datetime.utcnow() - timedelta(hours=4),
            opened_at=datetime.utcnow() - timedelta(hours=3),
            replied_at=datetime.utcnow() - timedelta(hours=2),
            gmail_thread_id="thread_18923bcdef"
        ),
        OutreachEmail(
            startup_id=startups[4].id,
            founder_id=5,
            template_type="Technical Open Source Sourcing",
            subject="eBPF Security Engine / SR Capital",
            body="Hi Jared,\n\nI came across Apex Security while reading through kernel bypassing modules. The 100ns latency overhead is incredibly impressive compared to traditional sidecars.\n\nWe have backed several DevOps infrastructure projects. I'd love to chat and share some of the feedback we are hearing from our enterprise portfolio companies.\n\nAre you open for a quick call this Thursday?\n\nBest,\nSarah Jenkins\nPartner, SR Capital",
            sent_at=datetime.utcnow() - timedelta(days=5),
            opened_at=datetime.utcnow() - timedelta(days=5),
            replied_at=datetime.utcnow() - timedelta(days=4),
            gmail_thread_id="thread_189240ffff"
        )
    ]
    
    for em in emails:
        db.add(em)
    db.commit()

    db.close()
    print("Database seeded successfully!")

if __name__ == "__main__":
    seed_db()
