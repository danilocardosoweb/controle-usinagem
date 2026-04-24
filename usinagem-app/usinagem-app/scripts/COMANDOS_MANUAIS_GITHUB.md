# Comandos Manuais para Atualizar GitHub

Se preferir executar os comandos manualmente, siga esta sequência:

## 1. Navegar para o diretório do projeto
```bash
cd "C:\Users\pcp\Desktop\Usinagem - Copia\usinagem-app"
```

## 2. Inicializar Git (se necessário)
```bash
git init
```

## 3. Conectar ao repositório existente
```bash
git remote add origin https://github.com/danilocardosoweb/ControleUsinagem.git
```

## 4. Verificar conexão (opcional)
```bash
git remote -v
```

## 5. Fazer pull das alterações remotas
```bash
git pull origin main --allow-unrelated-histories
```

## 6. Adicionar todos os arquivos
```bash
git add .
```

## 7. Commit das melhorias
```bash
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

Versão: 2.0.0 - Sistema completo com rastreabilidade avançada"
```

## 8. Configurar branch principal
```bash
git branch -M main
```

## 9. Push para GitHub
```bash
git push -u origin main --force
```

## 10. Criar tag da versão
```bash
git tag -a v2.0.0 -m "Versão 2.0.0 - Sistema completo com rastreabilidade avançada"
```

## 11. Push da tag
```bash
git push origin v2.0.0
```

## ✅ Resultado esperado

Após executar todos os comandos:
- ✅ Repositório atualizado: https://github.com/danilocardosoweb/ControleUsinagem
- ✅ Nova versão v2.0.0 criada
- ✅ Todos os arquivos e melhorias enviados
- ✅ Release disponível na aba "Releases" do GitHub
