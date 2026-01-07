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
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import threading
import logging
import traceback

SERVICE_VERSION = "2026-01-07 15:45"

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
        """Imprimir dados na impressora"""
        try:
            # Abrir impressora
            hprinter = win32print.OpenPrinter(nome_impressora)
            
            # Converter dados para bytes
            if isinstance(dados, str):
                dados_bytes = dados.encode('utf-8')
            else:
                dados_bytes = dados
            
            try:
                # Iniciar documento de impressão
                doc_info = ("Impressão TSPL", None, "RAW")
                win32print.StartDocPrinter(hprinter, 1, doc_info)
                win32print.StartPagePrinter(hprinter)

                # Enviar dados para impressora
                win32print.WritePrinter(hprinter, dados_bytes)

                # Finalizar página/documento
                win32print.EndPagePrinter(hprinter)
                win32print.EndDocPrinter(hprinter)
                
                logger.info(f'✅ Impressão enviada para: {nome_impressora}')
            
            finally:
                # Fechar impressora
                win32print.ClosePrinter(hprinter)
        
        except Exception as e:
            logger.error(f'❌ Erro ao imprimir: {str(e)}')
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
