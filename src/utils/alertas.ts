// src/utils/alertas.ts
// ✅ Alertas da ficha: etiquetas fixas do pet (valem para todas as visitas),
// mostradas em destaque em todas as etapas. Sem Firebase aqui: só regras e textos.

/** Lista pronta mostrada no cadastro */
export const ALERTAS_PRONTOS = [
  'Alérgico',
  'Morde',
  'Bravo',
  'Medroso',
  'Idoso',
  'Cardíaco',
  'Não usar perfume',
  'Pele sensível',
  'Pelo embolado',
  'Não usar secador',
] as const;

/** Limites (os mesmos do firestore.rules) */
export const MAX_ALERTAS = 12;
export const MAX_ALERTA_OUTRO = 40;
export const MAX_ALERTA_OBS = 300;

/**
 * Limpa a lista: tira espaços, vazios e repetidos (sem diferenciar maiúsculas),
 * corta cada etiqueta em 40 letras e a lista em 12 itens.
 */
export function normalizarAlertas(lista?: readonly (string | null | undefined)[] | null): string[] {
  const vistos = new Set<string>();
  const saida: string[] = [];
  for (const bruto of lista ?? []) {
    const t = String(bruto ?? '').trim().replace(/\s+/g, ' ').slice(0, MAX_ALERTA_OUTRO).trim();
    const chave = t.toLowerCase();
    if (!t || vistos.has(chave)) continue;
    vistos.add(chave);
    saida.push(t);
    if (saida.length >= MAX_ALERTAS) break;
  }
  return saida;
}

/** Limpa a observação do alerta (até 300 letras) */
export function normalizarAlertaObs(obs?: string | null): string {
  return String(obs ?? '').trim().slice(0, MAX_ALERTA_OBS);
}

/** Etiquetas da lista pronta x etiqueta "Outro" (texto livre) */
export function separarAlertas(alertas?: string[] | null): { prontos: string[]; outro: string } {
  const prontos: string[] = [];
  const outros: string[] = [];
  for (const a of normalizarAlertas(alertas)) {
    if ((ALERTAS_PRONTOS as readonly string[]).includes(a)) prontos.push(a);
    else outros.push(a);
  }
  return { prontos, outro: outros.join(', ').slice(0, MAX_ALERTA_OUTRO) };
}

/** Junta as etiquetas marcadas com o "Outro", na ordem da lista pronta */
export function juntarAlertas(prontos: string[], outro?: string): string[] {
  const ordenados = ALERTAS_PRONTOS.filter((a) => prontos.includes(a));
  return normalizarAlertas([...ordenados, outro ?? '']);
}

/** Para o card pequeno: os N primeiros + quantos sobraram ("+N") */
export function resumirAlertas(alertas?: string[] | null, max = 2): { visiveis: string[]; restantes: number } {
  const lista = normalizarAlertas(alertas);
  return { visiveis: lista.slice(0, max), restantes: Math.max(0, lista.length - max) };
}

/** Lista igual (mesma ordem)? Usado para saber se a ficha mudou */
export function mesmosAlertas(a?: string[] | null, b?: string[] | null): boolean {
  const x = normalizarAlertas(a);
  const y = normalizarAlertas(b);
  return x.length === y.length && x.every((v, i) => v === y[i]);
}
