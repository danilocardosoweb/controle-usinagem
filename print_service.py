"""
Print Service Local - Serviço de Impressão para Windows
Roda em background na porta 9001 e permite imprimir via API REST

Uso:
  python print_service.py
  
Endpoints:
  POST http://localhost:9001/print - Enviar TSPL para impressora
  GET http://localhost:9001/status - Verificar status do serviço
  GET http://localhost:9001/printers - Listar impressoras disponíveis
"""

import win32print
import win32api
import json
import sys
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import threading
import logging
import traceback

SERVICE_VERSION = "2026-01-08 08:45"

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class PrintServiceHandler(BaseHTTPRequestHandler):
    """Handler para requisições HTTP do Print Service"""
    
    def do_GET(self):
        """Processar requisições GET"""
        parsed_path = urlparse(self.path)
        
        if parsed_path.path == '/status':
            self.enviar_json(200, {'status': 'ok', 'message': 'Print Service rodando', 'version': SERVICE_VERSION})
        
        elif parsed_path.path == '/printers':
            try:
                impressoras = self.listar_impressoras()
                self.enviar_json(200, {'printers': impressoras})
            except Exception as e:
                self.enviar_json(500, {'error': str(e)})
        
        else:
            self.enviar_json(404, {'error': 'Endpoint não encontrado'})
    
    def do_POST(self):
        """Processar requisições POST"""
        parsed_path = urlparse(self.path)
        
        if parsed_path.path == '/print':
            try:
                # Ler corpo da requisição
                content_length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_length)
                payload = json.loads(body.decode('utf-8'))
                
                logger.info(f'📥 Requisição recebida: {payload}')
                
                # Validar payload
                if 'printer' not in payload or 'data' not in payload:
                    self.enviar_json(400, {'error': 'Faltam campos: printer, data'})
                    return
                
                impressora = payload['printer']
                dados = payload['data']
                
                logger.info(f'🖨️ Enviando para impressora: {impressora}')
                
                # Enviar resposta ANTES de imprimir (para não perder conexão)
                self.enviar_json(200, {'status': 'ok', 'message': 'Impressão enviada'})
                
                # Imprimir em background
                import threading
                thread = threading.Thread(target=self.imprimir, args=(impressora, dados))
                thread.daemon = True
                thread.start()
                
            except json.JSONDecodeError as e:
                logger.error(f'❌ JSON inválido: {str(e)}')
                self.enviar_json(400, {'error': 'JSON inválido'})
            except Exception as e:
                logger.error(f'❌ Erro ao imprimir: {str(e)}')
                logger.error(traceback.format_exc())
                self.enviar_json(500, {'error': str(e)})
        
        else:
            self.enviar_json(404, {'error': 'Endpoint não encontrado'})
    
    def do_OPTIONS(self):
        """Suportar CORS"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def enviar_json(self, status_code, data):
        """Enviar resposta JSON com CORS"""
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))
    
    def imprimir(self, nome_impressora, dados):
        """
        Imprimir dados na impressora térmica TSC TE200
        
        Estratégias para evitar problemas:
        1. Enviar dados em chunks pequenos (1024 bytes)
        2. Delay entre chunks para buffer processar
        3. Delay maior antes de finalizar job
        4. Um job por documento (não múltiplos PRINT em sequência rápida)
        """
        try:
            logger.info(f'🔍 Tentando conectar à impressora: {nome_impressora}')
            logger.info(f'📊 Tamanho dos dados: {len(dados)} bytes')
            
            # Abrir impressora (suporta UNC path como \\192.168.0.138\TTP-EXP)
            hprinter = win32print.OpenPrinter(nome_impressora)
            logger.info(f'✅ Conectado à impressora: {nome_impressora}')
            
            # Converter dados para bytes
            if isinstance(dados, str):
                dados_bytes = dados.encode('utf-8')
            else:
                dados_bytes = dados
            
            logger.info(f'📤 Enviando {len(dados_bytes)} bytes para impressora...')
            
            # Log dos primeiros 500 caracteres para debug
            preview = dados[:500] if isinstance(dados, str) else dados_bytes[:500].decode('utf-8', errors='ignore')
            logger.info(f'📝 Preview dos dados:\n{preview}...')
            
            try:
                # Iniciar documento de impressão RAW (sem StartPagePrinter, conforme boas práticas TSPL)
                doc_info = ("Etiqueta TSPL", None, "RAW")
                win32print.StartDocPrinter(hprinter, 1, doc_info)

                # Enviar dados em chunks menores para evitar overflow de buffer
                chunk_size = 1024  # Reduzido de 4096 para 1024
                bytes_sent = 0
                total_chunks = (len(dados_bytes) + chunk_size - 1) // chunk_size

                # Para jobs pequenos (1-2 chunks) não faz sentido atrasar.
                # Para jobs grandes, manter um delay mínimo para evitar overflow no driver/buffer.
                inter_chunk_sleep = 0.0 if total_chunks <= 2 else 0.005

                while bytes_sent < len(dados_bytes):
                    chunk = dados_bytes[bytes_sent:bytes_sent + chunk_size]
                    win32print.WritePrinter(hprinter, chunk)
                    bytes_sent += len(chunk)

                    # Log a cada 5 chunks para não poluir
                    chunk_num = bytes_sent // chunk_size
                    if chunk_num % 5 == 0 or bytes_sent >= len(dados_bytes):
                        logger.info(f'  → Chunk {chunk_num}/{total_chunks} - {bytes_sent}/{len(dados_bytes)} bytes')

                    # Pequeno delay entre chunks para TSC processar
                    if inter_chunk_sleep:
                        time.sleep(inter_chunk_sleep)

                # Pequeno delay para garantir que driver/spooler processe o buffer
                time.sleep(0.05)

                # Finalizar documento RAW
                win32print.EndDocPrinter(hprinter)

                logger.info(f'✅ Job TSPL finalizado para: {nome_impressora}')
            
            finally:
                # Fechar impressora
                win32print.ClosePrinter(hprinter)
        
        except Exception as e:
            logger.error(f'❌ Erro ao imprimir em {nome_impressora}: {str(e)}')
            logger.error(f'💡 Dica: Se for impressora compartilhada, use formato UNC: \\\\192.168.0.138\\TTP-EXP')
            logger.error(traceback.format_exc())
            raise
    
    def listar_impressoras(self):
        """Listar todas as impressoras disponíveis"""
        try:
            impressoras = []
            for (name, desc, flags) in win32print.EnumPrinters(2):
                impressoras.append({
                    'nome': name,
                    'descricao': desc,
                    'flags': flags
                })
            return impressoras
        except Exception as e:
            logger.error(f'Erro ao listar impressoras: {str(e)}')
            return []
    
    def log_message(self, format, *args):
        """Suprimir logs padrão do servidor"""
        logger.info(format % args)


def iniciar_servidor(porta=9001):
    """Iniciar o Print Service"""
    try:
        servidor = HTTPServer(('localhost', porta), PrintServiceHandler)
        logger.info(f'🏷️  Versão do Print Service: {SERVICE_VERSION}')
        logger.info(f'🚀 Print Service iniciado na porta {porta}')
        logger.info(f'📍 Endpoints:')
        logger.info(f'   POST http://localhost:{porta}/print - Imprimir')
        logger.info(f'   GET http://localhost:{porta}/status - Status')
        logger.info(f'   GET http://localhost:{porta}/printers - Listar impressoras')
        logger.info(f'⏹️  Pressione Ctrl+C para parar')
        
        servidor.serve_forever()
    
    except KeyboardInterrupt:
        logger.info('⏹️  Print Service parado')
        sys.exit(0)
    except Exception as e:
        logger.error(f'❌ Erro ao iniciar servidor: {str(e)}')
        sys.exit(1)


if __name__ == '__main__':
    iniciar_servidor()
