import React, { useState, useEffect } from 'react';
import {
  X, Users, Plus, Pencil, Trash2, AlertTriangle,
  UserCircle2, ShieldCheck, User, ChevronRight,
} from 'lucide-react';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp,
} from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { firebaseConfig, db, auth } from '../../lib/firebase';
import { toast } from 'sonner';
import { setDoc } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';





// ─── Tipos ────────────────────────────────────────────────────────────────────
interface UsuarioFirestore {
  id: string;
  nome: string;
  sobrenome: string;
  funcao: string;
  role: 'admin' | 'user';
  email: string;
  criadoEm?: any;
}

// ─── Modal de Confirmação de Exclusão ─────────────────────────────────────────
function ModalConfirmDelete({
  usuario,
  onConfirm,
  onCancel,
}: {
  usuario: UsuarioFirestore;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-red-100 p-4 rounded-2xl">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-lg font-bold text-gray-900">Excluir usuário?</h2>
          <p className="text-sm text-gray-500">
            Você está prestes a excluir{' '}
            <span className="font-semibold text-gray-800">
              {usuario.nome} {usuario.sobrenome}
            </span>.
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 mt-1">
            <p className="text-xs text-red-600 font-medium">
              ⚠️ Esta ação é permanente e irá apagar todos os dados deste usuário. Não poderá ser desfeita.
            </p>
          </div>
        </div>
        <div className="flex gap-3 w-full">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-gray-700 hover:bg-slate-100 transition"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-sm font-semibold shadow transition-all flex items-center justify-center gap-2"
          >
            <Trash2 size={15} />
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Card Criar Usuário ───────────────────────────────────────────────────────
function CardCriarUsuario({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [nome, setNome]           = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [funcao, setFuncao]       = useState('');
  const [role, setRole]           = useState<'user' | 'admin'>('user');
  const [email, setEmail]         = useState('');
  const [senha, setSenha]         = useState('');
  const [loading, setLoading]     = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!nome || !sobrenome || !funcao || !email || !senha) {
    toast.error('Preencha todos os campos.');
    return;
  }

  if (senha.length < 6) {
    toast.error('A senha deve ter no mínimo 6 caracteres.');
    return;
  }

  setLoading(true);

  // 🔑 Salva o usuário admin atual ANTES de qualquer operação
  const adminUser = auth.currentUser;

  // 🔧 Cria uma instância SECUNDÁRIA do Firebase (não afeta o login atual)
  const appSecundario = initializeApp(firebaseConfig, 'appSecundario');
  const authSecundario = getAuth(appSecundario);

  try {
    // 1️⃣ Cria o usuário na instância secundária (não faz login na instância principal)
    const cred = await createUserWithEmailAndPassword(authSecundario, email, senha);

    // 2️⃣ Salva no Firestore usando o UID como ID do documento
    await setDoc(doc(db, 'usuarios', cred.user.uid), {
      id: cred.user.uid,
      nome,
      sobrenome,
      funcao,
      role,
      email,
      criadoEm: Timestamp.now(),
    });

    toast.success(`Usuário ${nome} criado com sucesso! 🎉`);
    onSuccess();
    onClose();
  } catch (err: any) {
    console.error(err);
    if (err.code === 'auth/email-already-in-use') {
      toast.error('Este e-mail já está em uso.');
    } else if (err.code === 'auth/weak-password') {
      toast.error('A senha deve ter no mínimo 6 caracteres.');
    } else {
      toast.error('Erro ao criar usuário. Tente novamente.');
    }
  } finally {
    // 3️⃣ Destroi a instância secundária (limpeza de memória)
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
            <div className="bg-green-100 p-2 rounded-lg">
              <Plus className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Novo Usuário</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome e Sobrenome */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Nome</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="João"
                autoComplete="given-name"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Sobrenome</label>
              <input
                type="text"
                value={sobrenome}
                onChange={(e) => setSobrenome(e.target.value)}
                placeholder="Silva"
                autoComplete="family-name"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Função */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Função</label>
            <input
              type="text"
              value={funcao}
              onChange={(e) => setFuncao(e.target.value)}
              placeholder="Ex: Tosador, Banhista, Recepcionista..."
              autoComplete="organization-title"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
            />
          </div>

          {/* E-mail */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@email.com"
              autoComplete="email"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
            />
          </div>

          {/* Senha */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              minLength={6}
              autoComplete="new-password"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
            />
            {/* Indicador visual da força da senha */}
            {senha.length > 0 && (
              <p className={`text-xs font-medium mt-1 ${senha.length < 6 ? 'text-red-500' : 'text-green-500'}`}>
                {senha.length < 6
                  ? `⚠️ Senha muito curta (${senha.length}/6 caracteres)`
                  : '✅ Senha válida'}
              </p>
            )}
          </div>

          {/* Nível de Acesso */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Nível de Acesso</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('user')}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                  role === 'user'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-gray-500 hover:border-slate-300'
                }`}
              >
                <User size={16} />
                Usuário
              </button>
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                  role === 'admin'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-slate-200 bg-white text-gray-500 hover:border-slate-300'
                }`}
              >
                <ShieldCheck size={16} />
                Admin
              </button>
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-gray-700 hover:bg-slate-100 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-sm font-semibold shadow transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Plus size={15} />
                  Criar Usuário
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Card Editar Usuário ──────────────────────────────────────────────────────
function CardEditarUsuario({
  usuario,
  onClose,
  onSuccess,
}: {
  usuario: UsuarioFirestore;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [nome, setNome]           = useState(usuario.nome);
  const [sobrenome, setSobrenome] = useState(usuario.sobrenome);
  const [funcao, setFuncao]       = useState(usuario.funcao);
  const [role, setRole]           = useState<'user' | 'admin'>(usuario.role);
  const [loading, setLoading]     = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome || !sobrenome || !funcao) {
      toast.error('Preencha todos os campos.');
      return;
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, 'usuarios', usuario.id), {
        nome,
        sobrenome,
        funcao,
        role,
      });
      toast.success(`Usuário ${nome} atualizado com sucesso!`);
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
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
            <div className="bg-blue-100 p-2 rounded-lg">
              <Pencil className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Editar Usuário</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome e Sobrenome */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Nome</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                autoComplete="given-name"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Sobrenome</label>
              <input
                type="text"
                value={sobrenome}
                onChange={(e) => setSobrenome(e.target.value)}
                autoComplete="family-name"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Função */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Função</label>
            <input
              type="text"
              value={funcao}
              onChange={(e) => setFuncao(e.target.value)}
              autoComplete="organization-title"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
            />
          </div>

          {/* E-mail (somente leitura) */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">E-mail</label>
            <input
              type="email"
              value={usuario.email}
              disabled
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-100 text-sm text-gray-400 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400">O e-mail não pode ser alterado aqui.</p>
          </div>

          {/* Nível de Acesso */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Nível de Acesso</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('user')}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                  role === 'user'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-gray-500 hover:border-slate-300'
                }`}
              >
                <User size={16} />
                Usuário
              </button>
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                  role === 'admin'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-slate-200 bg-white text-gray-500 hover:border-slate-300'
                }`}
              >
                <ShieldCheck size={16} />
                Admin
              </button>
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-gray-700 hover:bg-slate-100 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white text-sm font-semibold shadow transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Pencil size={15} />
                  Salvar Alterações
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Seção de Usuários ────────────────────────────────────────────────────────
function SecaoUsuarios() {
  const [usuarios, setUsuarios]   = useState<UsuarioFirestore[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showCriar, setShowCriar] = useState(false);
  const [editando, setEditando]   = useState<UsuarioFirestore | null>(null);
  const [deletando, setDeletando] = useState<UsuarioFirestore | null>(null);

  const carregarUsuarios = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'usuarios'));
      const lista = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as UsuarioFirestore[];
      setUsuarios(lista);
    } catch (err) {
      toast.error('Erro ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const handleDelete = async () => {
    if (!deletando) return;
    try {
      await deleteDoc(doc(db, 'usuarios', deletando.id));
      toast.success(`Usuário ${deletando.nome} excluído com sucesso.`);
      setDeletando(null);
      carregarUsuarios();
    } catch (err) {
      toast.error('Erro ao excluir usuário.');
    }
  };

  return (
    <>
      {/* Modais */}
      {showCriar && (
        <CardCriarUsuario
          onClose={() => setShowCriar(false)}
          onSuccess={carregarUsuarios}
        />
      )}
      {editando && (
        <CardEditarUsuario
          usuario={editando}
          onClose={() => setEditando(null)}
          onSuccess={carregarUsuarios}
        />
      )}
      {deletando && (
        <ModalConfirmDelete
          usuario={deletando}
          onConfirm={handleDelete}
          onCancel={() => setDeletando(null)}
        />
      )}

      {/* Card principal */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">

        {/* Header do card */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-purple-500" />
            <span className="font-semibold text-gray-800">Usuários do Sistema</span>
            <span className="bg-purple-100 text-purple-600 text-xs font-bold px-2 py-0.5 rounded-full">
              {usuarios.length}
            </span>
          </div>
          <button
            onClick={() => setShowCriar(true)}
            className="bg-green-500 hover:bg-green-600 text-white p-1.5 rounded-lg transition shadow-sm hover:shadow-md"
            title="Criar novo usuário"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Lista */}
        <div className="divide-y divide-slate-50">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <span className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : usuarios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-6">
              <div className="bg-slate-100 p-4 rounded-full">
                <UserCircle2 className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-gray-500">Nenhum usuário criado</p>
              <p className="text-xs text-gray-400">
                Clique no <span className="text-green-500 font-bold">+</span> para adicionar o primeiro usuário.
              </p>
            </div>
          ) : (
            usuarios.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${u.role === 'admin' ? 'bg-purple-100' : 'bg-blue-100'}`}>
                    {u.role === 'admin'
                      ? <ShieldCheck size={16} className="text-purple-500" />
                      : <User size={16} className="text-blue-500" />
                    }
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {u.nome} {u.sobrenome}
                    </p>
                    <p className="text-xs text-gray-400">{u.funcao} · {u.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditando(u)}
                    className="p-2 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition"
                    title="Editar usuário"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setDeletando(u)}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
                    title="Excluir usuário"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

// ─── AdminSidebar Principal ───────────────────────────────────────────────────
interface AdminSidebarProps {
  userName: string;
  userEmail: string;
  isAdmin: boolean;
  onClose: () => void;
  onNavigate: (page: 'criar' | 'deletar' | 'editar' | null) => void;
  activePage: 'criar' | 'deletar' | 'editar' | null;
}

export function AdminSidebar({
  userName,
  userEmail,
  onClose,
}: AdminSidebarProps) {
  const [activeSection, setActiveSection] = useState<'usuarios' | null>(null);

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Painel */}
      <div className="fixed left-0 top-0 h-full w-80 z-50 bg-white shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">

        {/* Header */}
        <div className="bg-gradient-to-br from-purple-600 to-blue-600 px-6 py-6 flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-base">{userName}</p>
            <p className="text-purple-200 text-xs">{userEmail}</p>
            <span className="mt-1 inline-flex items-center gap-1 bg-white/20 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
              <ShieldCheck size={11} />
              Administrador
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition p-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* Menu */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2 mb-3">
            Gerenciamento
          </p>

          {/* Item: Usuários */}
          <button
            onClick={() =>
              setActiveSection((prev) => (prev === 'usuarios' ? null : 'usuarios'))
            }
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeSection === 'usuarios'
                ? 'bg-purple-50 text-purple-700'
                : 'text-gray-600 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users size={18} />
              Usuários
            </div>
            <ChevronRight
              size={16}
              className={`transition-transform duration-200 ${
                activeSection === 'usuarios' ? 'rotate-90' : ''
              }`}
            />
          </button>

          {/* Conteúdo expandido */}
          {activeSection === 'usuarios' && (
            <div className="px-1 pt-1">
              <SecaoUsuarios />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100">
          <p className="text-xs text-gray-400 text-center">
            © {new Date().getFullYear()} Studio3D Criativo
          </p>
        </div>
      </div>
    </>
  );
}
