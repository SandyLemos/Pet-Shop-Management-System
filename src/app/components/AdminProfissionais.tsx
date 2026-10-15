import React, { useState, useEffect } from 'react';
import { X, Plus, Pencil, Trash2, AlertTriangle, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { subscribeToProfissionais, addProfissional, updateProfissional, deleteProfissional } from '../../services/petService';
import type { Profissional } from '../types/pet';

// ─── Modal Confirmar Exclusão (Profissional) ──────────────────────────────────
function ModalConfirmDeleteProfissional({
  profissional, onConfirm, onCancel,
}: { profissional: Profissional; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-red-100 p-4 rounded-2xl"><AlertTriangle className="w-8 h-8 text-red-500" /></div>
        <div className="text-center space-y-2">
          <h2 className="text-lg font-bold text-gray-900">Excluir profissional?</h2>
          <p className="text-sm text-gray-500">
            Você está prestes a excluir{' '}
            <span className="font-semibold text-gray-800">{profissional.nome} {profissional.sobrenome}</span>.
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 mt-1">
            <p className="text-xs text-red-600 font-medium">⚠️ Esta ação é permanente. Não poderá ser desfeita.</p>
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

// ─── Card Criar Profissional ──────────────────────────────────────────────────
function CardCriarProfissional({ onClose }: { onClose: () => void }) {
  const [nome, setNome]           = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [funcao, setFuncao]       = useState('');
  const [loading, setLoading]     = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !sobrenome || !funcao) { toast.error('Preencha todos os campos.'); return; }
    setLoading(true);
    try {
      await addProfissional({ nome, sobrenome, funcao, ativo: true });
      toast.success(`Profissional ${nome} cadastrado com sucesso! 🎉`);
      onClose();
    } catch {
      toast.error('Erro ao cadastrar profissional.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="bg-orange-100 p-2 rounded-lg"><Plus className="w-5 h-5 text-orange-600" /></div>
            <h2 className="text-lg font-bold text-gray-900">Novo Profissional</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Nome</label>
              <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="João"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 transition" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Sobrenome</label>
              <input type="text" value={sobrenome} onChange={e => setSobrenome(e.target.value)} placeholder="Silva"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 transition" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Função</label>
            <input type="text" value={funcao} onChange={e => setFuncao(e.target.value)} placeholder="Ex: Tosador, Banhista..."
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 transition" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-gray-700 hover:bg-slate-100 transition">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-sm font-semibold shadow transition-all flex items-center justify-center gap-2 disabled:opacity-70">
              {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Plus size={15} /> Cadastrar</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Card Editar Profissional ─────────────────────────────────────────────────
function CardEditarProfissional({ profissional, onClose }: { profissional: Profissional; onClose: () => void }) {
  const [nome, setNome]           = useState(profissional.nome);
  const [sobrenome, setSobrenome] = useState(profissional.sobrenome);
  const [funcao, setFuncao]       = useState(profissional.funcao);
  const [ativo, setAtivo]         = useState(profissional.ativo);
  const [loading, setLoading]     = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !sobrenome || !funcao) { toast.error('Preencha todos os campos.'); return; }
    setLoading(true);
    try {
      await updateProfissional(profissional.id, { nome, sobrenome, funcao, ativo });
      toast.success(`Profissional ${nome} atualizado com sucesso!`);
      onClose();
    } catch {
      toast.error('Erro ao atualizar profissional.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 p-2 rounded-lg"><Pencil className="w-5 h-5 text-blue-600" /></div>
            <h2 className="text-lg font-bold text-gray-900">Editar Profissional</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Nome</label>
              <input type="text" value={nome} onChange={e => setNome(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Sobrenome</label>
              <input type="text" value={sobrenome} onChange={e => setSobrenome(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Função</label>
            <input type="text" value={funcao} onChange={e => setFuncao(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
          </div>
          <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 bg-slate-50">
            <div>
              <p className="text-sm font-semibold text-gray-700">Status</p>
              <p className="text-xs text-gray-400">Profissional aparece nas seleções</p>
            </div>
            <button
              type="button"
              onClick={() => setAtivo(prev => !prev)}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${ativo ? 'bg-green-500' : 'bg-slate-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${ativo ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
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

// ─── Seção Profissionais ──────────────────────────────────────────────────────
export function SecaoProfissionais() {
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [loading, setLoading]             = useState(true);
  const [showCriar, setShowCriar]         = useState(false);
  const [editando, setEditando]           = useState<Profissional | null>(null);
  const [deletando, setDeletando]         = useState<Profissional | null>(null);

  useEffect(() => {
    const unsub = subscribeToProfissionais(
      lista => { setProfissionais(lista); setLoading(false); },
      ()    => { toast.error('Erro ao carregar profissionais.'); setLoading(false); },
    );
    return () => unsub();
  }, []);

  const handleDelete = async () => {
    if (!deletando) return;
    try {
      await deleteProfissional(deletando.id);
      toast.success(`Profissional ${deletando.nome} excluído com sucesso.`);
      setDeletando(null);
    } catch {
      toast.error('Erro ao excluir profissional.');
    }
  };

  return (
    <>
      {showCriar && <CardCriarProfissional onClose={() => setShowCriar(false)} />}
      {editando  && <CardEditarProfissional profissional={editando} onClose={() => setEditando(null)} />}
      {deletando && <ModalConfirmDeleteProfissional profissional={deletando} onConfirm={handleDelete} onCancel={() => setDeletando(null)} />}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Briefcase size={18} className="text-orange-500" />
            <span className="font-semibold text-gray-800">Profissionais</span>
            <span className="bg-orange-100 text-orange-600 text-xs font-bold px-2 py-0.5 rounded-full">{profissionais.length}</span>
          </div>
          <button onClick={() => setShowCriar(true)} className="bg-orange-500 hover:bg-orange-600 text-white p-1.5 rounded-lg transition shadow-sm hover:shadow-md" title="Novo profissional">
            <Plus size={18} />
          </button>
        </div>
        <div className="divide-y divide-slate-50">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <span className="w-6 h-6 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : profissionais.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-6">
              <div className="bg-slate-100 p-4 rounded-full"><Briefcase className="w-8 h-8 text-slate-400" /></div>
              <p className="text-sm font-semibold text-gray-500">Nenhum profissional cadastrado</p>
              <p className="text-xs text-gray-400">Clique no <span className="text-orange-500 font-bold">+</span> para adicionar.</p>
            </div>
          ) : profissionais.map(p => (
            <div key={p.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${p.ativo ? 'bg-orange-100' : 'bg-slate-100'}`}>
                  <Briefcase size={16} className={p.ativo ? 'text-orange-500' : 'text-slate-400'} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{p.nome} {p.sobrenome}</p>
                  <p className="text-xs text-gray-400">
                    {p.funcao}
                    <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${p.ativo ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-500'}`}>
                      {p.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setEditando(p)} className="p-2 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition"><Pencil size={15} /></button>
                <button onClick={() => setDeletando(p)} className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

