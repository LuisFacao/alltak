import json
import base64
import main

from fastapi import ( APIRouter, Depends, HTTPException, UploadFile, File, Form )
from typing import Optional
from sqlalchemy.orm import Session

feedback_router = APIRouter( prefix="/api/feedback", tags=["Feedback"] )

direct_feedback_router = APIRouter( prefix="/api/direct-feedback", tags=["Direct Feedback"] )

@feedback_router.get("/")
async def list_feedback(
    db: Session = Depends(main.get_db)
):
    items = (
        db.query(main.FeedbackModel)
        .order_by(main.FeedbackModel.created_at.desc())
        .all()
    )
    return [
        main.serialize_feedback(f)
        for f in items
    ]

@feedback_router.post("/")
async def create_feedback(
    data: main.FeedbackData,
    db: Session = Depends(main.get_db)
):
    fb = main.FeedbackModel(
        user_email=data.user_email,
        category=data.category,
        message=data.message,
        rating=data.rating,
        attachments=json.dumps(
            [
                a.model_dump()
                for a in (data.attachments or [])
            ]
        )
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)

    return main.serialize_feedback(fb)

@feedback_router.post("/upload")
async def upload_feedback(
    user_email: str = Form(...),
    category: str = Form(...),
    message: str = Form(...),
    rating: int = Form(...),
    files: Optional[list[UploadFile]] = File(None),
    db: Session = Depends(main.get_db)
):
    attachments = []
    for uploaded_file in files or []:
        file_data = await uploaded_file.read()
        if not file_data: continue
        file_name = ( uploaded_file.filename or "arquivo" )
        file_type = ( uploaded_file.content_type or "application/octet-stream" )
        encoded = base64.b64encode( file_data ).decode("ascii")
        data_url = ( f"data:{file_type};base64,{encoded}" )

        attachments.append({
            "file_name": file_name,
            "file_type": file_type,
            "file_data": data_url
        })

    fb = main.FeedbackModel(
        user_email=user_email,
        category=category,
        message=message,
        rating=rating,
        attachments=json.dumps( attachments )
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)

    return main.serialize_feedback(fb)

@feedback_router.delete("/{feedback_id}")
async def delete_feedback(
    feedback_id: str,
    db: Session = Depends(main.get_db)
):
    fb = (
        db.query(main.FeedbackModel)
        .filter(
            main.FeedbackModel.id == feedback_id
        )
        .first()
    )
    if not fb:
        raise HTTPException(
            status_code=404,
            detail="Feedback não encontrado"
        )
    db.delete(fb)
    db.commit()

    return {
        "status": "deleted"
    }

@direct_feedback_router.get("/")
async def list_direct_feedback(
    recipient: Optional[str] = None,
    db: Session = Depends(main.get_db)
):
    q = (
        db.query(main.DirectFeedbackModel)
        .order_by(
            main.DirectFeedbackModel.created_at.desc()
        )
    )
    if recipient:
        q = q.filter(
            main.DirectFeedbackModel.recipient
            == recipient
        )
    return [
        main.serialize_direct(m)
        for m in q.all()
    ]

@direct_feedback_router.post("/")
async def create_direct_feedback(
    data: main.DirectFeedbackData,
    db: Session = Depends(main.get_db)
):
    m = main.DirectFeedbackModel(
        recipient=data.recipient,
        message=data.message,
        attachments=json.dumps(
            [
                a.model_dump()
                for a in (data.attachments or [])
            ]
        )
    )
    db.add(m)
    db.commit()
    db.refresh(m)

    return main.serialize_direct(m)


@direct_feedback_router.post("/upload")
async def upload_direct_feedback(
    recipient: str = Form(...),
    message: str = Form(...),
    files: Optional[list[UploadFile]] = File(None),
    db: Session = Depends(main.get_db)
):
    attachments = []
    for uploaded_file in files or []:
        file_data = await uploaded_file.read()
        if not file_data: continue
        file_name = (
            uploaded_file.filename
            or "arquivo"
        )
        file_type = (
            uploaded_file.content_type
            or "application/octet-stream"
        )
        encoded = base64.b64encode( file_data ).decode("ascii")
        data_url = ( f"data:{file_type};base64,{encoded}" )
        attachments.append({
            "file_name": file_name,
            "file_type": file_type,
            "file_data": data_url
        })

    m = main.DirectFeedbackModel(
        recipient=recipient,
        message=message,
        attachments=json.dumps(
            attachments
        )
    )
    db.add(m)
    db.commit()
    db.refresh(m)

    return main.serialize_direct(m)

@direct_feedback_router.delete(
    "/{direct_feedback_id}"
)
async def delete_direct_feedback(
    direct_feedback_id: str,
    db: Session = Depends(main.get_db)
):
    m = (
        db.query(main.DirectFeedbackModel)
        .filter(
            main.DirectFeedbackModel.id
            == direct_feedback_id
        )
        .first()
    )

    if not m:
        raise HTTPException(
            status_code=404,
            detail="Feedback direto não encontrado"
        )
    db.delete(m)
    db.commit()
    
    return {
        "status": "deleted"
    }