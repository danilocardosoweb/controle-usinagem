# Log de Alterações

[16/10/2025 09:14] - [Frontend] - [Pedidos: Botão "Limpar Filtros" na mesma linha e filtros compactos] - [Cascade]
- Grid de filtros alterado para 7 colunas em `Pedidos.jsx`
- Altura dos inputs/selects reduzida (h-8) para caber tudo em uma linha
- Botão "Limpar Filtros" alinhado na mesma linha dos filtros

[16/10/2025 09:10] - [Frontend] - [PCP: Seleção múltipla e exclusão em lote] - [Cascade]
- Adicionados checkboxes por linha e seletor no cabeçalho
- Botões "Excluir Selecionados" e "Excluir Todos"
- Handlers utilizam removeMany() no SupabaseService
- Experiência otimizada: não é mais necessário excluir um por um

[14/10/2025 12:24] - [Frontend] - [Filtro de prioridades em Apontamentos de Usinagem] - [Windsurf]
- Adicionado filtro minimalista no campo "Pedido/Seq" dos Apontamentos
- Botão toggle "Todos" / "Prioritários" ao lado do label
- Ícone de estrela (FaStar) muda de cor conforme estado
- Estados visuais:
  - Inativo: fundo cinza, estrela cinza, texto "Todos"
  - Ativo: fundo amarelo, estrela amarela, texto "Prioritários"
- Carrega prioridades do PCP via SupabaseService
- Filtra select de pedidos para mostrar apenas prioritários quando ativo
- Integração com tabela pcp_prioridades
- UX: toggle rápido sem necessidade de confirmação

[14/10/2025 12:17] - [Frontend] - [Autocomplete no campo Pedido Cliente do PCP] - [Windsurf]
- Implementado autocomplete no campo "Pedido Cliente" do PCP
- Sugestões aparecem ao digitar (mínimo 2 caracteres)
- Dropdown com até 10 sugestões de Pedidos Cliente únicos
- Cada sugestão mostra: Pedido Cliente + Nome do Cliente
- Busca automática ao selecionar uma sugestão
- Estados: sugestoesPedidoCliente, mostrarSugestoes
- Funções: handlePedidoClienteChange(), selecionarSugestao()
- Estilo: dropdown com hover, scroll automático, z-index adequado
- UX melhorada: onBlur com delay para permitir clique na sugestão

[14/10/2025 12:16] - [Frontend] - [Marcação de itens prioritários em Pedidos e Produtos] - [Windsurf]
- Adicionado carregamento de prioridades do PCP na página Pedidos
- Filtro "Prioridade" com opções: "Todos" e "Apenas Prioritários"
- Marcação visual de itens prioritários na tabela:
  - Fundo amarelo claro (bg-yellow-50)
  - Borda esquerda amarela destacada (border-l-4 border-l-yellow-500)
  - Ícone de estrela (FaStar) ao lado do número do pedido
  - Tooltip mostrando o número da prioridade
- Função isPrioritario() para verificar se pedido está no PCP
- Função getPrioridadeDoPedido() para obter dados da prioridade
- Integração com tabela pcp_prioridades via SupabaseService

[14/10/2025 12:05] - [Frontend/Database] - [Coluna Apontado no PCP] - [Windsurf]
- Adicionada coluna "Apontado" na tabela de prioridades do PCP
- Mostra quantidade apontada e percentual em relação à quantidade total
- Busca apontamentos por pedido_seq e ordem_trabalho
- Método getByIn() adicionado ao SupabaseService
- Recálculo automático ao carregar/atualizar prioridades
- Removido campo "Sequência" completamente (UI, DB e payloads)
- Modo grupo permite definir Data de Entrega e Status

[14/10/2025 11:59] - [Frontend] - [Seleção por Pedido Cliente no PCP] - [Windsurf]
- Modo de seleção: Individual ou Por Pedido Cliente (grupo)
- Busca por Pedido Cliente com listagem de itens
- Seleção múltipla com checkboxes
- Botão "Selecionar todos / Limpar seleção"
- Criação em lote de prioridades
- Contador de itens selecionados
- Auditoria para criação em lote

[14/10/2025 11:53] - [Frontend] - [Correções e melhorias no PCP] - [Windsurf]
- Corrigido import do SupabaseService (era SupabaseContext)
- Corrigidos nomes dos campos da tabela pedidos:
  - numero_pedido → pedido_seq
  - codigo_perfil → produto
  - quantidade → qtd_pedido
- Melhorado carregamento de dados com Promise.all
- Filtro de pedidos ativos (com saldo a produzir)
- Select melhorado com informações completas do pedido
- Indicador de loading no select de pedidos
- Contador de pedidos disponíveis
- Integração com AuditoriaService para registrar ações
- Logs detalhados no console para debug
- Melhor tratamento de erros com mensagens específicas

[14/10/2025 11:47] - [Frontend/Database] - [Nova aba PCP - Planejamento e Controle de Produção] - [Windsurf]
- Criada página PCP.jsx para gerenciar prioridades de produção
- Funcionalidades: adicionar, editar, excluir e reordenar prioridades
- Interface com drag-and-drop visual (setas cima/baixo)
- Campos: pedido, sequência, produto, quantidade, data entrega, status, observações
- Status: pendente, em_producao, concluido, atrasado
- Cores de prioridade: vermelho (1-3), laranja (4-6), verde (7+)
- Modal de edição inline
- Tabela pcp_prioridades criada no Supabase
- Índices otimizados para consultas
- Políticas RLS configuradas
- Trigger para atualizar campo atualizado_em
- Rota /pcp adicionada no App.jsx
- Item PCP adicionado no Sidebar (ícone FaTasks)
- Acesso: admin e supervisor

[14/10/2025 10:56] - [Frontend] - [Logo sem fundo no modo recolhido do Sidebar] - [Windsurf]
- Copiado LogoTecnoRedeSocial-SemFundo.png para frontend/src/assets
- Substituído por versão sem fundo do logo
- Tamanho aumentado para 56x56px (h-14 w-14)
- Removido padding e bordas arredondadas para visual mais limpo
- Logo transparente integra melhor com fundo azul do sidebar

[14/10/2025 10:52] - [Frontend] - [Atualização do logo no modo recolhido do Sidebar] - [Windsurf]
- Testado LogoTecnoRedeSocial.png
- Tamanho 48x48px (h-12 w-12)
- Com bordas arredondadas

[14/10/2025 10:50] - [Frontend] - [Ajuste do logo no modo recolhido do Sidebar] - [Windsurf]
- Primeira tentativa com LogoTecnoSimples.png
- Testado tamanho 40x40px
- Ajustes de centralização

[14/10/2025 10:46] - [Frontend] - [Adicionado logo e nome da Tecnoperfil no Sidebar] - [Windsurf]
- Copiado LogoTecno.png para frontend/src/assets
- Adicionado logo da Tecnoperfil no topo do Sidebar
- Logo com fundo branco e sombra para destaque
- Nome "Tecnoperfil" em negrito abaixo do logo
- Subtítulo "Controle de Usinagem" em texto menor
- Modo expandido: mostra logo completo, nome e subtítulo
- Visual profissional e branded

[14/10/2025 10:44] - [Frontend] - [Ajuste do logo na tela de login] - [Windsurf]
- Removido fundo azul de trás do logo
- Logo agora aparece diretamente sobre o card branco
- Aumentado tamanho do logo para h-24 (96px)
- Visual mais limpo e moderno

[14/10/2025 10:42] - [Frontend] - [Adicionado logo na tela de login] - [Windsurf]
- Copiado LogoDaniloBranco.png para frontend/src/assets
- Adicionado logo na tela de login
- Melhorado design da tela de login com gradiente azul
- Logo centralizado acima do título

[14/10/2025 09:30] - [Database/Frontend] - [Sistema de Auditoria e Histórico de Ações] - [Windsurf]
- Criada tabela historico_acoes no Supabase para auditoria completa
- Campos: usuario_id, usuario_nome, usuario_email, acao, modulo, descricao, dados_anteriores, dados_novos, ip_address, user_agent
- Tipos de ação: login, logout, criar, editar, excluir, visualizar, exportar, importar, aprovar, rejeitar, acesso_negado
- Módulos rastreados: autenticacao, usuarios, pedidos, apontamentos, paradas, relatorios, configuracoes, lotes, maquinas
- Criado AuditoriaService.js com métodos helper para registro de ações
- Integrado registro de login/logout no AuthContext
- Integrado registro de CRUD de usuários em Configuracoes
- Políticas RLS: admins veem tudo, usuários veem apenas suas ações
- Auditoria é imutável (não permite UPDATE ou DELETE)
- Índices otimizados para consultas por usuário, ação, módulo e data
- Senhas nunca são registradas (substituídas por ***)

[14/10/2025 09:23] - [Frontend] - [Controle de acesso por nível de usuário] - [Windsurf]
- Implementado controle de acesso baseado em roles (admin, supervisor, operador)
- Sidebar agora filtra menu items baseado no role do usuário
- Configurações visível apenas para usuários com role 'admin'
- Criado componente ProtectedRoute para proteger rotas por role
- Tela de "Acesso Negado" com informações sobre permissões necessárias
- Proteção em dois níveis: UI (sidebar) e rotas (App.jsx)
- Usuários não-admin não veem a aba Configurações no menu
- Acesso direto via URL bloqueado com mensagem de erro amigável

[14/10/2025 09:20] - [Frontend] - [Integração de login com Supabase] - [Windsurf]
- AuthContext agora valida credenciais contra tabela usuarios do Supabase
- Busca usuário por email usando supabaseService.getByIndex()
- Verifica senha comparando com campos senha e senha_hash
- Valida se usuário está ativo antes de permitir login
- Atualiza campo ultimo_acesso após login bem-sucedido
- Senha padrão alterada de 'senha123' para '123456' (conforme banco)
- Logs detalhados para debug: usuário não encontrado, senha incorreta, usuário inativo
- ⚠️ Senhas em texto plano - implementar hash em produção

[14/10/2025 09:02] - [Database/Frontend] - [Correção do erro NOT NULL em senha_hash] - [Windsurf]
- Alterada coluna senha_hash para nullable (ALTER COLUMN DROP NOT NULL)
- Criado trigger sync_senha_hash() para sincronizar senha e senha_hash
- Trigger copia automaticamente senha para senha_hash e vice-versa
- Frontend agora envia ambos os campos (senha e senha_hash) para compatibilidade
- Correção resolve erro "null value in column 'senha_hash' violates not-null constraint"
- Cadastro e edição de usuários agora funcionam corretamente

[14/10/2025 08:55] - [Frontend] - [Correção do reload automático na exclusão de usuários] - [Windsurf]
- Adicionado loadItems (recarregarUsuarios) ao hook useSupabase
- Implementado reload forçado após exclusão de usuário
- Logs detalhados: "Excluindo", "Forçando reload", "Lista recarregada"
- Correção garante que lista atualiza imediatamente após exclusão
- Usuário desaparece da tela assim que é excluído

[14/10/2025 08:51] - [Database] - [Migração da tabela usuarios via MCP Supabase] - [Windsurf]
- Utilizado MCP Supabase para adicionar colunas faltantes na tabela usuarios
- Adicionadas colunas: ativo, data_criacao, data_atualizacao, ultimo_acesso, senha
- Criados índices: idx_usuarios_email, idx_usuarios_nivel_acesso, idx_usuarios_ativo
- Implementado trigger automático para atualizar data_atualizacao
- Migração de senha_hash para senha para compatibilidade com frontend
- Tabela agora possui 4 usuários ativos (3 padrão + 1 admin)
- Sistema de gerenciamento de usuários 100% funcional

[14/10/2025 08:49] - [Frontend/Docs] - [Melhorias no sistema de usuários e documentação] - [Windsurf]
- Adicionados logs de debug na função excluirUsuarioHandler
- Criado aviso visual quando tabela de usuários não existe
- Documentação completa em CONFIGURACAO_USUARIOS.md
- Instruções passo a passo para configurar tabela no Supabase
- Seção de troubleshooting para problemas comuns
- Checklist de configuração completo
- Recomendações de segurança para produção

[14/10/2025 08:42] - [Frontend] - [Integração de gerenciamento de usuários com Supabase] - [Windsurf]
- Substituído sistema de usuários simulados por integração real com Supabase
- Hook useSupabase('usuarios') para CRUD completo de usuários
- Funções async: adicionarUsuarioHandler, salvarEdicaoUsuario, excluirUsuarioHandler
- Validação de campos obrigatórios (nome, email, senha)
- Normalização de email (trim + toLowerCase)
- Tratamento de senha na edição (manter atual se campo vazio)
- Indicadores de carregamento durante operações
- Mensagens de sucesso/erro com feedback ao usuário
- Tabela vazia mostra mensagem "Nenhum usuário cadastrado"
- Estado de carregamento desabilita botões durante operações

[14/10/2025 08:32] - [Frontend] - [Sistema completo de configuração de impressoras] - [Windsurf]
- Nova aba "Impressoras" em Configurações com interface completa
- Configuração separada para impressora térmica (etiquetas) e comum (documentos)
- Campos: nome, caminho de rede, IP, porta, status ativo/inativo
- Persistência no localStorage com chave 'configuracao_impressoras'
- Utilitário impressoras.js com funções helper para validação e acesso
- Integração com sistema de apontamentos (verificação antes de imprimir)
- Modal de impressão mostra qual impressora será usada
- Botões de teste para verificar conectividade
- Desabilitação de opções quando impressora não está configurada
- Alertas informativos direcionando para configuração quando necessário

[14/10/2025 08:28] - [Frontend] - [Correção de duplicação de funções helper] - [Windsurf]
- Removidas declarações duplicadas de extrairFerramenta e extrairComprimentoAcabado
- Funções agora definidas apenas no topo do arquivo (fora do componente)
- Corrigido erro: "can't access lexical declaration 'extrairFerramenta' before initialization"
- Sistema de filtros por Ferramenta e Comprimento funcionando corretamente

[14/10/2025 08:26] - [Frontend] - [Adição de filtros por Ferramenta e Comprimento] - [Windsurf]
- Novos filtros: Ferramenta e Comprimento nos relatórios
- Listas dinâmicas geradas a partir dos apontamentos existentes
- Filtros aplicados em apontamentosFiltrados
- Grid de filtros expandido para 7 colunas (md:grid-cols-7)
- Seção de filtros com botão Recolher/Expandir para melhor visualização

[14/10/2025 08:20] - [Frontend] - [Melhoria na concatenação de amarrados no relatório compacto] - [Windsurf]
- Refatorada função agruparRastreabilidadeCompacto() para garantir todos os campos
- Adicionados campos Amarrado_Pedido e Amarrado_Seq na concatenação
- Lista completa de 12 campos de amarrado sendo concatenados
- Implementada função concat() centralizada para evitar duplicatas
- Adicionados logs de debug para rastreamento (linhas → apontamentos agrupados)
- Logs mostram: apontamentos, amarrados e linhas geradas
- Correção garante que todos os amarrados selecionados apareçam no Excel

[14/10/2025 08:12] - [Frontend] - [Correção de validação de nomes de abas Excel] - [Windsurf]
- Criada função sanitizeSheetName() para validar nomes de abas
- Remove caracteres inválidos: : \ / ? * [ ]
- Limita nomes a 31 caracteres (padrão Excel)
- Mapeamento de nomes curtos para abas (Producao, Paradas, Desempenho, etc)
- Rastreabilidade com nomes: "Rastreab Detalhado" e "Rastreab Compacto"
- Corrigidos erros: "Sheet names cannot exceed 31 chars" e "Sheet name cannot contain"

[14/10/2025 08:05] - [Frontend] - [Implementação completa de relatórios Excel nativos] - [Windsurf]
- Substituída geração CSV por Excel nativo (.xlsx) usando biblioteca XLSX
- Implementada função downloadExcel() com auto-ajuste de largura de colunas
- Adicionada função downloadExcelMultiSheet() para múltiplas abas
- Criado botão "Gerar Todos os Relatórios" que exporta todos os tipos em um arquivo
- Nomes de arquivos com timestamp ISO para melhor organização
- Limite de 31 caracteres para nomes de abas (padrão Excel)
- Tratamento de erros robusto com logs detalhados
- Rastreabilidade com duas abas: Detalhado e Compacto
- Formatação automática de colunas com largura otimizada

[13/10/2025 17:57] - [Frontend] - [Correção do cálculo "Qtd. Apontada" em tempo real] - [Windsurf]
- Adicionada atualização forçada dos apontamentos após salvar (setTimeout 500ms)
- Corrigida busca por campo ordem_trabalho (estava usando ordemTrabalho)
- Adicionados logs de debug para identificar problemas de sincronização
- Função recarregarApontamentos() chamada após inserção para garantir atualização

[13/10/2025 17:54] - [Frontend] - [Otimização do formulário: remoção de campo e espaçamento reduzido] - [Windsurf]
- Removido campo "Item Cli:" (não necessário)
- Espaçamento entre linhas reduzido de 8mm para 5mm
- Margem inferior do cabeçalho reduzida de 12mm para 8mm
- Padding inferior do cabeçalho reduzido de 6mm para 4mm
- Formulário agora cabe melhor em uma folha A4

[13/10/2025 17:50] - [Frontend] - [Reformulação completa do design do Formulário de Identificação] - [Windsurf]
- Layout moderno com CSS Grid (25% labels, 75% valores)
- Container com borda preta e padding interno
- Cabeçalho com linha divisória e tipografia melhorada
- Labels em maiúsculo com letter-spacing
- Valores com fundo cinza claro (#f9f9f9) e bordas mais finas
- Fonte Segoe UI para aparência mais moderna
- Linha dupla (QTDE/PALET) em grid 4 colunas balanceadas
- Espaçamento uniforme de 8mm entre campos

[13/10/2025 17:48] - [Frontend] - [Configuração padrão de impressão: Paisagem e Margens Estreitas] - [Windsurf]
- Margens ajustadas para 12.7mm (padrão de margens estreitas do Word)
- Orientação paisagem (landscape) definida no @page e @media print
- Body margin 0 para evitar margens extras na impressão
- Configuração otimizada para impressão direta sem ajustes manuais

[13/10/2025 17:47] - [Frontend] - [Correção de alinhamento QTDE/PALET no formulário] - [Windsurf]
- Ajustado alinhamento da linha dupla (QTDE e PALET)
- Labels da linha dupla agora seguem mesmo estilo das outras linhas
- Valores da linha dupla com mesma formatação (borda, padding, altura)
- Alinhamento vertical corrigido para bottom nos valores

[13/10/2025 17:45] - [Frontend] - [Melhorias no Formulário de Identificação Word] - [Windsurf]
- Espaçamento entre linhas aumentado de 12mm para 15mm (padrão uniforme)
- Altura das linhas padronizada em 18mm
- Valores centralizados horizontalmente
- Labels mantidos alinhados à esquerda
- Alinhamento vertical ajustado para middle (melhor distribuição)
- Margem inferior do cabeçalho aumentada para 15mm

[13/10/2025 17:40] - [Frontend] - [Fontes maiores e campo Dureza na etiqueta térmica] - [Windsurf]
- Fontes aumentadas: labels 10pt, valores 14pt (bold), cabeçalho 14pt
- Código de barras aumentado para 32pt
- Adicionado campo "Dureza" na coluna esquerda (4 itens à esquerda, 3 à direita)
- Espaçamentos reduzidos para acomodar o novo campo
- Padding otimizado para melhor aproveitamento do espaço

[13/10/2025 17:36] - [Frontend] - [Layout em 2 colunas e fontes maiores na etiqueta térmica] - [Windsurf]
- Reorganizado em 2 colunas: 3 informações à esquerda, 3 à direita
- Fontes aumentadas: labels 9pt, valores 12pt (bold), cabeçalho 13pt
- Código de barras 30pt em negrito
- Todos os valores em negrito para melhor destaque
- Espaçamento vertical entre itens aumentado para 1.5mm

[13/10/2025 17:33] - [Frontend] - [Melhorias no layout da etiqueta térmica] - [Windsurf]
- Layout em grid 2 colunas (label + valor) para melhor organização
- Fontes aumentadas: labels 9pt, valores 10pt, cabeçalho 11pt
- Removida repetição do número do lote (aparece apenas no código de barras)
- Código de barras com fonte maior (28pt) e separado por linha divisória
- Espaçamento otimizado para melhor legibilidade

[13/10/2025 17:26] - [Frontend] - [Implementada impressão de etiqueta térmica 100x45mm] - [Windsurf]
- Criada função imprimirEtiquetaTermica() para gerar etiquetas compactas
- Layout otimizado para impressora térmica (100mm x 45mm)
- Modal de impressão atualizado com seleção de tipo: Formulário Completo (Word) ou Etiqueta Térmica
- Etiqueta inclui: Cliente, Lote, Pedido, Turno, Perfil, Quantidade, Comprimento e código de barras
- Impressão direta via window.print() sem necessidade de download

[13/10/2025 17:13] - [Frontend] - [Adicionado campo "Comprimento" para refugos em Apontamentos] - [Windsurf]
- Adicionado campo "Compr (mm)" ao lado de "Refugos/Sucata (PCs)" no modal "Confirmar Apontamento"
- Layout em grid 2 colunas para Refugos/Sucata e Comprimento
- Campo salvo na coluna comprimento_refugo da tabela apontamentos
- Permite calcular perdas em kg considerando peças refugadas de vários tamanhos

[13/10/2025 17:05] - [Frontend] - [Adicionado campo "Dureza do Material" em Apontamentos] - [Windsurf]
- Adicionado campo "Dureza do Material" no modal "Confirmar Apontamento"
- Incluído campo "DUREZA" no "Formulário de Identificação do Material Cortado" (.doc)
- Campo salvo na coluna dureza_material da tabela apontamentos
- Placeholder sugerido: "Ex.: HRC 45-50"

[05/10/2025 08:30] - [Frontend] - [Aprimoramento da aba "Previsão Trab." com turnos e data inicial] - [Windsurf]
- Adicionada nova aba "Turnos" para configuração de turnos de trabalho (TA, TB, TC)
- Implementado sistema de cadastro de horas de trabalho e horas de paradas por turno
- Adicionado campo "Data Inicial da Previsão" para cálculos a partir de datas específicas
- Cálculos de estimativas agora consideram horas úteis reais baseadas nos turnos ativos
- Persistência dos dados de turnos no localStorage
- Interface para ativar/desativar turnos e editar configurações em tempo real
- Resumo automático de horas úteis por dia considerando todos os turnos ativos
- Atualização automática dos cálculos de produtividade (pcs/dia) baseada nas horas úteis configuradas

[05/10/2025 08:20] - [Frontend] - [Implementação da nova aba "Previsão Trab." para estimativas de tempo] - [Windsurf]
- Criado componente PrevisaoTrabalho.jsx com três abas principais:
  - Carteira de Pedidos: estimativas automáticas baseadas em dados históricos
  - Estimativa Manual: ferramenta para calcular tempo de novos pedidos
  - Histórico Produtividade: análise de produtividade por produto
- Implementados cálculos de produtividade (pcs/hora, pcs/dia) baseados em apontamentos existentes
- Adicionado sistema de confiabilidade das estimativas (Alta/Média/Baixa) baseado no número de registros
- Incluída nova rota no menu lateral posicionada abaixo de "Relatórios"
- Atualizada documentação em specs.md com as novas funcionalidades
- Interface responsiva com filtros e resumos estatísticos

[04/10/2025 14:52] - [Projeto] - [Limpeza e organização completa do repositório] - [Windsurf]
- Criada estrutura organizada de pastas: docs/, docs/referencia/, scripts/
- Consolidados schemas SQL no data_schema.sql (fonte única)
- Movidos arquivos de documentação para docs/
- Movidos schemas antigos para docs/referencia/ (histórico)
- Movidos scripts de deploy para scripts/
- Removidos arquivos obsoletos: schema_rastreabilidade_amarrados.sql, schema_refugo.sql
- Removidos arquivos sensíveis: credenciais_teste.md
- Removidos scripts de migração não utilizados: cleanup_project.py, migrate_to_supabase.py
- Atualizado .gitignore com novas regras de exclusão
- Repositório limpo e organizado para produção

[04/10/2025 14:02] - [Frontend] - [Aprimoramento completo do relatório de rastreabilidade] - [Windsurf]
- Implementado relatório "Rastreabilidade (Amarrados/Lotes)" com visualização prévia completa
- Adicionado seletor "Modo de Exibição": Detalhado (1 linha por amarrado) vs Compacto (concatenado)
- Implementada exportação Excel (CSV) com fallback automático por lotes_externos e rack/produto
- Corrigidos erros de sintaxe JSX e estrutura do componente Relatorios.jsx
- Adicionadas colunas detalhadas: Amarrado_Ferramenta, Amarrado_Comprimento_mm, Amarrado_Pedido, Amarrado_Seq
- Implementada função agruparRastreabilidadeCompacto para modo compacto
- Criado arquivo INSTRUCOES_FALLBACK_AMARRADOS.md com código para fallback automático

[04/10/2025 14:02] - [Frontend] - [Correções no Dashboard e campo refugo] - [Windsurf]
- Corrigido cálculo "Tempo de Parada" usando tabela paradas com soma de durações do dia
- Ajustado "Ordens Concluídas" para usar regra separado >= qtd_pedido
- Corrigida coluna "Máquina" em "Ordens em Execução" mapeando IDs para nomes da tabela maquinas
- Adicionado campo "Refugos/Sucata" no modal "Confirmar Apontamento"
- Implementado salvamento em qtd_refugo na tabela apontamentos

[04/10/2025 14:02] - [Database] - [Adição de campo qtd_refugo] - [Windsurf]
- Criado script schema_refugo.sql para adicionar coluna qtd_refugo
- Campo numeric(18,3) com default 0 para controle de refugo/sucata
- Campo incluído em todos os relatórios de produção

[04/10/2025 12:20] - [Database/Frontend] - [Implementada rastreabilidade completa de amarrados] - [Danilo]
- Adicionado campo `amarrados_detalhados` (JSONB) na tabela `apontamentos`
- Sistema agora salva informações completas de cada amarrado selecionado:
  - Código do amarrado, rack específico, produto, pedido/seq, romaneio
  - Quantidades (kg/pc), situação, data embalagem, nota fiscal
- Criado arquivo `schema_rastreabilidade_amarrados.sql` com queries de exemplo
- Atualizada documentação em `database_schema.md`
- Frontend modificado para coletar e salvar detalhes completos dos amarrados

[04/10/2025 12:15] - [Frontend] - [Removido botão "Nova Busca" do modal] - [Danilo]
- Simplificado interface do modal "Procurar Amarrados"
- Mantidos apenas botões essenciais: "Adicionar à Seleção" e "Finalizar"

[04/10/2025 12:10] - [Frontend] - [Implementado modal de busca por amarrado com layout em duas colunas] - [Danilo]
- Modal redesenhado com largura máxima 7xl e altura 90vh
- Coluna esquerda: busca e seleção de amarrados
- Coluna direita: painel com amarrados já selecionados em tempo real
- Permite acumular amarrados de múltiplas buscas
- Controle individual para remover amarrados específicos

[04/10/2025 12:00] - [Frontend] - [Implementada lógica para rack opcional na busca por amarrado] - [Danilo]
- Campo Rack!Embalagem não é mais obrigatório quando usar "Procurar por Amarrado"
- Sistema detecta automaticamente racks dos amarrados selecionados
- Define "MÚLTIPLOS RACKS" quando amarrados vêm de racks diferentes
- Mantém fluxo tradicional para busca por rack específico

[04/10/2025 11:55] - [Frontend] - [Corrigido suporte a múltiplos racks na busca por amarrado] - [Danilo]
- Sistema agora suporta amarrados de diferentes racks na mesma seleção
- Cada lote mostra seu rack específico na interface
- Consolidação correta de amarrados independente do rack de origem

[04/10/2025 11:30] - [Frontend] - [Implementada seção de amarrados selecionados no formulário] - [Danilo]
- Adicionada visualização dos amarrados/lotes selecionados no formulário principal
- Permite remover lotes individuais ou todos de uma vez
- Mostra rack associado e contador de lotes selecionados

[04/10/2025 10:55] - [Frontend] - [Adicionado modal "Procurar por Amarrado"] - [Danilo]
- Implementado modal para buscar amarrados pelo número
- Permite selecionar amarrados específicos de diferentes racks
- Integrado ao fluxo de seleção de lotes no apontamento

[04/10/2025 08:59] - [frontend/src/services/SupabaseService.js] - [Correção do limite de 1000 registros na tabela lotes] - [Cascade]
- Implementada busca paginada para a tabela 'lotes' que carrega TODOS os registros em lotes de 1000.
- Corrigido problema onde apenas os primeiros 1000 lotes eram carregados (de 16 mil total).
- Adicionados logs de progresso durante o carregamento dos lotes.
- Mantida busca normal para outras tabelas menores.

[04/10/2025 08:55] - [frontend/src/pages/ApontamentosUsinagem.jsx] - [Correção definitiva da busca por Rack/Embalagem] - [Cascade]
- Restaurada busca exata primeiro (como na versão que funcionava), seguida de busca normalizada como fallback.
- Corrigida lógica em `buscarLotesPorRack()` e botão "Inspecionar" para priorizar correspondência exata.
- Adicionados logs de debug temporários para diagnosticar problemas de dados.
- Mantida função `normalizeRackId()` como fallback para variações de formato.

[01/10/2025 16:15] - [Banco de Dados] - [Consolidação do esquema Supabase/PostgreSQL] - [Cascade]
- Adicionadas tabelas: `apontamentos`, `tipos_parada`, `ferramentas_cfg`.
- Alterada `maquinas` com colunas: `codigo`, `modelo`, `fabricante`, `ano`.
- Alterada `pedidos` com coluna: `dados_originais (JSONB)` e índices adicionais.
- Criados índices condicionais para `apontamentos` (pedido_seq, inicio, maquina).
- Arquivo consolidado: `data_schema.sql` (inclui UP/DOWN para Postgres).

[01/10/2025 10:35] - [frontend/src/pages/ApontamentosUsinagem.jsx] - [Limpeza condicional após confirmar apontamento] - [Cascade]
- Após confirmar, o app pergunta se o usuário continuará cortando o mesmo item.
- Se SIM: mantém todos os campos e limpa apenas "Quantidade Produzida".
- Se NÃO: limpa todos os campos (via `clearForm()`), para escolher o próximo item.

[01/10/2025 10:57] - [frontend/src/pages/ApontamentosUsinagem.jsx] - [Modal personalizado: Continuar no mesmo item?] - [Cascade]
- Substituído `window.confirm` por um pop-up customizado com botões "Continuar" e "Novo item".
- Mantém fundo escurecido e impede interação com o restante da tela enquanto aberto.

[01/10/2025 11:06] - [frontend/src/pages/ApontamentosUsinagem.jsx] - [Geração de Lote e Impressão de Identificação (Word)] - [Cascade]
- Gerado código de lote combinando Dia+Hora+Minuto+Item+Comprimento+Pedido.Cliente+Nº OP.
- Incluído campo `lote` no payload salvo em `apontamentos` (IndexedDB).
- Criado modal pós-registro perguntando se deseja imprimir o formulário de identificação.
- Geração de arquivo `.doc` (HTML compatível com Word) com os campos: Cliente, Item, Item Cli, Medida, Pedido Tecno, Qtde, Palet, Pedido Cli e Lote.

[01/10/2025 11:14] - [frontend/src/pages/ApontamentosUsinagem.jsx] - [Ajuste do Lote e Layout do Word (paisagem)] - [Cascade]
- Lote passa a incluir data completa antes da hora: `DDMMYYYY-HHMM-...`.
- Documento `.doc` formatado em A4 paisagem com tabela, tipografia consistente e cabeçalho com Lote.

[01/10/2025 13:33] - [frontend/src/pages/ApontamentosUsinagem.jsx] - [Pop-up Romaneio e Lote Externo ao selecionar Pedido/Seq] - [Cascade]
- Ao selecionar um Pedido/Seq, abre modal solicitando "Número do Romaneio" e "Número do Lote (externo)".
- Valores são obrigatórios para rastreabilidade e salvos no formulário (`romaneioNumero`, `loteExterno`).
- Incluídos no payload do apontamento como `romaneio_numero` e `lote_externo`.

[29/09/2025 12:07] - [frontend/src/pages/ApontamentosUsinagem.jsx] - [Preenchimento automático do campo "Início" ao selecionar pedido] - [Cascade]
- Ao selecionar um pedido (via combo "Pedido/Seq" ou pelo modal de busca), o campo "Início" agora é preenchido automaticamente com a data/hora local atual no formato aceito por `datetime-local` (AAAA-MM-DDTHH:MM).
- Caso o campo já esteja preenchido, o valor existente é preservado (não sobrescreve).
- Não houve mudanças de banco de dados.

[29/09/2025 12:12] - [frontend/src/pages/ApontamentosUsinagem.jsx] - [Preenchimento automático do campo "Fim" (+1h do Início)] - [Cascade]
- Ao selecionar um pedido (via combo ou modal), o campo "Fim" passa a ser preenchido automaticamente com 1 hora a mais que o valor de "Início", quando "Fim" estiver vazio.
- O valor manual de "Fim", se já existir, é preservado (não sobrescreve).

[29/09/2025 12:19] - [frontend/src/pages/ApontamentosUsinagem.jsx] - [Persistência de rascunho do formulário] - [Cascade]
- Implementado salvamento automático do formulário em `localStorage` (chave `apont_usinagem_draft`).
- Rascunho é carregado ao abrir a página e limpo após o registro do apontamento.
- Garante que o nome do operador atual prevaleça ao carregar o rascunho.

[04/09/2025 17:45] - [frontend/src/contexts/AuthContext.jsx, frontend/src/pages/Login.jsx] - [Melhorias no sistema de login] - [Cascade]
- Simplificado o sistema de autenticação para aceitar qualquer email com a senha 'senha123'
- Adicionados logs de depuração para facilitar a identificação de problemas
- Pré-preenchido o formulário de login com credenciais válidas
- Melhorado o tratamento de erros e feedback ao usuário
- Adicionada detecção automática de papel (admin, supervisor, operador) com base no email

[04/09/2025 17:40] - [frontend/src/contexts/AuthContext.jsx] - [Correção das credenciais de login] - [Cascade]
- Atualizado o AuthContext para aceitar as credenciais definidas no arquivo credenciais_teste.md
- Adicionado suporte para login com os emails: admin@usinagem.com, operador@usinagem.com, supervisor@usinagem.com
- Adicionado suporte para login com o email danilo.cardosoweb@gmail.com
- Padronizada a senha para todos os usuários como 'senha123'

[04/09/2025 10:15] - [frontend/src/services, frontend/src/hooks] - [Implementação de persistência de dados com IndexedDB] - [Cascade]
- Criado serviço DatabaseService.js para gerenciar operações no IndexedDB
- Implementado hook personalizado useDatabase para facilitar o uso do IndexedDB em componentes React
- Adicionado suporte para armazenamento de pedidos, máquinas, insumos e configurações
- Implementada persistência de dados na página de Pedidos com suporte a importação de planilhas
- Adicionadas funcionalidades de sincronização com o servidor e gerenciamento offline dos dados

[03/09/2025 14:04] - [Projeto] - [Criação da estrutura inicial do projeto] - [Cascade]
[03/09/2025 14:08] - [Backend] - [Definição do esquema do banco de dados] - [Cascade]
[03/09/2025 14:12] - [Backend] - [Implementação da autenticação de usuários] - [Cascade]
[03/09/2025 14:16] - [Frontend] - [Criação da estrutura do frontend React] - [Cascade]
[03/09/2025 14:20] - [Frontend] - [Implementação das páginas de apontamentos] - [Cascade]
[03/09/2025 14:25] - [Frontend] - [Implementação do dashboard e relatórios] - [Cascade]
[03/09/2025 14:36] - [Frontend] - [Implementação da aba de Configurações] - [Cascade]
[03/09/2025 14:49] - [Backend/Frontend] - [Implementação da importação de planilha de pedidos] - [Cascade]
[03/09/2025 14:58] - [Frontend] - [Adição de campos para cadastro de Motivos e Tipos de Parada] - [Cascade]
[03/09/2025 15:10] - [Frontend] - [Correção da importação de planilhas Excel na página de Pedidos e Produtos] - [Cascade]
[03/09/2025 15:25] - [Frontend] - [Correção do mapeamento de colunas na importação da planilha de pedidos] - [Cascade]
[03/09/2025 16:10] - [Frontend] - [Implementação do cadastro de máquinas e insumos] - [Cascade]
[03/09/2025 16:45] - [frontend/src/pages/Configuracoes.jsx] - [Correção da interface de cadastro de máquinas e insumos] - [Cascade]
- Corrigidos erros de sintaxe na seção de máquinas
- Padronizado os valores de status das máquinas para 'ativo', 'manutencao' e 'inativo'
- Corrigida a exibição da tabela de máquinas que estava mostrando dados incorretos
- Melhorada a estrutura do código para facilitar manutenção futura
[03/09/2025 17:30] - [frontend/src/pages/Pedidos.jsx] - [Ajuste dos campos importantes na tabela de Pedidos e Produtos] - [Cascade]
- Atualizado o mapeamento de colunas para incluir todos os campos importantes da planilha
- Adicionado suporte para campos: Pedido/Seq, Pedido.Cliente, Cliente, Dt.Fatura, Produto, Unidade, Qtd.Pedido, Saldo.à.Prod, Estoque.ACA, Separado, Faturado, Item.Perfil, Nro da OP
- Melhorado o processamento de dados para extrair corretamente todos os campos importantes
- Implementada lógica para calcular valores padrão quando campos não estão presentes na planilha

[03/09/2025 17:45] - [backend/routes/pedidos.py] - [Atualização do mapeamento de colunas no backend] - [Cascade]
- Aprimorado o mapeamento de colunas na importação de planilhas no backend
- Adicionado suporte para variações de nomes de colunas em maiúsculas e minúsculas
- Organizado o mapeamento separando campos principais e campos adicionais
- Garantida a compatibilidade com os campos importantes identificados pelo usuário

[03/09/2025 16:45] - [backend/routes/pedidos.py] - [Ampliação do mapeamento de colunas] - [Cascade]
- Expandido o mapeamento de colunas para incluir mais variações de nomes
- Adicionado suporte para formatos com e sem pontuação (ex: "PEDIDO.CLIENTE" e "PEDIDO CLIENTE")
- Implementado reconhecimento de colunas com nomes simplificados (ex: "PEDIDO" para "pedido_seq")
- Melhorada a robustez da importação para lidar com diferentes formatos de planilhas
[03/07/2023 16:45] - [frontend/src/components/Sidebar.jsx] - Implementação de menu retrátil - [Windsurf]
- Adicionado botão para expandir/recolher o menu lateral
- Implementada detecção automática de dispositivos móveis para recolher o menu em telas pequenas
- Melhorada a experiência do usuário com transições suaves e ícones intuitivos
- Adicionado suporte a tooltips para itens do menu quando recolhido

[03/07/2023 15:30] - [frontend/src/pages/Pedidos.jsx] - Aprimoramento da importação de planilhas - [Windsurf]
- Implementado mapeamento dinâmico de colunas que reconhece os nomes exatos das colunas da planilha
- Adicionado suporte para preservar todos os dados originais da planilha em cada registro
- Melhorada a detecção de cabeçalhos para maior compatibilidade com diferentes formatos de planilha
- Adicionados logs detalhados para facilitar a depuração do processo de importação

[03/07/2023 14:30] - [frontend/src/pages/Pedidos.jsx] - Correção do mapeamento de colunas na importação da planilha - [Windsurf]
- Corrigido o mapeamento das colunas na função de importação para corresponder ao formato da planilha
- Adicionado tratamento adequado para datas no formato brasileiro e serial Excel
- Implementado cálculo correto de status e estoque com base nos dados importados
- Resolvido conflito de variável duplicada 'status' na função de importação

[03/09/2025 16:43] - [database_schema.sql, database_schema.md] - Atualização do esquema do banco de dados - [Cascade]
- Adicionada tabela de pedidos com todos os campos necessários para importação da planilha
- Incluídos campos como pedido_seq, cliente, produto, dt_fatura, saldo_a_prod, etc.
- Criados índices para melhorar a performance de consultas frequentes
- Atualizada a documentação do esquema para incluir a descrição detalhada da tabela de pedidos

[03/09/2025 16:45] - [backend/schemas/pedido.py] - Correção no schema do pedido - [Cascade]
- Corrigido o campo 'fativado' para 'efetivado' para alinhar com o esquema do banco de dados
- Garantida a consistência entre o modelo de dados do backend e a estrutura do banco de dados

[03/09/2025 16:50] - [frontend/src/pages/Pedidos.jsx] - Correção dos filtros na página de Pedidos - [Cascade]
- Corrigido o tratamento de datas nos filtros para garantir comparações corretas
- Adicionada verificação de valores nulos ou indefinidos nos campos de filtro
- Melhorada a função de ordenação para lidar corretamente com diferentes tipos de dados
- Implementado reset da página ao aplicar filtros para melhor experiência do usuário

[03/09/2025 17:15] - [frontend/src/pages/ApontamentosUsinagem.jsx, backend/routes/pedidos.py] - Atualização da página de Apontamentos - [Cascade]
- Adicionado uso do nome do usuário logado como operador
- Alterado campo "Ordem de Trabalho" para "Pedido/Seq"
- Alterado campo "Código do Perfil" para "Produto"
- Adicionados novos campos: "Qtd.Pedido", "Perfil Longo" e "Separado"
- Criado contexto de autenticação para gerenciar usuário logado
- Atualizado mapeamento de colunas no backend para incluir novos aliases
- Corrigido campo 'fativado' para 'efetivado' no mapeamento de colunas

[03/09/2025 17:45] - [frontend/src/main.jsx, frontend/src/App.jsx, frontend/src/pages/Login.jsx] - Correção da integração do contexto de autenticação - [Cascade]
- Adicionado AuthProvider ao redor da aplicação no main.jsx
- Atualizado App.jsx para usar o contexto de autenticação em vez de estado local
- Modificado componente Login para trabalhar com o contexto de autenticação
- Corrigido o fluxo de login para usar as credenciais definidas no AuthContext
- Implementado tratamento de erros e feedback visual durante o processo de login
