import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import main

feedback_router = APIRouter(prefix="/api/feedback", tags=["Feedback"])
direct_feedback_router = APIRouter(prefix="/api/direct-feedback", tags=["Direct Feedback"])

@feedback_router.get("/")
async def list_feedback(db: Session = Depends(main.get_db)):
    items = db.query(main.FeedbackModel).order_by(main.FeedbackModel.created_at.desc()).all()
    return [main.serialize_feedback(f) for f in items]

@feedback_router.post("/")
async def create_feedback(data: main.FeedbackData, db: Session = Depends(main.get_db)):
    fb = main.FeedbackModel(
        user_email=data.user_email,
        category=data.category,
        message=data.message,
        rating=data.rating,
        attachments=json.dumps([a.model_dump() for a in (data.attachments or [])]),
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)
    return main.serialize_feedback(fb)

@feedback_router.delete("/{feedback_id}")
async def delete_feedback(feedback_id: str, db: Session = Depends(main.get_db)):
    fb = db.query(main.FeedbackModel).filter(main.FeedbackModel.id == feedback_id).first()
    if not fb:
        raise HTTPException(status_code=404, detail="Feedback não encontrado")
    db.delete(fb)
    db.commit()
    return {"status": "deleted"}

@direct_feedback_router.get("/")
async def list_direct_feedback(recipient: Optional[str] = None, db: Session = Depends(main.get_db)):
    q = db.query(main.DirectFeedbackModel).order_by(main.DirectFeedbackModel.created_at.desc())
    if recipient:
        q = q.filter(main.DirectFeedbackModel.recipient == recipient)
    return [main.serialize_direct(m) for m in q.all()]

@direct_feedback_router.post("/")
async def create_direct_feedback(data: main.DirectFeedbackData, db: Session = Depends(main.get_db)):
    m = main.DirectFeedbackModel(
        recipient=data.recipient,
        message=data.message,
        attachments=json.dumps([a.model_dump() for a in (data.attachments or [])]),
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return main.serialize_direct(m)

@direct_feedback_router.delete("/{direct_feedback_id}")
async def delete_direct_feedback(direct_feedback_id: str, db: Session = Depends(main.get_db)):
    m = db.query(main.DirectFeedbackModel).filter(main.DirectFeedbackModel.id == direct_feedback_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Feedback direto não encontrado")
    db.delete(m)
    db.commit()
    return {"status": "deleted"}