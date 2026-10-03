import type { Pet } from '../app/types/pet';

// ✅ Alerta de pet parado há muito tempo (aparece só na aba Grade).
/** Aguardando sem iniciar o atendimento há mais de 30 min. */
export const LIMITE_ESPERA_MIN = 30;
/** Em atendimento (banho, escovar ou tosa) há mais de 2 h desde a chegada. */
export const LIMITE_ATENDIMENTO_MIN = 120;

export function minutosNaLoja(pet: Pick<Pet, 'checkInTime'>, agora: number): number {
  const t = new Date(pet.checkInTime).getTime();
  if (!pet.checkInTime || Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((agora - t) / 60_000));
}

export function estaParado(pet: Pick<Pet, 'checkInTime' | 'status'>, agora: number): boolean {
  const min = minutosNaLoja(pet, agora);
  if (pet.status === 'espera') return min > LIMITE_ESPERA_MIN;
  if (pet.status === 'banho' || pet.status === 'escovar' || pet.status === 'tosa') return min > LIMITE_ATENDIMENTO_MIN;
  return false; // finalizado (pronto) não conta
}

/** "45min" ou "1h20" */
export function formatarTempo(min: number): string {
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}
