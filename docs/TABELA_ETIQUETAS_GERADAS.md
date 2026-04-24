# Tabela de Etiquetas Geradas

## 📋 Visão Geral

A tabela `etiquetas_geradas` foi criada para armazenar e gerenciar todas as etiquetas térmicas geradas pelo sistema, permitindo consulta, rastreamento e reimpressão quando necessário.

## 🗄️ Estrutura da Tabela

### Tabela: `etiquetas_geradas`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | ID único da etiqueta (PK) |
| `lote_usinagem` | VARCHAR(50) | Código do lote de usinagem |
| `numero_etiqueta` | INTEGER | Número sequencial da etiqueta (ex: 1/10) |
| `total_etiquetas` | INTEGER | Total de etiquetas para o lote |
| `qtd_por_etiqueta` | INTEGER | Quantidade de peças nesta etiqueta |
| `qt_kg_por_etiqueta` | DECIMAL(10,2) | Peso em kg desta etiqueta |
| `apontamento_id` | UUID | Referência para o apontamento original |
| `codigo_amarrado` | VARCHAR(50) | Código do amarrado (se aplicável) |
| `rack_ou_pallet` | VARCHAR(50) | Rack ou pallet onde está armazenado |
| `data_hora_impresao` | TIMESTAMP | Data e hora da impressão |
| `impressora` | VARCHAR(100) | Impressora utilizada |
| `usuario_impressao` | VARCHAR(100) | Usuário que fez a impressão |
| `status` | VARCHAR(20) | Status: gerada, impressa, reimpressa |
| `qr_code` | TEXT | Conteúdo do QR Code gerado |
| `dados_etiqueta` | JSONB | Dados completos da etiqueta em JSON |
| `created_at` | TIMESTAMP | Data de criação do registro |
| `updated_at` | TIMESTAMP | Última atualização do registro |

## 📊 Índices

Para melhor performance, foram criados os seguintes índices:

```sql
CREATE INDEX idx_etiquetas_lote ON etiquetas_geradas(lote_usinagem);
CREATE INDEX idx_etiquetas_apontamento ON etiquetas_geradas(apontamento_id);
CREATE INDEX idx_etiquetas_data ON etiquetas_geradas(data_hora_impresao);
CREATE INDEX idx_etiquetas_status ON etiquetas_geradas(status);
```

## 🔄 Fluxo de Dados

### 1. Geração da Etiqueta
```
Usuário clica em imprimir → Modal abre → Define formação → Clica em Imprimir
                                                              ↓
                                                    EtiquetasService.registrarEtiquetas()
                                                              ↓
                                                    INSERT em etiquetas_geradas (status='gerada')
                                                              ↓
                                                    Impressão das etiquetas
                                                              ↓
                                                    EtiquetasService.marcarComoImpressa()
                                                              ↓
                                                    UPDATE status='impressa'
```

### 2. Reimpressão
```
Consulta etiquetas → Seleciona etiquetas → Clica em reimprimir
                                                              ↓
                                                    UPDATE status='reimpressa'
                                                              ↓
                                                    Nova impressão
```

## 🎯 Status da Etiqueta

| Status | Descrição | Quando ocorre |
|--------|-----------|---------------|
| `gerada` | Etiqueta criada no banco | Antes da impressão |
| `impressa` | Etiqueta impressa com sucesso | Após impressão bem-sucedida |
| `reimpressa` | Etiqueta reimpressa | Quando impressa novamente |

## 🔧 Serviços Disponíveis

### EtiquetasService.js

#### Métodos Principais

##### `registrarEtiquetas(apontamento, distribuicaoEtiquetas, usuario)`
- **Descrição**: Registra múltiplas etiquetas no banco
- **Parâmetros**:
  - `apontamento`: Dados do apontamento original
  - `distribuicaoEtiquetas`: Array com distribuição das etiquetas
  - `usuario`: Nome do usuário que está gerando
- **Retorno**: Array com etiquetas registradas

##### `marcarComoImpressa(etiquetaIds)`
- **Descrição**: Atualiza status das etiquetas para 'impressa'
- **Parâmetros**: Array de IDs das etiquetas
- **Retorno**: Etiquetas atualizadas

##### `getEtiquetasPorLote(loteUsinagem)`
- **Descrição**: Consulta todas as etiquetas de um lote
- **Parâmetros**: Código do lote de usinagem
- **Retorno**: Array de etiquetas ordenadas por número

##### `getEtiquetasPorApontamento(apontamentoId)`
- **Descrição**: Consulta etiquetas de um apontamento específico
- **Parâmetros**: ID do apontamento
- **Retorno**: Array de etiquetas

##### `getEstatisticas()`
- **Descrição**: Obtém estatísticas gerais das etiquetas
- **Retorno**: Objeto com totais por status

## 📱 Interface de Consulta

### Página: EtiquetasGeradas.jsx

#### Funcionalidades:

1. **Estatísticas em Cards**
   - Total de etiquetas geradas
   - Quantidade por status (gerada, impressa, reimpressa)

2. **Filtros**
   - Busca por lote, código ou cliente
   - Filtro por status
   - Botão de atualização

3. **Tabela de Resultados**
   - Exibe todas as etiquetas com informações relevantes
   - Ordenação por data/hora
   - Indicadores visuais de status

4. **Resumo da Consulta**
   - Quantidade de resultados
   - Filtros aplicados

## 📋 Estrutura JSON (dados_etiqueta)

Cada etiqueta armazena seus dados completos em formato JSON:

```json
{
  "cliente": "Nome do Cliente",
  "produto": "SER-001",
  "ferramenta": "SER-001",
  "quantidade": 37,
  "qt_kg": 20.5,
  "rack": "00002",
  "lote_usinagem": "06-01-2026-1401-000002",
  "lote_mp": "MP001",
  "dureza": "N/A",
  "pedido": "12345-001",
  "divisao_amarrados": "37 x 20.5",
  "numero_etiqueta": 1,
  "total_etiquetas": 20
}
```

## 🔍 Consultas Úteis

### 1. Etiquetas por Período
```sql
SELECT * FROM etiquetas_geradas 
WHERE data_hora_impresao >= '2026-01-01' 
AND data_hora_impresao <= '2026-01-31'
ORDER BY data_hora_impresao DESC;
```

### 2. Etiquetas por Cliente
```sql
SELECT 
  e.*,
  e.dados_etiqueta->>'cliente' as cliente
FROM etiquetas_geradas e
WHERE e.dados_etiqueta->>'cliente' = 'Nome do Cliente'
ORDER BY e.created_at DESC;
```

### 3. Estatísticas Diárias
```sql
SELECT 
  DATE(data_hora_impresao) as data,
  status,
  COUNT(*) as quantidade
FROM etiquetas_geradas
GROUP BY DATE(data_hora_impresao), status
ORDER BY data DESC, status;
```

### 4. Etiquetas Não Impressas
```sql
SELECT * FROM etiquetas_geradas 
WHERE status = 'gerada'
ORDER BY created_at;
```

## 🚀 Funcionalidades Futuras

### Planejadas

1. **Relatório de Etiquetas**
   - Exportação para Excel/CSV
   - Filtros avançados
   - Gráficos de produção

2. **Integração com Rastreamento**
   - QR Code que aponta para página de consulta
   - Histórico de movimentação
   - Fotos dos amarrados

3. **Alertas e Notificações**
   - Etiquetas não impressas após X horas
   - Relatórios automáticos diários
   - Notificações de problemas

4. **API Externa**
   - Endpoint para consulta de etiquetas
   - Integração com sistemas externos
   - Webhooks para eventos

## 🛠️ Manutenção

### Limpeza de Dados Antigos
```sql
-- Excluir etiquetas com mais de 1 ano
DELETE FROM etiquetas_geradas 
WHERE created_at < NOW() - INTERVAL '1 year';
```

### Backup
```sql
-- Backup completo da tabela
COPY etiquetas_geradas TO 'etiquetas_backup.csv' WITH CSV HEADER;
```

### Otimização
```sql
-- Analisar performance da tabela
EXPLAIN ANALYZE SELECT * FROM etiquetas_geradas WHERE lote_usinagem = 'XXX';
```

## 📝 Notas Importantes

1. **Performance**: A tabela está otimizada com índices para consultas frequentes
2. **Integridade**: Chaves estrangeiras garantem consistência com apontamentos
3. **Auditoria**: Todos os campos de data/hora permitem rastreamento completo
4. **Flexibilidade**: Campo JSONB permite armazenar dados estruturados
5. **Escalabilidade**: Estrutura preparada para volume alto de dados

## 🔗 Integrações

- **Apontamentos**: Cada etiqueta está vinculada a um apontamento
- **Relatórios**: Dados podem ser usados em relatórios de produção
- **Rastreamento**: Informações disponíveis para consulta futura
- **API**: Serviços disponíveis para integração externa

---

**Versão**: 1.0  
**Data**: 06/01/2026  
**Autor**: Sistema de Desenvolvimento  
**Status**: ✅ Implementado
