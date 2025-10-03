from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query
from typing import List, Optional
from uuid import UUID
import pandas as pd
import io
from datetime import datetime
import json

# Importando os schemas
from schemas.pedido import Pedido, PedidoCreate, PedidoUpdate

router = APIRouter(
    prefix="/pedidos",
    tags=["pedidos"],
    responses={404: {"description": "Pedido não encontrado"}},
)

# Simulação de banco de dados em memória
pedidos_db = []

@router.post("/importar", response_model=dict)
async def importar_pedidos(arquivo: UploadFile = File(...)):
    """
    Importa pedidos de uma planilha Excel ou CSV
    """
    if arquivo.filename.endswith('.xlsx') or arquivo.filename.endswith('.xls'):
        try:
            # Lê o conteúdo do arquivo
            contents = await arquivo.read()
            
            # Converte para DataFrame do pandas
            df = pd.read_excel(io.BytesIO(contents))
            
            # Renomeia as colunas para o formato do sistema
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
                'CÓDIGO DO PERFIL': 'produto',
                'Código do Perfil': 'produto',
                'código do perfil': 'produto',
                
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
                'PERFIL LONGO': 'item_perfil',
                'Perfil Longo': 'item_perfil',
                'perfil longo': 'item_perfil',
                
                'NRO DA OP': 'nro_op',
                'Nro da OP': 'nro_op',
                'nro da op': 'nro_op',
                'NÚMERO DA OP': 'nro_op',
                'Número da OP': 'nro_op',
                'número da op': 'nro_op',
                'OP': 'nro_op',
                'Op': 'nro_op',
                'op': 'nro_op',
                
                # Campos adicionais
                'DT.IMPLANT.ITEM': 'dt_implant_item',
                'Dt.Implant.Item': 'dt_implant_item',
                'dt.implant.item': 'dt_implant_item',
                
                'PRAZO': 'prazo',
                'Prazo': 'prazo',
                'prazo': 'prazo',
                
                'QT.SALDO.OP': 'qt_saldo_op',
                'Qt.Saldo.OP': 'qt_saldo_op',
                'qt.saldo.op': 'qt_saldo_op',
                
                'EM WIP': 'em_wip',
                'Em WIP': 'em_wip',
                'em wip': 'em_wip',
                
                'SALDO.À.FAT': 'saldo_a_fat',
                'Saldo.à.Fat': 'saldo_a_fat',
                'saldo.à.fat': 'saldo_a_fat',
                
                'UNIDADE.M.P': 'unidade_mp',
                'Unidade.M.P': 'unidade_mp',
                'unidade.m.p': 'unidade_mp',
                'UNIDADE MP': 'unidade_mp',
                'Unidade MP': 'unidade_mp',
                'unidade mp': 'unidade_mp',
                
                'ESTOQUE.M.P': 'estoque_mp',
                'Estoque.M.P': 'estoque_mp',
                'estoque.m.p': 'estoque_mp',
                'ESTOQUE MP': 'estoque_mp',
                'Estoque MP': 'estoque_mp',
                'estoque mp': 'estoque_mp',
                
                'PESO.BARRA': 'peso_barra',
                'Peso.Barra': 'peso_barra',
                'peso.barra': 'peso_barra',
                'PESO BARRA': 'peso_barra',
                'Peso Barra': 'peso_barra',
                'peso barra': 'peso_barra',
                
                'COD.CLIENTE': 'cod_cliente',
                'Cod.Cliente': 'cod_cliente',
                'cod.cliente': 'cod_cliente',
                'CÓDIGO CLIENTE': 'cod_cliente',
                'Código Cliente': 'cod_cliente',
                'código cliente': 'cod_cliente',
                
                'SITUAÇÃO.ITEM.PEDIDO': 'situacao_item_pedido',
                'Situação.Item.Pedido': 'situacao_item_pedido',
                'situação.item.pedido': 'situacao_item_pedido',
                'SITUAÇÃO ITEM PEDIDO': 'situacao_item_pedido',
                'Situação Item Pedido': 'situacao_item_pedido',
                'situação item pedido': 'situacao_item_pedido',
                
                'EFETIVADO?': 'efetivado',
                'Efetivado?': 'efetivado',
                'efetivado?': 'efetivado',
                'EFETIVADO': 'efetivado',
                'Efetivado': 'efetivado',
                'efetivado': 'efetivado',
                
                'ITEM.DO.CLIENTE': 'item_do_cliente',
                'Item.do.Cliente': 'item_do_cliente',
                'item.do.cliente': 'item_do_cliente',
                'ITEM DO CLIENTE': 'item_do_cliente',
                'Item do Cliente': 'item_do_cliente',
                'item do cliente': 'item_do_cliente',
                
                'REPRESENTANTE': 'representante',
                'Representante': 'representante',
                'representante': 'representante',
                
                'FAM.COMERCIAL': 'fam_comercial',
                'Fam.Comercial': 'fam_comercial',
                'fam.comercial': 'fam_comercial',
                'FAMÍLIA COMERCIAL': 'fam_comercial',
                'Família Comercial': 'fam_comercial',
                'família comercial': 'fam_comercial',
                
                'OPERACAO.ATUAL': 'operacao_atual',
                'Operacao.Atual': 'operacao_atual',
                'operacao.atual': 'operacao_atual',
                'OPERAÇÃO ATUAL': 'operacao_atual',
                'Operação Atual': 'operacao_atual',
                'operação atual': 'operacao_atual',
                
                'QTD.OPERACAO.FINALIZADAS': 'qtd_operacao_finalizadas',
                'Qtd.Operacao.Finalizadas': 'qtd_operacao_finalizadas',
                'qtd.operacao.finalizadas': 'qtd_operacao_finalizadas',
                'QTD OPERAÇÕES FINALIZADAS': 'qtd_operacao_finalizadas',
                'Qtd Operações Finalizadas': 'qtd_operacao_finalizadas',
                'qtd operações finalizadas': 'qtd_operacao_finalizadas',
                
                'QTD.OPERACAO.TOTAL': 'qtd_operacao_total',
                'Qtd.Operacao.Total': 'qtd_operacao_total',
                'qtd.operacao.total': 'qtd_operacao_total',
                'QTD OPERAÇÕES TOTAL': 'qtd_operacao_total',
                'Qtd Operações Total': 'qtd_operacao_total',
                'qtd operações total': 'qtd_operacao_total',
                
                'DATA.ULTIMO.REPORTE': 'data_ultimo_reporte',
                'Data.Último.Reporte': 'data_ultimo_reporte',
                'data.último.reporte': 'data_ultimo_reporte',
                'DATA ÚLTIMO REPORTE': 'data_ultimo_reporte',
                'Data Último Reporte': 'data_ultimo_reporte',
                'data último reporte': 'data_ultimo_reporte'
            }
            
            # Renomeia as colunas que existem no DataFrame
            colunas_existentes = {col: mapeamento_colunas[col] for col in mapeamento_colunas if col in df.columns}
            df = df.rename(columns=colunas_existentes)
            
            # Converte o DataFrame para lista de dicionários
            pedidos_data = df.fillna('').to_dict(orient='records')
            
            # Limpa o banco de dados em memória
            pedidos_db.clear()
            
            # Adiciona os novos pedidos
            for pedido_data in pedidos_data:
                # Converte tipos de dados
                for campo in ['dt_fatura', 'dt_implant_item']:
                    if campo in pedido_data and pedido_data[campo]:
                        if isinstance(pedido_data[campo], str):
                            try:
                                pedido_data[campo] = datetime.strptime(pedido_data[campo], '%d/%m/%Y').date()
                            except ValueError:
                                pedido_data[campo] = None
                
                # Cria um novo pedido com ID único
                novo_pedido = Pedido(
                    id=UUID('ffffffff-ffff-ffff-ffff-{:012d}'.format(len(pedidos_db) + 1)),
                    data_criacao=datetime.now(),
                    **{k: v for k, v in pedido_data.items() if k in PedidoCreate.__annotations__}
                )
                pedidos_db.append(novo_pedido)
            
            return {
                "status": "sucesso",
                "mensagem": f"Importados {len(pedidos_data)} pedidos com sucesso",
                "total_pedidos": len(pedidos_db)
            }
            
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Erro ao processar o arquivo: {str(e)}")
    else:
        raise HTTPException(status_code=400, detail="Formato de arquivo não suportado. Use Excel (.xlsx, .xls)")

@router.get("/", response_model=List[Pedido])
async def listar_pedidos(
    cliente: Optional[str] = None,
    produto: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    """
    Lista todos os pedidos com opção de filtros
    """
    filtrados = pedidos_db
    
    if cliente:
        filtrados = [p for p in filtrados if cliente.lower() in p.cliente.lower()]
    
    if produto:
        filtrados = [p for p in filtrados if produto.lower() in p.produto.lower() or produto.lower() in p.descricao.lower()]
    
    if status:
        filtrados = [p for p in filtrados if p.status == status]
    
    return filtrados[skip:skip + limit]

@router.get("/{pedido_id}", response_model=Pedido)
async def obter_pedido(pedido_id: UUID):
    """
    Obtém um pedido específico pelo ID
    """
    for pedido in pedidos_db:
        if pedido.id == pedido_id:
            return pedido
    
    raise HTTPException(status_code=404, detail="Pedido não encontrado")

@router.put("/{pedido_id}", response_model=Pedido)
async def atualizar_pedido(pedido_id: UUID, pedido_update: PedidoUpdate):
    """
    Atualiza um pedido existente
    """
    for i, pedido in enumerate(pedidos_db):
        if pedido.id == pedido_id:
            # Atualiza apenas os campos fornecidos
            update_data = pedido_update.dict(exclude_unset=True)
            
            # Converte o pedido para dicionário
            pedido_dict = pedido.dict()
            
            # Atualiza os campos
            pedido_dict.update(update_data)
            
            # Atualiza a data de atualização
            pedido_dict["data_atualizacao"] = datetime.now()
            
            # Cria um novo objeto Pedido com os dados atualizados
            pedido_atualizado = Pedido(**pedido_dict)
            
            # Substitui o pedido antigo pelo atualizado
            pedidos_db[i] = pedido_atualizado
            
            return pedido_atualizado
    
    raise HTTPException(status_code=404, detail="Pedido não encontrado")

@router.delete("/{pedido_id}", response_model=dict)
async def excluir_pedido(pedido_id: UUID):
    """
    Exclui um pedido pelo ID
    """
    for i, pedido in enumerate(pedidos_db):
        if pedido.id == pedido_id:
            # Remove o pedido da lista
            pedidos_db.pop(i)
            return {"status": "sucesso", "mensagem": "Pedido excluído com sucesso"}
    
    raise HTTPException(status_code=404, detail="Pedido não encontrado")

@router.get("/estatisticas/resumo", response_model=dict)
async def obter_estatisticas():
    """
    Obtém estatísticas gerais dos pedidos
    """
    if not pedidos_db:
        return {
            "total_pedidos": 0,
            "total_clientes": 0,
            "total_produtos": 0,
            "total_quantidade": 0,
            "total_a_produzir": 0
        }
    
    clientes = set(p.cliente for p in pedidos_db)
    produtos = set(p.produto for p in pedidos_db)
    
    total_quantidade = sum(p.qtd_pedido for p in pedidos_db if p.qtd_pedido)
    total_a_produzir = sum(p.saldo_a_prod for p in pedidos_db if p.saldo_a_prod)
    
    return {
        "total_pedidos": len(pedidos_db),
        "total_clientes": len(clientes),
        "total_produtos": len(produtos),
        "total_quantidade": total_quantidade,
        "total_a_produzir": total_a_produzir
    }
