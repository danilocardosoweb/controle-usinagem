/**
 * Utilitários para geração de geometria de amarrados de perfis
 */

/**
 * Gera posições (x, y) para um amarrado de perfis
 * @param {Object} params - Parâmetros de geração
 * @param {string} params.tipo - 'circular' ou 'retangular'
 * @param {number} params.quantidade - Quantidade total de peças
 * @param {number} params.pecasPorLinha - Quantidade de peças por linha (opcional)
 * @param {number} params.largura - Largura ou diâmetro do perfil
 * @param {number} params.altura - Altura do perfil (apenas retangular)
 * @param {number} params.espacamento - Espaçamento entre perfis
 * @param {string} params.layout - 'grid' ou 'hexagonal' (hexagonal apenas para circular)
 * @returns {Object} { posicoes: [{x, y}], boundingBox: {width, height} }
 */
export const gerarPosicoesAmarrado = ({
  tipo = 'circular',
  quantidade = 10,
  pecasPorLinha = null,
  largura = 50,
  altura = 50,
  espacamento = 2,
  layout = 'hexagonal'
}) => {
  const posicoes = [];
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

  // Se não informar peças por linha, calcula automático (raiz quadrada)
  const colunasBase = pecasPorLinha || Math.ceil(Math.sqrt(quantidade));

  if (tipo === 'circular') {
    const diametro = largura;
    const dx = diametro + espacamento;
    const dy = dx * 0.866; // Altura do triângulo equilátero

    let count = 0;
    let linha = 0;

    while (count < quantidade) {
      const offsetX = (linha % 2 === 0) ? 0 : dx / 2;
      
      // Em layouts hexagonais industriais, linhas alternadas costumam ter uma peça a menos
      // para se encaixarem perfeitamente no vale da linha de baixo
      const colunasNestaLinha = (linha % 2 === 0) ? colunasBase : colunasBase - 1;

      for (let col = 0; col < colunasNestaLinha && count < quantidade; col++) {
        const x = col * dx + offsetX;
        const y = linha * dy;
        
        posicoes.push({ x, y });
        
        minX = Math.min(minX, x - diametro / 2);
        maxX = Math.max(maxX, x + diametro / 2);
        minY = Math.min(minY, y - diametro / 2);
        maxY = Math.max(maxY, y + diametro / 2);
        
        count++;
      }
      linha++;
    }
  } else {
    // Retangular - Grid padrão
    const dx = largura + espacamento;
    const dy = altura + espacamento;
    
    let count = 0;
    let linha = 0;

    while (count < quantidade) {
      for (let col = 0; col < colunasBase && count < quantidade; col++) {
        const x = col * dx;
        const y = linha * dy;
        
        posicoes.push({ x, y });
        
        minX = Math.min(minX, x - largura / 2);
        maxX = Math.max(maxX, x + largura / 2);
        minY = Math.min(minY, y - altura / 2);
        maxY = Math.max(maxY, y + altura / 2);
        
        count++;
      }
      linha++;
    }
  }

  // Centralização
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  const posicoesCentralizadas = posicoes.map(p => ({
    x: p.x - centerX,
    y: p.y - centerY
  }));

  // Cálculo simplificado do contorno para o filme plástico (Convex Hull)
  const contorno = calcularContorno(posicoesCentralizadas);

  return {
    posicoes: posicoesCentralizadas,
    contorno,
    boundingBox: {
      width: maxX - minX,
      height: maxY - minY
    }
  };
};

/**
 * Algoritmo de Convex Hull (Monotone Chain) para determinar o perímetro do amarrado
 */
function calcularContorno(pontos) {
  if (pontos.length <= 2) return pontos;

  const pts = [...pontos].sort((a, b) => a.x !== b.x ? a.x - b.x : a.y - b.y);
  
  const crossProduct = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

  const lower = [];
  for (let p of pts) {
    while (lower.length >= 2 && crossProduct(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && crossProduct(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

