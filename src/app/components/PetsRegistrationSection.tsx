import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Plus, Pencil, Trash2, AlertTriangle, PawPrint,
  Dog, Cat, Phone, Hash, Search,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getAllPetsCadastro,
  deletePetCadastro,
  updatePetCadastro,
} from '../../services/petService';
import type { PetCadastro } from '../types/pet';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function labelEspecie(e?: string) {
  return e === 'gato' ? 'Gato' : e === 'cao' ? 'Cão' : '—';
}
function labelPorte(p?: string) {
  const map: Record<string, string> = { pequeno: 'Pequeno', medio: 'Médio', grande: 'Grande' };
  return p ? map[p] ?? p : '—';
}
function formatTelefone(tel?: string) {
  if (!tel) return '—';
  const d = tel.replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return tel;
}

// ─── Modal Detalhes do Pet ─────────────────────────────────────────────────────
function ModalDetalhesPet({
  pet, onClose, onEdit, onDelete,
}: {
  pet: PetCadastro;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in-95 duration-200 overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {pet.foto ? (
              <img src={pet.foto} alt={pet.nomePet}
                className="w-12 h-12 rounded-xl object-cover border-2 border-white/30 flex-shrink-0" />
            ) : (
              <div className="bg-white/20 p-2.5 rounded-xl flex-shrink-0">
                {pet.especie === 'gato'
                  ? <Cat className="w-6 h-6 text-white" />
                  : <Dog className="w-6 h-6 text-white" />}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-white font-bold text-base truncate">{pet.nomePet}</h2>
              <p className="text-indigo-200 text-xs font-mono">{pet.petNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition p-1 flex-shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Corpo */}
        <div className="p-6 space-y-3">
          <div className="bg-slate-50 rounded-xl p-4 space-y-2.5">
            <InfoRow icon={<Hash className="w-4 h-4 text-slate-400" />} label="Código" value={pet.petNumber} mono />
            <InfoRow icon="👤" label="Tutor" value={pet.nomeTutor} />
            <InfoRow icon={<Phone className="w-4 h-4 text-slate-400" />} label="Telefone" value={formatTelefone(pet.telefone)} />
            <InfoRow icon={pet.especie === 'gato' ? '🐈' : '🐕'} label="Espécie" value={labelEspecie(pet.especie)} />
            <InfoRow icon="🦴" label="Raça" value={pet.raca || '—'} />
            <InfoRow icon="📏" label="Porte" value={labelPorte(pet.porte)} />
          </div>

          {/* Ações */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onEdit}
              className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white text-sm font-semibold shadow transition-all flex items-center justify-center gap-2"
            >
              <Pencil size={15} /> Editar
            </button>
            <button
              onClick={onDelete}
              className="flex-1 py-2.5 rounded-lg border border-red-200 bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 transition flex items-center justify-center gap-2"
            >
              <Trash2 size={15} /> Excluir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value, mono }: {
  icon: React.ReactNode | string; label: string; value: string; mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-5 flex items-center justify-center flex-shrink-0">{icon}</span>
      <span className="text-gray-400 flex-shrink-0">{label}:</span>
      <span className={`font-semibold text-gray-700 truncate ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

// ─── Modal Confirmar Exclusão ──────────────────────────────────────────────────
function ModalConfirmDeletePet({
  pet, onConfirm, onCancel,
}: { pet: PetCadastro; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-red-100 p-4 rounded-2xl"><AlertTriangle className="w-8 h-8 text-red-500" /></div>
        <div className="text-center space-y-2">
          <h2 className="text-lg font-bold text-gray-900">Excluir cadastro?</h2>
          <p className="text-sm text-gray-500">
            Você está prestes a excluir a ficha de{' '}
            <span className="font-semibold text-gray-800">{pet.nomePet}</span>{' '}
            (<span className="font-mono">{pet.petNumber}</span>).
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 mt-1">
            <p className="text-xs text-red-600 font-medium">
              ⚠️ Isso remove apenas o cadastro permanente. Os atendimentos do dia e o histórico de logs NÃO são afetados.
            </p>
          </div>
        </div>
        <div className="flex gap-3 w-full">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-gray-700 hover:bg-slate-100 transition">
            Cancelar
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-sm font-semibold shadow transition-all flex items-center justify-center gap-2">
            <Trash2 size={15} /> Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Card Editar Pet ───────────────────────────────────────────────────────────
const RACAS_CAO = [
  'SRD (Sem Raça Definida)', 'Akita', 'Beagle', 'Border Collie', 'Boxer',
  'Bulldog Francês', 'Bulldog Inglês', 'Chihuahua', 'Cocker Spaniel', 'Dachshund',
  'Dálmata', 'Dobermann', 'Golden Retriever', 'Husky Siberiano', 'Labrador',
  'Lhasa Apso', 'Maltês', 'Pastor Alemão', 'Pinscher', 'Pitbull', 'Pomerânia',
  'Poodle', 'Pug', 'Rottweiler', 'Schnauzer', 'Shih Tzu', 'Yorkshire',
];
const RACAS_GATO = [
  'SRD (Sem Raça Definida)', 'Angorá', 'Bengal', 'British Shorthair',
  'Maine Coon', 'Persa', 'Ragdoll', 'Siamês', 'Sphynx',
];

function CardEditarPet({
  pet, onClose, onSuccess,
}: { pet: PetCadastro; onClose: () => void; onSuccess: () => void }) {
  const [nomePet, setNomePet]     = useState(pet.nomePet);
  const [nomeTutor, setNomeTutor] = useState(pet.nomeTutor);
  const [telefone, setTelefone]   = useState(pet.telefone || '');
  const [especie, setEspecie]     = useState<'cao' | 'gato' | ''>(pet.especie || '');
  const [raca, setRaca]           = useState(pet.raca || '');
  const [porte, setPorte]         = useState<'pequeno' | 'medio' | 'grande' | ''>(pet.porte || '');
  const [loading, setLoading]     = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomePet || !nomeTutor) { toast.error('Preencha nome do pet e do tutor.'); return; }
    setLoading(true);
    try {
      await updatePetCadastro(pet.petNumber, {
        nomePet,
        nomeTutor,
        telefone,
        especie: especie || undefined,
        raca: raca || undefined,
        porte: porte || undefined,
        foto: pet.foto,
      });
      toast.success(`Cadastro de ${nomePet} atualizado!`);
      onSuccess();
      onClose();
    } catch {
      toast.error('Erro ao atualizar cadastro.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 p-2 rounded-lg"><Pencil className="w-5 h-5 text-blue-600" /></div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Editar Pet</h2>
              <p className="text-xs text-gray-400 font-mono">{pet.petNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Nome do Pet</label>
            <input type="text" value={nomePet} onChange={e => setNomePet(e.target.value)} className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Espécie</label>
              <select value={especie} onChange={e => { setEspecie(e.target.value as any); setRaca(''); }} className={inputCls}>
                <option value="">—</option>
                <option value="cao">🐕 Cão</option>
                <option value="gato">🐈 Gato</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Porte</label>
              <select value={porte} onChange={e => setPorte(e.target.value as any)} className={inputCls}>
                <option value="">—</option>
                <option value="pequeno">Pequeno</option>
                <option value="medio">Médio</option>
                <option value="grande">Grande</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Raça</label>
            <select value={raca} onChange={e => setRaca(e.target.value)} disabled={!especie} className={inputCls}>
              <option value="">{especie ? 'Selecione...' : 'Escolha a espécie primeiro'}</option>
              {(especie === 'cao' ? RACAS_CAO : especie === 'gato' ? RACAS_GATO : []).map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Nome do Tutor</label>
            <input type="text" value={nomeTutor} onChange={e => setNomeTutor(e.target.value)} className={inputCls} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Telefone</label>
            <input type="tel" value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(24) 99999-9999" className={inputCls} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-gray-700 hover:bg-slate-100 transition">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white text-sm font-semibold shadow transition-all flex items-center justify-center gap-2 disabled:opacity-70">
              {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Pencil size={15} /> Salvar</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Seção Pets Cadastrados (export principal) ─────────────────────────────────
export function SecaoPetsCadastro() {
  const [pets, setPets]         = useState<PetCadastro[]>([]);
  const [loading, setLoading]   = useState(true);
  const [busca, setBusca]       = useState('');
  const [detalhe, setDetalhe]   = useState<PetCadastro | null>(null);
  const [editando, setEditando] = useState<PetCadastro | null>(null);
  const [deletando, setDeletando] = useState<PetCadastro | null>(null);

  const carregar = async () => {
    setLoading(true);
    try {
      setPets(await getAllPetsCadastro());
    } catch {
      toast.error('Erro ao carregar pets cadastrados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

// ✅ CORRIGIDO — telefone só busca com 4+ dígitos
const filtrados = useMemo(() => {
  const t = busca.trim().toLowerCase();
  if (!t) return pets;

  const tDigitos = t.replace(/\D/g, ''); // só os números do termo

  // remove zeros à esquerda do termo numérico digitado (ex.: "001" -> "1")
  const tNumero = tDigitos.replace(/^0+/, '');

  return pets.filter(p => {
    // nome / tutor / código bruto
    const matchTexto =
      p.nomePet.toLowerCase().includes(t) ||
      p.nomeTutor.toLowerCase().includes(t) ||
      p.petNumber.toLowerCase().includes(t);

    // número do pet sem prefixo e sem zeros à esquerda (ex.: "PET-000001" -> "1")
    const numeroPet = p.petNumber.replace(/\D/g, '').replace(/^0+/, '');

    // só compara número se o termo tiver dígitos
    const matchNumero =
      tNumero !== '' &&
      (
        numeroPet === tNumero ||              // igualdade exata: "1" acha o pet 1
        numeroPet.startsWith(tNumero)         // começa com: "1" acha 1, 10, 11...
      );

    // telefone — só busca com 4 ou mais dígitos (ex.: "1177")
    const matchTelefone =
      tDigitos.length >= 4 &&
      (p.telefone ?? '').replace(/\D/g, '').includes(tDigitos);

    return matchTexto || matchNumero || matchTelefone;
  });
}, [pets, busca]);


  const handleDelete = async () => {
    if (!deletando) return;
    try {
      await deletePetCadastro(deletando.petNumber);
      toast.success(`Cadastro de ${deletando.nomePet} excluído.`);
      setDeletando(null);
      setDetalhe(null);
      carregar();
    } catch {
      toast.error('Erro ao excluir cadastro.');
    }
  };

  return (
    <>
      {detalhe && (
        <ModalDetalhesPet
          pet={detalhe}
          onClose={() => setDetalhe(null)}
          onEdit={() => { setEditando(detalhe); setDetalhe(null); }}
          onDelete={() => { setDeletando(detalhe); }}
        />
      )}
      {editando && (
        <CardEditarPet pet={editando} onClose={() => setEditando(null)} onSuccess={carregar} />
      )}
      {deletando && (
        <ModalConfirmDeletePet pet={deletando} onConfirm={handleDelete} onCancel={() => setDeletando(null)} />
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <PawPrint size={18} className="text-indigo-500" />
            <span className="font-semibold text-gray-800">Pets Cadastrados</span>
            <span className="bg-indigo-100 text-indigo-600 text-xs font-bold px-2 py-0.5 rounded-full">{pets.length}</span>
          </div>
        </div>

        {/* Busca */}
        <div className="px-5 py-3 border-b border-slate-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por nome, tutor, telefone ou código..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            />
          </div>
        </div>

        {/* Lista */}
        <div className="divide-y divide-slate-50 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <span className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-6">
              <div className="bg-slate-100 p-4 rounded-full"><PawPrint className="w-8 h-8 text-slate-400" /></div>
              <p className="text-sm font-semibold text-gray-500">
                {busca ? 'Nenhum pet encontrado' : 'Nenhum pet cadastrado'}
              </p>
              <p className="text-xs text-gray-400">
                {busca ? 'Tente outro termo de busca.' : 'Os pets aparecem aqui após o primeiro cadastro.'}
              </p>
            </div>
          ) : filtrados.map(p => (
            <button
              key={p.petNumber}
              onClick={() => setDetalhe(p)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                {p.foto ? (
                  <img src={p.foto} alt={p.nomePet}
                    className="w-9 h-9 rounded-full object-cover border border-slate-100 flex-shrink-0" />
                ) : (
                  <div className="p-2 rounded-full bg-indigo-100 flex-shrink-0">
                    {p.especie === 'gato'
                      ? <Cat size={16} className="text-indigo-500" />
                      : <Dog size={16} className="text-indigo-500" />}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {p.nomePet}
                    <span className="ml-2 font-mono text-[10px] text-indigo-400">{p.petNumber}</span>
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {p.nomeTutor} · {formatTelefone(p.telefone)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <span
                  onClick={(e) => { e.stopPropagation(); setEditando(p); }}
                  className="p-2 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition cursor-pointer"
                >
                  <Pencil size={15} />
                </span>
                <span
                  onClick={(e) => { e.stopPropagation(); setDeletando(p); }}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition cursor-pointer"
                >
                  <Trash2 size={15} />
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
