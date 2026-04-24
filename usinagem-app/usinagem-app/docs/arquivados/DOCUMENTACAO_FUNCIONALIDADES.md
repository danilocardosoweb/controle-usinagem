# Sistema de Controle de Usinagem - Documentação de Funcionalidades

## Visão Geral
Sistema completo para controle de produção em usinagem, desenvolvido com React (frontend) e integração com Supabase para persistência de dados. O sistema oferece controle de pedidos, apontamentos de produção, relatórios de rastreabilidade e análise de desempenho.

---

## 📊 Dashboard

### Funcionalidades Principais
- **KPIs em Tempo Real**: OEE Total, Tempo de Parada, Produção no Período
- **Seletor de Período**: Hoje, Ontem, Últimos 7 dias
- **Ordens em Execução**: Lista com progresso em tempo real

### Métricas Exibidas
- **Produção no Período**: Soma das quantidades apontadas no intervalo selecionado
- **Tempo de Parada**: Cálculo automático das paradas que cruzam o período
- **Ordens**: Contadores de pedidos concluídos vs pendentes
- **Componentes OEE**: Disponibilidade, Performance, Qualidade (placeholder)

### Tabela de Ordens em Execução
| Coluna | Descrição |
|--------|-----------|
| Código | Pedido/Seq da ordem |
| Perfil | Código do produto |
| Máquina | Máquina atual da operação |
| Operador | Operador responsável |
| Qtd. Pedido | Quantidade total do pedido |
| Separado | Quantidade já separada |
| Apontado | Quantidade já produzida |
| Progresso | Barra de progresso visual (%) |

---

## 📦 Pedidos e Produtos

### Importação de Dados
- **Formato Suportado**: Excel (.xlsx, .xls)
- **Colunas Obrigatórias**: PEDIDO/SEQ, CLIENTE, PRODUTO
- **Colunas Opcionais**: DT.FATURA, DESCRIÇÃO, QTD.PEDIDO, SALDO.À.PROD, etc.

### Funcionalidades
- **Filtros Avançados**: Por produto, cliente, status, data
- **Layout Responsivo**: 5 colunas em telas médias+
- **Sincronização**: Com servidor backend via API
- **Validação**: Verificação automática de dados importados

### Campos Principais
- **Pedido/Seq**: Identificador único (ex: 82594/10)
- **Cliente**: Nome do cliente
- **Produto**: Código do produto/perfil
- **Quantidade**: Qtd pedida vs saldo a produzir
- **Status**: Pendente, em produção, concluído
- **Prazo**: Data de fatura/entrega

---

## ⚙️ Apontamentos de Usinagem

### Controle de Produção
- **Timer Integrado**: Cronômetro para controle de tempo
- **Seleção de Pedidos**: Busca inteligente por Pedido/Seq
- **Rastreabilidade Completa**: Vinculação com lotes e amarrados

### Fluxo de Apontamento
1. **Seleção do Pedido**: Busca por código ou cliente
2. **Dados da Operação**: Máquina, operador, horários
3. **Rastreabilidade**: Seleção de rack/pallet e lotes externos
4. **Confirmação**: Quantidade produzida e refugo
5. **Documentação**: Geração automática de formulário de identificação

### Rastreabilidade Avançada
- **Busca por Rack**: Localiza lotes por número do rack/embalagem
- **Busca por Amarrado**: Encontra rack pelo número do amarrado
- **Seleção Múltipla**: Múltiplos lotes e amarrados por apontamento
- **Dados Detalhados**: Código, lote, produto, pedido/seq, romaneio, quantidades

### Recursos Especiais
- **Contador de Tempo**: Start/stop com confirmação automática
- **Formulário de Identificação**: Geração de documento .doc para impressão
- **Abertura de PDFs**: Desenhos técnicos e fichas de processo
- **Histórico**: Listagem de apontamentos por ordem de trabalho

---

## 📈 Relatórios

### Tipos de Relatório
1. **Produção**: Análise de produtividade por período
2. **Paradas**: Tempo e motivos de paradas
3. **Desempenho**: Performance por operador/máquina
4. **Ferramentas**: Uso e desgaste por ferramenta
5. **Rastreabilidade**: Histórico completo de lotes e amarrados

### Relatório de Rastreabilidade
- **Modo Detalhado**: Uma linha por amarrado
- **Modo Compacto**: Amarrados concatenados por apontamento
- **Filtros**: Data, máquina, operador
- **Exportação**: Excel com todas as informações de rastreabilidade

### Colunas de Rastreabilidade
| Grupo | Colunas |
|-------|---------|
| **Apontamento** | Data, Hora, Máquina, Operador, Pedido/Seq |
| **Produção** | Produto Usinagem, Lote Usinagem, Qtd Produzida, Refugo |
| **Logística** | Rack/Pallet, Lotes Externos |
| **Amarrados** | Código, Lote, Rack, Produto, Pedido/Seq, Romaneio, Qt(kg), Qtd(pc) |

### Formatos de Exportação
- **Excel**: Formato principal com todas as colunas
- **PDF**: Em desenvolvimento (fallback para Excel)

---

## 📅 Previsão de Trabalho

### Análise de Carteira
- **Estimativas Automáticas**: Baseadas em histórico de produtividade
- **Seleção de Pedidos**: Checkboxes para análise específica
- **Filtros**: Por produto, pedido cliente, data inicial

### Modos de Cálculo
1. **Produtividade Histórica**: Baseada em apontamentos registrados
2. **Estimativa Manual**: 15.000 pcs/dia (configurável)

### Configuração de Turnos
- **Turnos Flexíveis**: Configuração de horas por turno
- **Horas Extras**: Dia útil e sábado separadamente
- **Tipo de Dia**: Dia útil vs sábado (apenas extras)

### Gantt de Previsão
- **Visualização Sequencial**: Tarefas em ordem cronológica
- **Controles Interativos**: Zoom, ordenação, sombreamento de fins de semana
- **Ordenação**: Por prazo, duração, comprimento (AZ/ZA), sequência
- **Informações**: Início, término previsto, duração estimada

### Estimativa Manual
- **Cotações**: Importação de planilhas de cotação
- **Campos**: Ferramenta, comprimento, volume, produtividade
- **Cálculos**: Automáticos baseados em histórico ou manual

---

## ⚙️ Configurações

### Gerenciamento de Usuários (4 colunas)
- **Campos**: Nome, Email, Senha, Nível de Acesso
- **Níveis**: Operador, Supervisor, Administrador
- **Operações**: Adicionar, editar, excluir usuários

### Configurações do Processo (5 colunas)
- **Setup (min)**: Tempo padrão de setup
- **Manut. (min)**: Tempo padrão de manutenção
- **Meta OEE (%)**: Meta de eficiência
- **Horas/Turno**: Horas de trabalho por turno
- **Dias Úteis/Mês**: Dias úteis para cálculos

### Gerenciamento de Máquinas (6 colunas)
- **Campos**: Código, Nome, Modelo, Fabricante, Ano, Status
- **Status**: Ativo, Em Manutenção, Inativo
- **Integração**: Vinculação com apontamentos

### Gerenciamento de Insumos (5 colunas)
- **Campos**: Código, Nome, Tipo, Quantidade, Unidade
- **Tipos**: Ferramenta, Ferramenta CNC, Lubrificante, Consumível, Outro
- **Controle**: Estoque e consumo

### Configurações Avançadas
- **Motivos de Parada**: Cadastro de causas de parada
- **Tipos de Parada**: Categorização de paradas
- **Caminhos de Arquivos**: PDFs de desenhos e fichas de processo
- **Expedição**: Parâmetros por ferramenta (peso, comprimento, embalagem)

### Importação de Dados
- **Pedidos**: Sincronização com servidor ou planilha
- **Lotes**: Importação de dados de rastreabilidade
- **Status do Sistema**: Monitoramento de conexões

---

## 🔧 Recursos Técnicos

### Tecnologias
- **Frontend**: React 18, Tailwind CSS
- **Backend**: Node.js, Express
- **Banco**: Supabase (PostgreSQL)
- **Armazenamento Local**: IndexedDB para cache

### Integrações
- **Supabase**: Sincronização de dados em tempo real
- **Excel**: Importação/exportação de planilhas
- **PDF**: Visualização de desenhos técnicos
- **Impressão**: Formulários de identificação

### Performance
- **Cache Local**: IndexedDB para operação offline
- **Sincronização**: Automática com servidor
- **Responsividade**: Layout adaptável para desktop/tablet

### Segurança
- **Autenticação**: Sistema de login com níveis de acesso
- **Validação**: Verificação de dados em tempo real
- **Backup**: Sincronização automática com nuvem

---

## 📱 Interface e Usabilidade

### Design Responsivo
- **Desktop**: Layout completo com todas as funcionalidades
- **Tablet**: Adaptação de colunas e controles
- **Mobile**: Interface simplificada para consultas

### Navegação
- **Sidebar**: Menu lateral com ícones intuitivos
- **Breadcrumbs**: Navegação contextual
- **Filtros**: Sempre visíveis e persistentes

### Feedback Visual
- **Indicadores de Status**: Cores e ícones para status
- **Barras de Progresso**: Visualização de andamento
- **Notificações**: Alertas e confirmações
- **Loading**: Indicadores de carregamento

---

## 🚀 Próximas Funcionalidades

### Melhorias Planejadas
- **OEE Real**: Cálculo automático de eficiência
- **Relatórios PDF**: Geração nativa de PDFs
- **Dashboard Avançado**: Gráficos e tendências
- **Mobile App**: Aplicativo dedicado para operadores

### Integrações Futuras
- **ERP**: Integração com sistemas corporativos
- **IoT**: Sensores de máquinas
- **BI**: Business Intelligence avançado
- **API**: Endpoints para terceiros

---

## 📞 Suporte e Manutenção

### Logs e Monitoramento
- **Error Log**: Registro de erros do sistema
- **Change Log**: Histórico de alterações
- **Status**: Monitoramento de saúde do sistema

### Backup e Recuperação
- **Automático**: Sincronização contínua
- **Manual**: Exportação de dados
- **Restauração**: Recuperação de dados perdidos

---

*Documento gerado em: 05/10/2025 21:45*
*Versão do Sistema: v0.3.0*
*Repositório: https://github.com/danilocardosoweb/ControleUsinagem.git*
