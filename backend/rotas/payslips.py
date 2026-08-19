from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import main

router = APIRouter(prefix="/api/payslips", tags=["Payslips"])

@router.get("/")
async def list_payslips(recipient: Optional[str] = None, db: Session = Depends(main.get_db)):
    q = db.query(main.PayslipModel).order_by(main.PayslipModel.created_at.desc())
    if recipient:
        q = q.filter(main.PayslipModel.recipient == recipient)
    return [main.serialize_payslip(p) for p in q.all()]

@router.post("/")
async def create_payslip(data: main.PayslipData, db: Session = Depends(main.get_db)):
    p = main.PayslipModel(recipient=data.recipient, ref=data.ref, file_name=data.file_name, file_data=data.file_data)
    db.add(p)
    db.commit()
    db.refresh(p)
    return main.serialize_payslip(p)

@router.delete("/{payslip_id}")
async def delete_payslip(payslip_id: str, db: Session = Depends(main.get_db)):
    p = db.query(main.PayslipModel).filter(main.PayslipModel.id == payslip_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Holerite não encontrado")
    db.delete(p)
    db.commit()
    return {"status": "deleted"}