from supabase import create_client
from .config import settings

# Esta função será usada para conectar ao Supabase quando tivermos as credenciais
def get_supabase_client():
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        raise ValueError("SUPABASE_URL e SUPABASE_KEY devem ser configurados")
    
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

# Por enquanto, vamos usar um banco de dados simulado para desenvolvimento
fake_db = {
    "usuarios": {},
    "maquinas": {},
    "carteira_encomendas": {},
    "apontamentos_producao": {},
    "motivos_parada": {},
    "apontamentos_parada": {}
}
