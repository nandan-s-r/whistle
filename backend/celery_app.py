import os
from celery import Celery
from backend.config import load_runtime_config
load_runtime_config()

app=Celery('vc_scope',broker=os.getenv('CELERY_BROKER_URL','redis://localhost:6379/0'))
app.conf.update(task_serializer='json',accept_content=['json'],task_ignore_result=True,
                task_acks_late=True,worker_prefetch_multiplier=1,broker_connection_retry_on_startup=True,
                beat_schedule={'recover-persisted-jobs':{'task':'vc_scope.dispatch_pending','schedule':15.0}})

@app.task(name='vc_scope.process_job')
def run_job(jid):
    from backend.worker import process_job
    process_job(jid)

@app.task(name='vc_scope.dispatch_pending')
def dispatch_pending():
    from backend.job_store import JobStore
    for jid in JobStore(worker=True).pending(): run_job.delay(jid)
