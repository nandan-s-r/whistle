# Common constants used across the OS

PIPELINE_STAGES = [
    "Sourced", 
    "Cold Outreach", 
    "Intro Call", 
    "Partner Meeting", 
    "Due Diligence", 
    "IC Review", 
    "Term Sheet", 
    "Invested", 
    "Rejected", 
    "Portfolio Monitoring"
]

SECTORS = [
    "Enterprise SaaS",
    "FinTech",
    "HealthTech",
    "ClimateTech",
    "AI / ML",
    "DevTools / Infra",
    "Consumer Tech",
    "DeepTech",
    "Web3 / Crypto",
    "E-commerce",
    "EdTech"
]

STAGES = [
    "Pre-seed",
    "Seed",
    "Series A",
    "Series B",
    "Series C+",
    "Growth"
]

SCORING_DIMENSIONS = [
    "Team & Founder Quality",
    "Market Size & Timing",
    "Product & Technology",
    "Traction & Revenue Quality",
    "Growth Rate & Momentum",
    "Business Model & Unit Economics",
    "Competitive Moat & Defensibility",
    "GTM & Distribution",
    "Execution Speed",
    "Fundraising Quality & Terms"
]

VERDICTS = {
    "STRONG INVEST": {"range": (85, 100), "color": "#22c55e"},
    "INVEST": {"range": (70, 84), "color": "#10b981"},
    "STRONG MAYBE": {"range": (55, 69), "color": "#eab308"},
    "MAYBE": {"range": (40, 54), "color": "#f59e0b"},
    "PASS": {"range": (0, 39), "color": "#ef4444"}
}
