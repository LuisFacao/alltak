from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form,
)
from fastapi.responses import Response
from sqlalchemy.orm import Session

import main


router = APIRouter(
    prefix="/api/payslips",
    tags=["Payslips"]
)


@router.get("/")
async def list_payslips(
    recipient: Optional[str] = None,
    db: Session = Depends(main.get_db),
):
    query = (
        db.query(main.PayslipModel)
        .order_by(main.PayslipModel.created_at.desc())
    )

    if recipient:
        query = query.filter(
            main.PayslipModel.recipient == recipient
        )

    return [
        main.serialize_payslip(p)
        for p in query.all()
    ]


@router.post("/")
async def create_payslip(
    data: main.PayslipData,
    db: Session = Depends(main.get_db),
):
    try:
        file_data = main._payslip_bytes(data.file_data)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Arquivo do holerite inválido"
        )

    if not file_data:
        raise HTTPException(
            status_code=400,
            detail="Arquivo do holerite vazio"
        )

    p = main.PayslipModel(
        recipient=data.recipient,
        ref=data.ref,
        file_name=data.file_name or "holerite.pdf",
        file_data=file_data,
    )

    db.add(p)
    db.commit()
    db.refresh(p)

    return main.serialize_payslip(p)


def _get_payslip_or_404(
    payslip_id: str,
    db: Session,
):
    p = (
        db.query(main.PayslipModel)
        .filter(main.PayslipModel.id == payslip_id)
        .first()
    )

    if not p:
        raise HTTPException(
            status_code=404,
            detail="Holerite não encontrado"
        )

    if not p.file_data:
        raise HTTPException(
            status_code=404,
            detail="Arquivo do holerite não encontrado"
        )

    return p


@router.get("/{payslip_id}/file")
async def get_payslip_file(
    payslip_id: str,
    db: Session = Depends(main.get_db),
):
    p = _get_payslip_or_404(payslip_id, db)

    file_data = main._payslip_bytes(p.file_data)

    return Response(
        content=file_data,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f'inline; filename="{p.file_name or "holerite.pdf"}"'
            )
        },
    )


@router.get("/{payslip_id}/download")
async def download_payslip(
    payslip_id: str,
    db: Session = Depends(main.get_db),
):
    p = _get_payslip_or_404(payslip_id, db)

    file_data = main._payslip_bytes(p.file_data)

    return Response(
        content=file_data,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{p.file_name or "holerite.pdf"}"'
            )
        },
    )


@router.post("/upload")
async def upload_payslip(
    recipient: str = Form(...),
    ref: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(main.get_db),
):
    file_data = await file.read()

    if not file_data:
        raise HTTPException(
            status_code=400,
            detail="Arquivo vazio"
        )

    filename = file.filename or "holerite.pdf"

    p = main.PayslipModel(
        recipient=recipient,
        ref=ref,
        file_name=filename,
        file_data=file_data,
    )

    db.add(p)
    db.commit()
    db.refresh(p)

    return main.serialize_payslip(p)


@router.put("/{payslip_id}")
async def update_payslip(
    payslip_id: str,
    data: main.PayslipUpdate,
    db: Session = Depends(main.get_db),
):
    p = (
        db.query(main.PayslipModel)
        .filter(main.PayslipModel.id == payslip_id)
        .first()
    )

    if not p:
        raise HTTPException(
            status_code=404,
            detail="Holerite não encontrado"
        )

    p.recipient = data.recipient
    p.ref = data.ref

    db.commit()
    db.refresh(p)

    return main.serialize_payslip(p)


@router.delete("/{payslip_id}")
async def delete_payslip(
    payslip_id: str,
    db: Session = Depends(main.get_db),
):
    p = (
        db.query(main.PayslipModel)
        .filter(main.PayslipModel.id == payslip_id)
        .first()
    )

    if not p:
        raise HTTPException(
            status_code=404,
            detail="Holerite não encontrado"
        )

    db.delete(p)
    db.commit()

    return {"status": "deleted"}
