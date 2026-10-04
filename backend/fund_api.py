"""Explicit fund membership and deal access; no invitations or implicit sharing."""
from copy import deepcopy
from uuid import uuid4
from typing import Literal
from fastapi import APIRouter,Depends,HTTPException
from pydantic import BaseModel,ConfigDict,Field
from sqlalchemy.orm import Session
from database.db import get_db
from database.models import User
from database.workspace import WorkspaceCompany,WorkspaceAudit
from database.funds import Fund,FundMember,FundCompany,FundGrant,FundAudit,FundAccessAudit
from backend.auth import get_current_user
from backend.workspace_schema import now

router=APIRouter(prefix='/api/workspace/funds',tags=['Fund access'])


class Input(BaseModel):
    model_config=ConfigDict(extra='forbid',str_strip_whitespace=True)


class CreateFund(Input):
    name:str=Field(min_length=2,max_length=160)


class MemberInput(Input):
    email:str=Field(min_length=3,max_length=320)
    role:Literal['Admin','Reviewer','Viewer']='Viewer'
    active:bool=True


class PublishInput(Input):
    company_id:str
    revision:int=Field(ge=1)
    disclosure_confirmed:Literal[True]


class GrantInput(Input):
    member_id:int|str
    role:Literal['Reviewer','Viewer','Remove']


def local(user):
    if hasattr(user,'supabase_token'):
        raise HTTPException(503,'Cloud fund access is not enabled yet. Personal cloud records remain private.')


def cloud(user,kind,payload):
    from backend.fund_repository import cloud_funds_enabled
    from backend.supabase_gateway import Gateway
    if not cloud_funds_enabled():raise HTTPException(503,'Cloud fund access is not enabled. Apply and verify its permissions migration first.')
    return Gateway(user.supabase_token).request('POST','/rest/v1/rpc/whistle_fund_action',data={'kind':kind,'payload':payload})


def member(db,user,fund_id,admin=False):
    local(user)
    item=db.query(FundMember).filter_by(fund_id=fund_id,user_id=user.id,active=True).first()
    if not item:raise HTTPException(404,'Fund not found in your memberships.')
    if admin and (item.role!='Admin' or user.role not in ('analyst','partner','admin')):
        raise HTTPException(403,'Only a fund administrator can change membership or deal access.')
    return item


def audit(db,user,fund_id,action,detail):
    db.add(FundAccessAudit(fund_id=fund_id,actor_id=str(user.id),action=action,detail=detail,at=now()))


@router.get('')
def list_funds(user=Depends(get_current_user),db:Session=Depends(get_db)):
    if hasattr(user,'supabase_token'):
        from backend.fund_repository import cloud_funds_enabled
        from backend.supabase_gateway import Gateway
        if not cloud_funds_enabled():return {'supported':False,'funds':[],'message':'Cloud team access requires the fund permissions migration and its deployment setting; personal cloud records remain private.'}
        rows=Gateway(user.supabase_token).request('GET','/rest/v1/whistle_fund_members',params={'user_id':'eq.'+user.id,'active':'eq.true','select':'role,fund:whistle_funds(id,name)'})
        return {'supported':True,'funds':[{'id':r['fund']['id'],'name':r['fund']['name'],'role':r['role']} for r in rows]}
    items=db.query(FundMember).filter_by(user_id=user.id,active=True).all()
    return {'supported':True,'funds':[{'id':m.fund_id,'name':db.get(Fund,m.fund_id).name,'role':m.role} for m in items]}


@router.post('')
def create_fund(payload:CreateFund,user=Depends(get_current_user),db:Session=Depends(get_db)):
    if hasattr(user,'supabase_token'):return cloud(user,'create',payload.model_dump())
    local(user)
    if user.role not in ('analyst','partner','admin'):raise HTTPException(403,'This account cannot create a fund workspace.')
    fund=Fund(id=uuid4().hex,name=payload.name,created_at=now());db.add(fund);db.flush()
    db.add(FundMember(fund_id=fund.id,user_id=user.id,role='Admin',active=True))
    audit(db,user,fund.id,'fund_created',{'name':payload.name});db.commit()
    return {'id':fund.id,'name':fund.name,'role':'Admin'}


@router.get('/{fund_id}')
def fund_details(fund_id:str,user=Depends(get_current_user),db:Session=Depends(get_db)):
    if hasattr(user,'supabase_token'):
        from backend.fund_repository import cloud_funds_enabled
        from backend.supabase_gateway import Gateway
        if not cloud_funds_enabled():raise HTTPException(503,'Cloud fund access is not enabled yet.')
        return Gateway(user.supabase_token).request('POST','/rest/v1/rpc/whistle_fund_details',data={'target':fund_id})
    m=member(db,user,fund_id)
    from backend.fund_repository import FundRepository
    records=[{'id':r.slug,'name':r.data['name'] if isinstance(r.data,dict) and isinstance(r.data.get('name'),str) else 'Record needs repair','revision':r.revision,'can_write':r.can_write}
             for r in FundRepository(db,user).companies() if r.fund_id==fund_id]
    members=[];grants=[];events=[]
    if m.role=='Admin':
        members=[{'id':n.id,'email':db.get(User,n.user_id).email,'name':db.get(User,n.user_id).full_name,'role':n.role,'active':n.active}
                 for n in db.query(FundMember).filter_by(fund_id=fund_id)]
        record_ids={r.id for r in db.query(FundCompany).filter_by(fund_id=fund_id)}
        grants=[{'company_id':g.company_id,'member_id':g.member_id,'role':g.role} for g in db.query(FundGrant).filter(FundGrant.company_id.in_(record_ids))]
        events=[{'action':a.action,'actor_id':a.actor_id,'detail':a.detail,'at':a.at} for a in db.query(FundAccessAudit).filter_by(fund_id=fund_id).order_by(FundAccessAudit.id.desc()).limit(30)]
    return {'id':fund_id,'name':db.get(Fund,fund_id).name,'role':m.role,'records':records,'members':members,'grants':grants,'events':events}


@router.post('/{fund_id}/members')
def change_member(fund_id:str,payload:MemberInput,user=Depends(get_current_user),db:Session=Depends(get_db)):
    if hasattr(user,'supabase_token'):return cloud(user,'member',{'fund_id':fund_id,**payload.model_dump()})
    current=member(db,user,fund_id,True)
    teammate=db.query(User).filter(User.email==payload.email.casefold(),User.is_active.is_(True)).first()
    if not teammate:raise HTTPException(422,'Use an existing active account email. No invitation has been sent.')
    item=db.query(FundMember).filter_by(fund_id=fund_id,user_id=teammate.id).first()
    if item and item.id==current.id and (not payload.active or payload.role!='Admin'):
        raise HTTPException(422,'Keep your administrator membership; another administrator must manage your departure.')
    if item:item.role,item.active=payload.role,payload.active
    else:
        item=FundMember(fund_id=fund_id,user_id=teammate.id,role=payload.role,active=payload.active);db.add(item)
    db.flush()
    if not payload.active:
        db.query(FundGrant).filter_by(member_id=item.id).delete()
    audit(db,user,fund_id,'membership_changed',{'member_id':item.id,'role':payload.role,'active':payload.active});db.commit()
    return {'member_id':item.id,'role':item.role,'active':item.active}


@router.post('/{fund_id}/records')
def publish_record(fund_id:str,payload:PublishInput,user=Depends(get_current_user),db:Session=Depends(get_db)):
    if hasattr(user,'supabase_token'):return cloud(user,'publish',{'fund_id':fund_id,**payload.model_dump()})
    member(db,user,fund_id,True)
    source=db.query(WorkspaceCompany).filter_by(user_id=user.id,slug=payload.company_id).first()
    if not source:raise HTTPException(404,'Select a personal record you own.')
    if source.revision!=payload.revision:raise HTTPException(409,'The record changed. Review its current contents before sharing.')
    identity=uuid4().hex;slug='fund-'+identity;data=deepcopy(source.data);data['id']=slug
    shared=FundCompany(id=identity,fund_id=fund_id,slug=slug,revision=source.revision+1,data=data);db.add(shared);db.flush()
    for a in db.query(WorkspaceAudit).filter_by(company_id=source.id).order_by(WorkspaceAudit.id):
        db.add(FundAudit(company_id=identity,actor=a.actor,actor_id='legacy-not-recorded',action=a.action,
            at=a.at,previous_revision=a.previous_revision,revision=a.revision,snapshot=deepcopy(a.snapshot)))
    db.add(FundAudit(company_id=identity,actor=user.full_name,actor_id=str(user.id),action='published_to_fund',at=now(),
        previous_revision=source.revision,revision=source.revision+1,snapshot=deepcopy(source.data)))
    audit(db,user,fund_id,'record_published',{'company_id':identity,'source_revision':source.revision,'disclosure_confirmed':True})
    db.commit()
    return {'id':slug,'name':data['name'],'revision':shared.revision}


@router.post('/{fund_id}/records/{slug}/grants')
def change_grant(fund_id:str,slug:str,payload:GrantInput,user=Depends(get_current_user),db:Session=Depends(get_db)):
    if hasattr(user,'supabase_token'):return cloud(user,'grant',{'fund_id':fund_id,'slug':slug,**payload.model_dump()})
    member(db,user,fund_id,True)
    company=db.query(FundCompany).filter_by(fund_id=fund_id,slug=slug).first()
    teammate=db.query(FundMember).filter_by(id=payload.member_id,fund_id=fund_id,active=True).first()
    if not company or not teammate:raise HTTPException(404,'Select a deal and active member from this fund.')
    item=db.query(FundGrant).filter_by(company_id=company.id,member_id=teammate.id).first()
    if payload.role=='Remove':
        if item:db.delete(item)
    elif item:item.role=payload.role
    else:db.add(FundGrant(company_id=company.id,member_id=teammate.id,role=payload.role))
    audit(db,user,fund_id,'deal_access_changed',{'company_id':company.id,'member_id':teammate.id,'role':payload.role});db.commit()
    return {'saved':True}
