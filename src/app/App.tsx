import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Button } from './components/ui/button';
import { SlotGrid } from './components/SlotGrid';
import { KanbanBoard } from './components/KanbanBoard';
import { AdminSidebar } from './components/AdminSidebar';
import {
  LayoutGrid, LayoutList, Dog, Filter,
  LogIn, Eye, EyeOff, LogOut, AlertTriangle, Settings,
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import type { Pet, SlotStatus } from './types/pet';
import { addPet, subscribeToPets, deletePet, updatePet } from '../services/petService';

// ─── Modal de Confirmação de Logout ──────────────────────────────────────────
function LogoutModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-sm p-8 flex flex-col items-center gap-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-br from-red-100 to-orange-100 p-4 rounded-2xl">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold text-gray-900">Deseja sair realmente?</h2>
          <p className="text-sm text-gray-500">
            Sua sessão será encerrada e você precisará fazer login novamente para acessar o sistema.
          </p>
        </div>
        <div className="flex gap-3 w-full mt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-gray-700 hover:bg-slate-100 transition"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <LogOut size={15} />
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tela de Login ────────────────────────────────────────────────────────────
function LoginScreen({
  onLogin,
}: {
  onLogin: (email: string, password: string) => Promise<boolean>;
}) {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const success = await onLogin(email, password);
    if (success) {
      toast.success('Bem-vindo ao PetShop Manager! 🐾');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-br from-blue-500 to-purple-500 px-8 py-10 flex flex-col items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
              <Dog className="w-10 h-10 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white">PetShop Manager</h1>
              <p className="text-blue-100 text-sm mt-1">Studio3D Criativo - Gestão</p>
            </div>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="px-8 py-8 space-y-5">
            <div className="text-center mb-2">
              <h2 className="text-lg font-semibold text-gray-800">Acesse sua conta</h2>
              <p className="text-sm text-gray-500">Informe suas credenciais para continuar</p>
            </div>

            {/* E-mail */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                autoComplete="email"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
              />
            </div>

            {/* Senha */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-2.5 pr-11 rounded-lg border border-slate-200 bg-slate-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Erro */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-lg">
                {error}
              </div>
            )}

            {/* Botão */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-2.5 rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={18} />
                  Entrar
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} Studio3D Criativo. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}

// ─── Tela de Loading inicial ──────────────────────────────────────────────────
function SplashScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-purple-500 p-4 rounded-2xl shadow-lg">
          <Dog className="w-8 h-8 text-white" />
        </div>
        <span className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Verificando sessão...</p>
      </div>
    </div>
  );
}

// ─── App Principal ────────────────────────────────────────────────────────────
export default function App() {
  const { user, loading, error, isAuthenticated, login, logout, isAdmin } = useAuth();

  const [pets, setPets]                         = useState<Pet[]>([]);
  const [filter, setFilter]                     = useState<'all' | 'banho' | 'tosa' | 'banho_tosa' | 'higienica' | 'ozonio' | 'hidratacao'>('all');
  const [dailyCounter, setDailyCounter]         = useState<number>(1);
  const [showLogoutModal, setShowLogoutModal]   = useState(false);
  const [showAdminSidebar, setShowAdminSidebar] = useState(false);
  const [adminActivePage, setAdminActivePage]   = useState<'criar' | 'deletar' | 'editar' | null>(null);

  // 🔥 Escuta os pets do dia em tempo real
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribe = subscribeToPets(
      (petsDoFirestore: Pet[]) => setPets(petsDoFirestore ?? []),
      () => toast.error('Erro ao carregar pets. Verifique sua conexão.'),
    );

    return () => unsubscribe();
  }, [isAuthenticated]);

  // 1️⃣ Firebase ainda verificando sessão → exibe splash
  if (loading) return <SplashScreen />;

  // 2️⃣ Não autenticado → exibe login
  if (!isAuthenticated) {
    return (
      <>
        <Toaster position="top-right" richColors />
        <LoginScreen
          onLogin={async (email, password) => {
            const success = await login(email, password);
            if (!success && error) toast.error(error);
            return success;
          }}
        />
      </>
    );
  }

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleRevertService = (petId: string, etapa: string, motivo: string) => {
    setPets((prev) =>
      prev.map((pet) => {
        if (pet.id !== petId) return pet;
        return {
          ...pet,
          status: 'espera' as SlotStatus,
          banhoCompleto: false,
          escovarCompleto: false,
          tosaCompleta: false,
          atendimentoIniciado: false,
          historicoReversoes: [
            ...(pet.historicoReversoes || []),
            { etapa, motivo, data: new Date().toISOString() },
          ],
        };
      }),
    );
    toast.success(`Serviço de ${etapa} revertido com sucesso.`);
  };

  const handleUpdateStatus = (petId: string, newStatus: SlotStatus) => {
    setPets((prev) =>
      prev.map((pet) => {
        if (pet.id !== petId) return pet;
        const updated = { ...pet, status: newStatus };
        if (newStatus === 'banho')   { updated.banhoCompleto = false; updated.escovarCompleto = false; }
        if (newStatus === 'escovar') { updated.escovarCompleto = false; updated.tosaCompleta = false; }
        if (newStatus === 'tosa')    { updated.tosaCompleta = false; }
        return updated;
      }),
    );
  };

  const handleAddPet = async (petData: Omit<Pet, 'id' | 'checkInTime'>) => {
    try {
      await addPet(petData);
      setDailyCounter((c) => c + 1);
      toast.success(`${petData.nomePet} cadastrado com sucesso! 🐾`);
    } catch {
      toast.error('Erro ao cadastrar pet. Tente novamente.');
    }
  };

  const handleCheckout = (petId: string) => {
    const pet = pets.find((p) => p.id === petId);
    setPets((prev) => prev.filter((p) => p.id !== petId));
    if (pet) toast.success(`${pet.nomePet} retirado com sucesso!`);
  };

  const handleEditPet = async (petId: string, updatedData: Partial<Pet>) => {
    try {
      await updatePet(petId, updatedData);
      setPets((prev) =>
        prev.map((p) => (p.id === petId ? { ...p, ...updatedData } : p)),
      );
    } catch {
      toast.error('Erro ao editar pet. Tente novamente.');
    }
  };

  const handleDeletePet = async (petId: string) => {
    const pet = pets.find((p) => p.id === petId);
    if (!pet) return;
    try {
      await deletePet(pet);
    } catch (err) {
      console.error('[handleDeletePet] Erro ao deletar pet:', err);
      toast.error('Erro ao deletar o pet. Tente novamente.');
    }
  };

  const handleAssignProfessional = (petId: string, pB?: string, pT?: string, pE?: string) => {
    setPets((prev) =>
      prev.map((p) =>
        p.id === petId
          ? {
              ...p,
              profissionalBanho: pB,
              profissionalTosa: pT,
              profissionalEscovar: pE,
              status: p.status === 'espera' ? ('banho' as SlotStatus) : p.status,
              atendimentoIniciado: true,
            }
          : p,
      ),
    );
  };

  const handleMarkServiceComplete = (petId: string, type: 'banho' | 'escovar' | 'tosa') => {
    setPets((prev) =>
      prev.map((p) => {
        if (p.id !== petId) return p;
        const updated = { ...p };
        if (type === 'banho')   updated.banhoCompleto   = true;
        if (type === 'escovar') updated.escovarCompleto = true;
        if (type === 'tosa')    updated.tosaCompleta    = true;
        return updated;
      }),
    );
  };

  const handleLogoutConfirm = async () => {
    await logout();
    setShowLogoutModal(false);
    setPets([]);
    setDailyCounter(1);
    toast.success('Sessão encerrada com sucesso.');
  };

  // 3️⃣ Autenticado → renderiza app completo
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <Toaster position="top-right" richColors />

      {/* Modal de logout */}
      {showLogoutModal && (
        <LogoutModal
          onConfirm={handleLogoutConfirm}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}

      {/* Sidebar Admin */}
      {showAdminSidebar && (
        <AdminSidebar
          userName={user?.displayName ?? user?.email ?? 'Usuário'}
          userEmail={user?.email ?? ''}
          isAdmin={isAdmin}
          onClose={() => setShowAdminSidebar(false)}
          onNavigate={(page) => setAdminActivePage(page)}
          activePage={adminActivePage}
        />
      )}

      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-purple-500 p-3 rounded-lg">
              <Dog className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">PetShop Manager</h1>
              <p className="text-sm text-gray-500">
                {user?.email ?? 'Studio3D Criativo - Gestão'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Botão Admin — só aparece para admins */}
            {isAdmin && (
              <Button
                variant="ghost"
                className="text-purple-600 font-bold flex items-center gap-2 hover:bg-purple-50"
                onClick={() => setShowAdminSidebar(true)}
              >
                <Settings size={16} />
                Admin
              </Button>
            )}

            <Button
              variant="ghost"
              className="text-red-500 font-bold flex items-center gap-2 hover:bg-red-50"
              onClick={() => setShowLogoutModal(true)}
            >
              <LogOut size={16} />
              Sair
            </Button>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs defaultValue="grid" className="space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <TabsList className="bg-slate-100">
              <TabsTrigger value="grid"   className="gap-2"><LayoutGrid size={18} /> Grade</TabsTrigger>
              <TabsTrigger value="kanban" className="gap-2"><LayoutList size={18} /> Fluxo</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-400" />
              <select
                className="text-sm border-none bg-transparent font-medium focus:ring-0"
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
              >
                <option value="all">Todos os Serviços</option>
                <option value="banho">Banho</option>
                <option value="tosa">Tosa</option>
              </select>
            </div>
          </div>

          <TabsContent value="grid">
            <SlotGrid
              pets={pets}
              onAddPet={handleAddPet}
              onEditPet={handleEditPet}
              onDeletePet={handleDeletePet}
              filter={filter}
            />
          </TabsContent>

          <TabsContent value="kanban">
            <KanbanBoard
              pets={pets}
              onUpdateStatus={handleUpdateStatus}
              onCheckout={handleCheckout}
              onAddPet={handleAddPet}
              onEditPet={handleEditPet}
              onDeletePet={handleDeletePet}
              onAssignProfessional={handleAssignProfessional}
              onMarkServiceComplete={handleMarkServiceComplete}
              onRevertService={handleRevertService}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
