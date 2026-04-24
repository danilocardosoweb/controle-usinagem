# Manual de Instalação e Configuração do Sistema de Usinagem em Outro Computador

## Objetivo

Este documento explica o passo a passo para instalar, configurar e executar o sistema em um computador diferente do ambiente de desenvolvimento.

Ele cobre:

- instalação das dependências
- configuração do frontend
- configuração do backend
- configuração do Supabase
- configuração da impressão térmica
- validações finais
- solução de problemas comuns

---

# 1. Requisitos do computador

## Sistema operacional

- Windows 10 ou Windows 11

## Programas obrigatórios

Instale os itens abaixo antes de tentar abrir o sistema:

- **Python 3.10 ou 3.11**
- **Node.js 18 ou superior**
- **npm** (normalmente já vem com o Node.js)
- **Git** (opcional, mas recomendado para clonar/atualizar o projeto)

## Observações importantes

Durante a instalação do Python:

- **marque a opção `Add Python to PATH`**

Para validar depois da instalação, abra o PowerShell e rode:

```powershell
python --version
node --version
npm --version
```

Se algum deles não funcionar, a instalação do ambiente ainda não está pronta.

---

# 2. Estrutura esperada do projeto

Este manual considera que a pasta do projeto estará assim:

```text
Usinagem/
├── iniciar_app.bat
├── iniciar_app_simples.bat
├── iniciar_print_service.bat
├── instalar_servico.bat
├── print_service.py
└── usinagem-app/
    ├── backend/
    └── frontend/
```

Se a estrutura estiver diferente, ajuste os caminhos antes de usar os scripts.

---

# 3. Instalação inicial do projeto

## 3.1. Copiar o projeto para o novo computador

Você pode fazer isso de uma das formas abaixo:

- copiar a pasta completa do projeto por rede/pendrive
- clonar do GitHub

Exemplo com Git:

```powershell
git clone https://github.com/danilocardosoweb/controle-usinagem.git
```

Depois entre na pasta raiz do projeto.

---

# 4. Configuração do frontend

O frontend usa Vite + React.

## 4.1. Criar arquivo de variáveis de ambiente

Dentro da pasta:

```text
usinagem-app/frontend/
```

crie um arquivo chamado:

```text
.env.local
```

Use como base o arquivo `.env.example`.

Conteúdo mínimo:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_aqui
VITE_APP_NAME=Sistema de Usinagem
VITE_APP_VERSION=1.0.0
```

## 4.2. Onde encontrar os dados do Supabase

No painel do Supabase, copie:

- **Project URL**
- **anon/public key**

Esses valores precisam ser colocados no `.env.local`.

## 4.3. Instalar dependências do frontend

No PowerShell:

```powershell
npm install --prefix .\usinagem-app\frontend
```

Ou entrando na pasta:

```powershell
python -c "print('ok')" 2>$null
```

```powershell
cd .\usinagem-app\frontend
npm install
```

## 4.4. Atualizações obrigatórias no Supabase (racks)

Para o apontamento funcionar corretamente com Rack/Pallet (Acabado), confirme no Supabase:

1. **Coluna `rack_acabado` na tabela `apontamentos`**
   - Tipo: `text`
   - Armazena o rack do produto acabado (diferente do rack de matéria prima).

2. **Tabela `rack_counter` e função `obter_proximo_rack_usinagem()`**
   - Responsável pela numeração automática dos racks: `USI-1001` até `USI-1999`.
   - Ao chegar em `USI-1999`, volta para `USI-1001`.

Se o ambiente for novo, execute o SQL do `database_schema.md` para garantir a criação desses itens.

---

# 5. Configuração do backend

O backend usa FastAPI + Python.

## 5.1. Criar ambiente virtual

No PowerShell:

```powershell
cd .\usinagem-app\backend
python -m venv venv
```

## 5.2. Instalar dependências do backend

Com o ambiente virtual criado, use:

```powershell
.\venv\Scripts\python -m pip install --upgrade pip
.\venv\Scripts\python -m pip install -r requirements.txt
```

As dependências do backend incluem, entre outras:

- `fastapi`
- `uvicorn`
- `supabase`
- `pandas`
- `openpyxl`
- `pyserial`
- `pywin32`

## 5.3. Dependência importante para impressão

O sistema de impressão local precisa de:

- `pywin32`

Se houver erro como:

```text
ModuleNotFoundError: No module named 'win32print'
```

rode:

```powershell
python -m pip install pywin32
```

ou, se estiver usando o Python do ambiente virtual:

```powershell
.\venv\Scripts\python -m pip install pywin32
```

---

# 6. Como iniciar o sistema

## Opção 1: iniciar tudo com o script principal

Na raiz do projeto, execute:

```powershell
.\iniciar_app.bat
```

Esse script faz:

- valida Python
- cria `venv` do backend se necessário
- instala dependências do backend
- instala dependências do frontend
- sobe backend em `http://localhost:8000`
- sobe frontend em `http://localhost:5173`

## Opção 2: usar o script simples

Se o ambiente já estiver preparado:

```powershell
.\iniciar_app_simples.bat
```

## Opção 3: iniciar manualmente

### Backend

```powershell
cd .\usinagem-app\backend
.\venv\Scripts\activate
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

Em outro terminal:

```powershell
cd .\usinagem-app\frontend
npm run dev
```

---

# 7. Configuração da impressão térmica

O sistema pode usar o serviço local de impressão no Windows.

## 7.1. O que é o Print Service Local

É um serviço Python local que expõe estes endpoints:

- `POST http://localhost:9001/print`
- `GET http://localhost:9001/status`
- `GET http://localhost:9001/printers`

Ele é usado para enviar TSPL diretamente para a impressora térmica do Windows.

## 7.2. Instalar dependência da impressão

No PowerShell:

```powershell
python -m pip install pywin32
```

Se preferir usar o ambiente virtual do backend:

```powershell
cd .\usinagem-app\backend
.\venv\Scripts\python -m pip install pywin32
```

## 7.3. Iniciar o Print Service manualmente

Na raiz do projeto:

```powershell
python .\print_service.py
```

Ou usando o script:

```powershell
.\iniciar_print_service.bat
```

## 7.4. Como validar se o serviço subiu

Abra outro terminal e rode:

```powershell
curl http://localhost:9001/status
```

Resposta esperada:

```json
{"status":"ok","message":"Print Service rodando"}
```

## 7.5. Como listar as impressoras disponíveis

```powershell
curl http://localhost:9001/printers
```

## 7.6. Configuração dentro do sistema

No sistema, acesse:

- **Configurações**
- **Impressoras**

Para a impressora térmica:

- ativar a impressora
- selecionar o tipo **`Local Print Service (Windows)`**
- escolher a impressora do Windows
- salvar a configuração
- usar o botão de teste

## 7.7. Impressora compartilhada em rede

Se a impressora for compartilhada no Windows, pode ser necessário informar um caminho como:

```text
\\192.168.0.138\TTP-EXP
```

---

# 8. Instalação do Print Service como serviço do Windows

Se quiser deixar o serviço de impressão sempre disponível no computador, use:

```powershell
.\instalar_servico.bat
```

## Observações

- execute como **Administrador**
- o script tenta usar **NSSM** se estiver instalado
- também existe alternativa com `pywin32`

Isso é útil para computadores de operação, onde o usuário não deve iniciar manualmente o serviço toda vez.

---

# 9. Ordem recomendada para preparar um novo computador

## Passo a passo recomendado

- **1.** Instalar Python 3.10 ou 3.11 com `Add Python to PATH`
- **2.** Instalar Node.js 18+
- **3.** Copiar ou clonar o projeto
- **4.** Criar `usinagem-app/frontend/.env.local`
- **5.** Preencher `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
- **6.** Executar `iniciar_app.bat`
- **7.** Instalar `pywin32` com `python -m pip install pywin32`
- **8.** Executar `iniciar_print_service.bat` ou `python .\print_service.py`
- **9.** Abrir o sistema em `http://localhost:5173`
- **10.** Configurar impressoras na tela de Configurações
- **11.** Fazer teste de impressão térmica

---

# 10. Checklist de validação final

Antes de entregar o computador para uso, valide:

## Aplicação

- **backend abre sem erro**
- **frontend abre sem erro**
- **login funciona**
- **dados do Supabase carregam normalmente**
- **telas principais abrem**
- **exportações funcionam**

## Impressão

- **`http://localhost:9001/status` responde**
- **a impressora aparece em `/printers`**
- **a impressora térmica está salva em Configurações**
- **o teste de impressão funciona**
- **a impressão de etiqueta real funciona**

---

# 11. Problemas comuns e soluções

## Erro: `python não é reconhecido`

Instale ou reinstale o Python e marque:

- **Add Python to PATH**

Depois reinicie o computador.

## Erro: `pip não é reconhecido`

Use:

```powershell
python -m pip install pywin32
```

em vez de:

```powershell
pip install pywin32
```

## Erro: `ModuleNotFoundError: No module named 'win32print'`

Instale:

```powershell
python -m pip install pywin32
```

## Erro de CORS ao imprimir

Verifique:

- se o frontend está usando a configuração de `local_print_service`
- se o serviço local está ativo na porta `9001`
- se o navegador foi recarregado após mudanças

## Frontend abre mas não carrega Supabase

Verifique o arquivo:

```text
usinagem-app/frontend/.env.local
```

Confira se estas variáveis estão preenchidas corretamente:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Depois reinicie o Vite.

## Impressora não aparece na lista

Verifique:

- se a impressora está instalada no Windows
- se está ligada
- se o usuário tem permissão de acesso
- se o `Print Service` está rodando

---

# 12. Comandos úteis

## Instalar frontend

```powershell
npm install --prefix .\usinagem-app\frontend
```

## Instalar backend

```powershell
cd .\usinagem-app\backend
python -m venv venv
.\venv\Scripts\python -m pip install --upgrade pip
.\venv\Scripts\python -m pip install -r requirements.txt
```

## Rodar backend

```powershell
cd .\usinagem-app\backend
.\venv\Scripts\activate
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Rodar frontend

```powershell
cd .\usinagem-app\frontend
npm run dev
```

## Instalar pywin32

```powershell
python -m pip install pywin32
```

## Rodar print service

```powershell
python .\print_service.py
```

## Testar status do print service

```powershell
curl http://localhost:9001/status
```

---

# 13. Recomendação para entrega em produção/local de operação

Para um computador de uso operacional, o ideal é:

- deixar o Python já instalado
- deixar Node.js já instalado
- deixar o `.env.local` pronto
- deixar o frontend/backend testados
- instalar `pywin32`
- configurar a impressora térmica
- testar pelo menos 1 impressão real
- se possível, instalar o Print Service como serviço do Windows

---

# 14. Arquivos importantes

## Raiz do projeto

- `iniciar_app.bat`
- `iniciar_app_simples.bat`
- `iniciar_print_service.bat`
- `instalar_servico.bat`
- `print_service.py`

## Frontend

- `usinagem-app/frontend/package.json`
- `usinagem-app/frontend/.env.local`
- `usinagem-app/frontend/.env.example`

## Backend

- `usinagem-app/backend/requirements.txt`

---

# 15. Observação final

Se o sistema for instalado em um computador fora do ambiente de desenvolvimento, faça sempre esta sequência mínima:

- instalar Python
- instalar Node.js
- configurar `.env.local`
- executar `iniciar_app.bat`
- instalar `pywin32`
- iniciar `print_service.py`
- configurar a impressora no sistema
- testar impressão

Se qualquer uma dessas etapas falhar, o aplicativo pode abrir, mas recursos como banco, relatórios ou impressão podem não funcionar corretamente.
