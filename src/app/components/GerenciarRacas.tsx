import { useState } from 'react';
import { toast } from 'sonner';
import { useRacas } from '../../hooks/useRacas';
import { useAuth } from '../../hooks/useAuth'; // ajuste o caminho/nome
import type { Especie } from '../../services/racaService';

const LABEL: Record<Especie, string> = { cao: 'Cão', gato: 'Gato' };
const MAX_NOME = 60;

function msgErro(e: unknown, fallback: string) {
  const m = e instanceof Error ? e.message : '';
  if (m === 'DUPLICADA') return 'Já existe uma raça com esse nome nessa espécie.';
  if (m === 'NOME_VAZIO') return 'Informe o nome da raça.';
  return fallback;
}

export function GerenciarRacas() {
  const { racas, carregando, erro, criar, editar, remover } = useRacas();
  const { isAdmin } = useAuth();

  const [nome, setNome] = useState('');
  const [especie, setEspecie] = useState<Especie>('cao');
  const [salvando, setSalvando] = useState(false);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nomeEdit, setNomeEdit] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleCriar = async () => {
    if (!nome.trim() || salvando) return;
    setSalvando(true);
    try {
      await criar(nome, especie);
      setNome('');
      toast.success('Raça adicionada.');
    } catch (err) {
      toast.error(msgErro(err, 'Erro ao adicionar a raça.'));
    } finally {
      setSalvando(false);
    }
  };

  const salvarEdicao = async (id: string, esp: Especie) => {
    if (!nomeEdit.trim()) {
      toast.error('Informe o nome da raça.');
      return;
    }
    setBusyId(id);
    try {
      await editar(id, nomeEdit, esp);
      setEditandoId(null);
      toast.success('Raça atualizada.');
    } catch (err) {
      toast.error(msgErro(err, 'Erro ao atualizar a raça.'));
    } finally {
      setBusyId(null);
    }
  };

  const excluir = async (id: string, nomeRaca: string) => {
    if (!confirm(`Excluir a raça "${nomeRaca}"?`)) return;
    setBusyId(id);
    try {
      await remover(id);
      toast.success('Raça excluída.');
    } catch {
      toast.error('Erro ao excluir. Verifique se você é admin.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* SEM <form> — evita form aninhado dentro do PetRegistration */}
      <div className="flex flex-wrap gap-2">
        <input
          value={nome}
          maxLength={MAX_NOME}
          onChange={e => setNome(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleCriar();
            }
          }}
          placeholder="Nome da raça"
          className="flex-1 min-w-[180px] rounded-md border px-3 py-2"
        />
        <select
          value={especie}
          onChange={e => setEspecie(e.target.value as Especie)}
          className="rounded-md border px-3 py-2"
        >
          <option value="cao">Cão</option>
          <option value="gato">Gato</option>
        </select>
        <button
          type="button"
          onClick={handleCriar}
          disabled={salvando || !nome.trim()}
          className="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {salvando ? 'Salvando…' : 'Adicionar'}
        </button>
      </div>

      {carregando && <p className="text-sm text-gray-500">Carregando raças…</p>}
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      {!carregando && !erro && racas.length === 0 && (
        <p className="text-sm text-gray-500">Nenhuma raça customizada cadastrada.</p>
      )}

      <ul className="divide-y rounded-md border">
        {racas.map(r => (
          <li key={r.id} className="flex items-center gap-2 px-3 py-2">
            {editandoId === r.id ? (
              <>
                <input
                  autoFocus
                  value={nomeEdit}
                  maxLength={MAX_NOME}
                  onChange={e => setNomeEdit(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      salvarEdicao(r.id, r.especie);
                    }
                    if (e.key === 'Escape') setEditandoId(null);
                  }}
                  className="flex-1 rounded-md border px-2 py-1"
                />
                <button
                  type="button"
                  onClick={() => salvarEdicao(r.id, r.especie)}
                  disabled={busyId === r.id || !nomeEdit.trim()}
                  className="text-sm text-green-700 disabled:opacity-50"
                >
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={() => setEditandoId(null)}
                  className="text-sm text-gray-500"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <span className="flex-1">{r.nome}</span>
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {LABEL[r.especie]}
                </span>

                {isAdmin && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setEditandoId(r.id);
                        setNomeEdit(r.nome);
                      }}
                      className="text-sm text-blue-600"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => excluir(r.id, r.nome)}
                      disabled={busyId === r.id}
                      className="text-sm text-red-600 disabled:opacity-50"
                    >
                      Excluir
                    </button>
                  </>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
