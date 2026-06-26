import { useEffect, useMemo, useState } from 'react';

function criarRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function gerarCaminho({ passos, espacamento, seed, avancoExtra = 3.5, larguraMult = 1.6, tamanho = 38, bordaForcada = null }) {
  const rand = criarRandom(seed);

  // 🔀 permite forçar uma borda diferente para garantir direção distinta
  const borda = bordaForcada !== null ? bordaForcada : Math.floor(rand() * 4);
  let x, y, angulo;

  if (borda === 0) { x = -5; y = rand() * 100; angulo = rand() * 90 - 45; }
  else if (borda === 1) { x = 105; y = rand() * 100; angulo = 180 + (rand() * 90 - 45); }
  else if (borda === 2) { x = rand() * 100; y = -5; angulo = 90 + (rand() * 90 - 45); }
  else { x = rand() * 100; y = 105; angulo = 270 + (rand() * 90 - 45); }

  const avanco = espacamento + avancoExtra;
  const larguraPasso = espacamento * larguraMult;

  const patasArr = [];
  let lado = 1;

  for (let i = 0; i < passos; i++) {
    angulo += (rand() - 0.5) * 22;
    const rad = (angulo * Math.PI) / 180;

    x += Math.cos(rad) * avanco;
    y += Math.sin(rad) * avanco;

    const perp = rad + Math.PI / 2;
    const px = x + Math.cos(perp) * larguraPasso * lado;
    const py = y + Math.sin(perp) * larguraPasso * lado;

    patasArr.push({ x: px, y: py, rotacao: angulo + 90, tamanho });
    lado *= -1;
  }

  return { patas: patasArr, borda };
}

// 🔎 Verifica se dois caminhos se cruzam
function caminhosColidem(a, b, distMin = 9) {
  for (const pa of a) {
    for (const pb of b) {
      const dx = pa.x - pb.x;
      const dy = pa.y - pb.y;
      if (Math.sqrt(dx * dx + dy * dy) < distMin) return true;
    }
  }
  return false;
}

export default function PawBackground({
  quantidade = 18,
  imgSrc = '/paw.png',           // 🐶 cachorro
  imgGato = '/paw_cat.png',      // 🐱 gato (nome correto)
  espacamento = 2.5,
  seed = 12345,
  passoDuracao = 0.45,
  vidaPegada = 4,
  pausaEntreCiclos = 1,
  opacidadeMax = 0.16,
  distanciaMinima = 9,
  degrade = "linear-gradient(135deg, #9ab8e0 0%, #cde1f8 50%, #f8dede 100%)"
}) {
  const [ciclo, setCiclo] = useState(0);

  // 🐶 Cachorro — direção aleatória
  const cachorro = useMemo(
    () => gerarCaminho({ passos: quantidade, espacamento, seed: seed + ciclo * 997 }),
    [quantidade, espacamento, seed, ciclo]
  );
  const patasCachorro = cachorro.patas;

  // 🐱 Gato — borda DIFERENTE do cachorro + sem cruzar
  const patasGato = useMemo(() => {
    const passosGato = Math.round(quantidade * 1.4);
    const espacamentoGato = espacamento * 0.65;

    // 🔀 escolhe uma borda diferente da do cachorro (direção distinta)
    const randDir = criarRandom(seed + 77777 + ciclo * 53);
    let bordaGato = Math.floor(randDir() * 4);
    if (bordaGato === cachorro.borda) bordaGato = (bordaGato + 1 + Math.floor(randDir() * 3)) % 4;

    let melhor = null;
    for (let tentativa = 0; tentativa < 25; tentativa++) {
      const candidato = gerarCaminho({
        passos: passosGato,
        espacamento: espacamentoGato,
        seed: seed + 50000 + ciclo * 1303 + tentativa * 311,
        tamanho: 30,
        bordaForcada: bordaGato,
      });
      if (!caminhosColidem(patasCachorro, candidato.patas, distanciaMinima)) {
        melhor = candidato.patas;
        break;
      }
      melhor = candidato.patas;
    }
    return melhor;
  }, [quantidade, espacamento, seed, ciclo, patasCachorro, cachorro.borda, distanciaMinima]);

  // 🐱 gato anda mais rápido e começa em outro momento
  const passoDuracaoGato = passoDuracao * 0.6;
  const atrasoInicialGato = 1.2; // ⏱️ gato entra ~1,2s depois do cachorro

  const tempoCachorro = (quantidade - 1) * passoDuracao + vidaPegada;
  const tempoGato = atrasoInicialGato + (patasGato.length - 1) * passoDuracaoGato + vidaPegada;
  const tempoTotal = Math.max(tempoCachorro, tempoGato) + pausaEntreCiclos;

  useEffect(() => {
    const timer = setTimeout(() => setCiclo((c) => c + 1), tempoTotal * 1000);
    return () => clearTimeout(timer);
  }, [tempoTotal, ciclo]);

  return (
    <div
      className="fixed inset-0 z-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
      style={{ background: degrade }}
    >
      <style>{`
        @keyframes pegadaVida {
          0%   { opacity: 0; }
          12%  { opacity: var(--op-max); }
          70%  { opacity: var(--op-max); }
          100% { opacity: 0; }
        }
      `}</style>

      {/* 🐶 Cachorro */}
      {patasCachorro.map((pata, i) => (
        <img
          key={`dog-${ciclo}-${i}`}
          src={imgSrc}
          alt=""
          className="absolute select-none block"
          style={{
            left: `${pata.x}%`,
            top: `${pata.y}%`,
            width: `${pata.tamanho}px`,
            opacity: 0,
            transform: `translate(-50%, -50%) rotate(${pata.rotacao}deg)`,
            transformOrigin: 'center',
            '--op-max': opacidadeMax,
            animation: `pegadaVida ${vidaPegada}s ease-in-out forwards`,
            animationDelay: `${i * passoDuracao}s`,
          }}
        />
      ))}

      {/* 🐱 Gato (mais rápido, direção diferente, começa depois) */}
      {patasGato.map((pata, i) => (
        <img
          key={`cat-${ciclo}-${i}`}
          src={imgGato}
          alt=""
          className="absolute select-none block"
          style={{
            left: `${pata.x}%`,
            top: `${pata.y}%`,
            width: `${pata.tamanho}px`,
            opacity: 0,
            transform: `translate(-50%, -50%) rotate(${pata.rotacao}deg)`,
            transformOrigin: 'center',
            '--op-max': opacidadeMax,
            animation: `pegadaVida ${vidaPegada}s ease-in-out forwards`,
            animationDelay: `${atrasoInicialGato + i * passoDuracaoGato}s`,
          }}
        />
      ))}
    </div>
  );
}
