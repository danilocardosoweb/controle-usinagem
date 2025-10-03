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

### 5. Integração da Carteira de Encomendas

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
