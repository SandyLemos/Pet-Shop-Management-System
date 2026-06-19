import React from 'react';
import { HEALTH_ISSUES, NO_ISSUES_ID, HealthIssue } from '../constants/healthIssues';

interface HealthIssuesSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

export const HealthIssuesSelector: React.FC<HealthIssuesSelectorProps> = ({
  selectedIds,
  onChange,
  disabled = false,
}) => {
  const nenhumaMarcada = selectedIds.includes(NO_ISSUES_ID);

  const toggleHealthIssue = (issueId: string) => {
    if (disabled) return;

    if (issueId === NO_ISSUES_ID) {
      // Se "Nenhuma" for clicada: alterna entre [NO_ISSUES_ID] e []
      onChange(nenhumaMarcada ? [] : [NO_ISSUES_ID]);
      return;
    }

    // Se outro problema for clicado: remove "Nenhuma" automaticamente
    const semNenhuma = selectedIds.filter((i) => i !== NO_ISSUES_ID);
    const novaLista = semNenhuma.includes(issueId)
      ? semNenhuma.filter((i) => i !== issueId)
      : [...semNenhuma, issueId];

    onChange(novaLista);
  };

  const renderCheckbox = (issue: HealthIssue) => {
    const checked = selectedIds.includes(issue.id);
    const isNenhuma = issue.id === NO_ISSUES_ID;

    return (
      <label
        key={issue.id}
        className={`
          flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition
          ${checked
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-200 hover:border-gray-300 bg-white'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${isNenhuma ? 'col-span-full' : ''}
        `}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={() => toggleHealthIssue(issue.id)}
          disabled={disabled}
          className="w-4 h-4 accent-blue-600"
        />
        <span className="text-lg" aria-hidden>{issue.icon}</span>
        <span className="text-sm font-medium text-gray-800">{issue.label}</span>
      </label>
    );
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">
        Problemas de saúde observados
      </h3>

      {/* "Nenhuma" em destaque no topo */}
      {renderCheckbox(HEALTH_ISSUES.find((i) => i.id === NO_ISSUES_ID)!)}

      {/* Demais problemas em grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {HEALTH_ISSUES
          .filter((i) => i.id !== NO_ISSUES_ID)
          .map(renderCheckbox)}
      </div>

      {nenhumaMarcada && (
        <p className="text-xs text-green-600">
          ✓ Pet sem problemas de saúde aparentes
        </p>
      )}
    </div>
  );
};
