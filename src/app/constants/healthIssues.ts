export type HealthSeverity = 'low' | 'medium' | 'high';
export type HealthCategory = 'geral' | 'pele' | 'parasitas' | 'ouvido' | 'olhos' | 'outros';

export interface HealthIssue {
  id: string;
  label: string;
  icon: string;
  severity: HealthSeverity;
  category: HealthCategory;
}

export const NO_ISSUES_ID = 'nenhuma';

export const HEALTH_ISSUES: HealthIssue[] = [
  { id: NO_ISSUES_ID,       label: 'Nenhuma',               icon: '✔️', severity: 'low',    category: 'geral' },
  { id: 'pulgas',           label: 'Pulgas',                icon: '🐛', severity: 'medium', category: 'parasitas' },
  { id: 'carrapatos',       label: 'Carrapatos',            icon: '🕷️', severity: 'medium', category: 'parasitas' },
  { id: 'suspeita_sarna',   label: 'Suspeita de sarna',     icon: '🦠', severity: 'high',   category: 'pele' },
  { id: 'irritacao_pele',   label: 'Irritação na pele',     icon: '🌿', severity: 'medium', category: 'pele' },
  { id: 'feridas',          label: 'Feridas',               icon: '🩹', severity: 'high',   category: 'pele' },
  { id: 'queda_pelo',       label: 'Queda de pelo anormal', icon: '🐕', severity: 'medium', category: 'pele' },
  { id: 'mau_cheiro_ouvido',label: 'Mau cheiro no ouvido',  icon: '👃', severity: 'medium', category: 'ouvido' },
  { id: 'irritacao_ouvido', label: 'Irritação no ouvido',   icon: '👂', severity: 'medium', category: 'ouvido' },
  { id: 'secrecao_ocular',  label: 'Secreção ocular',       icon: '👁️', severity: 'medium', category: 'olhos' },
  { id: 'caroços',          label: 'Caroços / nódulos',     icon: '🔴', severity: 'high',   category: 'outros' },
];

/** Retorna o objeto HealthIssue a partir do ID. */
export const getHealthIssueById = (id: string): HealthIssue | undefined =>
  HEALTH_ISSUES.find((issue) => issue.id === id);

/** Converte uma lista de IDs em uma lista de labels legíveis. */
export const getHealthIssueLabels = (ids: string[]): string[] =>
  ids
    .map((id) => getHealthIssueById(id)?.label)
    .filter((label): label is string => Boolean(label));

/** Retorna apenas os problemas reais (exclui "Nenhuma"). */
export const getRealHealthIssues = (): HealthIssue[] =>
  HEALTH_ISSUES.filter((issue) => issue.id !== NO_ISSUES_ID);
