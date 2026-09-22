// src/utils/dia.ts
const FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric', month: '2-digit', day: '2-digit',
});

export function idDoDiaDe(d: Date): string {
  return FMT.format(d);
}

export function idDoDia(): string {
  return idDoDiaDe(new Date());
}
