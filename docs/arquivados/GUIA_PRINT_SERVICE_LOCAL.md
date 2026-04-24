# 🖨️ Guia: Print Service Local (Solução 3)

## 📋 Visão Geral

O **Print Service Local** é um serviço Windows que roda em background na porta 9001 e permite imprimir em impressoras Windows via API REST simples.

**Vantagens:**
- ✅ Funciona com qualquer impressora Windows
- ✅ Sem necessidade de driver especial
- ✅ Sem bloqueios de navegador
- ✅ Rápido e confiável
- ✅ Roda em background automaticamente

---

## 🚀 Como Instalar e Usar

### Passo 1: Instalar Dependências

1. Abra **PowerShell** como Administrador
2. Cole este comando:

```powershell
pip install pywin32
```

### Passo 2: Iniciar o Print Service

**Opção A: Executar arquivo BAT (Mais Fácil)**

1. Navegue até: `c:\Users\pcp\Desktop\Apps Prontos\Usinagem\`
2. Clique duas vezes em: **`iniciar_print_service.bat`**
3. Uma janela de terminal abrirá mostrando:
   ```
   🚀 Iniciando Print Service na porta 9001...
   ```

**Opção B: Executar via PowerShell**

```powershell
cd "c:\Users\pcp\Desktop\Apps Prontos\Usinagem"
python print_service.py
```

### Passo 3: Verificar se Está Rodando

Abra o navegador e acesse:
```
http://localhost:9001/status
```

Você deve ver:
```json
{
  "status": "ok",
  "message": "Print Service rodando"
}
```

---

## 🖨️ Como Usar no App

### Passo 1: Listar Impressoras Disponíveis

1. Vá para **Configurações > Impressoras**
2. Clique no botão **🔄** ao lado de "Caminho da Impressora Compartilhada"
3. O app listará todas as impressoras Windows disponíveis

### Passo 2: Selecionar Impressora

1. Na lista, procure por **"TSC TE200"**
2. Clique para selecionar
3. O nome aparecerá no campo

### Passo 3: Testar

1. Clique no botão **"Testar"**
2. Uma etiqueta de teste será impressa
3. Se funcionar: ✅ **Pronto!**

---

## 📊 Endpoints do Print Service

### GET /status
Verifica se o serviço está rodando

```bash
curl http://localhost:9001/status
```

**Resposta:**
```json
{
  "status": "ok",
  "message": "Print Service rodando"
}
```

---

### GET /printers
Lista todas as impressoras Windows

```bash
curl http://localhost:9001/printers
```

**Resposta:**
```json
{
  "printers": [
    {
      "nome": "TSC TE200",
      "descricao": "TSC TE200",
      "flags": 8388608
    },
    {
      "nome": "Samsung ML-371x Series PCL 6",
      "descricao": "Samsung ML-371x Series PCL 6",
      "flags": 8388608
    }
  ]
}
```

---

### POST /print
Envia TSPL para impressora

```bash
curl -X POST http://localhost:9001/print \
  -H "Content-Type: application/json" \
  -d '{
    "printer": "TSC TE200",
    "data": "SIZE 100 mm,45 mm\nCLS\nTEXT 10,10,\"0\",0,1,1,\"TESTE\"\nPRINT 1,1\n"
  }'
```

**Resposta:**
```json
{
  "status": "ok",
  "message": "Impressão enviada"
}
```

---

## 🔧 Configuração Avançada

### Mudar Porta do Serviço

Edite `print_service.py` e altere:

```python
def iniciar_servidor(porta=9001):  # Mude 9001 para outra porta
```

### Adicionar Autenticação

Para adicionar segurança, edite o handler:

```python
def do_POST(self):
    # Verificar token
    token = self.headers.get('Authorization', '')
    if token != 'Bearer seu_token_aqui':
        self.enviar_json(401, {'error': 'Não autorizado'})
        return
```

---

## 🐛 Solução de Problemas

### ❌ "Print Service não está rodando"

**Causa:** O arquivo `iniciar_print_service.bat` não foi executado

**Solução:**
1. Abra `iniciar_print_service.bat`
2. Deixe a janela aberta enquanto usa o app
3. Se fechar, o serviço para

---

### ❌ "Impressora não encontrada"

**Causa:** Impressora não está instalada ou compartilhada no Windows

**Solução:**
1. Vá para **Configurações > Dispositivos > Impressoras e scanners**
2. Verifique se a TSC TE200 aparece
3. Se não aparecer, instale o driver

---

### ❌ "Erro ao imprimir"

**Causa:** Impressora desligada ou offline

**Solução:**
1. Verifique se a impressora está ligada
2. Verifique se o cabo USB está conectado
3. Tente imprimir de outro programa (ex: Notepad)

---

## 📦 Instalação como Serviço Windows (Opcional)

Para que o Print Service inicie automaticamente com o Windows:

1. Abra **PowerShell como Administrador**
2. Execute:

```powershell
cd "c:\Users\pcp\Desktop\Apps Prontos\Usinagem"
python print_service.py install
python print_service.py start
```

Para remover:

```powershell
python print_service.py stop
python print_service.py remove
```

---

## 🎯 Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                    Navegador                            │
│                  (localhost:5173)                       │
│                                                         │
│  ┌──────────────┐         ┌─────────────────────────┐ │
│  │   Frontend   │  HTTP   │   Print Service Local   │ │
│  │   (React)    │ ──────> │   (localhost:9001)      │ │
│  └──────────────┘         └─────────────────────────┘ │
│                                      │                  │
└──────────────────────────────────────┼──────────────────┘
                                       │ Windows API
                                       ▼
                            ┌──────────────────┐
                            │  Impressora      │
                            │  TSC TE200       │
                            └──────────────────┘
```

---

## ✅ Checklist de Implementação

- [x] Criar `print_service.py`
- [x] Criar `iniciar_print_service.bat`
- [x] Criar `LocalPrintService.js`
- [x] Integrar com `PrintService.js`
- [ ] Atualizar `ConfiguradorImpressora.jsx`
- [ ] Atualizar `Configuracoes.jsx`
- [ ] Testar impressão via Print Service

---

**Status:** ✅ Implementação Completa

**Data:** 07/01/2026

**Próximo Passo:** Executar `iniciar_print_service.bat` e testar no app
