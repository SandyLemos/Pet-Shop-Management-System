import React, { useState } from 'react';
import { X, Plus, PawPrint } from 'lucide-react';
import {
  collection, addDoc, getDocs, query, where, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { toast } from 'sonner';

function CardAdicionarRaca({ onClose }: { onClose: () => void }) {
  const [nome, setNome]       = useState('');
  const [especie, setEspecie] = useState<'cao' | 'gato'>('cao');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const limpo = nome.trim().replace(/\s+/g, ' ');
    if (limpo.length < 2) {
      toast.error('Informe o nome da raça (mínimo 2 caracteres).');
      return;
    }

    setLoading(true);
    try {
      const nomeNormalizado = limpo.toLowerCase();

      const dup = await getDocs(query(
        collection(db, 'racas'),
        where('nomeNormalizado', '==', nomeNormalizado),
        where('especie', '==', especie),
      ));
      if (!dup.empty) {
        toast.error('Essa raça já está cadastrada.');
        setLoading(false);
        return;
      }

      await addDoc(collection(db, 'racas'), {
        nome: limpo.replace(/\b\w/g, c => c.toUpperCase()),
        nomeNormalizado,
        especie,
        criadoEm: serverTimestamp(),
      });

      toast.success(`Raça "${limpo}" adicionada com sucesso! 🎉`);
      onClose();
    } catch {
      toast.error('Erro ao adicionar raça.');
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
            <div className="bg-teal-100 p-2 rounded-lg">
              <PawPrint className="w-5 h-5 text-teal-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Adicionar Raça</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Espécie</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setEspecie('cao')}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${especie === 'cao' ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 bg-white text-gray-500 hover:border-slate-300'}`}>
                🐕 Cão
              </button>
              <button type="button" onClick={() => setEspecie('gato')}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${especie === 'gato' ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 bg-white text-gray-500 hover:border-slate-300'}`}>
                🐈 Gato
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Nome da Raça</label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex: Spitz Alemão"
              autoFocus
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 transition"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-gray-700 hover:bg-slate-100 transition">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white text-sm font-semibold shadow transition-all flex items-center justify-center gap-2 disabled:opacity-70">
              {loading
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><Plus size={15} /> Adicionar</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Botão + modal, prontos para colar em qualquer lugar do admin */
export function BotaoAdicionarRaca() {
  const [show, setShow] = useState(false);
  return (
    <>
      {show && <CardAdicionarRaca onClose={() => setShow(false)} />}
      <button
        type="button"
        onClick={() => setShow(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all"
      >
        <PawPrint size={16} />
        Adicionar raça
      </button>
    </>
  );
}
