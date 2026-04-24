# Sistema de Modelos de Amarrado - Documentação

## 📋 Visão Geral

Implementação completa de um sistema para **salvar, carregar e reutilizar modelos de amarrado** de perfis de alumínio. Permite que os usuários criem bibliotecas de configurações otimizadas por ferramenta e reutilizem-nas posteriormente.

## 🗄️ Banco de Dados

### Tabela: `amarrado_modelos`

```sql
CREATE TABLE amarrado_modelos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('circular', 'retangular')),
  quantidade INTEGER NOT NULL,
  pecas_por_linha INTEGER,
  largura NUMERIC NOT NULL,
  altura NUMERIC NOT NULL,
  espacamento NUMERIC NOT NULL,
  comprimento_perfil NUMERIC NOT NULL,
  cor TEXT DEFAULT '#a0a0a0',
  mostrar_filme BOOLEAN DEFAULT true,
  ferramenta TEXT,
  comprimento_mm INTEGER,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_modelo_ferramenta_comprimento UNIQUE (nome, ferramenta, comprimento_mm)
);
```

**Campos:**
- `id`: Identificador único (UUID)
- `nome`: Nome descritivo do modelo (ex: "Amarrado Padrão TR-0018")
- `descricao`: Descrição opcional com detalhes
- `tipo`: Tipo de perfil ('circular' ou 'retangular')
- `quantidade`: Quantidade total de peças
- `pecas_por_linha`: Quantidade de peças por linha (base)
- `largura`: Largura/diâmetro do perfil em mm
- `altura`: Altura do perfil (apenas retangular)
- `espacamento`: Espaçamento entre perfis em mm
- `comprimento_perfil`: Comprimento do perfil em mm
- `cor`: Cor do perfil em hexadecimal
- `mostrar_filme`: Boolean para exibir filme plástico
- `ferramenta`: Código da ferramenta (ex: "TR-0018")
- `comprimento_mm`: Comprimento da ferramenta em mm (ex: 2000) - **NOVO**
- `criado_em`: Timestamp de criação
- `atualizado_em`: Timestamp de atualização

**Chave Composta (UNIQUE):**
- `(nome, ferramenta, comprimento_mm)` - Permite reutilização em múltiplas abas

**Índices:**
- `idx_amarrado_ferramenta_comprimento`: Para busca rápida por ferramenta + comprimento
- `idx_amarrado_modelos_tipo`: Para filtro por tipo
- `idx_amarrado_modelos_criado_em`: Para ordenação por data

**RLS (Row Level Security):**
- Leitura: Pública (todos podem ver)
- Escrita: Apenas usuários autenticados

## 🔧 Serviço Frontend

### `AmarradoService.js`

Localização: `frontend/src/services/AmarradoService.js`

**Métodos disponíveis:**

#### `salvarModelo(modelo)`
Salva um novo modelo ou atualiza um existente.

```javascript
const resultado = await AmarradoService.salvarModelo({
  nome: 'Amarrado Padrão',
  descricao: 'Perfil circular 19mm, 18 peças',
  tipo: 'circular',
  quantidade: 18,
  pecas_por_linha: 5,
  largura: 19,
  altura: 0,
  espacamento: 2,
  comprimento: 2000,
  cor: '#a0a0a0',
  mostrar_filme: true,
  ferramenta: 'TR-0018'
});
```

#### `carregarModelos(filtros)`
Carrega modelos com filtros por ferramenta e/ou comprimento.

```javascript
// Busca específica: ferramenta + comprimento
const resultado = await AmarradoService.carregarModelos({ 
  ferramenta: 'TR-0018',
  comprimento_mm: 2000
});

// Fallback: apenas ferramenta
const resultado = await AmarradoService.carregarModelos({ 
  ferramenta: 'TR-0018'
});
```

#### `carregarModeloPorFerramenta(ferramenta, comprimento_mm)`
Carrega o modelo mais recente para uma ferramenta + comprimento específicos.
Útil para pré-carregar configuração ao abrir uma aba.

```javascript
const resultado = await AmarradoService.carregarModeloPorFerramenta('TR-0018', 2000);
if (resultado.success && resultado.data) {
  // Aplicar configuração automaticamente
  setAmarrado(resultado.data);
}
```

#### `carregarModeloPorId(id)`
Carrega um modelo específico pelo ID.

```javascript
const resultado = await AmarradoService.carregarModeloPorId(modeloId);
```

#### `deletarModelo(id)`
Deleta um modelo.

```javascript
const resultado = await AmarradoService.deletarModelo(modeloId);
```

#### `duplicarModelo(id, novoNome)`
Duplica um modelo existente com novo nome.

```javascript
const resultado = await AmarradoService.duplicarModelo(modeloId, 'Cópia do Modelo');
```

## 🎨 Interface do Usuário

### Botões no Sidebar de Amarrado

**Localização:** Aba "Amarrados" → Painel lateral

**Botões:**
- **Salvar Modelo** (Verde): Abre modal para salvar a configuração atual
- **Carregar** (Azul): Abre modal para selecionar um modelo salvo

### Modal: Salvar Novo Modelo

**Campos:**
- Nome do Modelo (obrigatório)
- Descrição (opcional)

**Ações:**
- Salvar: Persiste o modelo no banco de dados
- Cancelar: Fecha o modal

### Modal: Carregar Modelo

**Exibição:**
- Lista de modelos salvos para a ferramenta atual
- Cada modelo mostra:
  - Nome
  - Tipo de perfil (⭕ circular ou ▭ retangular)
  - Quantidade de peças
  - Dimensões (largura × comprimento)
  - Descrição (se houver)

**Ações por modelo:**
- **Carregar**: Aplica a configuração à visualização atual
- **Deletar**: Remove o modelo (com confirmação)

## 🔄 Fluxo de Uso

### Salvar um Modelo

1. Configure o amarrado na aba "Amarrados"
   - Tipo de perfil
   - Dimensões
   - Quantidade e peças por linha
   - Espaçamento
   - Cor

2. Clique em **"Salvar Modelo"**

3. Preencha:
   - Nome (ex: "Amarrado Padrão TR-0018")
   - Descrição (opcional)

4. Clique em **"Salvar"**

5. Modelo é armazenado no banco de dados

### Carregar um Modelo

1. Clique em **"Carregar"** no painel de amarrado

2. Selecione o modelo desejado da lista

3. Clique em **"Carregar"**

4. A configuração é aplicada instantaneamente

5. O visualizador 3D atualiza com os novos parâmetros

### Deletar um Modelo

1. Abra o modal **"Carregar"**

2. Localize o modelo

3. Clique em **"Deletar"** (ícone de lixeira)

4. Confirme a exclusão

## 📊 Exemplo de Uso Prático

**Cenário:** Você trabalha com a ferramenta TR-0018 e tem 3 configurações otimizadas:

```
TR-0018
├─ "Amarrado Compacto" (18 peças, 5 por linha)
├─ "Amarrado Padrão" (20 peças, 5 por linha)
└─ "Amarrado Máximo" (24 peças, 6 por linha)
```

**Workflow:**
1. Ao abrir a aba "Amarrados", clique em "Carregar"
2. Selecione "Amarrado Padrão"
3. A visualização 3D atualiza automaticamente
4. Você pode visualizar as cotas e o filme plástico
5. Se precisar de outra configuração, clique "Carregar" novamente

## 🔐 Segurança

- **RLS Habilitado**: Apenas usuários autenticados podem modificar modelos
- **Validação de Tipo**: Constraint CHECK garante tipo válido
- **Constraint UNIQUE**: Evita nomes duplicados por ferramenta

## � Reutilização em Múltiplas Abas

### Estrutura de Chave Composta

Os modelos são salvos com uma **chave composta** que permite reutilização:

```
Chave: (nome, ferramenta, comprimento_mm)
```

Isso significa que um mesmo modelo pode ser:
- ✅ Reutilizado na aba "Visualização 3D"
- ✅ Reutilizado na aba "Cubagem em Caminhões"
- ✅ Reutilizado em qualquer outra aba que use amarrados

### Exemplo de Uso Multi-Aba

**Aba Amarrados:**
```javascript
// Salvar modelo
await AmarradoService.salvarModelo({
  nome: 'Amarrado Padrão',
  ferramenta: 'TR-0018',
  comprimento_mm: 2000,
  tipo: 'circular',
  quantidade: 18,
  // ... outros parâmetros
});
```

**Aba Visualização 3D:**
```javascript
// Carregar e aplicar automaticamente
const resultado = await AmarradoService.carregarModeloPorFerramenta('TR-0018', 2000);
if (resultado.success && resultado.data) {
  setAmarrado(resultado.data); // Aplicar configuração
}
```

**Aba Cubagem:**
```javascript
// Listar modelos disponíveis para esta ferramenta + comprimento
const resultado = await AmarradoService.carregarModelos({
  ferramenta: 'TR-0018',
  comprimento_mm: 2000
});
```

## �📈 Próximas Melhorias

- [ ] Exportar/Importar modelos (CSV, JSON)
- [ ] Compartilhar modelos entre usuários
- [ ] Histórico de versões
- [ ] Tags para categorização
- [ ] Busca avançada por parâmetros
- [ ] Integração com relatórios de cubagem
- [ ] Auto-carregamento de modelos ao abrir abas

## 🐛 Troubleshooting

### Modelos não aparecem ao carregar
- Verifique se a ferramenta está correta
- Confirme que os modelos foram salvos com a ferramenta especificada
- Verifique as permissões RLS no Supabase

### Erro ao salvar modelo
- Verifique se o nome já existe para esta ferramenta
- Confirme que está autenticado
- Verifique a conexão com o banco de dados

### Modal não abre
- Verifique o console do navegador para erros
- Confirme que o componente está renderizando
- Verifique se os estados estão sendo atualizados corretamente
