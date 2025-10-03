# Controle de Usinagem - Fábrica de Extrusão

## Descrição

Aplicação web para controle e apontamentos da usinagem na Fábrica de Extrusão de Perfis de Alumínio. O sistema permite o registro de ordens de trabalho, apontamentos de produção, controle de paradas de máquina, monitoramento de indicadores de desempenho (OEE) e geração de relatórios exportáveis.

## Tecnologias Utilizadas

### Frontend
- React
- Tailwind CSS
- React Router
- Chart.js

### Backend
- FastAPI (Python)
- Supabase (PostgreSQL)

## Estrutura do Projeto

```
usinagem-app/
├── backend/             # API FastAPI
│   ├── core/           # Configurações e funcionalidades centrais
│   ├── routes/         # Rotas da API
│   ├── schemas/        # Modelos de dados (Pydantic)
│   ├── main.py         # Ponto de entrada da API
│   └── requirements.txt # Dependências Python
├── frontend/            # Aplicação React
│   ├── src/            # Código fonte
│   │   ├── components/  # Componentes reutilizáveis
│   │   ├── pages/       # Páginas da aplicação
│   │   ├── assets/      # Recursos estáticos
│   │   ├── context/     # Contextos React
│   │   └── utils/       # Funções utilitárias
│   ├── index.html      # Página HTML principal
│   ├── package.json     # Dependências JavaScript
│   └── tailwind.config.js # Configuração do Tailwind
├── database_schema.sql  # Esquema SQL do banco de dados
├── database_schema.md   # Documentação do banco de dados
├── specs.md            # Especificações do projeto
└── change_log.md       # Registro de alterações
```

## Funcionalidades Principais

1. **Autenticação de Usuários**
   - Diferentes níveis de acesso (operador, supervisor, admin)

2. **Apontamentos da Usinagem**
   - Registro de ordens de trabalho em execução
   - Controle de início/fim e quantidade produzida

3. **Apontamentos de Paradas de Máquina**
   - Registro de eventos de parada com motivo e duração
   - Classificação das paradas

4. **Dashboard Interativo**
   - Indicadores OEE (Disponibilidade, Performance, Qualidade)
   - Gráficos de produção e paradas

5. **Carteira de Encomendas**
   - Upload de arquivo Excel
   - Gerenciamento de ordens de trabalho

6. **Relatórios Exportáveis**
   - Filtros por data, máquina e operador
   - Exportação em Excel e PDF

## Como Executar

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Banco de Dados

O sistema utiliza o Supabase como plataforma de banco de dados. O esquema completo está disponível no arquivo `database_schema.sql` e documentado em `database_schema.md`.

## Documentação

Para mais detalhes sobre as especificações do projeto, consulte o arquivo `specs.md`.
