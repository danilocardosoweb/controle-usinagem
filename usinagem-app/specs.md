# Especificações do Projeto

## Visão Geral

O Sistema de Controle e Apontamentos da Usinagem é uma aplicação web desenvolvida para gerenciar as atividades de usinagem na Fábrica de Extrusão de Perfis de Alumínio. O sistema permite o registro de apontamentos de produção, controle de paradas de máquina, monitoramento de indicadores de desempenho e geração de relatórios.

## Funcionalidades Principais

### 1. Apontamentos da Usinagem

- Registro das ordens de trabalho em execução
- Seleção de atividades a partir da Carteira de Encomendas
- Impressão de etiqueta térmica (100mm x 45mm) com QR Code contendo dados compactos de rastreabilidade do lote
- Campos para registro:
  - Operador
  - Máquina
  - Código do perfil
  - Início e fim da operação
  - Quantidade produzida
  - Observações
- **Extração de Comprimento do Perfil Longo:** Nova coluna "Comprimento Longo" na tabela de apontamentos, exibindo o comprimento extraído automaticamente do campo "Perfil Longo" usando a função `extrairComprimentoPerfilLongo`
- **Busca por Comprimento Longo:** Modal de busca de pedidos permite filtrar por comprimento longo digitando números (ex: 679 para encontrar perfis com 679mm)

### 2.1 Apontamentos da Embalagem (com etapas)

- A aba "Apontamentos da Embalagem" reutiliza a estrutura de apontamentos, porém permite registrar etapas distintas do processo.
- O sistema pergunta ao usuário o tipo de processo:
  - **Somente Embalagem**
  - **Rebarbar/Limpeza + Embalagem**
- Quando o processo envolve duas etapas, o usuário seleciona a **Etapa** a ser apontada:
  - `REBARBAR_LIMPEZA`
  - `EMBALAGEM`
- Cada etapa é registrada como um apontamento separado, permitindo:
  - Operador e máquina diferentes por etapa
  - Apontamentos em dias/horários distintos
- **Regras de cálculo:** para evitar duplicidade de produção, os indicadores de "Qtd. Apontada" e "Saldo" na Embalagem consideram apenas os apontamentos com etapa `EMBALAGEM` (ou apontamentos legados sem etapa).

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

### 4. Relatórios Inteligentes

- Produção por período (turno, dia, mês) com **Hora Início, Hora Fim, Duração e Pcs/hora**
- Relatório de paradas de máquina com classificação
- Desempenho por operador/máquina
- **Relatórios por área (Usinagem x Embalagem):** versões específicas dos relatórios de Produção/Desempenho/Produtividade filtrando os apontamentos pela unidade (`apontamentos.exp_unidade`).
- Exportação em Excel e PDF
- **Cards de Indicadores (KPIs):** Total de apontamentos, Produção total, Tempo total trabalhado, Produtividade média (pcs/hora), Operadores ativos, Taxa de refugo
- **Insights Automáticos:** Alertas de taxa de refugo elevada, apontamentos sem hora de término, produtividade abaixo do esperado, metas de produção atingidas
- **UI Moderna:** Tabelas com destaque visual para métricas importantes, cores indicativas de performance
- **Filtros por Cliente e Pedido Cliente:** Novos campos de entrada de texto nos filtros para busca case-insensitive com match parcial, aplicado a todos os tipos de relatórios

### 5. Previsão de Trabalho

- Estimativas de tempo para conclusão de pedidos baseadas em dados históricos
- Cálculos de produtividade (pcs/hora, pcs/dia) por produto
- Análise da carteira de pedidos com estimativas automáticas
- Ferramenta para estimativas manuais de novos pedidos
- Histórico de produtividade por produto, máquina e operador
- Indicadores de confiabilidade das estimativas baseados no número de registros históricos

### 5.1 Pedidos e Produtos

- **Página de Gerenciamento de Pedidos:** Visualização e filtro de todos os pedidos da carteira
- **Filtros Operacionais:** Cliente, Pedido Cliente, Produto/Descrição, Status, Prioridade, Ferramenta, Comprimento
- **Exportação para Excel:** 
  - Botão "Exportar Filtrado" - exporta apenas os pedidos com filtros aplicados
  - Botão "Exportar Completo" - exporta todos os pedidos do banco
  - Arquivo gerado com todas as colunas relevantes (Nº OP, Pedido/Seq, Cliente, Ferramenta, Produto, Qtd. Pedido, Saldo, Estoque, etc.)
  - Ajuste automático de largura de colunas para melhor legibilidade
  - Nomeação do arquivo com data atual (ex: `Pedidos_Filtrado_16-01-2026.xlsx`)
- **Indicadores de Resumo:** Total de quantidade pedida e saldo a produzir dos itens filtrados

### 6. Estoque (Itens Acabados)

- Aba "Estoque" com gerenciamento de inventário de itens acabados
- **Ajuste de Inventário (Valor Final)**: Funcionalidade restrita a usuários admin
  - Campo de texto com autocomplete para seleção/criação de produtos
  - Permite adicionar produtos não apontados anteriormente
  - Entrada de contagem física (valor final) para ajuste
  - Cálculo automático do delta (diferença entre saldo atual e contagem física)
  - Registro de motivo do ajuste (Inventário, Correção de erro, Ajuste pós usinagem/embalagem, Outro)
  - Campo de observação para justificativa complementar
  - Histórico de ajustes com visualização de antes/depois/delta
- **Cálculo de Saldo**: Incorpora deltas de ajustes de inventário ao saldo calculado por produto
- **Tabela de Produtos**: Exibe saldo atualizado incluindo ajustes de inventário
- **Validação de Permissões**: Apenas admins podem acessar modal de ajuste (validação no frontend via `useAuth()` context)

### 7. EXP - Usinagem

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

##### 6.1.2 Sistema de Rastreabilidade de Lotes (Nov/2025)

- **Lotes Derivados com Rastreabilidade Completa:**
  - **Lote Base (Usinagem):** Gerado automaticamente no formato `DDMMAAAA-HHMM-PEDIDO` (ex: `20112025-1430-78914/10`)
  - **Lotes Derivados:** Sufixos sequenciais `-INS-01`, `-INS-02` (inspeção) e `-EMB-01`, `-EMB-02` (embalagem)
  - Campo `apontamentos.lote_externo` armazena o lote base para rastreabilidade origem
  - Campo `apontamentos.lote` armazena o lote derivado com sufixo
  - Sequência automática garante códigos únicos mesmo com múltiplos apontamentos
- **Modal "Apontar Embalagem – Alúnica":**
  - Título muda automaticamente quando estágio é `para-embarque`
  - Exibe bloco "Disponível para Embalar" com:
    - Total disponível calculado em tempo real dos apontamentos `para-embarque`
    - Tabela com "Lote de Usinagem" (origem) e "Lote de Embalagem" (derivado)
    - **Saldo projetado após o apontamento atual** (verde se OK, vermelho se exceder)
    - **Alerta visual** quando quantidade informada excede o disponível
  - Validação em tempo real previne erros antes do salvamento
- **Interface de Cards Aprimorada:**
  - Cards de Inspeção/Embalagem exibem colunas separadas: "Lote Usinagem" e "Lote Inspeção/Embalagem"
  - Rastreabilidade completa visível em toda a interface
  - Operador consegue rastrear qualquer lote da origem até a embalagem final
- **Validação de Finalização:**
  - Modal de bloqueio impede finalização quando há pendências de inspeção/embalagem
  - Verifica produção completa antes de permitir finalização do pedido
  - Mensagens descritivas indicam o motivo do bloqueio

### 7. Correção de Apontamentos (Auditoria)

- **Acesso:** Apenas administradores podem corrigir apontamentos
- **Funcionalidades:**
  - Modal interativo para editar campos de apontamentos (quantidade, data/hora, operador, máquina, rack/pallet, observações)
  - Rastreamento automático de campos alterados
  - Motivo obrigatório para justificar a correção
  - Histórico completo de todas as correções com timeline visual
  - Suporte a reversão de correções com justificativa
- **Auditoria:**
  - Tabela `apontamentos_correcoes` armazena dados anteriores e novos em JSONB
  - Registro de quem corrigiu, quando e por quê
  - RLS policies garantem que apenas admin possa inserir/atualizar correções
  - Supervisores podem visualizar histórico de correções
- **UI:**
  - Botão "🔧 Corrigir" visível apenas para admin na tabela de apontamentos
  - Modal com duas abas: "Corrigir" (edição) e "Histórico" (auditoria)
  - Campos alterados destacados em laranja com valores originais visíveis
  - Resumo de alterações antes de salvar

### 8. Integração da Carteira de Encomendas

- Upload de arquivo Excel contendo os itens de usinagem
- Carregamento automático dos dados para alimentar os apontamentos

### 9. Manual do Usuário

- Página geral acessível pelo menu lateral em **"Manual do Usuário"**.
- Objetivo: orientar usuários iniciantes sobre os fluxos principais do sistema.
- Conteúdo inclui instruções para:
  - Apontamentos de Usinagem
  - Apontamentos de Embalagem (incluindo fluxo por etapas)
  - Apontamentos de Paradas
  - Relatórios
  - Estoque
  - Correção de apontamentos (admin)

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
