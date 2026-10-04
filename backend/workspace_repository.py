"""Same investment workflow, with local SQL or authenticated Supabase RLS storage."""
from types import SimpleNamespace
from fastapi import Depends, HTTPException
from sqlalchemy import update
from sqlalchemy.exc import IntegrityError
from database.db import get_db
from database.workspace import WorkspaceCompany, WorkspaceIdentity, WorkspaceAudit, WorkspaceSearch
from database import funds  # Register additive tables before startup creates local metadata.
from backend.auth import get_current_user
from backend.supabase_gateway import Gateway
from backend.workspace_schema import now
from backend.frozen_history import preserve_frozen_history


class LocalRepository:
    def __init__(self, db, user):
        self.db, self.user = db, user

    def companies(self):
        return self.db.query(WorkspaceCompany).filter_by(user_id=self.user.id).order_by(WorkspaceCompany.id).all()

    def find(self, slug):
        return self.db.query(WorkspaceCompany).filter_by(user_id=self.user.id, slug=slug).first()

    def create(self, company):
        existing = self.find(company.id)
        if existing:
            return existing, False
        row = WorkspaceCompany(user_id=self.user.id, slug=company.id, revision=1, data=company.model_dump(mode="json"))
        self.db.add(row)
        try:
            self.db.flush()
            self.db.add(WorkspaceIdentity(user_id=self.user.id, domain=company.domain, company_id=row.id))
            self.db.add(WorkspaceAudit(company_id=row.id, actor=self.user.full_name, action="company_intake",
                                      at=now(), previous_revision=0, revision=1, snapshot={}))
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            existing = self.find(company.id)
            if existing:
                return existing, False
            raise HTTPException(409, "Company captured concurrently. Refresh before retrying.")
        return row, True

    def save(self, row, data, revision, action):
        previous = row.data
        data = preserve_frozen_history(previous, data)
        result = self.db.execute(update(WorkspaceCompany).where(
            WorkspaceCompany.id == row.id, WorkspaceCompany.user_id == self.user.id,
            WorkspaceCompany.revision == revision).values(data=data, revision=revision+1))
        if result.rowcount != 1:
            self.db.rollback()
            raise HTTPException(409, "Another reviewer updated this company. Refresh and retry.")
        self.db.add(WorkspaceAudit(company_id=row.id, actor=self.user.full_name, action=action, at=now(),
            previous_revision=revision, revision=revision+1, snapshot=previous))
        self.db.commit()

    def searches(self):
        return [{"id":s.id,"name":s.name,"filters":s.filters} for s in self.db.query(WorkspaceSearch).filter_by(user_id=self.user.id)]

    def save_search(self, name, filters):
        row = self.db.query(WorkspaceSearch).filter_by(user_id=self.user.id, name=name).first()
        if row:
            row.filters = filters
        else:
            self.db.add(WorkspaceSearch(user_id=self.user.id, name=name, filters=filters))
        self.db.commit()

    def history(self, row):
        return [{"id":a.id,"actor":a.actor,"action":a.action,"at":a.at,
                 "previous_revision":a.previous_revision,"revision":a.revision}
                for a in self.db.query(WorkspaceAudit).filter_by(company_id=row.id).order_by(WorkspaceAudit.id.desc())]

    def revision_snapshot(self, row, revision):
        item = self.db.query(WorkspaceAudit).filter_by(company_id=row.id, previous_revision=revision).first()
        return item.snapshot if item else None


class CloudRepository:
    def __init__(self, user):
        self.user, self.gateway = user, Gateway(user.supabase_token)

    def companies(self):
        # Read every authorized page rather than silently stopping at a server
        # row limit. A stable primary-key cursor avoids shifting offset pages.
        rows, cursor = [], None
        while True:
            params = {"select":"*", "order":"id.asc", "limit":250}
            if cursor: params['id'] = 'gt.' + cursor
            page = self.gateway.request("GET", "/rest/v1/vc_companies", params=params)
            if not page: break
            next_cursor = str(page[-1]['id'])
            if cursor is not None and next_cursor <= cursor:
                raise HTTPException(502, 'Workspace pagination did not advance. Retry without using incomplete results.')
            rows.extend(page); cursor = next_cursor
        return [SimpleNamespace(**r) for r in rows]

    def find(self, slug):
        rows = self.gateway.request("GET", "/rest/v1/vc_companies", params={"slug":"eq."+slug,"select":"*","limit":1})
        return SimpleNamespace(**rows[0]) if rows else None

    def create(self, company):
        existing = self.find(company.id)
        if existing:
            return existing, False
        try:
            rows = self.gateway.request("POST", "/rest/v1/vc_companies", data={"owner_id":self.user.id,
                "slug":company.id,"domain":company.domain,"revision":1,"data":company.model_dump(mode="json")},
                headers={"Prefer":"return=representation"})
        except HTTPException as e:
            if e.status_code == 409:
                existing = self.find(company.id)
                if existing:
                    return existing, False
            raise
        return SimpleNamespace(**rows[0]), True

    def save(self, row, data, revision, action):
        data = preserve_frozen_history(row.data, data)
        rows = self.gateway.request("PATCH", "/rest/v1/vc_companies", params={"id":"eq."+row.id,
            "revision":"eq."+str(revision)}, data={"data":data,"revision":revision+1,"last_action":action},
            headers={"Prefer":"return=representation"})
        if not rows:
            raise HTTPException(409, "Another reviewer updated this company. Refresh and retry.")

    def searches(self):
        return self.gateway.request("GET", "/rest/v1/vc_searches", params={"select":"id,name,filters","order":"created_at.asc"})

    def save_search(self, name, filters):
        self.gateway.request("POST", "/rest/v1/vc_searches", params={"on_conflict":"owner_id,name"},
            data={"owner_id":self.user.id,"name":name,"filters":filters},
            headers={"Prefer":"resolution=merge-duplicates"})

    def history(self, row):
        return self.gateway.request("GET", "/rest/v1/vc_audit", params={"company_id":"eq."+row.id,
            "select":"id,actor,action,at,previous_revision,revision","order":"at.desc"})

    def revision_snapshot(self, row, revision):
        rows = self.gateway.request('GET', '/rest/v1/vc_audit', params={'company_id':'eq.'+row.id,
            'previous_revision':'eq.'+str(revision),'select':'snapshot','limit':1})
        return rows[0]['snapshot'] if rows else None


def get_repository(user=Depends(get_current_user), db=Depends(get_db)):
    if hasattr(user, "supabase_token"):
        from backend.fund_repository import CombinedRepository,CloudFundRepository,cloud_funds_enabled
        return CombinedRepository(CloudRepository(user),CloudFundRepository(user)) if cloud_funds_enabled() else CloudRepository(user)
    from backend.fund_repository import CombinedRepository,FundRepository
    return CombinedRepository(LocalRepository(db,user),FundRepository(db,user))
