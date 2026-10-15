import React, { useState, useEffect } from 'react';
import { X, Users, Plus, Pencil, Trash2, AlertTriangle, UserCircle2, ShieldCheck, User } from 'lucide-react';
import { collection, getDocs, updateDoc, deleteDoc, doc, setDoc, Timestamp } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { firebaseConfig, db } from '../../lib/firebase';
import { toast } from 'sonner';
import { initializeApp, deleteApp } from 'firebase/app';

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface UsuarioFirestore {
  id: string;
  nome: string;
  sobrenome: string;
  funcao: string;
  role: 'admin' | 'user';
  email: string;
  criadoEm?: any;
}

// ─── Modal Confirmar Exclusão (Usuário) ───────────────────────────────────────
function ModalConfirmDelete({
  usuario, onConfirm, onCancel,
}: { usuario: UsuarioFirestore; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-red-100 p-4 rounded-2xl"><AlertTriangle className="w-8 h-8 text-red-500" /></div>
        <div className="text-center space-y-2">
          <h2 className="text-lg font-bold text-gray-900">Excluir usuário?</h2>
          <p className="text-sm text-gray-500">
            Você está prestes a excluir{' '}
            <span className="font-semibold text-gray-800">{usuario.nome} {usuario.sobrenome}</span>.
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 mt-1">
            <p className="text-xs text-red-600 font-medium">
              ⚠️ Esta ação é permanente e irá apagar todos os dados deste usuário. Não poderá ser desfeita.
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

// ─── Card Criar Usuário ───────────────────────────────────────────────────────
function CardCriarUsuario({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [nome, setNome]           = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [funcao, setFuncao]       = useState('');
  const [role, setRole]           = useState<'user' | 'admin'>('user');
  const [email, setEmail]         = useState('');
  const [senha, setSenha]         = useState('');
  const [loading, setLoading]     = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !sobrenome || !funcao || !email || !senha) { toast.error('Preencha todos os campos.'); return; }
    if (senha.length < 6) { toast.error('A senha deve ter no mínimo 6 caracteres.'); return; }
    setLoading(true);
    const appSecundario = initializeApp(firebaseConfig, 'appSecundario');
    const authSecundario = getAuth(appSecundario);
    try {
      const cred = await createUserWithEmailAndPassword(authSecundario, email, senha);
      await setDoc(doc(db, 'usuarios', cred.user.uid), {
        id: cred.user.uid, nome, sobrenome, funcao, role, email, criadoEm: Timestamp.now(),
      });
      toast.success(`Usuário ${nome} criado com sucesso! 🎉`);
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') toast.error('Este e-mail já está em uso.');
      else if (err.code === 'auth/weak-password') toast.error('A senha deve ter no mínimo 6 caracteres.');
      else toast.error('Erro ao criar usuário. Tente novamente.');
    } finally {
      await deleteApp(appSecundario);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="bg-green-100 p-2 rounded-lg"><Plus className="w-5 h-5 text-green-600" /></div>
            <h2 className="text-lg font-bold text-gray-900">Novo Usuário</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Nome</label>
              <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="João" autoComplete="given-name"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Sobrenome</label>
              <input type="text" value={sobrenome} onChange={e => setSobrenome(e.target.value)} placeholder="Silva" autoComplete="family-name"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Função</label>
            <input type="text" value={funcao} onChange={e => setFuncao(e.target.value)} placeholder="Ex: Tosador, Banhista..." autoComplete="organization-title"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">E-mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="usuario@email.com" autoComplete="email"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Senha</label>
            <input type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} autoComplete="new-password"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
            {senha.length > 0 && (
              <p className={`text-xs font-medium mt-1 ${senha.length < 6 ? 'text-red-500' : 'text-green-500'}`}>
                {senha.length < 6 ? `⚠️ Senha muito curta (${senha.length}/6 caracteres)` : '✅ Senha válida'}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Nível de Acesso</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setRole('user')}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${role === 'user' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-gray-500 hover:border-slate-300'}`}>
                <User size={16} /> Usuário
              </button>
              <button type="button" onClick={() => setRole('admin')}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${role === 'admin' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-slate-200 bg-white text-gray-500 hover:border-slate-300'}`}>
                <ShieldCheck size={16} /> Admin
              </button>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-gray-700 hover:bg-slate-100 transition">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-sm font-semibold shadow transition-all flex items-center justify-center gap-2 disabled:opacity-70">
              {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Plus size={15} /> Criar Usuário</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Card Editar Usuário ──────────────────────────────────────────────────────
function CardEditarUsuario({ usuario, onClose, onSuccess }: { usuario: UsuarioFirestore; onClose: () => void; onSuccess: () => void }) {
  const [nome, setNome]           = useState(usuario.nome);
  const [sobrenome, setSobrenome] = useState(usuario.sobrenome);
  const [funcao, setFuncao]       = useState(usuario.funcao);
  const [role, setRole]           = useState<'user' | 'admin'>(usuario.role);
  const [loading, setLoading]     = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !sobrenome || !funcao) { toast.error('Preencha todos os campos.'); return; }
    setLoading(true);
    try {
      await updateDoc(doc(db, 'usuarios', usuario.id), { nome, sobrenome, funcao, role });
      toast.success(`Usuário ${nome} atualizado com sucesso!`);
      onSuccess();
      onClose();
    } catch {
      toast.error('Erro ao atualizar usuário. Tente novamente.');
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
            <h2 className="text-lg font-bold text-gray-900">Editar Usuário</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Nome</label>
              <input type="text" value={nome} onChange={e => setNome(e.target.value)} autoComplete="given-name"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Sobrenome</label>
              <input type="text" value={sobrenome} onChange={e => setSobrenome(e.target.value)} autoComplete="family-name"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Função</label>
            <input type="text" value={funcao} onChange={e => setFuncao(e.target.value)} autoComplete="organization-title"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">E-mail</label>
            <input type="email" value={usuario.email} disabled
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-100 text-sm text-gray-400 cursor-not-allowed" />
            <p className="text-xs text-gray-400">O e-mail não pode ser alterado aqui.</p>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Nível de Acesso</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setRole('user')}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${role === 'user' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-gray-500 hover:border-slate-300'}`}>
                <User size={16} /> Usuário
              </button>
              <button type="button" onClick={() => setRole('admin')}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${role === 'admin' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-slate-200 bg-white text-gray-500 hover:border-slate-300'}`}>
                <ShieldCheck size={16} /> Admin
              </button>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-gray-700 hover:bg-slate-100 transition">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white text-sm font-semibold shadow transition-all flex items-center justify-center gap-2 disabled:opacity-70">
              {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Pencil size={15} /> Salvar Alterações</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Seção Usuários ───────────────────────────────────────────────────────────
export function SecaoUsuarios() {
  const [usuarios, setUsuarios]   = useState<UsuarioFirestore[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showCriar, setShowCriar] = useState(false);
  const [editando, setEditando]   = useState<UsuarioFirestore | null>(null);
  const [deletando, setDeletando] = useState<UsuarioFirestore | null>(null);

  const carregarUsuarios = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'usuarios'));
      setUsuarios(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as UsuarioFirestore[]);
    } catch {
      toast.error('Erro ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarUsuarios(); }, []);

  const handleDelete = async () => {
    if (!deletando) return;
    try {
      await deleteDoc(doc(db, 'usuarios', deletando.id));
      toast.success(`Usuário ${deletando.nome} excluído com sucesso.`);
      setDeletando(null);
      carregarUsuarios();
    } catch {
      toast.error('Erro ao excluir usuário.');
    }
  };

  return (
    <>
      {showCriar && <CardCriarUsuario onClose={() => setShowCriar(false)} onSuccess={carregarUsuarios} />}
      {editando  && <CardEditarUsuario usuario={editando} onClose={() => setEditando(null)} onSuccess={carregarUsuarios} />}
      {deletando && <ModalConfirmDelete usuario={deletando} onConfirm={handleDelete} onCancel={() => setDeletando(null)} />}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-purple-500" />
            <span className="font-semibold text-gray-800">Usuários do Sistema</span>
            <span className="bg-purple-100 text-purple-600 text-xs font-bold px-2 py-0.5 rounded-full">{usuarios.length}</span>
          </div>
          <button onClick={() => setShowCriar(true)} className="bg-green-500 hover:bg-green-600 text-white p-1.5 rounded-lg transition shadow-sm hover:shadow-md" title="Criar novo usuário">
            <Plus size={18} />
          </button>
        </div>
        <div className="divide-y divide-slate-50">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <span className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : usuarios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-6">
              <div className="bg-slate-100 p-4 rounded-full"><UserCircle2 className="w-8 h-8 text-slate-400" /></div>
              <p className="text-sm font-semibold text-gray-500">Nenhum usuário criado</p>
              <p className="text-xs text-gray-400">Clique no <span className="text-green-500 font-bold">+</span> para adicionar.</p>
            </div>
          ) : usuarios.map(u => (
            <div key={u.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${u.role === 'admin' ? 'bg-purple-100' : 'bg-blue-100'}`}>
                  {u.role === 'admin' ? <ShieldCheck size={16} className="text-purple-500" /> : <User size={16} className="text-blue-500" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{u.nome} {u.sobrenome}</p>
                  <p className="text-xs text-gray-400">{u.funcao} · {u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setEditando(u)} className="p-2 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition"><Pencil size={15} /></button>
                <button onClick={() => setDeletando(u)} className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

