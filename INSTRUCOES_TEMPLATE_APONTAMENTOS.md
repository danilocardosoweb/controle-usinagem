# Template de Apontamentos de Usinagem

## 📋 Visão Geral

Este template foi criado para que seu pessoal possa preencher os apontamentos de usinagem em uma planilha Excel, que será posteriormente importada no app.

## 📁 Arquivos

- **TEMPLATE_APONTAMENTOS.csv** - Arquivo base para preenchimento (abra no Excel e salve como .xlsx)
- **INSTRUCOES_TEMPLATE_APONTAMENTOS.md** - Este arquivo com instruções

## 🎯 Campos Obrigatórios

Estes campos **DEVEM** ser preenchidos:

| Campo | Formato | Exemplo | Descrição |
|-------|---------|---------|-----------|
| **Data Início** | DD/MM/YYYY HH:MM | 18/03/2026 14:55 | Data e hora de início do apontamento |
| **Data Fim** | DD/MM/YYYY HH:MM | 18/03/2026 15:55 | Data e hora de término do apontamento |
| **Pedido/Seq** | XXXXX/XX | 84659/10 | Código do pedido e sequência |
| **Máquina** | Nome exato | Serra Doppia 2 cabeças | Nome da máquina (consulte lista abaixo) |
| **Quantidade** | Número inteiro | 8000 | Quantidade de peças produzidas |

## 📝 Campos Opcionais

Estes campos podem ser deixados em branco:

| Campo | Formato | Exemplo | Descrição |
|-------|---------|---------|-----------|
| Qtd Refugo | Número inteiro | 50 | Quantidade de peças refugadas |
| Comprimento Refugo (mm) | Número | 1340 | Comprimento em milímetros |
| Dureza | Número | 58 | Valor de dureza do material |
| Rack/Pallet | Código | 4117 | Identificação do rack ou pallet |
| Observações | Texto livre | Troca de pallet 10:20/10:40 | Anotações adicionais |

## 🤖 Campos Preenchidos Automaticamente

O app preencherá automaticamente estes campos ao importar:

- **Operador** - Será preenchido com o usuário logado no app
- **Produto** - Extraído do pedido selecionado
- **Cliente** - Extraído do pedido selecionado
- **Perfil Longo** - Extraído do pedido selecionado
- **Comprimento Acabado** - Calculado automaticamente
- **Quantidade Pedida** - Extraída do pedido

## 🔧 Máquinas Disponíveis

Use **exatamente** um destes nomes:

- Serra Doppia 2 cabeças
- Torno CNC
- Fresadora
- Retífica
- (Consulte o administrador se precisar adicionar uma nova máquina)

## ⏰ Regras de Data e Hora

1. **Formato obrigatório**: DD/MM/YYYY HH:MM
   - Exemplo correto: `18/03/2026 14:55`
   - Exemplo incorreto: `2026-03-18 14:55` ❌

2. **Validação de horários**:
   - A hora de **fim NÃO pode ser anterior** à hora de **início**
   - Exemplo correto: 14:55 até 15:55 ✅
   - Exemplo incorreto: 15:55 até 14:55 ❌

3. **Mesmo dia**:
   - Se o apontamento passar da meia-noite, use datas diferentes
   - Exemplo: 18/03/2026 22:00 até 19/03/2026 06:00 ✅

## 📊 Exemplo de Preenchimento

| Data Início | Data Fim | Pedido/Seq | Máquina | Quantidade | Qtd Refugo | Comprimento Refugo (mm) | Dureza | Rack/Pallet | Observações |
|---|---|---|---|---|---|---|---|---|---|
| 18/03/2026 14:55 | 18/03/2026 15:55 | 84659/10 | Serra Doppia 2 cabeças | 8000 | 50 | 1340 | 58 | 4117 | Troca de pallet 10:20/10:40 |
| 18/03/2026 16:00 | 18/03/2026 17:30 | 84659/10 | Serra Doppia 2 cabeças | 7500 | 25 | 1340 | 58 | 4117 | Sem observações |
| 19/03/2026 08:00 | 19/03/2026 12:00 | 85290/60 | Torno CNC | 6000 | 0 | | 62 | 4118 | Manutenção 10:30-11:00 |

## 🚀 Como Usar

### 1. Preparar a Planilha

1. Abra o arquivo `TEMPLATE_APONTAMENTOS.csv` no Excel
2. Preencha os dados conforme as instruções acima
3. Salve o arquivo como **Excel (.xlsx)**
   - Arquivo > Salvar Como
   - Formato: Excel Workbook (.xlsx)

### 2. Importar no App

1. Acesse **Apontamentos de Usinagem**
2. Clique em **Importar Planilha** (quando implementado)
3. Selecione o arquivo .xlsx preenchido
4. O app validará os dados
5. Se houver erros, corrija e tente novamente
6. Se tudo estiver correto, clique em **Importar**

### 3. Verificação

Após importar, o app:
- ✅ Validará todas as datas e horas
- ✅ Buscará os dados do pedido automaticamente
- ✅ Preencherá os campos complementares
- ✅ Registrará os apontamentos no banco de dados
- ✅ Mostrará um relatório de sucesso/erros

## ⚠️ Erros Comuns

| Erro | Causa | Solução |
|------|-------|---------|
| Data inválida | Formato incorreto | Use DD/MM/YYYY HH:MM |
| Pedido não encontrado | Código incorreto | Verifique o número do pedido |
| Máquina não encontrada | Nome digitado errado | Use o nome exato da lista |
| Hora de fim anterior ao início | Lógica de horário | Verifique se fim > início |
| Arquivo não importado | Formato errado | Salve como .xlsx, não .csv |

## 📞 Suporte

Se encontrar problemas:

1. Verifique se todos os campos obrigatórios estão preenchidos
2. Valide o formato das datas (DD/MM/YYYY HH:MM)
3. Confirme que a máquina existe na lista
4. Verifique se o pedido/seq está correto
5. Contate o administrador se o erro persistir

## 💡 Dicas

- **Copie a linha de exemplo** para começar um novo apontamento
- **Use o mesmo pedido/seq** para múltiplos apontamentos do mesmo item
- **Deixe em branco** os campos opcionais se não aplicável
- **Revise antes de importar** para evitar erros em massa
- **Faça backup** da planilha antes de importar

---

**Versão**: 1.0  
**Última atualização**: 19/03/2026  
**Contato**: Administrador do Sistema
