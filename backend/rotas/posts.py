from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import main

router = APIRouter(prefix="/api/posts", tags=["Posts"])

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
        urgent=data.urgent
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