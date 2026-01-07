from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import socket
import sys

router = APIRouter(prefix="/print", tags=["Impressão"])


class PrintTsplRequest(BaseModel):
    tipo: str = Field("rede_ip", description="Tipo: rede_ip, usb_com, compartilhada_windows")
    ip: str = Field("", description="IP da impressora (para rede_ip)")
    porta: int = Field(9100, description="Porta RAW (para rede_ip)")
    porta_com: str = Field("", description="Porta COM (para usb_com, ex: COM1)")
    caminho_compartilhada: str = Field("", description="Caminho compartilhada (para compartilhada_windows, ex: \\\\servidor\\impressora)")
    tspl: str = Field(..., description="Comandos TSPL para impressão")
    timeout_ms: int = Field(3000, description="Timeout de conexão/envio em ms")


@router.post("/tspl")
def print_tspl(payload: PrintTsplRequest):
    data = (payload.tspl or "").encode("utf-8", errors="ignore")
    if not data:
        raise HTTPException(status_code=400, detail="TSPL vazio")

    timeout = max(payload.timeout_ms, 250) / 1000.0
    tipo = (payload.tipo or "rede_ip").strip().lower()

    try:
        if tipo == "rede_ip":
            return _print_rede_ip(payload, data, timeout)
        elif tipo == "usb_com":
            return _print_usb_com(payload, data, timeout)
        elif tipo == "compartilhada_windows":
            return _print_compartilhada_windows(payload, data)
        else:
            raise HTTPException(status_code=400, detail=f"Tipo de impressora desconhecido: {tipo}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Erro ao imprimir: {str(e)}")


def _print_rede_ip(payload: PrintTsplRequest, data: bytes, timeout: float):
    """Impressora de rede via IP:porta (RAW ou LPR/LPD)"""
    ip = (payload.ip or "").strip()
    if not ip:
        raise HTTPException(status_code=400, detail="IP da impressora é obrigatório")

    if payload.porta <= 0 or payload.porta > 65535:
        raise HTTPException(status_code=400, detail="Porta inválida")

    try:
        # Porta 515 usa protocolo LPR/LPD
        if payload.porta == 515:
            lpr_data = b"\x02lp\n" + data
            with socket.create_connection((ip, payload.porta), timeout=timeout) as s:
                s.settimeout(timeout)
                s.sendall(lpr_data)
        else:
            # Porta 9100 ou outras - RAW direto
            with socket.create_connection((ip, payload.porta), timeout=timeout) as s:
                s.settimeout(timeout)
                s.sendall(data)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Falha ao enviar para {ip}:{payload.porta} - {e}")


def _print_usb_com(payload: PrintTsplRequest, data: bytes, timeout: float):
    """Impressora USB/COM conectada localmente"""
    porta_com = (payload.porta_com or "").strip().upper()
    if not porta_com:
        raise HTTPException(status_code=400, detail="Porta COM é obrigatória (ex: COM1)")

    try:
        import serial
        
        # Validar formato da porta COM
        if not porta_com.startswith("COM"):
            raise ValueError(f"Porta COM inválida: {porta_com}")

        # Conectar e enviar
        with serial.Serial(porta_com, baudrate=9600, timeout=timeout) as ser:
            ser.write(data)
            ser.flush()
        
        return {"ok": True}
    except ImportError:
        raise HTTPException(status_code=500, detail="Biblioteca pyserial não instalada")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Falha ao enviar para {porta_com} - {e}")


def _print_compartilhada_windows(payload: PrintTsplRequest, data: bytes):
    """Impressora compartilhada Windows (\\\\servidor\\impressora)"""
    caminho = (payload.caminho_compartilhada or "").strip()
    if not caminho:
        raise HTTPException(status_code=400, detail="Caminho da impressora compartilhada é obrigatório")

    if not sys.platform.startswith("win"):
        raise HTTPException(status_code=400, detail="Impressoras compartilhadas Windows só funcionam em Windows")

    try:
        import win32print
        import win32api
        
        # Abrir impressora compartilhada
        hprinter = win32print.OpenPrinter(caminho)
        
        try:
            # Enviar dados para impressão
            win32print.WritePrinter(hprinter, data)
        finally:
            win32print.ClosePrinter(hprinter)
        
        return {"ok": True}
    except ImportError:
        raise HTTPException(status_code=500, detail="Biblioteca pywin32 não instalada ou não configurada")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Falha ao enviar para {caminho} - {e}")


@router.get("/portas-com")
def listar_portas_com():
    """Lista portas COM/USB disponíveis no sistema"""
    try:
        import serial.tools.list_ports
        
        portas = []
        for port, desc, hwid in serial.tools.list_ports.comports():
            portas.append({
                "porta": port,
                "descricao": desc,
                "hwid": hwid
            })
        
        return {"portas": portas}
    except ImportError:
        raise HTTPException(status_code=500, detail="Biblioteca pyserial não instalada")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar portas COM: {str(e)}")


@router.get("/impressoras-windows")
def listar_impressoras_windows():
    """Lista impressoras compartilhadas Windows disponíveis"""
    if not sys.platform.startswith("win"):
        raise HTTPException(status_code=400, detail="Apenas disponível em Windows")
    
    try:
        import win32print
        
        impressoras = []
        flags = win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS
        
        for printer_info in win32print.EnumPrinters(flags):
            impressoras.append({
                "nome": printer_info[2],
                "caminho": printer_info[2],
                "descricao": printer_info[4] if len(printer_info) > 4 else ""
            })
        
        return {"impressoras": impressoras}
    except ImportError:
        raise HTTPException(status_code=500, detail="Biblioteca pywin32 não instalada ou não configurada")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar impressoras: {str(e)}")
