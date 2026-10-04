from fastapi import FastAPI, Request

app = FastAPI()

@app.post("/calendar_webhook")
async def calendar_webhook(request: Request):
    """Receives push notifications from Google Calendar API."""
    data = await request.json()
    print("Calendar update received", data)
    return {"status": "success"}
