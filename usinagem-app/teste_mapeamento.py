import pandas as pd
import json

# Função para simular o mapeamento de colunas da planilha
def testar_mapeamento_colunas():
    # Simular cabeçalhos de uma planilha
    cabecalhos = [
        "PEDIDO/SEQ", "PEDIDO.CLIENTE", "CLIENTE", "DT.FATURA", 
        "PRODUTO", "DESCRIÇÃO", "UNIDADE", "QTD.PEDIDO", 
        "SALDO.À.PROD", "ESTOQUE.ACA", "SEPARADO", "FATURADO", 
        "ITEM.PERFIL", "NRO DA OP"
    ]
    
    # Mapeamento de colunas como no frontend
    todasColunas = {cabecalho: i for i, cabecalho in enumerate(cabecalhos)}
    
    # Inicializar o objeto de colunas
    colunas = {}
    
    # Mapeamento para PEDIDO/SEQ
    if todasColunas.get('PEDIDO/SEQ') is not None:
        colunas['pedido'] = todasColunas['PEDIDO/SEQ']
    elif todasColunas.get('PEDIDO') is not None:
        colunas['pedido'] = todasColunas['PEDIDO']
    else:
        colunas['pedido'] = -1
    
    # Mapeamento para PEDIDO.CLIENTE
    if todasColunas.get('PEDIDO.CLIENTE') is not None:
        colunas['pedidoCliente'] = todasColunas['PEDIDO.CLIENTE']
    elif todasColunas.get('PEDIDO CLIENTE') is not None:
        colunas['pedidoCliente'] = todasColunas['PEDIDO CLIENTE']
    else:
        colunas['pedidoCliente'] = -1
    
    # Mapeamento para CLIENTE
    if todasColunas.get('CLIENTE') is not None:
        colunas['cliente'] = todasColunas['CLIENTE']
    else:
        colunas['cliente'] = -1
    
    # Mapeamento para DT.FATURA
    if todasColunas.get('DT.FATURA') is not None:
        colunas['data'] = todasColunas['DT.FATURA']
    elif todasColunas.get('DATA ENTREGA') is not None:
        colunas['data'] = todasColunas['DATA ENTREGA']
    else:
        colunas['data'] = -1
    
    # Mapeamento para PRODUTO
    if todasColunas.get('PRODUTO') is not None:
        colunas['produto'] = todasColunas['PRODUTO']
    else:
        colunas['produto'] = -1
    
    # Mapeamento para DESCRIÇÃO
    if todasColunas.get('DESCRIÇÃO') is not None:
        colunas['descricao'] = todasColunas['DESCRIÇÃO']
    else:
        colunas['descricao'] = -1
    
    # Mapeamento para UNIDADE
    if todasColunas.get('UNIDADE') is not None:
        colunas['unidade'] = todasColunas['UNIDADE']
    else:
        colunas['unidade'] = -1
    
    # Mapeamento para QTD.PEDIDO
    if todasColunas.get('QTD.PEDIDO') is not None:
        colunas['quantidade'] = todasColunas['QTD.PEDIDO']
    else:
        colunas['quantidade'] = -1
    
    # Mapeamento para SALDO.À.PROD
    if todasColunas.get('SALDO.À.PROD') is not None:
        colunas['saldo'] = todasColunas['SALDO.À.PROD']
    else:
        colunas['saldo'] = -1
    
    # Mapeamento para ESTOQUE.ACA
    if todasColunas.get('ESTOQUE.ACA') is not None:
        colunas['estoque'] = todasColunas['ESTOQUE.ACA']
    else:
        colunas['estoque'] = -1
    
    # Mapeamento para SEPARADO
    if todasColunas.get('SEPARADO') is not None:
        colunas['separado'] = todasColunas['SEPARADO']
    else:
        colunas['separado'] = -1
    
    # Mapeamento para FATURADO
    if todasColunas.get('FATURADO') is not None:
        colunas['faturado'] = todasColunas['FATURADO']
    else:
        colunas['faturado'] = -1
    
    # Mapeamento para ITEM.PERFIL
    if todasColunas.get('ITEM.PERFIL') is not None:
        colunas['perfil'] = todasColunas['ITEM.PERFIL']
    else:
        colunas['perfil'] = -1
    
    # Mapeamento para NRO DA OP
    if todasColunas.get('NRO DA OP') is not None:
        colunas['op'] = todasColunas['NRO DA OP']
    else:
        colunas['op'] = -1
    
    # Simular uma linha de dados
    linha = [
        "123/1", "456", "Cliente Teste", "01/09/2025",
        "PROD001", "Produto de Teste", "PC", 100,
        50, 20, 30, 0,
        "PERFIL-A", "OP-001"
    ]
    
    # Extrair valores das colunas conforme o mapeamento
    pedidoSeq = linha[colunas['pedido']] if colunas['pedido'] != -1 else ''
    pedidoCliente = linha[colunas['pedidoCliente']] if colunas['pedidoCliente'] != -1 else ''
    nomeCliente = linha[colunas['cliente']] if colunas['cliente'] != -1 else 'Cliente não especificado'
    codigoProduto = linha[colunas['produto']] if colunas['produto'] != -1 else ''
    descricaoProduto = linha[colunas['descricao']] if colunas['descricao'] != -1 else 'Sem descrição'
    unidadeProduto = linha[colunas['unidade']] if colunas['unidade'] != -1 else 'PC'
    
    # Extrair quantidade e saldo
    quantidade = linha[colunas['quantidade']] if colunas['quantidade'] != -1 else 0
    saldoAProd = linha[colunas['saldo']] if colunas['saldo'] != -1 else quantidade
    
    # Extrair estoque, separado e faturado
    estoqueAca = linha[colunas['estoque']] if colunas['estoque'] != -1 else 0
    separado = linha[colunas['separado']] if colunas['separado'] != -1 else 0
    faturado = linha[colunas['faturado']] if colunas['faturado'] != -1 else 0
    
    # Extrair perfil e OP
    perfil = linha[colunas['perfil']] if colunas['perfil'] != -1 else ''
    op = linha[colunas['op']] if colunas['op'] != -1 else ''
    
    # Criar o objeto de pedido
    pedido = {
        "id": "1",
        "pedido_seq": pedidoSeq,
        "pedido_cliente": pedidoCliente,
        "cliente": nomeCliente,
        "dt_fatura": "01/09/2025",
        "produto": codigoProduto,
        "descricao": descricaoProduto,
        "unidade": unidadeProduto,
        "qtd_pedido": quantidade,
        "saldo_a_prod": saldoAProd,
        "estoque_aca": estoqueAca,
        "separado": separado,
        "faturado": faturado,
        "item_perfil": perfil,
        "nro_op": op,
        "status": "pendente"
    }
    
    # Imprimir o resultado do mapeamento
    print("Mapeamento de colunas:")
    print(json.dumps(colunas, indent=2))
    print("\nPedido processado:")
    print(json.dumps(pedido, indent=2))
    
    # Testar com cabeçalhos em minúsculas
    print("\n\nTestando com cabeçalhos em minúsculas:")
    cabecalhos_minusculos = [c.lower() for c in cabecalhos]
    todasColunas_minusculas = {cabecalho: i for i, cabecalho in enumerate(cabecalhos_minusculos)}
    
    # Simular o mapeamento do backend
    mapeamento_backend = {
        # Campos principais identificados como importantes
        'PEDIDO/SEQ': 'pedido_seq',
        'Pedido/Seq': 'pedido_seq',
        'pedido/seq': 'pedido_seq',
        'PEDIDO.CLIENTE': 'pedido_cliente',
        'Pedido.Cliente': 'pedido_cliente',
        'pedido.cliente': 'pedido_cliente',
        'CLIENTE': 'cliente',
        'Cliente': 'cliente',
        'cliente': 'cliente',
        'DT.FATURA': 'dt_fatura',
        'Dt.Fatura': 'dt_fatura',
        'dt.fatura': 'dt_fatura',
    }
    
    # Verificar se o mapeamento do backend funciona com diferentes formatos
    colunas_encontradas = {}
    for coluna_original, coluna_mapeada in mapeamento_backend.items():
        for cabecalho in cabecalhos + cabecalhos_minusculos:
            if cabecalho.lower() == coluna_original.lower():
                colunas_encontradas[coluna_original] = cabecalho
                break
    
    print("\nColunas encontradas pelo mapeamento do backend:")
    print(json.dumps(colunas_encontradas, indent=2))

if __name__ == "__main__":
    testar_mapeamento_colunas()
