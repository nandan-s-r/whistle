"""Optional monitoring that excludes research, credentials and personal fields."""
import os


def sanitize_event(event, hint=None):
    allowed = {key:event[key] for key in ("event_id","timestamp","level","platform","release","environment","transaction","contexts") if key in event}
    # SDK runtime/device context only. Drop arbitrary application context.
    if "contexts" in allowed:
        allowed["contexts"] = {k:v for k,v in allowed["contexts"].items() if k in ("runtime","os","trace")}
    errors = []
    for value in event.get("exception",{}).get("values",[]):
        frames = [{k:f[k] for k in ("filename","function","lineno","in_app") if k in f}
                  for f in value.get("stacktrace",{}).get("frames",[])]
        errors.append({"type":value.get("type","Error"),"value":"Application error; private details omitted", "stacktrace":{"frames":frames}})
    if errors:
        allowed["exception"] = {"values":errors}
    return allowed


def initialize_monitoring():
    if not os.getenv("SENTRY_DSN"):
        return
    import sentry_sdk
    sentry_sdk.init(dsn=os.environ["SENTRY_DSN"],environment=os.getenv("ENVIRONMENT","development"),
                    send_default_pii=False,before_send=sanitize_event,
                    traces_sample_rate=0,include_local_variables=False)
