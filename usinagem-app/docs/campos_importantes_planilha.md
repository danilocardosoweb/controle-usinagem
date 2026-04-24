# Campos Importantes da Planilha de Pedidos

## Campos Essenciais
- **Pedido/Seq**: Pedidos de produção (também referido como "Ordem de Trabalho")
- **Pedido.Cliente**: Pedidos referência do Cliente
- **Cliente**: Nome do Cliente
- **Dt.Fatura**: Data para Entrega dos pedidos
- **Produto**: Produto Acabado (também referido como "Código do Perfil")
- **Unidade**: Unidade de Atendimento
- **Qtd.Pedido**: Quantidade Solicitada
- **Saldo.à.Prod**: Saldo a produzir
- **Estoque.ACA**: Quantidade em Estoque
- **Separado**: Quantidade Separada para Cliente
- **Faturado**: Quantidade já Faturada
- **Item.Perfil**: Produto longo (também referido como "Perfil Longo", matéria prima para fazer o acabado, precisa ser trabalhado na usinagem)
- **Nro da OP**: Número da OP Criada no sistema

## Todos os Campos do Arquivo Excel
Pedido/Seq,Pedido.Cliente,Cliente,Dt.Fatura,Dt.Implant.Item,Prazo,Produto,Descrição,Unidade,Qtd.Pedido,Qt.Saldo.OP,Em WIP,Saldo.à.Prod,Estoque.ACA,Separado,Faturado,Saldo.à.Fat,Item.Perfil,Unidade M.P,Estoque M.P,Peso.Barra,Cod.Cliente,Situação.Item.Pedido,Efetivado?,Item.do.Cliente,Representante,Fam.Comercial,Nro da OP,Operacao.Atual,Qtd.Operacao.Finalizadas,Qtd.Operacao.Total,Data.Ultimo.Reporte

## Mapeamento de Colunas no Sistema

### Frontend (React)

O sistema frontend realiza o seguinte mapeamento de colunas durante a importação da planilha:

| Campo Original | Campo no Sistema | Variações Aceitas | Alias na Interface |
|---------------|-----------------|-------------------|-------------------|
| Pedido/Seq | pedido_seq | PEDIDO/SEQ, Pedido/Seq, pedido/seq | Ordem de Trabalho |
| Pedido.Cliente | pedido_cliente | PEDIDO.CLIENTE, Pedido.Cliente, pedido.cliente, PEDIDO CLIENTE | - |
| Cliente | cliente | CLIENTE, Cliente, cliente | - |
| Dt.Fatura | dt_fatura | DT.FATURA, Dt.Fatura, dt.fatura, DATA ENTREGA | - |
| Produto | produto | PRODUTO, Produto, produto | Código do Perfil |
| Unidade | unidade | UNIDADE, Unidade, unidade | - |
| Qtd.Pedido | qtd_pedido | QTD.PEDIDO, Qtd.Pedido, qtd.pedido, QUANTIDADE | Qtd.Pedido |
| Saldo.à.Prod | saldo_a_prod | SALDO.À.PROD, Saldo.à.Prod, saldo.à.prod, SALDO | - |
| Estoque.ACA | estoque_aca | ESTOQUE.ACA, Estoque.ACA, estoque.aca, ESTOQUE | - |
| Separado | separado | SEPARADO, Separado, separado | Separado |
| Faturado | faturado | FATURADO, Faturado, faturado | - |
| Item.Perfil | item_perfil | ITEM.PERFIL, Item.Perfil, item.perfil, PERFIL | Perfil Longo |
| Nro da OP | nro_op | NRO DA OP, Nro da OP, nro da op, OP | - |

### Backend (FastAPI)

O backend utiliza um mapeamento expandido com processamento via pandas, incluindo múltiplas variações de nomes de colunas para garantir maior compatibilidade:

```python
# Mapeamento de colunas no backend
mapeamento_colunas = {
    # Campos principais identificados como importantes
    'PEDIDO/SEQ': 'pedido_seq',
    'Pedido/Seq': 'pedido_seq',
    'pedido/seq': 'pedido_seq',
    'PEDIDO': 'pedido_seq',
    'Pedido': 'pedido_seq',
    'pedido': 'pedido_seq',
    'ORDEM DE TRABALHO': 'pedido_seq',
    'Ordem de Trabalho': 'pedido_seq',
    'ordem de trabalho': 'pedido_seq',
    
    'PEDIDO.CLIENTE': 'pedido_cliente',
    'Pedido.Cliente': 'pedido_cliente',
    'pedido.cliente': 'pedido_cliente',
    'PEDIDO CLIENTE': 'pedido_cliente',
    'Pedido Cliente': 'pedido_cliente',
    'pedido cliente': 'pedido_cliente',
    
    'CLIENTE': 'cliente',
    'Cliente': 'cliente',
    'cliente': 'cliente',
    
    'DT.FATURA': 'dt_fatura',
    'Dt.Fatura': 'dt_fatura',
    'dt.fatura': 'dt_fatura',
    'DATA ENTREGA': 'dt_fatura',
    'Data Entrega': 'dt_fatura',
    'data entrega': 'dt_fatura',
    
    'PRODUTO': 'produto',
    'Produto': 'produto',
    'produto': 'produto',
    
    'DESCRIÇÃO': 'descricao',
    'Descrição': 'descricao',
    'descricao': 'descricao',
    'descrição': 'descricao',
    
    'UNIDADE': 'unidade',
    'Unidade': 'unidade',
    'unidade': 'unidade',
    
    'QTD.PEDIDO': 'qtd_pedido',
    'Qtd.Pedido': 'qtd_pedido',
    'qtd.pedido': 'qtd_pedido',
    'QUANTIDADE': 'qtd_pedido',
    'Quantidade': 'qtd_pedido',
    'quantidade': 'qtd_pedido',
    
    'SALDO.À.PROD': 'saldo_a_prod',
    'Saldo.à.Prod': 'saldo_a_prod',
    'saldo.à.prod': 'saldo_a_prod',
    'SALDO À PROD': 'saldo_a_prod',
    'Saldo à Prod': 'saldo_a_prod',
    'saldo à prod': 'saldo_a_prod',
    'SALDO': 'saldo_a_prod',
    'Saldo': 'saldo_a_prod',
    'saldo': 'saldo_a_prod',
    
    'ESTOQUE.ACA': 'estoque_aca',
    'Estoque.ACA': 'estoque_aca',
    'estoque.aca': 'estoque_aca',
    'ESTOQUE ACA': 'estoque_aca',
    'Estoque ACA': 'estoque_aca',
    'estoque aca': 'estoque_aca',
    'ESTOQUE': 'estoque_aca',
    'Estoque': 'estoque_aca',
    'estoque': 'estoque_aca',
    
    'SEPARADO': 'separado',
    'Separado': 'separado',
    'separado': 'separado',
    
    'FATURADO': 'faturado',
    'Faturado': 'faturado',
    'faturado': 'faturado',
    
    'ITEM.PERFIL': 'item_perfil',
    'Item.Perfil': 'item_perfil',
    'item.perfil': 'item_perfil',
    'ITEM PERFIL': 'item_perfil',
    'Item Perfil': 'item_perfil',
    'item perfil': 'item_perfil',
    'PERFIL': 'item_perfil',
    'Perfil': 'item_perfil',
    'perfil': 'item_perfil',
    
    'NRO DA OP': 'nro_op',
    'Nro da OP': 'nro_op',
    'nro da op': 'nro_op',
    'NÚMERO DA OP': 'nro_op',
    'Número da OP': 'nro_op',
    'número da op': 'nro_op',
    'OP': 'nro_op',
    'Op': 'nro_op',
    'op': 'nro_op',
    
    # ... e muitos outros campos adicionais
}
```

## Lógica de Processamento

1. **Detecção Automática**: O sistema detecta automaticamente os cabeçalhos da planilha e mapeia para os campos internos.

2. **Valores Padrão**: Quando um campo não é encontrado na planilha, o sistema utiliza valores padrão:
   - Quantidade não especificada: 0
   - Saldo não especificado: igual à quantidade do pedido
   - Estoque não especificado: 0
   - Separado não especificado: 0
   - Faturado não especificado: 0

3. **Tratamento de Datas**: O sistema converte datas em formato de texto (DD/MM/AAAA) ou datas seriais do Excel para o formato padrão brasileiro.

4. **Campos Numéricos**: Valores numéricos são convertidos para o formato adequado, removendo caracteres especiais quando necessário.

## Implementação Técnica

### Frontend
- Utiliza a biblioteca **xlsx** para processamento client-side da planilha
- Implementa detecção dinâmica de cabeçalhos para maior compatibilidade
- Realiza conversão de tipos de dados (números, datas)

### Backend
- Utiliza **pandas** e **openpyxl** para leitura e processamento da planilha
- Implementa renomeação de colunas com base no mapeamento definido
- Converte dados para os tipos apropriados antes de salvar no banco de dados

## Recomendações

- A importação funciona melhor quando a primeira linha da planilha contém os cabeçalhos
- Planilhas sem cabeçalhos claros podem resultar em mapeamento incorreto
- Recomenda-se manter os nomes de colunas originais da planilha exportada do sistema ERP
- Para melhor compatibilidade, utilize o formato de planilha Excel (.xlsx)
