# Esquema do Banco de Dados

## Tabela: `usuarios`
Armazena as informações dos usuários do sistema.
- `id`: Identificador único do usuário.
- `nome`: Nome do usuário.
- `email`: E-mail para login (único).
- `senha_hash`: Senha criptografada.
- `nivel_acesso`: Perfil de permissão ('operador', 'supervisor', 'admin').
- `created_at`: Data de criação do registro.

## Tabela: `maquinas`
Catálogo das máquinas da usinagem.
- `id`: Identificador único da máquina.
- `nome`: Nome da máquina.
- `descricao`: Descrição ou detalhes técnicos.
- `status`: Status atual ('ativa', 'inativa', 'manutencao').
- `created_at`: Data de criação do registro.
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
- `id`: Identificador único do apontamento.
- `ordem_trabalho_id`: Chave estrangeira para `carteira_encomendas`.
- `usuario_id`: Chave estrangeira para `usuarios` (operador).
- `maquina_id`: Chave estrangeira para `maquinas`.
- `inicio_timestamp`: Data e hora de início da produção.
- `fim_timestamp`: Data e hora de término da produção.
- `quantidade_produzida`: Total de peças produzidas no período.
- `observacoes`: Notas adicionais.
- `created_at`: Data de criação do registro.

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
- `created_at`: Data de criação.
