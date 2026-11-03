# Sucateamento pós-apontamento

## Diagnóstico

O registro principal de produção é `public.apontamentos`. A coluna `quantidade` representa a produção originalmente apontada e não deve ser reduzida depois da gravação. Antes desta implementação, as perdas existiam apenas em `qtd_refugo`, destinada ao refugo informado junto com o apontamento.

As principais leituras de `apontamentos` estão em:

- Apontamentos de Usinagem e Embalagem;
- Dashboard e indicadores de qualidade;
- Pedidos, PCP e previsão de trabalho;
- Estoque e montagem de paletes;
- Expedição, kits e romaneios;
- Relatórios e exportações Excel;
- consultas de racks e rastreabilidade.

## Classificação dos dados

- **Produção bruta:** `apontamentos.quantidade`. É histórica e imutável neste fluxo.
- **Refugo imediato:** `apontamentos.qtd_refugo`. Ocorre durante o apontamento.
- **Sucata pós-apontamento:** soma dos eventos ativos de `apontamentos_sucata`.
- **Produção válida:** produção bruta menos sucata pós-apontamento.

Produtividade de processo pode usar produção bruta para medir o que foi efetivamente processado. Estoque, saldo de OP, racks disponíveis e Expedição devem usar produção válida.

## Arquitetura

### `apontamentos_sucata`

Mantém um evento por sucateamento, com vínculo ao apontamento, snapshots da OP/produto/lote/rack, quantidade, peso, motivo, origem, usuários, evidência e dados de estorno. Registros não são excluídos.

### `vw_apontamentos_saldos`

Preserva todas as colunas do apontamento e acrescenta:

- `quantidade_sucateada`;
- `quantidade_liquida`;
- `peso_sucateado_kg`;
- `ultimo_sucateamento_em`;
- `eventos_sucata_ativos`.

Registros históricos sem eventos continuam com quantidade líquida igual à quantidade original.

### Operações transacionais

`registrar_sucateamento_apontamento` bloqueia a linha do apontamento com `FOR UPDATE`, recalcula os eventos ativos e só então grava. Isso impede que operações simultâneas ultrapassem o saldo.

`estornar_sucateamento_apontamento` altera o evento para `estornado`, guardando usuário, data e motivo. Não existe exclusão operacional.

## Permissões

Operadores podem visualizar. Somente usuários ativos com perfil supervisor ou administrador podem confirmar ou estornar.

### Risco residual conhecido

O aplicativo usa autenticação própria armazenada no navegador, não Supabase Auth. A função valida o usuário informado contra `public.usuarios`, mas não existe hoje uma identidade criptográfica vinculada à chamada da API. A evolução recomendada é migrar o login para Supabase Auth e validar `auth.uid()` nas RPCs/RLS. Até essa migração, não se deve considerar o identificador vindo do navegador equivalente a uma sessão de banco autenticada.

## Comportamento das telas

- Tabela do Dia: mostra produção bruta, sucata posterior e produção válida.
- Dashboard: produção e qualidade usam saldo válido; sucata posterior aparece separadamente.
- Pedidos/PCP/Previsão: saldo usa produção válida.
- Estoque/Paletes/Expedição: disponibilidade usa produção válida.
- Relatório de Produção: exporta bruto, sucata posterior e válido.
- Perdas e Sucatas: diferencia refugo imediato de sucata pós-apontamento.

## Testes executados

- parcial;
- total;
- múltiplos eventos;
- excesso de saldo;
- zero e negativo;
- unidade em peças inteira;
- perfil sem permissão;
- estorno parcial e total;
- apontamento histórico sem evento;
- visão de saldo líquido.

Os testes de banco foram executados em transações revertidas e não deixaram eventos de teste.
