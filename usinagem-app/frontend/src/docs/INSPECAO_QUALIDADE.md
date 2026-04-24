# Controle de Inspeção de Qualidade

## Visão Geral
A tela de Controle de Inspeção de Qualidade permite registrar inspeções de peças produzidas com base em períodos de produção previamente apontados, garantindo rastreabilidade completa e validação de dados.

## Funcionalidades Principais

### 1. Acesso à Tela
- Disponível no modal de confirmação de apontamento
- Botão "Inspeção QA" (roxo) aparece junto com "Confirmar"
- Dados do apontamento são preenchidos automaticamente

### 2. Estrutura da Tela

#### Cabeçalho (Somente Leitura)
- **Produto**: Código do perfil/produto
- **Pedido/Seq**: Número da OP
- **Período**: Data e hora do apontamento
- **Quantidade Total**: Total de peças produzidas

#### Resumo da Inspeção
Indicadores em tempo real:
- **Blocos**: Quantidade de blocos concluídos vs total
- **Inspecionado**: Quantidade total inspecionada
- **NOK**: Quantidade de peças com não conformidade
- **% NOK**: Percentual de defeitos
- **Progresso**: Percentual de blocos concluídos

#### Geração Automática de Blocos
- Sistema divide automaticamente a quantidade total pela regra de inspeção (padrão: 80 pcs/palete)
- Exemplo: 800 peças ÷ 80 = 8 blocos de inspeção
- Cada bloco mostra quantidade prevista e campo para inspecionada

### 3. Fluxo de Inspeção

#### Opção 1: Tudo OK
1. Clique no botão "Tudo OK" (verde)
2. Todos os blocos são marcados como conforme automaticamente
3. Quantidade inspecionada = quantidade prevista

#### Opção 2: Inspeção Detalhada
1. Para cada bloco:
   - Insira quantidade inspecionada
   - Selecione status: OK ou NOK
   
2. Se **OK**: 
   - Quantidade inspecionada = quantidade prevista
   - Sem campos adicionais

3. Se **NOK**:
   - Insira quantidade de peças com defeito
   - Selecione tipo de defeito:
     - Dimensional
     - Superficial
     - Quebra
     - Deformação
     - Outro
   - Adicione observações (opcional)
   - Anexe foto (opcional)

### 4. Validações

#### Obrigatórias
- ✓ Todos os blocos devem ser inspecionados
- ✓ Quantidade NOK ≤ Quantidade inspecionada
- ✓ Tipo de defeito obrigatório para NOK
- ✓ Quantidade inspecionada ≤ Quantidade prevista

#### Alertas
- ⚠️ Se % NOK > 5%: Confirmar continuação
- ⚠️ Inconsistência entre OK e NOK

### 5. Ações

#### Salvar Parcial
- Salva o estado atual da inspeção
- Permite retomar depois
- Não finaliza o processo

#### Finalizar Inspeção
- Valida todos os dados
- Registra:
  - Quantidade total inspecionada
  - Quantidade total NOK
  - Percentual de defeito
  - Data/hora da inspeção
  - Operador responsável
  - Blocos com detalhes
- Cria registro na tabela `inspecoes_qualidade`

### 6. Banco de Dados

#### Tabela: `inspecoes_qualidade`
```sql
- id: UUID (chave primária)
- apontamento_id: Referência ao apontamento
- produto: Código do produto
- pedido_seq: Número da OP
- palete: ID do palete (rack_acabado)
- quantidade_total: Total produzido
- quantidade_inspecionada: Total inspecionado
- quantidade_nok: Total com defeito
- percentual_nok: % de defeitos
- blocos: JSON com detalhes de cada bloco
- data_inspecao: Timestamp da inspeção
- operador: Usuário responsável
- status: 'concluida' ou 'parcial'
- observacoes: Notas adicionais
```

### 7. Tipos de Defeito

| Tipo | Descrição |
|------|-----------|
| Dimensional | Fora das medidas especificadas |
| Superficial | Riscos, marcas, oxidação |
| Quebra | Peça quebrada ou trincada |
| Deformação | Empenamento ou deformação |
| Outro | Defeito não categorizado |

### 8. UX/Usabilidade

#### Design
- Interface simples e intuitiva
- Botões grandes (touch-friendly)
- Cores indicativas:
  - 🟢 Verde = OK
  - 🔴 Vermelho = NOK
  - 🟡 Amarelo = Pendente

#### Feedback Visual
- Barra de progresso em tempo real
- Indicadores coloridos por status
- Mensagens de validação clara
- Animações suaves

### 9. Fluxo Completo

```
1. Apontamento de Produção
   ↓
2. Modal de Confirmação
   ↓
3. Clique em "Inspeção QA"
   ↓
4. Modal de Inspeção Abre
   ↓
5. Inspeção dos Blocos
   ├─ Opção A: "Tudo OK" (rápido)
   └─ Opção B: Bloco por bloco (detalhado)
   ↓
6. Validação de Dados
   ↓
7. Finalizar Inspeção
   ↓
8. Registro Salvo em Banco
   ↓
9. Retorna ao Apontamento
```

### 10. Integração com Auditoria

Cada inspeção finalizada registra:
- Ação: `INSPECAO_QUALIDADE`
- Usuário: Operador responsável
- Data/Hora: Timestamp automático
- Detalhes: Quantidade NOK e outros dados

## Exemplos de Uso

### Exemplo 1: Produção Sem Defeitos
```
Produção: 800 peças
Regra: 80 pcs/palete
Blocos: 8

Ação: Clique "Tudo OK"
Resultado: 8 blocos marcados como OK
Inspecionado: 800 pcs
NOK: 0 pcs
% NOK: 0%
```

### Exemplo 2: Produção Com Defeitos
```
Produção: 400 peças
Regra: 100 pcs/palete
Blocos: 4

Bloco 1: 100 inspecionadas, 2 NOK (Dimensional)
Bloco 2: 100 inspecionadas, 0 NOK
Bloco 3: 100 inspecionadas, 1 NOK (Superficial)
Bloco 4: 100 inspecionadas, 0 NOK

Total Inspecionado: 400 pcs
Total NOK: 3 pcs
% NOK: 0.75%
Status: Aprovado (< 5%)
```

## Configuração

### Padrões
- **Peças por Palete**: 80 (configurável por produto)
- **Limite de Alerta NOK**: 5%
- **Tipos de Defeito**: Pré-definidos (extensível)

### Personalização
Para alterar a regra de inspeção por produto, edite o campo `pcs_por_palete` no apontamento ou na configuração de produto.

## Troubleshooting

### Problema: Botão "Inspeção QA" não aparece
**Solução**: Verifique se está no modal de confirmação de apontamento

### Problema: Não consegue finalizar
**Solução**: Verifique se todos os blocos foram inspecionados e se as validações passaram

### Problema: Dados não salvam
**Solução**: Verifique conexão com banco de dados e permissões de usuário

## Próximas Melhorias
- [ ] Anexar múltiplas fotos por bloco
- [ ] Histórico de inspeções por produto/OP
- [ ] Relatório de inspeção em PDF
- [ ] Integração com sistema de rastreabilidade
- [ ] Análise de tendências de defeitos
