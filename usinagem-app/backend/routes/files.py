from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from pathlib import Path
import re

router = APIRouter(prefix="/files", tags=["Arquivos"])

@router.get("/pdf/{filename}")
def get_pdf(filename: str, base: str = Query(..., description="Caminho base onde os PDFs estão armazenados")):
    # Garante extensão .pdf
    if not filename.lower().endswith('.pdf'):
        filename = f"{filename}.pdf"

    try:
        # Normaliza caminho base (Windows drive ou UNC)
        b = base.strip().strip('"')
        # Converter 'U:' para 'U:\\'
        m = re.fullmatch(r"([A-Za-z]):[/\\]?", b)
        if m:
            b = f"{m.group(1)}:/"
        # Trocar barras para o formato do SO
        b = b.replace('\\\\', '\\')
        base_path = Path(b)
        # Monta o caminho final
        file_path = (base_path / filename).resolve()
        # Opcional: impedir sair do base_path quando base existe
        try:
            if base_path.exists() and base_path.resolve() not in file_path.parents and base_path.resolve() != file_path:
                raise HTTPException(status_code=400, detail="Caminho inválido")
        except Exception:
            # Se base não existe, apenas segue para verificação de existência do arquivo
            pass

        if not file_path.exists() or file_path.suffix.lower() != '.pdf':
            raise HTTPException(status_code=404, detail="Arquivo não encontrado")

        headers = {"Content-Disposition": f"inline; filename={Path(filename).name}"}
        return FileResponse(str(file_path), media_type="application/pdf", headers=headers)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao abrir arquivo: {e}")
