# Troubleshooting - Deploy Vercel

## Problema identificado nos logs

O Vercel está usando o commit antigo `cd0e2c0` ao invés do commit mais recente `66d496f` que contém as correções para o erro 404.

```
Cloning github.com/danilocardosoweb/ControleUsinagem (Branch: main, Commit: cd0e2c0)
```

## Soluções para forçar novo deploy

### Opção 1: Via Vercel Dashboard (Mais rápida)

1. **Acesse**: https://vercel.com/dashboard
2. **Encontre** seu projeto "ControleUsinagem"
3. **Clique** na aba "Deployments"
4. **Clique** no botão "Redeploy" no deployment mais recente
5. **Selecione** "Use existing Build Cache: No"
6. **Confirme** o redeploy

### Opção 2: Via Git (Já executado)

Criei um commit vazio para triggerar novo deploy:
```bash
git commit --allow-empty -m "trigger: Forçar redeploy no Vercel"
git push origin main
```

### Opção 3: Verificar configurações do projeto no Vercel

1. **Acesse** as configurações do projeto no Vercel
2. **Vá** para "Git" settings
3. **Verifique** se está conectado ao repositório correto
4. **Confirme** que a branch é "main"
5. **Se necessário**, reconecte o repositório

## Verificações importantes

### 1. Confirmar que o vercel.json está na raiz
```bash
ls -la vercel.json
```

### 2. Verificar conteúdo do vercel.json
O arquivo deve conter:
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
  ]
}
```

### 3. Testar build localmente
```bash
cd frontend
npm install
npm run build
ls -la dist/
```

## Próximo deploy deve mostrar

Quando o novo deploy rodar, você deve ver nos logs:
```
Cloning github.com/danilocardosoweb/ControleUsinagem (Branch: main, Commit: 3c15ab3)
```
ou um commit mais recente.

## Comandos para debug

### Ver commits recentes
```bash
git log --oneline -5
```

### Verificar status do repositório
```bash
git status
git remote -v
```

### Forçar push (se necessário)
```bash
git push origin main --force
```

## Configurações recomendadas no Vercel

### Build & Development Settings:
- **Framework Preset**: Other
- **Build Command**: `cd frontend && npm run build`
- **Output Directory**: `frontend/dist`
- **Install Command**: `cd frontend && npm install`
- **Root Directory**: deixar vazio (usa a raiz)

### Environment Variables (se usar Supabase):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Sinais de que funcionou

✅ **Logs do build mostram commit correto**
✅ **Build command executa**: `cd frontend && npm run build`
✅ **Output directory**: `frontend/dist` é usado
✅ **Arquivos gerados**: `index.html`, `assets/` etc.
✅ **Deploy completa** sem erros 404

## Se ainda der erro

1. **Verifique** se o `index.html` está sendo gerado em `frontend/dist/`
2. **Confirme** que o `_redirects` está em `frontend/public/`
3. **Teste** o build local primeiro
4. **Verifique** se não há erros de sintaxe no código React
5. **Considere** fazer deploy manual via Vercel CLI

## Deploy manual via CLI (último recurso)

```bash
npm i -g vercel
vercel login
cd "C:\Users\pcp\Desktop\Usinagem - Copia\usinagem-app"
vercel --prod
```
