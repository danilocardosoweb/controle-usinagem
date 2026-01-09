# Script PowerShell para Deploy no GitHub
# Execute com: PowerShell -ExecutionPolicy Bypass -File Deploy-GitHub.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ATUALIZANDO REPOSITÓRIO GITHUB" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Navegar para o diretório correto
Set-Location "C:\Users\pcp\Desktop\Usinagem - Copia\usinagem-app"

Write-Host "1. Inicializando repositório Git..." -ForegroundColor Yellow
try {
    git init
    Write-Host "✅ Git inicializado" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Git já inicializado ou erro: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "2. Conectando ao repositório remoto..." -ForegroundColor Yellow
try {
    git remote remove origin 2>$null
    git remote add origin https://github.com/danilocardosoweb/ControleUsinagem.git
    Write-Host "✅ Repositório remoto conectado" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Erro ao conectar repositório: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "3. Adicionando arquivos..." -ForegroundColor Yellow
try {
    git add .
    Write-Host "✅ Arquivos adicionados" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro ao adicionar arquivos: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "4. Fazendo commit..." -ForegroundColor Yellow
$commitMessage = @"
feat: Grandes melhorias no sistema de usinagem v2.0.0

🚀 NOVAS FUNCIONALIDADES:
- ✅ Relatório de Rastreabilidade completo (amarrados/lotes)
- ✅ Modo detalhado vs compacto nos relatórios
- ✅ Campo de refugo/sucata nos apontamentos
- ✅ Filtros por produto e ferramenta
- ✅ Exportação Excel nativa (.xlsx)
- ✅ Layout responsivo melhorado
- ✅ Fallback automático de amarrados por rack

🔧 CORREÇÕES IMPORTANTES:
- ✅ Dashboard: Tempo de parada calculado corretamente
- ✅ Dashboard: Ordens concluídas usando regra separado >= qtd_pedido
- ✅ Dashboard: Máquinas resolvidas por nome da tabela
- ✅ Relatórios: Coluna 'Separado' corrigida (busca em pedidos)
- ✅ Interface: Barra de rolagem com espaçamento adequado

📊 MELHORIAS DE RASTREABILIDADE:
- ✅ Sistema de amarrados com busca avançada
- ✅ Modal de seleção múltipla com acumulação
- ✅ Rastreabilidade completa do material bruto ao acabado
- ✅ Campos JSONB para detalhes completos dos amarrados

🗄️ BANCO DE DADOS:
- ✅ Campo qtd_refugo (numeric) na tabela apontamentos
- ✅ Campo amarrados_detalhados (JSONB) com índice GIN
- ✅ Scripts SQL organizados e documentados

Tecnologias: React, Tailwind CSS, Supabase, PostgreSQL, XLSX
"@

try {
    git commit -m $commitMessage
    Write-Host "✅ Commit realizado" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro no commit: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "5. Configurando branch principal..." -ForegroundColor Yellow
try {
    git branch -M main
    Write-Host "✅ Branch configurada" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Erro ao configurar branch: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "6. Enviando para GitHub..." -ForegroundColor Yellow
try {
    git push -u origin main --force
    Write-Host "✅ Código enviado para GitHub" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro ao enviar para GitHub: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Verifique sua conexão com a internet e credenciais do Git" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "7. Criando tag da versão..." -ForegroundColor Yellow
try {
    git tag -a v2.0.0 -m "Versão 2.0.0 - Sistema completo com rastreabilidade avançada"
    git push origin v2.0.0
    Write-Host "✅ Tag v2.0.0 criada e enviada" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Erro ao criar/enviar tag: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ DEPLOY CONCLUÍDO!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📍 Repositório atualizado em:" -ForegroundColor White
Write-Host "   https://github.com/danilocardosoweb/ControleUsinagem" -ForegroundColor Blue
Write-Host ""
Write-Host "🏷️ Nova versão: v2.0.0" -ForegroundColor White
Write-Host ""
Write-Host "🔗 Releases: https://github.com/danilocardosoweb/ControleUsinagem/releases" -ForegroundColor Blue
Write-Host ""

Read-Host "Pressione Enter para fechar"
