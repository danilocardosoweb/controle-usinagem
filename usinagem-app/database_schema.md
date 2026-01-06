# Esquema do Banco de Dados

## Tabela: `configuracoes`
Parâmetros chave/valor utilizados pelo sistema.
- `chave`: Identificador textual único.
- `valor`: Valor associado à chave.
- `updated_at`: Data/hora (TIMESTAMPTZ) da última atualização, padrão `timezone('utc', now())`.

## Tabela: `usuarios`
Armazena as informações dos usuários do sistema.
- `id`: UUID com `DEFAULT gen_random_uuid()`.
- `nome`: Nome do usuário.
- `email`: E-mail para login (único).
- `senha_hash`: Senha criptografada.
- `nivel_acesso`: Perfil de permissão ('operador', 'supervisor', 'admin').
- `created_at`: Data/hora de criação (TIMESTAMPTZ UTC).

## Tabela: `maquinas`
Catálogo das máquinas da usinagem.
- `id`: UUID com `DEFAULT gen_random_uuid()`.
- `nome`: Nome da máquina.
- `descricao`: Descrição ou detalhes técnicos.
- `status`: Status atual ('ativa', 'inativa', 'manutencao').
- `created_at`: Data/hora de criação (TIMESTAMPTZ UTC).
- `codigo`: Código visível/etiqueta (opcional).
- `modelo`: Modelo do equipamento (opcional).
- `fabricante`: Fabricante (opcional).
- `ano`: Ano de fabricação (opcional).

## Tabela: `carteira_encomendas`
Armazena as ordens de trabalho carregadas via Excel.
- `id`: Identificador único da ordem.
- `codigo_perfil`: Código do perfil de alumínio.
- `descricao_perfil`: Descrição do perfil.
- `quantidade_necessaria`: Quantidade de peças a serem produzidas.
- `prazo_entrega`: Prazo final da ordem.
- `status`: Status da ordem ('pendente', 'em_execucao', 'concluida').
- `created_at`: Data de criação do registro.

## Tabela: `apontamentos_producao`
Registra os apontamentos de produção feitos pelos operadores.
- `id`: UUID com `DEFAULT gen_random_uuid()`.
- `ordem_trabalho_id`: Referência para `carteira_encomendas`.
- `usuario_id`: Referência para `usuarios` (operador).
- `maquina_id`: Referência para `maquinas`.
- `inicio`: Data/hora (TIMESTAMPTZ) de início da produção.
- `fim`: Data/hora (TIMESTAMPTZ) de término da produção.
- `quantidade`: Total de peças produzidas no período.
- `rack_ou_pallet`: Identificação do rack/pallet utilizado.
- `observacoes`: Notas adicionais.
- `created_at`: Data/hora de criação (TIMESTAMPTZ UTC).

## View: `apontamentos_parada`
Camada de compatibilidade que projeta a tabela canônica `paradas` no formato antigo.
- Seleciona `id`, `maquina`, `motivo_parada`, `tipo_parada`, `inicio` (como `inicio_timestamp`), `fim` (como `fim_timestamp`), `observacoes` e `created_at`.
- Útil para relatórios legados que esperam os campos com sufixo `_timestamp`.

## Tabela: `apontamentos`
Registra os apontamentos operacionais efetivamente usados pelo app (campos ricos e rastreabilidade).
- `id`: UUID.
- `pedido_seq`: Pedido/Seq amigável.
- `pedido_cliente`: Número do pedido do cliente.
- `ordem_trabalho`: Espelha `pedido_seq` quando aplicável.
- `nro_op`: Número da OP.
- `produto`: Código do produto.
- `perfil_longo`: Perfil longo.
- `cliente`: Cliente.
- `operador`: Operador (texto).
- `maquina`: Máquina (texto; pode evoluir para FK no futuro).
- `inicio`: Início (timestamp com fuso).
- `fim`: Fim (timestamp com fuso).
- `quantidade`: Quantidade produzida.
- `qtd_pedido`: Quantidade do pedido.
- `separado`/`qtd_separado`: Valores de separado.
- `comprimento_acabado_mm`: Comprimento do acabado (mm).
- `rack_ou_pallet`: Identificador do rack/pallet.
- `romaneio_numero`: Número do romaneio.
- `lote`: Lote interno gerado.
- `lote_externo`: Primeiro lote externo.
- `lotes_externos`: Lista de lotes externos (array).
- `amarrados_detalhados`: Detalhes completos dos amarrados para rastreabilidade (JSONB).
- `observacoes`: Observações.
- `created_at`: Data de criação.
- `qtd_refugo`: Quantidade de refugo/sucata apontada.
- `dureza_material`: Dureza informada no apontamento (texto livre).
- `comprimento_refugo`: Comprimento médio das peças refugadas (mm).
- `exp_fluxo_id`: Referência opcional para o registro em `exp_pedidos_fluxo` associado ao apontamento.
- `exp_unidade`: Unidade/módulo de expedição onde o apontamento foi realizado (ex.: `alunica`, `tecnoperfil`).
- `exp_stage`: Estágio do fluxo EXP no momento do apontamento (ex.: `para-usinar`, `para-embarque`).
- `etapa_embalagem`: Etapa do apontamento quando `exp_unidade='embalagem'` (ex.: `REBARBAR_LIMPEZA` ou `EMBALAGEM`).

### Campo `amarrados_detalhados` (JSONB)
Armazena informações completas dos amarrados selecionados para rastreabilidade total:
```json
[
  {
    "codigo": "2532005482",
    "rack": "278", 
    "lote": "224020089",
    "produto": "EXP908155000NANV",
    "pedido_seq": "78914/10",
    "romaneio": "37513",
    "qt_kg": 12.42,
    "qtd_pc": 3,
    "situacao": "LIBERADO",
    "embalagem_data": "2024-12-15",
    "nota_fiscal": "12345"
  }
]
```

## Tabela: `motivos_parada`
Catálogo com os motivos de parada das máquinas.
- `id`: Identificador único do motivo.
- `descricao`: Descrição do motivo da parada.
- `tipo_parada`: Classificação da parada ('planejada', 'nao_planejada', 'manutencao', 'setup').

## Tabela: `paradas`
Registra os eventos de parada de máquina (tabela canônica no Supabase).
- `id`: Identificador único do registro de parada (UUID).
- `maquina`: Identificador/nome da máquina (texto; pode evoluir para FK).
- `motivo_parada`: Texto do motivo (pode evoluir para FK com `motivos_parada`).
- `tipo_parada`: Classificação (ex.: `planejada`, `nao_planejada`, `manutencao`, `setup`).
- `inicio`: Data e hora de início da parada (timestamptz).
- `fim`: Data e hora de término da parada (timestamptz, opcional).
- `observacoes`: Notas adicionais.
- `created_at`: Timestamp de criação.

Observação: existe a VIEW `apontamentos_parada` para compatibilidade com nomenclaturas antigas,
mapeando os campos da tabela `paradas` para o formato com sufixos `_timestamp`.

## Tabela: `tipos_parada`
Catálogo de tipos de parada utilizados no frontend (estrutura simples).
- `id`: UUID.
- `descricao`: Texto do tipo.
- `created_at`: Timestamp de criação.

## Tabela: `pedidos`
Armazena os pedidos importados da planilha Excel.
- `id`: Identificador único do pedido.
- `pedido_seq`: Número do pedido e sequência.
- `pedido_cliente`: Número do pedido do cliente.
- `cliente`: Nome do cliente.
- `dt_fatura`: Data prevista para faturamento/entrega.
- `dt_implant_item`: Data de implantação do item.
- `prazo`: Prazo em dias.
- `produto`: Código do produto.
- `descricao`: Descrição detalhada do produto.
- `unidade`: Unidade de medida do produto (ex: PC, KG).
- `qtd_pedido`: Quantidade total pedida.
- `qt_saldo_op`: Quantidade em saldo de ordem de produção.
- `em_wip`: Quantidade em processo (Work in Progress).
- `saldo_a_prod`: Saldo a produzir.
- `estoque_aca`: Quantidade em estoque acabado.
- `separado`: Quantidade separada para entrega.
- `faturado`: Quantidade já faturada.
- `saldo_a_fat`: Saldo a faturar.
- `item_perfil`: Código do item/perfil.
- `unidade_mp`: Unidade de medida da matéria-prima.
- `estoque_mp`: Quantidade em estoque de matéria-prima.
- `peso_barra`: Peso da barra em kg.
- `cod_cliente`: Código interno do cliente.
- `situacao_item_pedido`: Situação atual do item no pedido.
- `efetivado`: Indica se o pedido foi efetivado (boolean).
- `item_do_cliente`: Código do item usado pelo cliente.
- `representante`: Nome do representante comercial.
- `fam_comercial`: Família comercial do produto.
- `nro_op`: Número da ordem de produção.
- `operacao_atual`: Operação atual no processo produtivo.
- `qtd_operacao_finalizadas`: Quantidade de operações já finalizadas.
- `qtd_operacao_total`: Quantidade total de operações necessárias.
- `data_ultimo_reporte`: Data e hora do último reporte de produção.
- `status`: Status do pedido ('pendente', 'em_producao', 'concluido').
- `prioridade`: Nível de prioridade do pedido (número inteiro).
- `observacoes`: Observações adicionais sobre o pedido.
- `data_criacao`: Data de criação do registro.
- `data_atualizacao`: Data da última atualização do registro.
- `dados_originais`: Linha original da planilha (JSONB no Supabase).

## Tabela: `ferramentas_cfg`
Parâmetros por ferramenta para estimativas de expedição.
- `id`: UUID.
- `ferramenta`: Código único (ex.: TR-0018).
- `peso_linear`: kg/m.
- `comprimento_mm`: Comprimento padrão (mm).
- `pcs_por_pallet`: Peças por pallet.
- `ripas_por_pallet`: Ripas por pallet.
- `embalagem`: 'pallet' | 'caixa'.
- `pcs_por_caixa`: Peças por caixa (quando embalagem = 'caixa').
- `vida_util_dias`: Vida útil estimada em dias (para alertas de troca).
- `ultima_troca`: Data/hora da última troca (timestamptz).
- `responsavel`: Responsável pela ferramenta.
- `created_at`: Data de criação.

## Tabela: `exp_pedidos_fluxo`
Pedidos selecionados para acompanhamento na aba EXP - Usinagem.
- `id`: UUID gerado com `gen_random_uuid()`.
- `pedido_id`: Referência para o pedido original (quando existir).
- `importado_id`: Referência para `exp_pedidos_importados` (staging da planilha).
- `origem`: Fonte do registro (`carteira`, `arquivo` ou `manual`).
- `pedido_seq`: Identificador amigável Pedido/Seq.
- `cliente`: Nome do cliente.
- `numero_pedido`: Pedido do cliente.
- `data_entrega`: Data prevista de entrega.
- `ferramenta`: Código da ferramenta/perfil.
- `pedido_kg` / `pedido_pc`: Totais solicitados.
- `kg_disponivel` / `pc_disponivel`: Quantidade ainda disponível para apontamentos parciais (NUMERIC(18,3)).
- `saldo_kg_total` / `saldo_pc_total`: Quantidade total acumulada apontada em kg e peças (NUMERIC(18,3)).
- `saldo_atualizado_em`: Timestamp da última atualização de saldos.
- `status_atual`: Estágio atual no fluxo TecnoPerfil.
- `alunica_stage`: Estágio persistido da unidade Alúnica no fluxo EXP (`para-usinar`, `para-inspecao`, `para-embarque`).
- `dados_originais`: Payload JSON com dados de origem.
- `selecionado_por`: Usuário responsável pela inclusão no fluxo.
- `selecionado_em` / `criado_em` / `atualizado_em`: Timestamps em UTC.

## Tabela: `exp_estoque_baixas`
Registro de baixas de estoque com rastreabilidade por lote.
- `id`: UUID gerado automaticamente.
- `fluxo_id`: Referência para `exp_pedidos_fluxo`.
- `lote_codigo`: Código do lote específico (ex: `20112025-1430-78914/10-EMB-01`).
- `tipo_baixa`: Tipo de baixa - `'consumo'` (uso interno) ou `'venda'` (saída comercial).
- `quantidade_pc`: Quantidade baixada em peças.
- `quantidade_kg`: Quantidade baixada em quilogramas.
- `observacao`: Justificativa ou detalhes da baixa.
- `baixado_por`: Usuário que realizou a baixa.
- `baixado_em`: Timestamp da baixa (UTC).
- `estornado`: Indica se a baixa foi estornada (`TRUE`/`FALSE`).
- `estornado_por`: Usuário que estornou a baixa.
- `estornado_em`: Timestamp do estorno (UTC).
- `motivo_estorno`: Justificativa para o estorno.
- `created_at`: Timestamp de criação (UTC).

**Índices:**
- `idx_baixas_fluxo` em `fluxo_id`
- `idx_baixas_lote` em `lote_codigo`
- `idx_baixas_tipo` em `tipo_baixa`
- `idx_baixas_data` em `baixado_em`
- `idx_baixas_estornado` em `estornado` (WHERE `estornado = FALSE`)

**Propósito:**
Permite rastrear consumo/venda de lotes específicos, mantendo rastreabilidade completa desde a usinagem até a baixa. Suporta estorno de baixas com justificativa.

## Tabela: `exp_insumos`
Catálogo de insumos de estoque.
- `id`: UUID gerado automaticamente.
- `nome`: Nome do insumo.
- `categoria`: Categoria (opcional).
- `qtd_atual`: Campo legado (não é a fonte de verdade quando há movimentos).
- `qtd_minima`: Estoque mínimo para alertas.
- `unidade`: Unidade de medida.
- `foto_url`: URL da foto do item (vinculada ao insumo).
- `criado_por`, `criado_em`, `atualizado_em`: Metadados.

## Tabela: `exp_insumos_mov`
Movimentações de insumos (fonte de verdade para saldo).
- `id`: UUID.
- `insumo_id`: Referência opcional para `exp_insumos`.
- `nome`: Nome do insumo.
- `categoria`: Categoria (opcional).
- `tipo`: `entrada` | `saida` | `ajuste`.
- `quantidade`: Quantidade movimentada (> 0).
- `unidade`: Unidade.
- `motivo`, `maquina`, `responsavel`, `observacao`: Rastreabilidade.
- `created_at`: Timestamp.

## Tabela: `exp_ferramentas_mov`
Movimentações de ferramentas (troca/consumo/entrada/perda).
- `id`: UUID.
- `ferramenta`: Código/nome.
- `categoria`: Categoria (opcional).
- `tipo`: `entrada` | `consumo` | `troca` | `ajuste` | `perda`.
- `quantidade`: Quantidade movimentada (> 0).
- `unidade`: Unidade.
- `motivo`, `maquina`, `responsavel`, `observacao`: Rastreabilidade.
- `created_at`: Timestamp.

## View: `vw_insumos_saldo`
Saldo por insumo calculado a partir de `exp_insumos_mov`.
- `saldo` = entradas - saídas + ajustes.

## View: `vw_insumos_consumo_30d`
Consumo (saídas) de insumos nos últimos 30 dias.

## View: `vw_ferramentas_consumo_30d`
Consumo de ferramentas nos últimos 30 dias.

## View: `vw_ferramentas_status`
Status de vida útil de ferramentas (ativa/atenção/para trocar) baseado em `ferramentas_cfg`.

## View: `vw_insumos_reposicao`
Sugestão de reposição quando saldo <= mínimo.

## Tabela: `exp_pedidos_movimentacoes`
Histórico de movimentações do fluxo EXP - Usinagem.
- `id`: UUID gerado automaticamente.
- `fluxo_id`: Referência para `exp_pedidos_fluxo`.
- `status_anterior` / `status_novo`: Estágios envolvidos na movimentação.
- `motivo`: Justificativa livre.
- `movimentado_por`: Usuário responsável (texto livre).
- `movimentado_em`: Data/hora UTC da movimentação.
- `tipo_movimentacao`: Classificação (`status`, `quantidade` ou `ajuste`).
- `kg_movimentado` / `pc_movimentado`: Quantidade movimentada na operação (NUMERIC(18,3)).
- `kg_disponivel_anterior` / `kg_disponivel_atual`: Saldo disponível em kg antes/depois da movimentação.
- `pc_disponivel_anterior` / `pc_disponivel_atual`: Saldo disponível em peças antes/depois da movimentação.

## Tabela: `apontamentos_correcoes`
Auditoria de correções realizadas em apontamentos (apenas admin).
- `id`: UUID gerado automaticamente.
- `apontamento_id`: Referência para `apontamentos(id)` com cascata de exclusão.
- `valor_anterior`: JSONB com dados originais antes da correção.
- `valor_novo`: JSONB com dados após a correção.
- `campos_alterados`: Array de TEXT com nomes dos campos corrigidos (ex: `['quantidade', 'inicio']`).
- `corrigido_por`: UUID referência para `usuarios(id)` - quem fez a correção.
- `corrigido_em`: TIMESTAMPTZ com data/hora da correção (padrão: agora em UTC).
- `motivo_correcao`: Texto obrigatório explicando por que foi corrigido.
- `revertido`: BOOLEAN indicando se a correção foi revertida (padrão: false).
- `revertido_por`: UUID referência para `usuarios(id)` - quem reverteu (opcional).
- `revertido_em`: TIMESTAMPTZ com data/hora da reversão (opcional).
- `motivo_reversao`: Texto explicando por que foi revertido (opcional).
- `created_at`: TIMESTAMPTZ de criação do registro.

**Índices:**
- `idx_correcoes_apontamento` em `apontamento_id`
- `idx_correcoes_corrigido_por` em `corrigido_por`
- `idx_correcoes_data` em `corrigido_em DESC`

**RLS Policies:**
- `admin_can_insert_correcoes`: Apenas usuários com `nivel_acesso = 'admin'` podem inserir.
- `admin_can_view_correcoes`: Apenas usuários com `nivel_acesso IN ('admin', 'supervisor')` podem visualizar.
- `admin_can_update_correcoes`: Apenas usuários com `nivel_acesso = 'admin'` podem atualizar (reversões).

**Propósito:**
Manter rastreabilidade completa de todas as correções de apontamentos, incluindo dados anteriores, novos, quem corrigiu, quando e por quê. Suporta reversão de correções com justificativa.
