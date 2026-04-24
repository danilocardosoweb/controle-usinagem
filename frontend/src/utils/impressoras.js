// Utilitários para configuração de impressoras

export const getConfiguracaoImpressoras = () => {
  try {
    const saved = localStorage.getItem('configuracao_impressoras')
    return saved ? JSON.parse(saved) : {
      termica: {
        nome: 'Impressora Térmica',
        caminho: '\\\\192.168.1.100\\Zebra_ZT230',
        ip: '192.168.1.100',
        porta: '9100',
        ativa: true
      },
      comum: {
        nome: 'Impressora Comum',
        caminho: '\\\\192.168.1.101\\HP_LaserJet',
        ip: '192.168.1.101',
        porta: '9100',
        ativa: true
      }
    }
  } catch (error) {
    console.error('Erro ao carregar configurações de impressoras:', error)
    return {
      termica: { nome: 'Impressora Térmica', caminho: '', ip: '', porta: '9100', ativa: false },
      comum: { nome: 'Impressora Comum', caminho: '', ip: '', porta: '9100', ativa: false }
    }
  }
}

export const getImpressoraTermica = () => {
  const config = getConfiguracaoImpressoras()
  return config.termica
}

export const getImpressoraComum = () => {
  const config = getConfiguracaoImpressoras()
  return config.comum
}

export const isImpressoraAtiva = (tipo) => {
  const config = getConfiguracaoImpressoras()
  return config[tipo]?.ativa || false
}

export const getCaminhoImpressora = (tipo) => {
  const config = getConfiguracaoImpressoras()
  const impressora = config[tipo]
  
  if (!impressora || !impressora.ativa) {
    return null
  }
  
  // Priorizar caminho de rede se disponível
  if (impressora.caminho) {
    return impressora.caminho
  }
  
  // Fallback para IP:porta
  if (impressora.ip && impressora.porta) {
    return `${impressora.ip}:${impressora.porta}`
  }
  
  return null
}

export const validarConfiguracaoImpressora = (impressora) => {
  if (!impressora.nome) {
    return 'Nome da impressora é obrigatório'
  }
  
  if (!impressora.caminho && !impressora.ip) {
    return 'Caminho de rede ou IP é obrigatório'
  }
  
  if (impressora.ip && !impressora.porta) {
    return 'Porta é obrigatória quando IP é informado'
  }
  
  return null
}
