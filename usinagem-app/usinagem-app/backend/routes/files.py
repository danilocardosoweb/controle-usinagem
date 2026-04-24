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
        b_raw = base.strip().strip('"')

        # Aceitar também quando o usuário informa o CAMINHO COMPLETO do PDF em `base`.
        # Ex.: base="U:\\PU-5080.pdf" e filename="PU-5080.pdf" (ou qualquer outro)
        b_path_candidate = Path(b_raw)
        if b_raw.lower().endswith('.pdf'):
            # Quando base é arquivo, a pasta base é o parent
            base_path = b_path_candidate.parent
        else:
            # Converter 'U:' para 'U:/', para evitar Path("U:") virar algo inesperado
            m = re.match(r"^([A-Za-z]):([/\\])?", b_raw)
            if m:
                drive = m.group(1)
                sep = m.group(2)
                # Se não tiver separador, adiciona /
                if not sep:
                    b_raw = f"{drive}:/"
                else:
                    # Se tiver separador, normaliza para /
                    b_raw = f"{drive}:/"
            base_path = Path(b_raw)

        # Monta o caminho final
        file_path = (base_path / filename).resolve()

        # Impedir path traversal quando a base existe (checa se file_path está dentro de base_path)
        try:
            if base_path.exists():
                base_resolved = base_path.resolve()
                if base_resolved != file_path and base_resolved not in file_path.parents:
                    raise HTTPException(status_code=400, detail="Caminho inválido")
        except HTTPException:
            raise
        except Exception:
            # Se não conseguir resolver base (UNC offline etc), apenas segue para verificação de existência
            pass

        if not file_path.exists() or file_path.suffix.lower() != '.pdf':
            raise HTTPException(status_code=404, detail="Arquivo não encontrado")

        headers = {"Content-Disposition": f"inline; filename={Path(filename).name}"}
        return FileResponse(str(file_path), media_type="application/pdf", headers=headers)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao abrir arquivo: {e}")
