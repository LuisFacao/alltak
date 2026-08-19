from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import main

router = APIRouter(prefix="/api/events", tags=["Events"])

@router.get("/")
async def list_events(db: Session = Depends(main.get_db)):
    events = db.query(main.EventModel).order_by(main.EventModel.date).all()
    return [main.serialize_event(e) for e in events]

@router.post("/")
async def create_event(data: main.EventData, db: Session = Depends(main.get_db)):
    event = main.EventModel(date=data.date, title=data.title, color=data.color)
    db.add(event)
    db.commit()
    db.refresh(event)
    return main.serialize_event(event)

@router.delete("/{event_id}")
async def delete_event(event_id: str, db: Session = Depends(main.get_db)):
    event = db.query(main.EventModel).filter(main.EventModel.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    db.delete(event)
    db.commit()
    return {"status": "deleted"}