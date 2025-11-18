# Especificações do Projeto

## Visão Geral

O Sistema de Controle e Apontamentos da Usinagem é uma aplicação web desenvolvida para gerenciar as atividades de usinagem na Fábrica de Extrusão de Perfis de Alumínio. O sistema permite o registro de apontamentos de produção, controle de paradas de máquina, monitoramento de indicadores de desempenho e geração de relatórios.

## Funcionalidades Principais

### 1. Apontamentos da Usinagem

- Registro das ordens de trabalho em execução
- Seleção de atividades a partir da Carteira de Encomendas
- Campos para registro:
  - Operador
  - Máquina
  - Código do perfil
  - Início e fim da operação
  - Quantidade produzida
  - Observações

#### Comportamentos automáticos
- Ao selecionar um pedido (via combo "Pedido/Seq" ou pelo modal de busca), o campo "Início" é preenchido automaticamente com a data/hora local atual no formato aceito por inputs `datetime-local` (AAAA-MM-DDTHH:MM).
- Se o campo "Início" já tiver um valor, ele é preservado (não sobrescreve).

### 2. Apontamentos de Paradas de Máquina

- Registro de eventos de parada
- Campos para registro:
  - Máquina
  - Motivo da parada
  - Classificação (planejada, não-planejada, manutenção, setup)
  - Início e fim da parada
  - Observações

### 3. Dashboard Interativo

- Indicadores principais:
  - OEE (Disponibilidade, Performance, Qualidade)
  - Tempo total de parada
  - Produção diária/mensal
  - Ordens concluídas x pendentes
- Gráficos dinâmicos para acompanhamento em tempo real

### 4. Relatórios Exportáveis

- Produção por período (turno, dia, mês)
- Relatório de paradas de máquina com classificação
- Desempenho por operador/máquina
- Exportação em Excel e PDF

### 5. Previsão de Trabalho

- Estimativas de tempo para conclusão de pedidos baseadas em dados históricos
- Cálculos de produtividade (pcs/hora, pcs/dia) por produto
- Análise da carteira de pedidos com estimativas automáticas
- Ferramenta para estimativas manuais de novos pedidos
- Histórico de produtividade por produto, máquina e operador
- Indicadores de confiabilidade das estimativas baseados no número de registros históricos

### 6. EXP - Usinagem

- Área dedicada à evolução dos recursos de expedição integrados à usinagem
- Página inicial criada como base para futuras funcionalidades específicas
- Abas "TecnoPerfil" e "Alúnica" exibidas diretamente na página para navegação entre conteúdos
  - **TecnoPerfil:** cartões de status (Pedido, Produzido, Inspeção, Expedição Alúnica, Expedição Cliente) com legendas e placeholders para indicadores
    - Card "Pedido" mostra tabela resumida (Pedido, Cliente, Nº Pedido, Data Entrega, Ferramenta, Pedido Kg, Pedido Pc) alimentada da carteira
    - Fluxo interativo com cards empilhados seguindo a sequência (Pedido → Produzido → Inspeção → Embalagem/Expedição Alúnica/Expedição Cliente), com registros persistidos em localStorage
    - Card "Pedido" inclui importação discreta via planilha (.xlsx/.csv) e formulário para cadastro manual com validação mínima
    - Expedição Alúnica transfere o pedido para a aba Alúnica; Expedição Cliente permite finalizar o pedido com histórico registrado
  - **Resumo:** aba com botão de exportação para Excel que gera planilha multiabas (Resumo consolidado, Top ferramentas, Detalhes por pedido e abas por unidade). Utiliza utilitário `exportResumoExcel`, mantendo numeração brasileira e campos calculados
  - **Alúnica:** cartões de status (Material em Estoque, Material para Usinar, Material para Embarque, Expedição) com legendas, ações operacionais e descrições desativadas conforme diretriz de simplificação visual
  - Tabelas da TecnoPerfil e Alúnica em layout compacto (`13px`), com truncamento de texto, nova coluna **Último movimento** e ações contextuais
- Visível para todos os perfis autenticados no menu principal

#### 6.1 Refatoração da página EXP - Usinagem (Nov/2025)

- Componentização e hooks criados para melhorar manutenibilidade e permitir novas implementações:
  - **Components**
    - `InventariosPanel.jsx`: sub-aba Inventários (lista, criação a partir do snapshot do estoque, edição/salvamento de itens e botão Cancelar quando status = rascunho).
    - `EstoqueUsinagemPanel.jsx`: filtros (unidade, situação, período e busca), tabela com saldos e botão de exportação Excel. Atalho para abrir Inventários.
    - `SelectionModal.jsx`: seleção de pedidos a partir de importados e carteira, com checagem de duplicidade e inclusão no fluxo.
    - `DeletePedidoButton.jsx`: botão de exclusão visível apenas para administradores.
  - **Hooks**
    - `useFluxoExpUsinagem.js`: carrega `fluxoPedidos` e `importados` com estados de loading/erro e `loadFluxo()/loadImportados()`.
    - `useInventarios.js`: gerencia inventários (`inventarios`, `activeInventario`, `invItens`, `invSaving`, `errors`) e ações (`loadInventarios`, `loadInventarioItens`, `createInventarioFromSnapshot`, `saveInventarioItem`, `cancelInventario`).
  - **Utils**
    - `utils/auth.js`: função `isAdmin(user)` centralizada para controle de permissões.

- Ordem lógica crítica no componente `ExpUsinagem.jsx`:
  - `pedidosTecnoPerfil` (useMemo) deve ser declarado antes do `useInventarios`, pois é utilizado pelo hook.

  - Permissões:
    - Botões de exclusão de pedidos do fluxo usam `isAdmin(user)` e aparecem somente para administradores.

  - Exportações:
    - `EstoqueUsinagemPanel` e `ResumoDashboard` utilizam utilitários de exportação garantindo formatação PT-BR (números e datas).

  - Inventários:
    - Snapshot do estoque é obtido a partir de `fluxoPedidos` (dados brutos) + `pedidosTecnoPerfil` (normalizados) com cálculo de saldos (`pedidoKg/Pc - apontadoKg/Pc`).
    - Cancelamento de inventário rascunho remove o cabeçalho e itens e atualiza a lista.

##### 6.1.1 Melhorias Alúnica (Nov/2025)

- **Migração de lotes (Inspeção → Embalagem):** Ao acionar "Aprovar Inspeção e Embalar" no estágio `para-inspecao`, os registros de `apontamentos` do pedido têm `exp_stage` atualizado para `para-embarque`, preservando o mesmo código de lote (ex.: `...-insp`). Não há alteração de saldos; é apenas reclassificação do estágio.
- **Evitar duplicidade visual:** Quando existem lotes resumidos para o estágio atual, a linha base do pedido não é exibida no mesmo card, permanecendo apenas o resumo de lotes.
- **Pré-carregamento ampliado:** O histórico de apontamentos é carregado automaticamente para pedidos visíveis em `para-usinar`, `para-inspecao` e `para-embarque`, garantindo que os resumos apareçam sem ação manual.
- **Persistência do estágio da Alúnica:** O estágio atual da unidade Alúnica é persistido na coluna `alunica_stage` de `exp_pedidos_fluxo` (valores: `para-usinar`, `para-inspecao`, `para-embarque`). A aplicação lê do banco para sincronizar o estado local e grava nas transições totais (aprovação/reabertura) e na entrada inicial na Alúnica.
- **Totais no cabeçalho por estágio:** O cabeçalho da Alúnica exibe os totais (pcs) por estágio:
  - `para-usinar`: saldo a produzir (pedidoPcTotal − pcs já apontados em Inspeção + Embalagem).
  - `para-inspecao`: soma dos apontamentos `exp_unidade='alunica' AND exp_stage='para-inspecao'` dos pedidos naquele estágio.
  - `para-embarque`: soma dos apontamentos `exp_unidade='alunica' AND exp_stage='para-embarque'` dos pedidos naquele estágio.

### 6. Integração da Carteira de Encomendas

- Upload de arquivo Excel contendo os itens de usinagem
- Carregamento automático dos dados para alimentar os apontamentos

## Arquitetura do Sistema

### Frontend

- **Framework**: React
- **Estilização**: Tailwind CSS
- **Roteamento**: React Router
- **Gerenciamento de Estado**: React Hooks
- **Gráficos**: Chart.js / React-Chartjs-2
- **Processamento de Excel**: xlsx

### Backend

- **Framework**: FastAPI (Python)
- **Autenticação**: JWT (JSON Web Tokens)
- **Processamento de Dados**: Pandas

### Banco de Dados

- **Plataforma**: Supabase
- **Tipo**: PostgreSQL

## Requisitos Técnicos

### Segurança

- Autenticação de usuários com diferentes níveis de acesso:
  - Operadores: Registro de apontamentos
  - Supervisores: Visualização de relatórios e dashboard
  - Administradores: Acesso completo ao sistema

### Responsividade

- Interface adaptável para diferentes dispositivos (desktop, tablet, mobile)

### Performance

- Carregamento rápido de dados
- Atualização em tempo real dos indicadores

### Integração

- Capacidade de importar/exportar dados em diferentes formatos (Excel, PDF, CSV)

## Fluxos de Trabalho

### Fluxo de Apontamento de Produção

1. Operador faz login no sistema
2. Seleciona a opção "Apontamentos de Usinagem"
3. Escolhe a ordem de trabalho da Carteira de Encomendas
4. Preenche os dados de início, máquina, etc.
5. Ao finalizar, registra o fim e a quantidade produzida
6. Sistema atualiza o status da ordem de trabalho

### Fluxo de Registro de Parada

1. Operador faz login no sistema
2. Seleciona a opção "Apontamentos de Paradas"
3. Registra a máquina e o motivo da parada
4. Informa o horário de início
5. Ao finalizar a parada, registra o horário de fim
6. Sistema atualiza os indicadores de disponibilidade
