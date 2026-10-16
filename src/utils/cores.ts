// ✅ Personalização: cores do topo de cada loja.
// Funções puras (sem Firebase), para poderem ser testadas sem navegador.

export interface CoresLoja {
  principal: string; // #RRGGBB
  destaque: string;  // #RRGGBB
}

/** Visual de hoje: quem não personalizar continua com ele */
export const CORES_PADRAO: CoresLoja = { principal: '#3B2FBE', destaque: '#E8192C' };

export const ehCorValida = (cor: unknown): cor is string =>
  typeof cor === 'string' && /^#[0-9a-fA-F]{6}$/.test(cor);

/** Cores válidas vindas do banco, ou null (= padrão) */
export function coresValidas(cores: any): CoresLoja | null {
  if (!cores || !ehCorValida(cores.principal) || !ehCorValida(cores.destaque)) return null;
  return { principal: cores.principal.toUpperCase(), destaque: cores.destaque.toUpperCase() };
}

export function rgb(cor: string): [number, number, number] {
  const n = parseInt(cor.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const brilho = (cor: string) => {
  const [r, g, b] = rgb(cor);
  return 0.299 * r + 0.587 * g + 0.114 * b;
};

/** Cor tão clara que o texto branco do topo fica difícil de ler */
export const corMuitoClara = (cor: string) => brilho(cor) > 190;

const hex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();

const distancia = (a: string, b: string) => {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  return Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
};

/**
 * Cores mais presentes numa imagem (pixels RGBA), ignorando fundo transparente,
 * branco, preto e cinzas. Devolve até `quantas`, da mais usada para a menos usada.
 */
export function coresDosPixels(px: ArrayLike<number>, quantas = 4): string[] {
  const grupos = new Map<string, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i + 3 < px.length; i += 4) {
    const r = px[i], g = px[i + 1], b = px[i + 2], a = px[i + 3];
    if (a < 128) continue;                              // transparente
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (max - min < 40 || max < 50) continue;           // cinza, branco ou preto
    const chave = `${r >> 5},${g >> 5},${b >> 5}`;
    const gr = grupos.get(chave) ?? { n: 0, r: 0, g: 0, b: 0 };
    gr.n++; gr.r += r; gr.g += g; gr.b += b;
    grupos.set(chave, gr);
  }
  const ordenadas = [...grupos.values()]
    .sort((a, b) => b.n - a.n)
    .map((gr) => hex(gr.r / gr.n, gr.g / gr.n, gr.b / gr.n));
  const escolhidas: string[] = [];
  for (const cor of ordenadas) {
    if (escolhidas.every((e) => distancia(e, cor) >= 90)) escolhidas.push(cor);
    if (escolhidas.length === quantas) break;
  }
  return escolhidas;
}

/**
 * Sugestão para o topo a partir das cores da logo: a mais escura (que não seja clara demais)
 * vira a principal; a mais usada entre as outras vira o destaque.
 * Sem cor aproveitável (logo preta e branca), devolve null e fica o padrão.
 */
export function sugerirCores(cores: string[]): CoresLoja | null {
  const usaveis = cores.filter((c) => !corMuitoClara(c));
  if (usaveis.length === 0) return null;
  const principal = [...usaveis].sort((a, b) => brilho(a) - brilho(b))[0];
  const destaque = usaveis.find((c) => c !== principal) ?? CORES_PADRAO.destaque;
  return { principal, destaque };
}

/** Lê as cores de um arquivo de imagem no próprio aparelho (antes do envio) */
export async function coresDaImagem(file: Blob): Promise<string[]> {
  try {
    const img = await createImageBitmap(file);
    const largura = 80;
    const altura = Math.max(1, Math.round((largura * img.height) / img.width));
    const canvas = document.createElement('canvas');
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];
    ctx.drawImage(img, 0, 0, largura, altura);
    img.close?.();
    return coresDosPixels(ctx.getImageData(0, 0, largura, altura).data);
  } catch {
    return []; // formato que o navegador não abre: sem sugestão
  }
}
