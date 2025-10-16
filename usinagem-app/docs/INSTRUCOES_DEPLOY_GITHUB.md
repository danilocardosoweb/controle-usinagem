# Instruções para Deploy no GitHub

## Preparação do repositório

### 1. Inicializar Git (se ainda não foi feito)
```bash
cd "C:\Users\pcp\Desktop\Usinagem - Copia\usinagem-app"
git init
```

### 2. Criar arquivo .gitignore
Crie o arquivo `.gitignore` na raiz do projeto com o seguinte conteúdo:

```gitignore
# Dependencies
node_modules/
*/node_modules/

# Build outputs
dist/
build/
*/dist/
*/build/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# next.js build output
.next

# nuxt.js build output
.nuxt

# vuepress build output
.vuepress/dist

# Serverless directories
.serverless/

# FuseBox cache
.fusebox/

# DynamoDB Local files
.dynamodb/

# TernJS port file
.tern-port

# IDE files
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
ENV/
env.bak/
venv.bak/

# Supabase
.supabase/

# Temporary files
*.tmp
*.temp
```

### 3. Adicionar todos os arquivos ao Git
```bash
git add .
```

### 4. Fazer commit inicial com todas as funcionalidades
```bash
git commit -m "feat: Sistema completo de controle de usinagem

- ✅ Dashboard com indicadores OEE, tempo de parada e ordens
- ✅ Apontamentos de usinagem com rastreabilidade completa
- ✅ Sistema de amarrados com busca e seleção múltipla
- ✅ Relatórios avançados com exportação Excel
- ✅ Rastreabilidade detalhada (amarrados/lotes/racks)
- ✅ Campo de refugo/sucata nos apontamentos
- ✅ Filtros por produto e ferramenta
- ✅ Layout responsivo para dispositivos móveis
- ✅ Integração com Supabase/PostgreSQL
- ✅ Autenticação de usuários
- ✅ Importação de planilhas Excel
- ✅ Configurações de máquinas e ferramentas

Principais funcionalidades:
- Apontamentos com timer integrado
- Busca por amarrados com modal avançado
- Relatórios: Produção, Paradas, OEE, Expedição, Rastreabilidade
- Dashboard em tempo real
- Sistema de lotes e racks
- Controle de paradas de máquina
- Exportação para Excel nativo

Tecnologias: React, Tailwind CSS, Supabase, FastAPI"
```

## Criação do repositório no GitHub

### 5. Criar repositório no GitHub
1. Acesse [github.com](https://github.com)
2. Clique em "New repository" (ou use o botão "+")
3. Preencha os dados:
   - **Repository name**: `sistema-usinagem` ou `controle-usinagem`
   - **Description**: `Sistema completo de controle e apontamentos de usinagem com rastreabilidade de amarrados`
   - **Visibility**: Private ou Public (conforme sua preferência)
   - **NÃO** marque "Add a README file" (já temos um)
   - **NÃO** adicione .gitignore (já criamos um)

### 6. Conectar repositório local ao GitHub
```bash
# Substitua SEU_USUARIO e NOME_DO_REPOSITORIO pelos valores corretos
git remote add origin https://github.com/SEU_USUARIO/NOME_DO_REPOSITORIO.git
git branch -M main
git push -u origin main
```

## Estrutura do README.md

Atualize o arquivo `README.md` existente com informações mais completas:

```markdown
# Sistema de Controle de Usinagem

Sistema completo para controle e apontamentos de usinagem em fábrica de extrusão de perfis de alumínio, com rastreabilidade completa de amarrados e lotes.

## 🚀 Funcionalidades Principais

### 📊 Dashboard
- Indicadores OEE (Disponibilidade, Performance, Qualidade)
- Tempo de parada em tempo real
- Ordens em execução com progresso
- Produção diária e estatísticas

### 🏭 Apontamentos de Usinagem
- Timer integrado para controle de tempo
- Seleção de pedidos com preenchimento automático
- Busca avançada por amarrados
- Rastreabilidade completa de lotes e racks
- Campo de refugo/sucata
- Geração automática de códigos de lote
- Impressão de formulários de identificação

### 📈 Relatórios Avançados
- **Produção por Período**: Detalhamento completo dos apontamentos
- **Rastreabilidade**: Amarrados/lotes com modo detalhado e compacto
- **Paradas de Máquina**: Análise de tempos de parada
- **OEE Detalhado**: Indicadores por máquina e período
- **Estimativa de Expedição**: Cálculo de pallets e peso
- **Produtividade**: Análise por ferramenta e comprimento
- Exportação para Excel nativo (.xlsx)
- Filtros por produto, ferramenta, período, máquina, operador

### 🔍 Sistema de Amarrados
- Modal de busca por número do amarrado
- Seleção múltipla com acumulação
- Inspeção de racks com filtros
- Rastreabilidade completa do material bruto
- Fallback automático por rack/produto

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React** - Interface de usuário
- **Tailwind CSS** - Estilização
- **React Router** - Navegação
- **React Icons** - Ícones
- **XLSX** - Exportação Excel

### Backend
- **FastAPI** - API REST
- **Supabase** - Banco de dados PostgreSQL
- **Python** - Linguagem do backend

### Banco de Dados
- **PostgreSQL** (via Supabase)
- Tabelas: apontamentos, pedidos, lotes, máquinas, paradas
- Campos JSONB para rastreabilidade detalhada
- Índices otimizados para performance

## 📦 Instalação e Execução

### Pré-requisitos
- Node.js 16+
- Python 3.8+
- Conta no Supabase

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Configuração do Banco
1. Execute os scripts SQL na pasta raiz:
   - `schema_rastreabilidade_amarrados.sql`
   - `schema_refugo.sql`
2. Configure as variáveis de ambiente do Supabase

## 📋 Estrutura do Projeto

```
usinagem-app/
├── frontend/                 # Aplicação React
│   ├── src/
│   │   ├── components/      # Componentes reutilizáveis
│   │   ├── pages/          # Páginas da aplicação
│   │   ├── contexts/       # Contextos React
│   │   └── hooks/          # Hooks customizados
├── backend/                 # API FastAPI
│   ├── routes/             # Rotas da API
│   ├── schemas/            # Modelos Pydantic
│   └── core/               # Configurações
├── database_schema.sql      # Schema do banco
├── change_log.md           # Log de alterações
└── specs.md               # Especificações
```

## 🔧 Configuração

### Variáveis de Ambiente
Crie arquivo `.env` no frontend:
```
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_supabase
VITE_BACKEND_URL=http://localhost:8000
```

### Credenciais de Teste
- **Admin**: admin@usinagem.com / senha123
- **Operador**: operador@usinagem.com / senha123
- **Supervisor**: supervisor@usinagem.com / senha123

## 📊 Principais Melhorias Implementadas

- ✅ Rastreabilidade completa de amarrados
- ✅ Relatório de rastreabilidade com modos detalhado/compacto
- ✅ Campo de refugo/sucata nos apontamentos
- ✅ Correções no Dashboard (tempo de parada, ordens concluídas)
- ✅ Filtros por produto e ferramenta
- ✅ Layout responsivo melhorado
- ✅ Exportação Excel nativa
- ✅ Fallback automático de amarrados por rack

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Suporte

Para suporte e dúvidas, entre em contato através dos issues do GitHub.
```

## 🎯 Comandos finais para deploy

### 7. Push final com README atualizado
```bash
git add README.md
git commit -m "docs: Atualiza README com documentação completa"
git push
```

### 8. Criar release/tag (opcional)
```bash
git tag -a v1.0.0 -m "Versão 1.0.0 - Sistema completo com rastreabilidade"
git push origin v1.0.0
```

## ✅ Verificação final

Após o deploy, verifique:
- [ ] Repositório criado no GitHub
- [ ] Todos os arquivos enviados
- [ ] README.md atualizado e visível
- [ ] .gitignore funcionando (node_modules não enviado)
- [ ] Histórico de commits organizado
- [ ] Release/tag criada (se aplicável)

## 🔒 Configurações de segurança

### Para repositório privado:
- Adicione colaboradores conforme necessário
- Configure branch protection rules
- Ative security alerts

### Para repositório público:
- Remova informações sensíveis do código
- Use variáveis de ambiente para credenciais
- Adicione licença apropriada
