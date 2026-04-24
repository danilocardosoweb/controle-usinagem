import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Edges, Environment, Text } from '@react-three/drei';
import * as THREE from 'three';
import { gerarPosicoesAmarrado } from '../utils/geometriaAmarrado';

const Cota = ({ p1, p2, label, offset = 0.1, color = '#f59e0b' }) => {
  const points = [new THREE.Vector3(...p1), new THREE.Vector3(...p2)];
  const midPoint = new THREE.Vector3().addVectors(points[0], points[1]).multiplyScalar(0.5);
  
  // Direção perpendicular para o offset
  const dir = new THREE.Vector3().subVectors(points[1], points[0]).normalize();
  const perp = new THREE.Vector3(-dir.y, dir.x, 0).multiplyScalar(offset);
  
  const linePoints = [
    points[0].clone().add(perp),
    points[1].clone().add(perp)
  ];

  return (
    <group>
      <line>
        <bufferGeometry attach="geometry" setFromPoints={linePoints} />
        <lineBasicMaterial attach="material" color={color} linewidth={1} />
      </line>
      {/* Pernas da cota */}
      <line>
        <bufferGeometry attach="geometry" setFromPoints={[points[0], linePoints[0]]} />
        <lineBasicMaterial attach="material" color={color} linewidth={1} opacity={0.5} transparent />
      </line>
      <line>
        <bufferGeometry attach="geometry" setFromPoints={[points[1], linePoints[1]]} />
        <lineBasicMaterial attach="material" color={color} linewidth={1} opacity={0.5} transparent />
      </line>
      <Text
        position={[midPoint.x + perp.x * 1.5, midPoint.y + perp.y * 1.5, midPoint.z]}
        fontSize={0.03}
        color={color}
        anchorX="center"
        anchorY="middle"
        rotation={[0, 0, Math.atan2(dir.y, dir.x)]}
      >
        {label}
      </Text>
    </group>
  );
};

const FilmePlastico = ({ contorno, largura, altura, comprimento, tipo }) => {
  const shape = useMemo(() => {
    if (!contorno || contorno.length < 3) return null;
    const s = new THREE.Shape();
    
    // Folga mínima para o plástico não "atravessar" o metal (Z-fighting)
    const folga = 0.002; 
    const r = (tipo === 'circular' ? largura / 2 : 0) + folga;

    // Criar o caminho do contorno expandido
    contorno.forEach((p, i) => {
      // Expansão radial para seguir o contorno externo das peças
      const angle = Math.atan2(p.y, p.x);
      const px = p.x + Math.cos(angle) * r;
      const py = p.y + Math.sin(angle) * r;

      if (i === 0) s.moveTo(px, py);
      else s.lineTo(px, py);
    });
    s.closePath();
    return s;
  }, [contorno, largura, altura, tipo]);

  if (!shape) return null;

  return (
    <mesh position={[0, 0, -comprimento / 2]}>
      <extrudeGeometry args={[shape, { depth: comprimento, bevelEnabled: false }]} />
      <meshPhysicalMaterial 
        color="#ffffff"
        transparent
        opacity={0.15}
        roughness={0.1}
        metalness={0.1}
        transmission={0.6}
        thickness={0.005}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

const PerfilCircular = ({ x, y, z, diametro, comprimento, cor }) => {
  return (
    <mesh position={[x, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[diametro / 2, diametro / 2, comprimento, 32]} />
      <meshStandardMaterial color={cor} metalness={0.7} roughness={0.2} />
      <Edges color="black" threshold={15} />
    </mesh>
  );
};

const PerfilRetangular = ({ x, y, largura, altura, comprimento, cor }) => {
  return (
    <mesh position={[x, y, 0]}>
      <boxGeometry args={[largura, altura, comprimento]} />
      <meshStandardMaterial color={cor} metalness={0.7} roughness={0.2} />
      <Edges color="black" />
    </mesh>
  );
};

const AmarradoVisualizacao3D = ({
  tipo = 'circular',
  quantidade = 20,
  pecasPorLinha = null,
  largura = 50,
  altura = 50,
  espacamento = 5,
  comprimento = 2000,
  cor = '#a0a0a0',
  mostrarFilme = true
}) => {
  // Converter mm para metros para o Three.js
  const scale = 0.001;
  const l = largura * scale;
  const h = altura * scale;
  const e = espacamento * scale;
  const c = comprimento * scale;

  const { posicoes, boundingBox, contorno } = useMemo(() => {
    return gerarPosicoesAmarrado({
      tipo,
      quantidade,
      pecasPorLinha,
      largura: l,
      altura: h,
      espacamento: e
    });
  }, [tipo, quantidade, pecasPorLinha, l, h, e]);

  return (
    <div className="w-full h-full bg-slate-900 rounded-xl overflow-hidden relative">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[c * 0.8, c * 0.5, c * 1.2]} fov={50} />
        <OrbitControls makeDefault />
        <Environment preset="city" />
        
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} castShadow />
        <spotLight position={[-10, 20, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />

        <group position={[0, 0, -c/2]}>
          {posicoes.map((pos, i) => (
            tipo === 'circular' ? (
              <PerfilCircular key={i} x={pos.x} y={pos.y} diametro={l} comprimento={c} cor={cor} />
            ) : (
              <PerfilRetangular key={i} x={pos.x} y={pos.y} largura={l} altura={h} comprimento={c} cor={cor} />
            )
          ))}

          {mostrarFilme && (
            <FilmePlastico 
              contorno={contorno} 
              largura={l} 
              altura={h} 
              comprimento={c} 
              tipo={tipo} 
            />
          )}

          {/* Cotas */}
          <Cota 
            p1={[-boundingBox.width/2, -boundingBox.height/2, c/2]} 
            p2={[boundingBox.width/2, -boundingBox.height/2, c/2]} 
            label={`${(boundingBox.width / scale).toFixed(0)} mm`}
            offset={-0.1}
          />
          <Cota 
            p1={[boundingBox.width/2, -boundingBox.height/2, c/2]} 
            p2={[boundingBox.width/2, boundingBox.height/2, c/2]} 
            label={`${(boundingBox.height / scale).toFixed(0)} mm`}
            offset={0.1}
          />
        </group>

        {/* Grid no chão */}
        <gridHelper args={[10, 20, '#444', '#222']} position={[0, -boundingBox.height/2 - 0.05, 0]} />
      </Canvas>

      {/* Info Overlay */}
      <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md p-3 rounded-lg border border-white/10 text-white pointer-events-none">
        <p className="text-[10px] font-bold uppercase text-amber-400 mb-2">Dimensões Reais do Amarrado</p>
        <div className="space-y-1.5">
          <p className="text-xs flex gap-2">
            <span className="text-slate-400 w-16">Peças:</span>
            <span className="font-bold text-amber-400">{quantidade}</span>
          </p>
          <p className="text-xs flex gap-2">
            <span className="text-slate-400 w-16">Largura:</span>
            <span className="font-bold text-white">{(boundingBox.width / scale).toFixed(1)} mm</span>
          </p>
          <p className="text-xs flex gap-2">
            <span className="text-slate-400 w-16">Altura:</span>
            <span className="font-bold text-white">{(boundingBox.height / scale).toFixed(1)} mm</span>
          </p>
          <p className="text-xs flex gap-2">
            <span className="text-slate-400 w-16">Comprimento:</span>
            <span className="font-bold text-white">{comprimento.toFixed(0)} mm</span>
          </p>
          <div className="border-t border-white/10 pt-1.5 mt-1">
            <p className="text-[9px] text-slate-500 leading-relaxed">
              Medidas de borda a borda das peças externas.<br/>
              Inclui espaçamento entre perfis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AmarradoVisualizacao3D;
