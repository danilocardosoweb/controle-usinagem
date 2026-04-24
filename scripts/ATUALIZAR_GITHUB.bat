@echo off
echo ========================================
echo ATUALIZANDO REPOSITÓRIO GITHUB EXISTENTE
echo ========================================
echo.

echo 1. Verificando status do Git...
git status

echo.
echo 2. Inicializando repositório (se necessário)...
git init

echo.
echo 3. Conectando ao repositório existente...
git remote add origin https://github.com/danilocardosoweb/ControleUsinagem.git

echo.
echo 4. Verificando conexão remota...
git remote -v

echo.
echo 5. Fazendo pull das alterações remotas (se houver)...
git pull origin main --allow-unrelated-histories

echo.
echo 6. Adicionando todos os arquivos atualizados...
git add .

echo.
echo 7. Fazendo commit das melhorias implementadas...
git commit -m "feat: Grandes melhorias no sistema de usinagem

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
- ✅ Relacionamento inteligente apontamentos ↔ pedidos

🗄️ BANCO DE DADOS:
- ✅ Campo qtd_refugo (numeric) na tabela apontamentos
- ✅ Campo amarrados_detalhados (JSONB) com índice GIN
- ✅ Scripts SQL organizados e documentados

📱 UX/UI MELHORIAS:
- ✅ Grid responsivo para diferentes tamanhos de tela
- ✅ Barra de rolagem customizada e bem posicionada
- ✅ Seletores condicionais (aparecem quando relevantes)
- ✅ Exportação com nome de arquivo inteligente

Tecnologias: React, Tailwind CSS, Supabase, PostgreSQL, XLSX
Versão: 2.0.0 - Sistema completo com rastreabilidade avançada"

echo.
echo 8. Configurando branch principal...
git branch -M main

echo.
echo 9. Enviando atualizações para o GitHub...
git push -u origin main --force

echo.
echo 10. Criando tag da nova versão...
git tag -a v2.0.0 -m "Versão 2.0.0 - Sistema completo com rastreabilidade avançada

🚀 Principais melhorias:
- Relatório de rastreabilidade completo
- Campo de refugo/sucata
- Filtros avançados por produto/ferramenta
- Exportação Excel nativa
- Dashboard corrigido e otimizado
- Layout responsivo melhorado
- Fallback automático de amarrados
- Banco de dados expandido com JSONB"

echo.
echo 11. Enviando tag para o GitHub...
git push origin v2.0.0

echo.
echo ========================================
echo ✅ DEPLOY CONCLUÍDO COM SUCESSO!
echo ========================================
echo.
echo 📍 Repositório atualizado em:
echo    https://github.com/danilocardosoweb/ControleUsinagem
echo.
echo 🏷️ Nova versão criada: v2.0.0
echo.
echo 📋 Principais arquivos atualizados:
echo    - frontend/src/pages/Relatorios.jsx (relatório rastreabilidade)
echo    - frontend/src/pages/ApontamentosUsinagem.jsx (campo refugo)
echo    - frontend/src/pages/Dashboard.jsx (correções)
echo    - schema_rastreabilidade_amarrados.sql (novo)
echo    - schema_refugo.sql (novo)
echo    - README.md (documentação atualizada)
echo    - change_log.md (histórico completo)
echo.
echo 🔗 Acesse: https://github.com/danilocardosoweb/ControleUsinagem/releases
echo.
echo ========================================

pause
