from fastapi import HTTPException
from sqlalchemy import and_,or_,select,exists,update
from database.funds import FundMember,FundCompany,FundGrant,FundAudit
from backend.workspace_schema import now
from types import SimpleNamespace
from backend.supabase_gateway import Gateway
from backend.frozen_history import preserve_frozen_history
import os


def cloud_funds_enabled():return os.getenv('FUND_ACCESS_ENABLED','false').lower()=='true'


class CloudFundRepository:
    def __init__(self,user):self.gateway=Gateway(user.supabase_token)
    def decorate(self,row):return SimpleNamespace(**row,fund_record=True)
    def companies(self):
        rows=[];cursor=None
        while True:
            params={'select':'*','order':'id.asc','limit':250}
            if cursor:params['id']='gt.'+cursor
            page=self.gateway.request('GET','/rest/v1/whistle_fund_records',params=params)
            if not page:break
            latest=str(page[-1]['id'])
            if cursor and latest<=cursor:raise HTTPException(502,'Fund pagination did not advance. Retry without incomplete results.')
            rows.extend(page);cursor=latest
        return [self.decorate(r) for r in rows]
    def find(self,slug):
        rows=self.gateway.request('GET','/rest/v1/whistle_fund_records',params={'slug':'eq.'+slug,'select':'*','limit':1})
        return self.decorate(rows[0]) if rows else None
    def save(self,row,data,revision,action):
        if not row.can_write:raise HTTPException(403,'You have read-only access to this fund record.')
        data=preserve_frozen_history(row.data,data)
        rows=self.gateway.request('PATCH','/rest/v1/whistle_fund_companies',params={'id':'eq.'+row.id,'revision':'eq.'+str(revision)},
            data={'data':data,'revision':revision+1,'last_action':action},headers={'Prefer':'return=representation'})
        if not rows:raise HTTPException(409,'Your access or this record changed. Refresh before retrying.')
    def history(self,row):
        return self.gateway.request('GET','/rest/v1/whistle_fund_audit',params={'company_id':'eq.'+row.id,
            'select':'id,actor,actor_id,action,at,previous_revision,revision','order':'at.desc'})
    def revision_snapshot(self,row,revision):
        rows=self.gateway.request('GET','/rest/v1/whistle_fund_audit',params={'company_id':'eq.'+row.id,
            'previous_revision':'eq.'+str(revision),'select':'snapshot','limit':1})
        return rows[0]['snapshot'] if rows else None


class FundRepository:
    def __init__(self,db,user):self.db,self.user=db,user

    def permission(self,company_id,write=False):
        grant=exists(select(FundGrant.id).where(FundGrant.company_id==FundCompany.id,FundGrant.member_id==FundMember.id,
            FundGrant.role=='Reviewer' if write else FundGrant.role.in_(['Reviewer','Viewer'])))
        return exists(select(FundMember.id).where(FundMember.fund_id==FundCompany.fund_id,
            FundMember.user_id==self.user.id,FundMember.active.is_(True),
            or_(FundMember.role=='Admin',and_(FundMember.role=='Reviewer' if write else FundMember.role.in_(['Reviewer','Viewer']),grant))))

    def decorate(self,row):
        row.fund_record=True
        row.can_write=self.db.query(FundCompany.id).filter(FundCompany.id==row.id,self.permission(row.id,True)).first() is not None
        return row

    def companies(self):
        return [self.decorate(row) for row in self.db.query(FundCompany).filter(self.permission(None)).order_by(FundCompany.id).all()]

    def find(self,slug):
        row=self.db.query(FundCompany).filter(FundCompany.slug==slug,self.permission(None)).first()
        return self.decorate(row) if row else None

    def save(self,row,data,revision,action):
        if not row.can_write:raise HTTPException(403,'You have read-only access to this fund record.')
        previous=row.data
        data=preserve_frozen_history(previous,data)
        result=self.db.execute(update(FundCompany).where(FundCompany.id==row.id,FundCompany.revision==revision,
            self.permission(row.id,True)).values(data=data,revision=revision+1))
        if result.rowcount!=1:
            self.db.rollback();raise HTTPException(409,'Your access or this record changed. Refresh before retrying.')
        self.db.add(FundAudit(company_id=row.id,actor=self.user.full_name,actor_id=str(self.user.id),action=action,
            at=now(),previous_revision=revision,revision=revision+1,snapshot=previous))
        self.db.commit()

    def history(self,row):
        return [{'id':a.id,'actor':a.actor,'actor_id':a.actor_id,'action':a.action,'at':a.at,'previous_revision':a.previous_revision,'revision':a.revision}
                for a in self.db.query(FundAudit).filter_by(company_id=row.id).order_by(FundAudit.id.desc())]

    def revision_snapshot(self,row,revision):
        item=self.db.query(FundAudit).filter_by(company_id=row.id,previous_revision=revision).first()
        return item.snapshot if item else None


class CombinedRepository:
    def __init__(self,personal,fund):self.personal,self.fund=personal,fund
    def companies(self):return [*self.personal.companies(),*self.fund.companies()]
    def find(self,slug):return self.fund.find(slug) if slug.startswith('fund-') else self.personal.find(slug)
    def create(self,company):return self.personal.create(company)
    def save(self,row,data,revision,action):return (self.fund if getattr(row,'fund_record',False) else self.personal).save(row,data,revision,action)
    def history(self,row):return (self.fund if getattr(row,'fund_record',False) else self.personal).history(row)
    def revision_snapshot(self,row,revision):return (self.fund if getattr(row,'fund_record',False) else self.personal).revision_snapshot(row,revision)
    def searches(self):return self.personal.searches()
    def save_search(self,name,filters):return self.personal.save_search(name,filters)
