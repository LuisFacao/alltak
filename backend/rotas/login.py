from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import main

login_router = APIRouter(prefix="/api/auth/login", tags=["Login"])
users_router = APIRouter(prefix="/api/users", tags=["Users"])

@login_router.options("/")
async def options_login():
    return {}

@login_router.post("/")
async def login(data: main.LoginData, db: Session = Depends(main.get_db)):
    user = db.query(main.UserModel).filter(main.UserModel.email == data.email).first()
    if not user or not main.verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos")

    token = main.create_token(user.id, user.email, user.role)
    return {
        "token": token,
        "user": {"id": user.id, "email": user.email, "role": user.role, "initial": user.initial},
    }

@users_router.get("/")
async def list_users(db: Session = Depends(main.get_db)):
    return [{"id": u.id, "email": u.email, "role": u.role, "initial": u.initial} for u in db.query(main.UserModel).all()]

@users_router.post("/")
async def create_user(data: main.UserData, db: Session = Depends(main.get_db)):
    if not data.password:
        raise HTTPException(status_code=400, detail="Senha é obrigatória para criar usuário")
    if db.query(main.UserModel).filter(main.UserModel.email == data.email).first():
        raise HTTPException(status_code=400, detail="Este e-mail já está cadastrado")

    initial = data.email[:2].upper()
    user = main.UserModel(email=data.email, password_hash=main.hash_password(data.password), role=data.role, initial=initial)
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "email": user.email, "role": user.role, "initial": user.initial}

@users_router.delete("/{user_id}")
async def delete_user(user_id: str, db: Session = Depends(main.get_db)):
    user = db.query(main.UserModel).filter(main.UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    db.delete(user)
    db.commit()
    return {"status": "deleted"}