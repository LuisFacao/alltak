import json
import base64
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
import main

router = APIRouter(prefix="/api/posts", tags=["Posts"])


async def _files_to_attachments(files):
    attachments = []
    for uploaded_file in files or []:
        file_data = await uploaded_file.read()
        if not file_data:
            continue
        file_type = uploaded_file.content_type or "application/octet-stream"
        encoded = base64.b64encode(file_data).decode("ascii")
        attachments.append({
            "file_name": uploaded_file.filename or "arquivo",
            "file_type": file_type,
            "file_data": f"data:{file_type};base64,{encoded}",
        })
    return attachments


@router.get("/")
async def list_posts(db: Session = Depends(main.get_db)):
    posts = db.query(main.PostModel).order_by(main.PostModel.created_at.desc()).all()
    return [main.serialize_post(p) for p in posts]


@router.post("/")
async def create_post(data: main.PostData, db: Session = Depends(main.get_db)):
    post = main.PostModel(
        title=data.title,
        content=data.content,
        author=data.author,
        tag=data.tag,
        urgent=data.urgent,
        attachments=json.dumps([a.model_dump() for a in (data.attachments or [])]),
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return main.serialize_post(post)


@router.post("/upload")
async def upload_post(
    title: str = Form(...),
    content: str = Form(...),
    author: str = Form(...),
    tag: str = Form("Geral"),
    urgent: bool = Form(False),
    files: Optional[list[UploadFile]] = File(None),
    db: Session = Depends(main.get_db),
):
    attachments = await _files_to_attachments(files)
    post = main.PostModel(
        title=title,
        content=content,
        author=author,
        tag=tag,
        urgent=urgent,
        attachments=json.dumps(attachments),
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return main.serialize_post(post)


@router.delete("/{post_id}")
async def delete_post(post_id: str, db: Session = Depends(main.get_db)):
    post = db.query(main.PostModel).filter(main.PostModel.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post não encontrado")
    db.delete(post)
    db.commit()
    return {"status": "deleted"}
