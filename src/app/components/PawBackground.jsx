import { useEffect, useMemo, useState } from 'react';

function criarRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function gerarCaminho({ passos, espacamento, seed }) {
  const rand = criarRandom(seed);

  const borda = Math.floor(rand() * 4);
  let x, y, angulo;

  if (borda === 0) { x = -5; y = rand() * 100; angulo = rand() * 90 - 45; }
  else if (borda === 1) { x = 105; y = rand() * 100; angulo = 180 + (rand() * 90 - 45); }
  else if (borda === 2) { x = rand() * 100; y = -5; angulo = 90 + (rand() * 90 - 45); }
  else { x = rand() * 100; y = 105; angulo = 270 + (rand() * 90 - 45); }

  const avanco = espacamento + 3.5;
  const larguraPasso = espacamento * 1.6;

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

    patasArr.push({ x: px, y: py, rotacao: angulo + 90, tamanho: 38 });
    lado *= -1;
  }

  return patasArr;
}

export default function PawBackground({
  quantidade = 18,
  imgSrc = '/paw.png',
  espacamento = 2.5,
  seed = 12345,
  passoDuracao = 0.45,
  vidaPegada = 4,
  pausaEntreCiclos = 1,
  opacidadeMax = 0.16,
  // ⬇️ degradê suave e claro (tira o branco estático)
  degrade="linear-gradient(135deg, #9ab8e0 0%, #cde1f8 50%, #f8dede 100%)"
}) {
  const [ciclo, setCiclo] = useState(0);

  const patas = useMemo(
    () => gerarCaminho({ passos: quantidade, espacamento, seed: seed + ciclo * 997 }),
    [quantidade, espacamento, seed, ciclo]
  );

  const tempoTotal =
    (quantidade - 1) * passoDuracao + vidaPegada + pausaEntreCiclos;

  useEffect(() => {
    const timer = setTimeout(() => setCiclo((c) => c + 1), tempoTotal * 1000);
    return () => clearTimeout(timer);
  }, [tempoTotal, ciclo]);

  return (
    <div
      className="fixed inset-0 z-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
      style={{ background: degrade }} // ⬅️ degradê suave no fundo, patas por cima
    >
      <style>{`
        @keyframes pegadaVida {
          0%   { opacity: 0; }
          12%  { opacity: var(--op-max); }
          70%  { opacity: var(--op-max); }
          100% { opacity: 0; }
        }
      `}</style>

      {patas.map((pata, i) => (
        <img
          key={`${ciclo}-${i}`}
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
    </div>
  );
}
