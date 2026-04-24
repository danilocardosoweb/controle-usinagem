import React, { useRef, useMemo, useEffect, Suspense, useCallback } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, ContactShadows, Line, Billboard, Text, Environment } from '@react-three/drei'
import * as THREE from 'three'

// ─── CENÁRIO MODERNO (Estúdio) ───────────────────────────────────────────────
function AmbienteModerno() {
  return (
    <>
      {/* Iluminação suave e reflexos realistas */}
      <Environment preset="city" />
      <ambientLight intensity={0.5} />
      
      {/* Luz Direcionada Suave */}
      <spotLight 
        position={[6, 12, 6]} 
        angle={0.4} 
        penumbra={0.8} 
        intensity={2.5} 
        castShadow 
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-4, 4, -4]} intensity={1.2} color="#38bdf8" distance={20} />

      {/* Chão Principal (Estilo Epóxi Escuro/Polido) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial 
          color="#0f172a" 
          roughness={0.15} 
          metalness={0.2} 
          envMapIntensity={0.6} 
        />
      </mesh>

      {/* Pedestal / Área de Montagem Demarcada */}
      <group position={[0, 0, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.003, 0]} receiveShadow>
          <circleGeometry args={[2.5, 64]} />
          <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.1} />
        </mesh>
        
        {/* Anel Luminoso Azul Cyan Demarcando o Espaço */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]}>
          <ringGeometry args={[2.5, 2.52, 64]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.5} />
        </mesh>
      </group>

      {/* Pilaretes de Segurança Industriais (Bollards) */}
      {[
        [-1.8, 1.8], [1.8, 1.8], [-1.8, -1.8], [1.8, -1.8]
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.35, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, 0.7, 16]} />
            <meshStandardMaterial color="#facc15" roughness={0.3} />
          </mesh>
          {/* Faixas Pretas */}
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.062, 0.062, 0.1, 16]} />
            <meshStandardMaterial color="#0f172a" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.25, 0]}>
            <cylinderGeometry args={[0.062, 0.062, 0.08, 16]} />
            <meshStandardMaterial color="#0f172a" roughness={0.8} />
          </mesh>
          {/* Base */}
          <mesh position={[0, 0.02, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.1, 0.1, 0.04, 16]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
        </group>
      ))}

      {/* Grid Minimalista dentro da base */}
      <gridHelper args={[5, 10, "#334155", "#1e293b"]} position={[0, 0.001, 0]} />

    </>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const hexToColor = (hex) => new THREE.Color(hex || '#d97706')

// Materiais de madeira compartilhados (criados uma vez)
const MAT_DECK = new THREE.MeshStandardMaterial({ color: '#C8902A', metalness: 0.05, roughness: 0.75 })
const MAT_VIGA = new THREE.MeshStandardMaterial({ color: '#7A5C14', metalness: 0.05, roughness: 0.85 })
const MAT_RIPA = new THREE.MeshStandardMaterial({ color: '#9B6E2A', metalness: 0.05, roughness: 0.65 })

const GAP_ENTRE_PACOTES = 0.010

const normalizeIndices = (lista) => {
  if (!Array.isArray(lista)) return []
  const set = new Set()
  lista.forEach((valor) => {
    const idx = Number(valor)
    if (Number.isFinite(idx) && idx >= 0) {
      set.add(idx)
    }
  })
  return Array.from(set).sort((a, b) => a - b)
}

export function calcularLayoutColunas({ pacotesPorCamada = 1, orientacaoPacote = 'longitudinal', pkLargX = 0, pkProfZ = 0, gap = GAP_ENTRE_PACOTES, colunasRotacionadas = [] }) {
  const n = Math.max(1, pacotesPorCamada)
  const defaultOrient = orientacaoPacote === 'transversal' ? 'transversal' : 'longitudinal'
  const axisDistrib = defaultOrient === 'transversal' ? 'z' : 'x'
  const toggled = normalizeIndices(colunasRotacionadas)

  const columns = Array.from({ length: n }, (_, idx) => {
    const isToggled = toggled.includes(idx)
    const orientation = isToggled
      ? (defaultOrient === 'transversal' ? 'longitudinal' : 'transversal')
      : defaultOrient
    // Rotacao horizontal (X <-> Z): comportamento original
    const baseWidthX = orientation === 'transversal' ? pkProfZ : pkLargX
    const baseDepthZ = orientation === 'transversal' ? pkLargX : pkProfZ
    const widthX = baseWidthX
    const depthZ = baseDepthZ
    return { index: idx, orientation, widthX, depthZ }
  })

  const sizeAlongAxis = columns.map(col => axisDistrib === 'x' ? col.widthX : col.depthZ)
  const axisSpan = sizeAlongAxis.reduce((acc, size, idx) => acc + size + (idx > 0 ? gap : 0), 0)
  let cursor = -axisSpan / 2
  const centersAxis = []

  sizeAlongAxis.forEach((size) => {
    const center = cursor + size / 2
    centersAxis.push(center)
    cursor = center + size / 2 + gap
  })

  columns.forEach((col, idx) => {
    col.centerX = axisDistrib === 'x' ? centersAxis[idx] : 0
    col.centerZ = axisDistrib === 'x' ? 0 : centersAxis[idx]
  })

  const widthXList = columns.map(col => col.widthX)
  const depthZList = columns.map(col => col.depthZ)

  const spanX = axisDistrib === 'x'
    ? axisSpan
    : Math.max(...widthXList, 0)

  const spanZ = axisDistrib === 'x'
    ? Math.max(...depthZList, 0)
    : axisSpan

  return {
    columns,
    spanX,
    spanZ,
    axisDistrib,
    toggled,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONVENÇÃO DE EIXOS
//   X → largura  (lado a lado dos pacotes na camada)
//   Y → altura   (camadas empilhadas)
//   Z → comprimento do material (profundidade, ao longo do palete)
// ═══════════════════════════════════════════════════════════════════════════════

// Configurações de paletes pré-definidos (em metros)
export const PALETE_CONFIGS = {
  'PBR_1000x1000':  { largX: 1.0,  profZ: 1.0,  nTab: 7, label: 'PBR 1000×1000 mm' },
  'PBR_1200x1200':  { largX: 1.2,  profZ: 1.2,  nTab: 9, label: 'PBR 1200×1200 mm' },
  'PBR_1200x800':   { largX: 1.2,  profZ: 0.8,  nTab: 7, label: 'PBR 1200×800 mm' },
  'PBR_1200x1000': { largX: 1.2,  profZ: 1.0,  nTab: 7, label: 'PBR 1200×1000 mm' },
}

// ─── BASE DO PALETE PBR ────────────────────────────────────────────────────────
// 3 vigas (correm em Z) + N tábuas de deck (correm em X)
function BasePalete({ tipoPalete = 'PBR_1200x1000' }) {
  const altViga  = 0.090
  const altTabua = 0.022
  const config   = PALETE_CONFIGS[tipoPalete] || PALETE_CONFIGS['PBR_1200x1000']
  const { largX, profZ, nTab } = config
  const tabZ     = profZ / nTab - 0.008

  return (
    <group>
      {/* 3 vigas principais */}
      {[-largX * 0.38, 0, largX * 0.38].map((vx, i) => (
        <mesh key={i} position={[vx, altViga / 2, 0]} castShadow receiveShadow material={MAT_VIGA}>
          <boxGeometry args={[0.095, altViga, profZ]} />
        </mesh>
      ))}
      {/* Tábuas de deck */}
      {Array.from({ length: nTab }, (_, i) => {
        const span = profZ - tabZ
        const tz   = (i / (nTab - 1)) * span - span / 2
        return (
          <mesh key={i} position={[0, altViga + altTabua / 2, tz]} castShadow receiveShadow material={MAT_DECK}>
            <boxGeometry args={[largX, altTabua, tabZ]} />
          </mesh>
        )
      })}
    </group>
  )
}

// ─── RIPA ─────────────────────────────────────────────────────────────────────
function Ripa({ position, w, h, d }) {
  return (
    <mesh position={position} castShadow receiveShadow material={MAT_RIPA}>
      <boxGeometry args={[w, h, d]} />
    </mesh>
  )
}

function LateralRipaInteractive({
  position,
  w,
  h,
  d,
  rotation = [0, 0, 0],
  spanZ,
  onChangeMargem,
}) {
  const meshRef = useRef(null)
  const draggingRef = useRef(false)

  const updateMargemFromEvent = useCallback((event) => {
    if (!onChangeMargem || !spanZ) return
    const half = spanZ / 2
    const raw = half - Math.abs(event.point.z)
    const clamped = THREE.MathUtils.clamp(raw, 0, Math.max(0, half - 0.005))
    onChangeMargem(Math.round(clamped * 1000))
  }, [onChangeMargem, spanZ])

  const setCursor = useCallback((value) => {
    if (typeof document !== 'undefined') {
      document.body.style.cursor = value
    }
  }, [])

  const handlePointerDown = useCallback((event) => {
    if (!onChangeMargem) return
    event.stopPropagation()
    draggingRef.current = true
    event.target.setPointerCapture?.(event.pointerId)
    setCursor('ew-resize')
    updateMargemFromEvent(event)
  }, [onChangeMargem, setCursor, updateMargemFromEvent])

  const handlePointerMove = useCallback((event) => {
    if (!draggingRef.current) return
    event.stopPropagation()
    updateMargemFromEvent(event)
  }, [updateMargemFromEvent])

  const finishDrag = useCallback((event) => {
    if (!draggingRef.current) return
    event.stopPropagation()
    draggingRef.current = false
    event.target.releasePointerCapture?.(event.pointerId)
    setCursor('auto')
  }, [setCursor])

  const handlePointerOver = useCallback(() => {
    if (!draggingRef.current) setCursor('ew-resize')
  }, [setCursor])

  const handlePointerOut = useCallback(() => {
    if (!draggingRef.current) setCursor('auto')
  }, [setCursor])

  const handleDoubleClick = useCallback((event) => {
    if (!onChangeMargem) return
    event.stopPropagation()
    updateMargemFromEvent(event)
  }, [onChangeMargem, updateMargemFromEvent])

  useEffect(() => () => setCursor('auto'), [setCursor])

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={rotation}
      castShadow
      receiveShadow
      material={MAT_RIPA}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerLeave={handlePointerOut}
      onPointerOver={handlePointerOver}
      onDoubleClick={handleDoubleClick}
    >
      <boxGeometry args={[w, h, d]} />
    </mesh>
  )
}

// ─── PACOTE (caixa sólida representando o feixe de perfis) ────────────────────
// largX = largura do pacote em X
// altY  = altura do pacote em Y
// profZ = comprimento do material em Z
function Pacote({ position, largX, altY, profZ, cor }) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color:     hexToColor(cor),
    metalness: 0.72,
    roughness: 0.22,
    envMapIntensity: 1.3,
  }), [cor])

  return (
    <mesh position={position} castShadow receiveShadow material={mat}>
      <boxGeometry args={[largX, altY, profZ]} />
    </mesh>
  )
}

// ─── CENA COMPLETA ─────────────────────────────────────────────────────────────
//
// RIPAS TRANSVERSAIS (entre camadas / topo):
//   Ficam PERPENDICULARES aos pacotes → correm ao longo do eixo X (largura)
//   Parâmetros: ripaAlt=altura, ripaLarg=espessura em Z, ripaComp=comprimento em X
//   São posicionadas em N pontos ao longo de Z (profundidade do palete)
//
// RIPAS LATERAIS VERTICAIS:
//   Ficam nas faces frontal e traseira (±Z) do palete, em pé, cobrindo toda a altura
//   Parâmetros: ripaVertAlt=espessura em Y de cada tábua, ripaVertLarg=largura em X,
//               ripaVertComp=comprimento em Z (espessura total da tábua lateral)
//
// ─── helper: ripa transversal em N pontos ao longo de Z ──────────────────────
function RipasTransversais({ yPos, ripaAlt, ripaLarg, comprimento, posicoes, eixoLong = 'z' }) {
  const alongZ = eixoLong === 'z'
  return posicoes.map((pos, ri) => (
    <Ripa
      key={ri}
      position={alongZ ? [0, yPos, pos] : [pos, yPos, 0]}
      w={alongZ ? comprimento : ripaLarg}
      h={ripaAlt}
      d={alongZ ? ripaLarg : comprimento}
    />
  ))
}

function PaleteCompleto({
  pacotesPorCamada,
  numBlocos,
  camadasPorBloco,
  pkLargX, pkAltY, pkProfZ,
  // Ripas entre camadas
  ripaEntreBlocos,
  numRipasPorCamada,
  ripasEntrePosicao,     // uniforme | centro | extremos | manual
  ripasEntreOffsetMm,    // offset em mm
  ripasEntreManual,      // modo manual
  ripasEntrePosicoes,    // JSON: posições específicas
  ripaAlt,
  ripaLarg,
  ripaComprimento,       // comprimento da ripa transversal
  ripaTopo,
  // Ripas laterais verticais: N ripas em pé nas faces ±X
  ripaVertical,
  numRipasLateral,
  ripasLatPosicao,       // uniforme | cantos | centro | manual
  ripasLatOffsetMm,      // offset em mm
  ripasLatManual,        // modo manual
  ripasLatPosicoes,      // JSON: posições específicas
  ripasLatMargemMm = 0,
  colunasRotacionadas,
  ripaVertLarg,          // espessura da ripa lateral no eixo X (largura)
  ripaVertComp,          // espessura da ripa lateral no eixo Z (comprimento)
  ripaVertAltura = 1080, // altura/comprimento da ripa lateral no eixo Y
  // Tipo de palete base
  tipoPalete = 'PBR_1200x1000',
  orientacaoPacote = 'longitudinal', // longitudinal | transversal
  cor,
  onChangeRipaMargemInteractive,
  onToggleColunaOrientacao,
  colunasLayout,
}) {
  const altBase    = 0.090 + 0.022
  const isTransv   = orientacaoPacote === 'transversal'
  const pacotesPorCamadaSafe = Math.max(1, pacotesPorCamada)
  const layout = colunasLayout || calcularLayoutColunas({
    pacotesPorCamada: pacotesPorCamadaSafe,
    orientacaoPacote,
    pkLargX,
    pkProfZ,
    gap: GAP_ENTRE_PACOTES,
    colunasRotacionadas,
  })
  const { columns, spanX, spanZ } = layout
  const compRipaX  = spanX + 0.01
  const margemLat = Math.min(Math.max(0, (ripasLatMargemMm || 0) / 1000), Math.max(0, spanZ / 2 - 0.01))
  const spanUtilZ = Math.max(0.01, spanZ - margemLat * 2)

  // Cada camada de pacotes tem altura pkAltY (sem ripa entre camadas individuais)
  const altCamada  = pkAltY + 0.004   // pequeno gap entre camadas do mesmo bloco
  // Cada bloco = camadasPorBloco × altCamada
  const altBloco   = camadasPorBloco * altCamada
  // Entre blocos fica a ripa transversal
  const altRipaBloco = ripaEntreBlocos ? ripaAlt + 0.004 : 0.006
  // Altura total de um bloco + sua ripa inferior
  const altBlocoTotal = altRipaBloco + altBloco

  // Altura total empilhada para ripas verticais
  const altEmpilhado = numBlocos * altBlocoTotal + (ripaTopo ? ripaAlt + 0.004 : 0)
  const yEmpMeio     = altBase + altEmpilhado / 2

  // Helper para calcular posições Z das ripas entre camadas
  function calcularPosicoesRipasEntre() {
    const offsetM = (ripasEntreOffsetMm || 0) / 1000  // converter mm para metros

    // Modo manual: usar posições específicas do JSON
    if (ripasEntreManual && ripasEntrePosicoes) {
      try {
        const posicoes = JSON.parse(ripasEntrePosicoes)
        if (Array.isArray(posicoes) && posicoes.length > 0) {
          return posicoes.map(p => (p / 1000) - spanZ / 2 + offsetM)
        }
      } catch (e) {
        console.warn('Erro ao parsear posições manuais das ripas entre:', e)
      }
    }

    const n = Math.max(1, numRipasPorCamada)

    // Modo extremos: ripas nas pontas
    if (ripasEntrePosicao === 'extremos') {
      if (n === 1) return [offsetM]
      if (n === 2) return [-spanZ / 2 + offsetM, spanZ / 2 + offsetM]
      // Para mais ripas, distribuir entre extremos
      return Array.from({ length: n }, (_, i) =>
        (i / (n - 1)) * spanZ - spanZ / 2 + offsetM
      )
    }

    // Modo centro: ripas centralizadas
    if (ripasEntrePosicao === 'centro') {
      const centroInicio = -((n - 1) * 0.15) / 2  // espaçamento de 150mm entre ripas
      return Array.from({ length: n }, (_, i) => centroInicio + i * 0.15 + offsetM)
    }

    // Padrão: uniforme (distribuído ao longo da profundidade)
    return n <= 1
      ? [offsetM]
      : Array.from({ length: n }, (_, i) =>
          -spanUtilZ / 2 + (i / (n - 1)) * spanUtilZ + offsetM
        )
  }

  // Helper para calcular posições Z das ripas laterais (quadro)
  function calcularPosicoesRipasLateral() {
    // Modo manual: usar posições específicas
    if (ripasLatManual && ripasLatPosicoes) {
      try {
        const posicoes = JSON.parse(ripasLatPosicoes)
        if (Array.isArray(posicoes) && posicoes.length > 0) {
          const offsetM = (ripasLatOffsetMm || 0) / 1000
          return posicoes.map(p => (p / 1000) - spanZ / 2 + offsetM)
        }
      } catch (e) {
        console.warn('Erro ao parsear posições manuais das ripas laterais:', e)
      }
    }

    const offsetM = (ripasLatOffsetMm || 0) / 1000
    const n = Math.max(2, numRipasLateral)  // mínimo 2 para formar quadro

    // Modo cantos: ripas nos extremos + intermediárias distribuídas entre eles
    if (ripasLatPosicao === 'cantos') {
      if (n === 1) return [offsetM]
      if (n === 2) return [(-spanUtilZ / 2 + 0.02) + offsetM, (spanUtilZ / 2 - 0.02) + offsetM]
      // n >= 3: extremos fixos + (n-2) ripas distribuídas entre eles
      const start = -spanUtilZ / 2 + 0.02
      const end   =  spanUtilZ / 2 - 0.02
      return Array.from({ length: n }, (_, i) => (start + (i / (n - 1)) * (end - start)) + offsetM)
    }

    // Modo centro: ripas centralizadas
    if (ripasLatPosicao === 'centro') {
      if (n === 2) return [-0.10 + offsetM, 0.10 + offsetM]
      const espacamento = 0.20
      const inicio = -((n - 1) * espacamento) / 2
      return Array.from({ length: n }, (_, i) => inicio + i * espacamento + offsetM)
    }

    // Padrão: uniforme
    return n <= 1
      ? [offsetM]
      : Array.from({ length: n }, (_, i) =>
          -spanUtilZ / 2 + (i / (n - 1)) * spanUtilZ + offsetM
        )
  }

  // Calcular todas as posições
  const posZRipas = calcularPosicoesRipasEntre()
  const posXRipas = isTransv
    ? posZRipas.map((z) => z) // reutilizamos distribuições porém aplicadas no eixo X
    : null
  const posZLat = calcularPosicoesRipasLateral()

  // (paleteCfg não é mais necessário; usamos totalLargX e pkProfZ diretamente)

  return (
    <group>
      {/* ── BASE DO PALETE ── */}
      <BasePalete tipoPalete={tipoPalete} />

      {/* ── BLOCOS ── */}
      {Array.from({ length: numBlocos }, (_, bi) => {
        // Y base do bloco (ripas ficam embaixo, pacotes empilham acima)
        const yBlocoBase = altBase + bi * altBlocoTotal

        return (
          <React.Fragment key={bi}>
            {/* Ripa transversal ABAIXO do bloco (exceto no primeiro bloco se não tiver ripa antes) */}
            {ripaEntreBlocos && (
              <RipasTransversais
                yPos={yBlocoBase + ripaAlt / 2}
                ripaAlt={ripaAlt}
                ripaLarg={ripaLarg}
                comprimento={isTransv ? spanZ : compRipaX}
                posicoes={isTransv ? posXRipas : posZRipas}
                eixoLong={isTransv ? 'x' : 'z'}
              />
            )}

            {/* Camadas de pacotes dentro do bloco */}
            {Array.from({ length: camadasPorBloco }, (_, ci) => {
              const yBase = yBlocoBase + altRipaBloco + ci * altCamada
              const yPk   = yBase + pkAltY / 2
              return (
                <React.Fragment key={ci}>
                  {Array.from({ length: pacotesPorCamadaSafe }, (_, pi) => {
                    const coluna = columns[pi] || columns[0]
                    const xPk = coluna?.centerX ?? 0
                    const zPk = coluna?.centerZ ?? 0
                    const largAtual = coluna?.widthX ?? (isTransv ? pkProfZ : pkLargX)
                    const profAtual = coluna?.depthZ ?? (isTransv ? pkLargX : pkProfZ)
                    return (
                      <Pacote
                        key={pi}
                        position={[xPk, yPk, zPk]}
                        largX={largAtual}
                        altY={pkAltY}
                        profZ={profAtual}
                        cor={cor}
                      />
                    )
                  })}
                </React.Fragment>
              )
            })}
          </React.Fragment>
        )
      })}

      {onToggleColunaOrientacao && columns.map((col) => (
        <mesh
          key={`col-hit-${col.index}`}
          position={[col.centerX, yEmpMeio, col.centerZ]}
          onDoubleClick={(event) => {
            event.stopPropagation()
            onToggleColunaOrientacao(col.index)
          }}
          onPointerOver={() => { document.body.style.cursor = 'pointer' }}
          onPointerOut={() => { document.body.style.cursor = 'auto' }}
        >
          <boxGeometry args={[col.widthX || 0.01, altEmpilhado, col.depthZ || 0.01]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}

      {/* ── Ripas TRANSVERSAIS de TOPO ── */}
      {ripaTopo && (() => {
        const yUltimo = altBase + numBlocos * altBlocoTotal
        return (
          <RipasTransversais
            yPos={yUltimo + ripaAlt / 2}
            ripaAlt={ripaAlt}
            ripaLarg={ripaLarg}
            comprimento={isTransv ? spanZ : compRipaX}
            posicoes={isTransv ? posXRipas : posZRipas}
            eixoLong={isTransv ? 'x' : 'z'}
          />
        )
      })()}

      {/* ── Ripas LATERAIS VERTICAIS: N ripas em pé nas faces ±X ──
          Formam um quadro na lateral do palete para amarração da fita pet.
          Cada ripa é vertical (corre em Y), com largura em Z (profundidade).
          w = ripaVertLarg (espessura em X), h = ripaVertAltura, d = ripaVertComp */}
      {ripaVertical && (() => {
        const clearance = 0.004
        const larguraRipa = ripaVertLarg
        const comprimentoRipa = ripaVertComp
        const alturaRipa = ripaVertAltura // já em metros

        const yRipaMeio = altBase + alturaRipa / 2

        if (isTransv) {
          const halfOutside = spanZ / 2 + comprimentoRipa / 2 + clearance
          return posZRipas.flatMap((rx, ri) => [
            <LateralRipaInteractive
              key={`lat-front-${ri}`}
              axis="z"
              sentido="transversal"
              position={[rx,  yRipaMeio, -halfOutside]}
              w={larguraRipa}
              h={alturaRipa}
              d={comprimentoRipa}
              rotation={[0, Math.PI / 2, 0]}
              margemAtual={margemLat}
              spanZ={spanZ}
              onChangeMargem={onChangeRipaMargemInteractive}
            />,
            <LateralRipaInteractive
              key={`lat-back-${ri}`}
              axis="z"
              sentido="transversal"
              position={[rx,  yRipaMeio,  halfOutside]}
              w={larguraRipa}
              h={alturaRipa}
              d={comprimentoRipa}
              rotation={[0, Math.PI / 2, 0]}
              margemAtual={margemLat}
              spanZ={spanZ}
              onChangeMargem={onChangeRipaMargemInteractive}
            />,
          ])
        }

        const halfOutside = spanX / 2 + larguraRipa / 2 + clearance
        return posZLat.flatMap((rz, ri) => [
          <LateralRipaInteractive
            key={`lat-l-${ri}`}
            axis="x"
            sentido="longitudinal"
            position={[-halfOutside, yRipaMeio, rz]}
            w={larguraRipa}
            h={alturaRipa}
            d={comprimentoRipa}
            margemAtual={margemLat}
            spanZ={spanZ}
            onChangeMargem={onChangeRipaMargemInteractive}
          />,
          <LateralRipaInteractive
            key={`lat-r-${ri}`}
            axis="x"
            sentido="longitudinal"
            position={[ halfOutside, yRipaMeio, rz]}
            w={larguraRipa}
            h={alturaRipa}
            d={comprimentoRipa}
            margemAtual={margemLat}
            spanZ={spanZ}
            onChangeMargem={onChangeRipaMargemInteractive}
          />,
        ])
      })()}
    </group>
  )
}

// ─── COMPONENTE: LINHA DE COTA 3D ─────────────────────────────────────────────
function Cota3D({ inicio, fim, cor = '#34d399', label = '', offset = 0.05, direcao = 'horizontal' }) {
  const [x1, y1, z1] = inicio
  const [x2, y2, z2] = fim

  // Calcular pontos com offset
  let p1, p2, pLabel
  if (direcao === 'horizontal') {
    // Cota horizontal (largura em X)
    p1 = [x1, y1 + offset, z1 + offset]
    p2 = [x2, y2 + offset, z2 + offset]
    pLabel = [(x1 + x2) / 2, y1 + offset + 0.03, z1 + offset]
  } else if (direcao === 'vertical') {
    // Cota vertical (altura em Y)
    p1 = [x1 - offset, y1, z1 + offset]
    p2 = [x2 - offset, y2, z2 + offset]
    pLabel = [x1 - offset - 0.05, (y1 + y2) / 2, z1 + offset]
  } else {
    // Cota profundidade (em Z)
    p1 = [x1 + offset, y1 + offset, z1]
    p2 = [x2 + offset, y2 + offset, z2]
    pLabel = [x1 + offset, y1 + offset + 0.03, (z1 + z2) / 2]
  }

  return (
    <group>
      {/* Linha principal */}
      <Line points={[p1, p2]} color={cor} lineWidth={2} />
      {/* Extremidades (pequenas perpendiculares) */}
      <Line
        points={direcao === 'horizontal'
          ? [[p1[0], p1[1] - 0.015, p1[2]], [p1[0], p1[1] + 0.015, p1[2]]]
          : direcao === 'vertical'
            ? [[p1[0] - 0.015, p1[1], p1[2]], [p1[0] + 0.015, p1[1], p1[2]]]
            : [[p1[0], p1[1] - 0.015, p1[2]], [p1[0], p1[1] + 0.015, p1[2]]]
        }
        color={cor}
        lineWidth={2}
      />
      <Line
        points={direcao === 'horizontal'
          ? [[p2[0], p2[1] - 0.015, p2[2]], [p2[0], p2[1] + 0.015, p2[2]]]
          : direcao === 'vertical'
            ? [[p2[0] - 0.015, p2[1], p2[2]], [p2[0] + 0.015, p2[1], p2[2]]]
            : [[p2[0], p2[1] - 0.015, p2[2]], [p2[0], p2[1] + 0.015, p2[2]]]
        }
        color={cor}
        lineWidth={2}
      />
      {/* Label */}
      <Billboard position={pLabel}>
        <Text
          fontSize={0.035}
          color={cor}
          anchorX="center"
          anchorY="center"
        >
          {label}
        </Text>
      </Billboard>
    </group>
  )
}

// ─── COMPONENTE: MEDIDOR TOTAL DO PALETE ──────────────────────────────────────
function MedidorTotal({ largX, altY, profZ, altBase, ripaVertical, ripaVertComp, ripaVertLarg, ripaVertAltura }) {
  const margemRipas = ripaVertical ? Math.max(ripaVertComp, ripaVertLarg) + 0.02 : 0

  // Dimensões totais em metros
  const totalLarg = largX + margemRipas * 2
  const totalAlt = altY + altBase   // chão (Y=0) → topo dos pacotes
  const totalProf = profZ + margemRipas * 2

  // Dimensões em mm para display
  const largMm   = Math.round(totalLarg * 1000)
  const altMm    = Math.round(totalAlt * 1000)          // chão → topo (laranja)
  const altPacMm = Math.round(altY * 1000)              // só pacotes empilhados (azul)
  const profMm   = Math.round(totalProf * 1000)

  // Cubagem em m³
  const cubagem = (totalLarg * totalAlt * totalProf).toFixed(3)

  return (
    <>
      {/* Cota Largura (X) - na base */}
      <Cota3D
        inicio={[-largX / 2, 0, profZ / 2 + margemRipas + 0.02]}
        fim={[largX / 2, 0, profZ / 2 + margemRipas + 0.02]}
        label={`Larg: ${largMm}mm`}
        offset={-0.08}
        direcao="horizontal"
        cor="#34d399"
      />

      {/* Cota Altura dos pacotes (altBase → topo) - lateral esquerda - azul */}
      <Cota3D
        inicio={[-largX / 2 - margemRipas - 0.02, altBase, profZ / 2]}
        fim={[-largX / 2 - margemRipas - 0.02, totalAlt, profZ / 2]}
        label={`Amarrado: ${altPacMm}mm`}
        offset={0.08}
        direcao="vertical"
        cor="#60a5fa"
      />

      {/* Cota Altura Total (chão → topo) - lateral direita - laranja - sempre visível */}
      <Cota3D
        inicio={[largX / 2 + margemRipas + 0.02, 0, profZ / 2]}
        fim={[largX / 2 + margemRipas + 0.02, totalAlt, profZ / 2]}
        label={`Base→Topo: ${altMm}mm`}
        offset={0.08}
        direcao="vertical"
        cor="#f97316"
      />

      {/* Cota Profundidade/Comprimento (Z) - na frente superior */}
      <Cota3D
        inicio={[-largX / 2, totalAlt + 0.02, -profZ / 2]}
        fim={[-largX / 2, totalAlt + 0.02, profZ / 2]}
        label={`Comp: ${profMm}mm`}
        offset={0.05}
        direcao="profundidade"
        cor="#fbbf24"
      />

      {/* Label de cubagem */}
      <Billboard position={[0, totalAlt + 0.12, 0]}>
        <Text
          fontSize={0.04}
          color="#f472b6"
          anchorX="center"
          anchorY="center"
        >
          Cubagem: {cubagem} m³
        </Text>
      </Billboard>
    </>
  )
}

// Densidade da madeira de pinus/eucalipto (kg/m³) usada para ripas
const DENSIDADE_MADEIRA_KG_M3 = 600
// Peso aproximado do palete base por tipo (kg)
const PESO_BASE_PALETE = { PBR_1200x1000: 25, PBR_1000x1000: 22, CHEP_1200x1000: 30, default: 25 }

// ─── OVERLAY INFO ─────────────────────────────────────────────────────────────
function InfoOverlay({ pacotesPorCamada, numBlocos, camadasPorBloco, pkLargMm, pkAltMm, pkProfMm, cor, totalLargMm, totalAltMm, totalProfMm, cubagem, ripaVertical, ripaAlturaMm,
  ripaEntreBlocos, numRipasPorCamada, ripaTopo, numRipasLateral, ripaAltMm, ripaLargMm, ripaCompMm, ripaVertCompMm, ripaVertLargMm,
  pesoPacoteKg, tipoPalete }) {
  const totalCamadas = numBlocos * camadasPorBloco
  const totalPacotes = pacotesPorCamada * totalCamadas

  // Ripas entre camadas: (num_ripas × num_interfaces) — cada bloco tem 1 camada base + 1 topo opcional
  const numInterfacesEntreBloco = ripaEntreBlocos ? numBlocos : 0
  const numRipasTopo = ripaTopo ? numRipasPorCamada : 0
  const totalRipasEntre = (numRipasPorCamada * numInterfacesEntreBloco) + numRipasTopo
  const compRipasEntreMm = ripaCompMm

  // Ripas laterais verticais: numRipasLateral × 2 lados (frente e trás)
  const totalRipasLateral = ripaVertical ? numRipasLateral * 2 : 0
  const compRipasLateralMm = ripaAlturaMm

  // ── Estimativa de peso ──
  const temPeso = pesoPacoteKg > 0
  const pesoPacotesKg = temPeso ? totalPacotes * pesoPacoteKg : null

  // Peso das ripas entre camadas: volume (m³) × densidade
  const pesoRipasEntreKg = totalRipasEntre > 0
    ? totalRipasEntre * (ripaLargMm / 1000) * (ripaAltMm / 1000) * (compRipasEntreMm / 1000) * DENSIDADE_MADEIRA_KG_M3
    : 0

  // Peso das ripas laterais: volume × densidade
  const pesoRipasLatKg = totalRipasLateral > 0
    ? totalRipasLateral * (ripaVertLargMm / 1000) * (ripaVertCompMm / 1000) * (compRipasLateralMm / 1000) * DENSIDADE_MADEIRA_KG_M3
    : 0

  const pesoPaletBase = PESO_BASE_PALETE[tipoPalete] ?? PESO_BASE_PALETE.default
  const pesoTotalKg = temPeso
    ? pesoPacotesKg + pesoRipasEntreKg + pesoRipasLatKg + pesoPaletBase
    : null

  return (
    <div style={{
      position: 'absolute', bottom: 10, left: 10, zIndex: 10,
      background: 'rgba(0,0,0,0.75)', color: '#fff', backdropFilter: 'blur(6px)',
      borderRadius: 8, padding: '10px 14px', fontSize: 11, lineHeight: 1.8,
      pointerEvents: 'none', border: '1px solid rgba(255,255,255,0.15)',
      minWidth: 220,
    }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: '#fbbf24', marginBottom: 4, borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: 4 }}>
        📦 Montagem do Palete
      </div>

      {/* Dimensões Totais */}
      <div style={{ marginTop: 6, marginBottom: 8, padding: '6px 8px', background: 'rgba(52,211,153,0.15)', borderRadius: 6, border: '1px solid rgba(52,211,153,0.3)' }}>
        <div style={{ fontWeight: 700, fontSize: 11, color: '#34d399', marginBottom: 3 }}>📐 DIMENSÕES TOTAIS:</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
          <span>Largura: <b>{totalLargMm}mm</b></span>
          <span style={{ color: '#34d399' }}>X</span>
          <span>Altura: <b>{totalAltMm}mm</b></span>
          <span style={{ color: '#34d399' }}>X</span>
          <span>Prof: <b>{totalProfMm}mm</b></span>
        </div>
        {ripaVertical && totalAltMm > 0 && (
          <div style={{ marginTop: 4, fontSize: 10, color: '#f97316' }}>
            📏 <b>Altura Total: {totalAltMm}mm</b> (chão → topo)
          </div>
        )}
        <div style={{ marginTop: 4, textAlign: 'center', fontSize: 11, color: '#f472b6', fontWeight: 700 }}>
          🧊 Cubagem: {cubagem} m³
        </div>
      </div>

      <div>Pacote: <b>{pkLargMm}mm</b> × <b>{pkAltMm}mm</b> × <b>{pkProfMm}mm</b></div>
      <div>{pacotesPorCamada} pct/camada · {camadasPorBloco} cam/bloco · {numBlocos} blocos</div>
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', marginTop: 6, paddingTop: 6, fontWeight: 700 }}>
        Total: <span style={{ color: '#34d399' }}>{totalPacotes} pacotes</span> <span style={{ fontWeight: 400, fontSize: 10 }}>({totalCamadas} cam)</span>
      </div>

      {/* Estimativa de Peso */}
      <div style={{ marginTop: 8, padding: '6px 8px', background: pesoTotalKg ? 'rgba(99,102,241,0.15)' : 'rgba(100,116,139,0.1)', borderRadius: 6, border: pesoTotalKg ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(100,116,139,0.2)' }}>
        <div style={{ fontWeight: 700, fontSize: 11, color: pesoTotalKg ? '#a5b4fc' : '#94a3b8', marginBottom: pesoTotalKg ? 4 : 0 }}>
          ⚖️ PESO ESTIMADO:
        </div>
        {pesoTotalKg ? (
          <>
            <div style={{ fontSize: 10, marginBottom: 2 }}>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>Pacotes: </span>
              <b>{pesoPacotesKg.toFixed(1)} kg</b>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, marginLeft: 4 }}>({pesoPacoteKg} kg/un)</span>
            </div>
            {(pesoRipasEntreKg + pesoRipasLatKg) > 0 && (
              <div style={{ fontSize: 10, marginBottom: 2 }}>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Ripas: </span>
                <b>{(pesoRipasEntreKg + pesoRipasLatKg).toFixed(1)} kg</b>
              </div>
            )}
            <div style={{ fontSize: 10, marginBottom: 4 }}>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>Base palete: </span>
              <b>~{pesoPaletBase} kg</b>
            </div>
            <div style={{ borderTop: '1px solid rgba(99,102,241,0.3)', paddingTop: 4, fontWeight: 700, fontSize: 12, color: '#818cf8', textAlign: 'center' }}>
              ≈ {pesoTotalKg.toFixed(0)} kg total
            </div>
          </>
        ) : (
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
            Informe o peso por pacote na configuração para ver a estimativa.
          </div>
        )}
      </div>

      {/* Resumo de Ripas */}
      <div style={{ marginTop: 8, padding: '6px 8px', background: 'rgba(217,119,6,0.15)', borderRadius: 6, border: '1px solid rgba(217,119,6,0.35)' }}>
        <div style={{ fontWeight: 700, fontSize: 11, color: '#f59e0b', marginBottom: 4 }}>🪵 RIPAS NECESSÁRIAS:</div>
        {totalRipasLateral > 0 && (
          <div style={{ fontSize: 10, marginBottom: 2 }}>
            <span style={{ color: '#fb923c' }}>▸ Laterais: </span>
            <b>{totalRipasLateral} ripas</b>
            <span style={{ color: 'rgba(255,255,255,0.5)', marginLeft: 4 }}>{compRipasLateralMm}mm cada</span>
          </div>
        )}
        {totalRipasEntre > 0 && (
          <div style={{ fontSize: 10, marginBottom: 2 }}>
            <span style={{ color: '#fb923c' }}>▸ Entre camadas: </span>
            <b>{totalRipasEntre} ripas</b>
            <span style={{ color: 'rgba(255,255,255,0.5)', marginLeft: 4 }}>{compRipasEntreMm}mm cada</span>
          </div>
        )}
        <div style={{ marginTop: 4, fontSize: 10, color: '#34d399', fontWeight: 700 }}>
          Total: {totalRipasLateral + totalRipasEntre} ripas por palete
        </div>
      </div>

      <div style={{ marginTop: 4, fontSize: 9, opacity: 0.8 }}>
        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 1, background: cor, marginRight: 3 }} />
        Pacote
        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 1, background: '#9B6E2A', marginLeft: 8, marginRight: 3 }} />
        Ripa
      </div>
    </div>
  )
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
const PaleteVisualizacao3D = ({
  // Estrutura: pacotes × camadas × blocos
  pacotesPorCamada     = 3,
  camadasPorBloco      = 3,
  numBlocos            = 3,
  // Dimensões do PACOTE em mm (milímetros)
  larguraPacoteMm      = 300,
  alturaPacoteMm       = 100,
  profundidadePacoteMm = 6000,
  // Ripas transversais (entre blocos + topo)
  ripaEntreBlocos      = true,
  numRipasPorCamada    = 3,
  ripasEntrePosicao    = 'uniforme',    // uniforme | centro | extremos | manual
  ripasEntreOffsetMm   = 0,             // offset de ajuste fino em mm
  ripasEntreManual     = false,         // modo manual ativado
  ripasEntrePosicoes   = '',            // JSON: [z1, z2, ...] posições específicas
  ripaAlturaMm         = 30,
  ripaLarguraMm        = 50,
  ripaComprimentoMm    = 1200,          // comprimento da ripa transversal
  ripaTopo             = true,
  // Ripas laterais verticais (quadro)
  ripaVertical         = true,
  numRipasLateral      = 3,
  ripasLatPosicao      = 'uniforme',    // uniforme | cantos | centro | manual
  ripasLatOffsetMm     = 0,             // offset de ajuste fino em mm
  ripasLatManual       = false,         // modo manual ativado
  ripasLatPosicoes     = '',            // JSON: [z1, z2, ...] posições específicas
  ripasLatMargemMm     = 40,
  ripaVertLarguraMm    = 50,
  ripaVertCompMm       = 30,
  ripaVertAlturaMm     = 1080,
  // Tipo de palete base
  tipoPalete           = 'PBR_1200x1000',
  // Peso por pacote (kg) para estimativa de peso total
  pesoPacoteKg         = 0,
  // Orientação do material
  orientacaoPacote     = 'longitudinal', // longitudinal | transversal
  // Visual
  corPacote            = '#b0b8c1',
  mostrarCotas         = true,   // mostrar cotas de dimensão
  colunasRotacionadas  = [],
  onToggleColunaInteractive,
  // Props legadas (em cm para compatibilidade)
  numCamadas           = undefined,
  ripaEntreCamadas     = undefined,
  ripaComprimentoCm    = 100,
  ripaLateral          = false,
  tipoPerfil           = 'retangular',
  pecasPorPacote       = 1,
  // Props legadas de dimensões em cm
  larguraPacoteCm      = undefined,
  alturaPacoteCm       = undefined,
  profundidadePacoteCm = undefined,
  ripaAlturaCm         = undefined,
  ripaLarguraCm        = undefined,
  ripaVertLarguraCm    = undefined,
  ripaVertCompCm       = undefined,
  onChangeRipaMargemInteractive,
}) => {
  // Suporte legado: converter cm para mm se necessário
  const _larguraPacoteMm = larguraPacoteCm ? larguraPacoteCm * 10 : larguraPacoteMm
  const _alturaPacoteMm = alturaPacoteCm ? alturaPacoteCm * 10 : alturaPacoteMm
  const _profundidadePacoteMm = profundidadePacoteCm ? profundidadePacoteCm * 10 : profundidadePacoteMm
  const _ripaAlturaMm   = ripaAlturaCm   ? ripaAlturaCm   * 10 : ripaAlturaMm
  const _ripaLarguraMm = ripaLarguraCm ? ripaLarguraCm * 10 : ripaLarguraMm
  const _ripaComprimentoMm = ripaComprimentoCm ? ripaComprimentoCm * 10 : ripaComprimentoMm
  const _ripaVertLarguraMm = ripaVertLarguraCm ? ripaVertLarguraCm * 10 : ripaVertLarguraMm
  const _ripaVertCompMm = ripaVertCompCm ? ripaVertCompCm * 10 : ripaVertCompMm
  const _ripaVertAlturaMm = ripaVertAlturaMm

  // Suporte legado: se receber numCamadas sem camadasPorBloco/numBlocos
  const _camadasPorBloco = camadasPorBloco
  const _numBlocos       = numBlocos
  const _ripaEntreBlocos = ripaEntreBlocos ?? ripaEntreCamadas ?? true

  // Converte mm → metros (dividir por 1000)
  const pkLargX    = _larguraPacoteMm / 1000
  const pkAltY     = _alturaPacoteMm / 1000
  const pkProfZ    = _profundidadePacoteMm / 1000
  const ripaAlt    = _ripaAlturaMm / 1000
  const ripaLarg   = _ripaLarguraMm / 1000
  const ripaComprimentoM = _ripaComprimentoMm / 1000
  const ripaVertLarg = _ripaVertLarguraMm / 1000
  const ripaVertComp = _ripaVertCompMm / 1000
  const ripaVertAltura = _ripaVertAlturaMm / 1000

  // Cálculo de altTotal para a câmera
  const pacotesPorCamadaSafe = Math.max(1, pacotesPorCamada)
  const isTransv        = orientacaoPacote === 'transversal'
  const layoutColunas = useMemo(() => calcularLayoutColunas({
    pacotesPorCamada: pacotesPorCamadaSafe,
    orientacaoPacote,
    pkLargX,
    pkProfZ,
    gap: GAP_ENTRE_PACOTES,
    colunasRotacionadas,
  }), [pacotesPorCamadaSafe, orientacaoPacote, pkLargX, pkProfZ, colunasRotacionadas])
  const spanX           = layoutColunas.spanX
  const spanZ           = layoutColunas.spanZ
  const altCamada      = pkAltY + 0.004
  const altRipaBloco   = _ripaEntreBlocos ? ripaAlt + 0.004 : 0.006
  const altBlocoTotal  = altRipaBloco + _camadasPorBloco * altCamada
  const altEmpilhado   = _numBlocos * altBlocoTotal + (ripaTopo ? ripaAlt + 0.004 : 0)
  const altTotal       = 0.112 + altEmpilhado
  const cDist          = Math.max(spanX, altTotal, spanZ + (ripaVertical ? ripaVertComp * 2 : 0)) * 1.9
  const camPos         = [cDist * 0.85, cDist * 0.65, cDist * 1.05]
  const tgt            = [0, altTotal * 0.45, 0]
  const shadowSc       = Math.max(spanX, spanZ) * 2.8

  // Calcular dimensões totais do palete (incluindo ripas laterais)
  const margemRipas = ripaVertical ? Math.max(ripaVertComp, ripaVertLarg) + 0.02 : 0
  const totalLargM = spanX + margemRipas * 2
  const totalAltM = altTotal
  const totalProfM = spanZ + margemRipas * 2

  // Converter para mm e calcular cubagem
  const totalLargMm = Math.round(totalLargM * 1000)
  const totalAltMm = Math.round(totalAltM * 1000)
  const totalProfMm = Math.round(totalProfM * 1000)
  const cubagem = (totalLargM * totalAltM * totalProfM).toFixed(3)

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#020617' }}>
      <InfoOverlay
        pacotesPorCamada={pacotesPorCamada}
        numBlocos={_numBlocos}
        camadasPorBloco={_camadasPorBloco}
        pkLargMm={_larguraPacoteMm}
        pkAltMm={_alturaPacoteMm}
        pkProfMm={_profundidadePacoteMm}
        cor={corPacote}
        totalLargMm={totalLargMm}
        totalAltMm={totalAltMm}
        totalProfMm={totalProfMm}
        cubagem={cubagem}
        ripaVertical={ripaVertical}
        ripaAlturaMm={Math.round(ripaVertAltura * 1000)}
        ripaEntreBlocos={_ripaEntreBlocos}
        numRipasPorCamada={numRipasPorCamada}
        ripaTopo={ripaTopo}
        numRipasLateral={numRipasLateral}
        ripaAltMm={_ripaAlturaMm}
        ripaLargMm={_ripaLarguraMm}
        ripaCompMm={_ripaComprimentoMm}
        ripaVertCompMm={_ripaVertCompMm}
        ripaVertLargMm={_ripaVertLarguraMm}
        pesoPacoteKg={Number(pesoPacoteKg) || 0}
        tipoPalete={tipoPalete}
      />
      <div style={{
        position: 'absolute', top: 8, right: 10, zIndex: 10,
        fontSize: 10, color: 'rgba(255,255,255,0.4)',
        pointerEvents: 'none', textAlign: 'right', lineHeight: 1.7,
      }}>
        🖱 Arrastar → girar<br />⚲ Scroll → zoom<br />🖱² Dir → mover
      </div>

      <Canvas
        shadows
        camera={{ position: camPos, fov: 40, near: 0.005, far: 800 }}
        style={{ width: '100%', height: '100%' }}
        dpr={[1, 1.5]}
        performance={{ min: 0.5 }}
        gl={{ powerPreference: 'low-power', antialias: false }}
        onCreated={({ gl }) => {
          const canvas = gl.domElement
          canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault() })
          canvas.addEventListener('webglcontextrestored', () => { gl.forceContextRestore?.() })
        }}
      >
        <Suspense fallback={null}>
          <AmbienteModerno />
          
          <ContactShadows
            position={[0, -0.001, 0]} opacity={0.65}
            scale={shadowSc} blur={1.8} far={altTotal * 2}
          />

          <PaleteCompleto
            pacotesPorCamada={pacotesPorCamada}
            numBlocos={_numBlocos}
            camadasPorBloco={_camadasPorBloco}
            pkLargX={pkLargX} pkAltY={pkAltY} pkProfZ={pkProfZ}
            // Ripas entre camadas
            ripaEntreBlocos={_ripaEntreBlocos}
            numRipasPorCamada={numRipasPorCamada}
            ripasEntrePosicao={ripasEntrePosicao}
            ripasEntreOffsetMm={ripasEntreOffsetMm}
            ripasEntreManual={ripasEntreManual}
            ripasEntrePosicoes={ripasEntrePosicoes}
            ripaAlt={ripaAlt}
            ripaLarg={ripaLarg}
            ripaComprimento={ripaComprimentoM}
            ripaTopo={ripaTopo}
            // Ripas laterais
            ripaVertical={ripaVertical}
            numRipasLateral={numRipasLateral}
            ripasLatPosicao={ripasLatPosicao}
            ripasLatOffsetMm={ripasLatOffsetMm}
            ripasLatManual={ripasLatManual}
            ripasLatPosicoes={ripasLatPosicoes}
            ripasLatMargemMm={ripasLatMargemMm}
            colunasRotacionadas={colunasRotacionadas}
            ripaVertLarg={ripaVertLarg}
            ripaVertComp={ripaVertComp}
            ripaVertAltura={ripaVertAltura}
            // Visual
            tipoPalete={tipoPalete}
            orientacaoPacote={orientacaoPacote}
            cor={corPacote}
            onToggleColunaOrientacao={onToggleColunaInteractive}
            colunasLayout={layoutColunas}
            onChangeRipaMargemInteractive={onChangeRipaMargemInteractive}
          />

          {/* Medidor de dimensões totais com cotas - condicional */}
          {mostrarCotas && (
            <MedidorTotal
              largX={spanX}
              altY={altEmpilhado}
              profZ={spanZ}
              altBase={0.112}
              ripaVertical={ripaVertical}
              ripaVertComp={ripaVertComp}
              ripaVertLarg={ripaVertLarg}
              ripaVertAltura={ripaVertAltura}
            />
          )}
        </Suspense>

        <OrbitControls
          makeDefault enablePan enableZoom enableRotate
          minDistance={0.02} maxDistance={200} target={tgt}
        />
      </Canvas>
    </div>
  )
}

export default PaleteVisualizacao3D
