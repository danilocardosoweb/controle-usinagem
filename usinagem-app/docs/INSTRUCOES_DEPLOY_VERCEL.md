# Instruções para Deploy no Vercel

## Problema identificado
O erro 404 NOT_FOUND indica que o Vercel não está encontrando os arquivos da aplicação React. Isso acontece porque:

1. O Vercel não sabe onde estão os arquivos do frontend
2. Não há configuração para Single Page Application (SPA)
3. Falta configuração de build específica para o projeto

## Arquivos criados/atualizados

### 1. `vercel.json` (raiz do projeto)
```json
{
  "version": 2,
  "buildCommand": "cd frontend && npm install && npm run build",
  "outputDirectory": "frontend/dist",
  "installCommand": "cd frontend && npm install",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### 2. `frontend/vite.config.js` (atualizado)
Adicionadas configurações de build otimizadas para produção.

### 3. `frontend/public/_redirects`
```
/*    /index.html   200
```

## Como fazer o redeploy no Vercel

### Opção 1: Via GitHub (Recomendado)

1. **Commit e push das alterações:**
```bash
git add .
git commit -m "fix: Configurações para deploy no Vercel

- Adicionado vercel.json com configurações corretas
- Configurado vite.config.js para build otimizado
- Adicionado _redirects para SPA routing
- Corrigido outputDirectory para frontend/dist"

git push origin main
```

2. **No Vercel Dashboard:**
   - Acesse https://vercel.com/dashboard
   - Encontre seu projeto "ControleUsinagem"
   - Clique em "Redeploy" ou aguarde o deploy automático

### Opção 2: Via Vercel CLI

1. **Instalar Vercel CLI:**
```bash
npm i -g vercel
```

2. **Login no Vercel:**
```bash
vercel login
```

3. **Deploy do projeto:**
```bash
cd "C:\Users\pcp\Desktop\Usinagem - Copia\usinagem-app"
vercel --prod
```

## Configurações importantes no Vercel Dashboard

### Build & Development Settings:
- **Framework Preset**: Vite
- **Build Command**: `cd frontend && npm run build`
- **Output Directory**: `frontend/dist`
- **Install Command**: `cd frontend && npm install`

### Environment Variables (se necessário):
- `VITE_SUPABASE_URL`: sua URL do Supabase
- `VITE_SUPABASE_ANON_KEY`: sua chave anônima do Supabase

## Estrutura esperada após build:

```
frontend/dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── ...
└── _redirects
```

## Verificação pós-deploy

1. **Acesse a URL do Vercel** (ex: https://seu-projeto.vercel.app)
2. **Teste as rotas:**
   - `/` - Dashboard
   - `/apontamentos` - Apontamentos de Usinagem
   - `/relatorios` - Relatórios
3. **Verifique o console do navegador** para erros
4. **Teste a navegação** entre páginas

## Troubleshooting

### Se ainda der 404:
1. Verifique se o `vercel.json` está na raiz do projeto
2. Confirme se o `outputDirectory` está correto
3. Verifique se o build está gerando arquivos em `frontend/dist/`

### Se der erro de build:
1. Teste o build localmente: `cd frontend && npm run build`
2. Verifique se todas as dependências estão no `package.json`
3. Confirme se não há erros de TypeScript/ESLint

### Se der erro de roteamento:
1. Verifique se o arquivo `_redirects` está em `frontend/public/`
2. Confirme se as configurações de `rewrites` estão no `vercel.json`

## Comandos para testar localmente

```bash
# Testar build
cd frontend
npm run build
npm run preview

# Verificar se os arquivos foram gerados
ls -la dist/
```

## Resultado esperado

Após seguir estas instruções:
- ✅ Aplicação carrega corretamente no Vercel
- ✅ Todas as rotas funcionam (SPA routing)
- ✅ Assets são servidos com cache otimizado
- ✅ Build é rápido e eficiente
- ✅ Navegação entre páginas funciona sem 404
