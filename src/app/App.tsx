import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Button } from './components/ui/button';
import { SlotGrid } from './components/SlotGrid';
import { KanbanBoard } from './components/KanbanBoard';
import AdminSidebar from './components/AdminSidebar';
import { PetCodeModal } from './components/PetCodeModal';
import PawBackground from './components/PawBackground';
import { toast, Toaster } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { useSlotsUsadosHoje } from '../hooks/useSlotsUsadosHoje'; // ✅ NOVO
import type { Pet, SlotStatus } from './types/pet';
import {
  addPet,
  subscribeToPets,
  encerrarPet,
  updatePet,
  marcarComoAvisado,
} from '../services/petService';
import {
  LayoutGrid, LayoutList, Filter,
  LogIn, Eye, EyeOff, LogOut, AlertTriangle, Settings,
  PackageCheck,
} from 'lucide-react';
import { EntreguesTab } from './components/EntreguesTab';


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
    if (!success) setError('E-mail ou senha inválidos. Tente novamente.');
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #1a1560 0%, #3B2FBE 40%, #E8192C 100%)' }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-10" style={{ background: '#E8192C' }} />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full opacity-10" style={{ background: '#3B2FBE' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5" style={{ background: '#ffffff' }} />
      </div>

      <div className="relative w-full max-w-md z-10">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">

          <div
            className="flex flex-col items-center gap-2 px-8 pt-10 pb-6"
            style={{ background: 'linear-gradient(160deg, #1a1560 0%, #3B2FBE 60%, #E8192C 100%)' }}
          >
            <div className="bg-white rounded-2xl px-6 py-4 shadow-lg">
              <img
                src="/logo-elite.png"
                alt="Elite Pet Shop"
                width={126}
                height={80}
                className="h-20 w-auto object-contain"
              />
            </div>
            <p className="text-white/70 text-xs mt-2 tracking-widest uppercase font-semibold">
              Sistema de Gestão
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-8 py-8 space-y-5">
            <div className="text-center mb-1">
              <h2 className="text-lg font-bold text-gray-800">Acesse sua conta</h2>
              <p className="text-sm text-gray-400">Informe suas credenciais para continuar</p>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-600">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                autoComplete="email"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none transition"
                onFocus={(e) => (e.target.style.boxShadow = '0 0 0 2px #3B2FBE55')}
                onBlur={(e)  => (e.target.style.boxShadow = '')}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-600">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-2.5 pr-11 rounded-xl border border-slate-200 bg-slate-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none transition"
                  onFocus={(e) => (e.target.style.boxShadow = '0 0 0 2px #3B2FBE55')}
                  onBlur={(e)  => (e.target.style.boxShadow = '')}
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

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-xl flex items-center gap-2">
                <AlertTriangle size={15} className="flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.98]"
              style={{
                background: loading
                  ? '#aaa'
                  : 'linear-gradient(135deg, #3B2FBE 0%, #E8192C 100%)',
              }}
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

        <p className="text-center text-xs text-white/50 mt-5">
          © {new Date().getFullYear()} Elite Pet Shop · Desenvolvido por Studio3D Criativo
        </p>
      </div>
    </div>
  );
}

// ─── Tela de Loading inicial ──────────────────────────────────────────────────
function SplashScreen() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #1a1560 0%, #3B2FBE 40%, #E8192C 100%)' }}
    >
      <div className="flex flex-col items-center gap-5">
        <div className="bg-white rounded-2xl px-6 py-4 shadow-xl">
          <img
            src="/logo-elite.png"
            alt="Elite Pet Shop"
            width={101}
            height={64}
            className="h-16 w-auto object-contain"
          />
        </div>
        <span className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-white/60 tracking-widest uppercase">Verificando sessão...</p>
      </div>
    </div>
  );
}

// ─── App Principal ────────────────────────────────────────────────────────────
export default function App() {
  const { user, loading, error, isAuthenticated, login, logout, isAdmin } = useAuth();

  // ✅ NOVO: slots já queimados hoje (compartilhado entre todos os dispositivos)
  const { marcarUsado } = useSlotsUsadosHoje();

  const [pets, setPets]                         = useState<Pet[]>([]);
  const [filter, setFilter]                     = useState<'all' | 'banho' | 'tosa' | 'banho_tosa' | 'higienica' | 'ozonio' | 'hidratacao'>('all');
  const [dailyCounter, setDailyCounter]         = useState<number>(1);
  const [showLogoutModal, setShowLogoutModal]   = useState(false);
  const [showAdminSidebar, setShowAdminSidebar] = useState(false);
  const [adminActivePage, setAdminActivePage]   = useState<'criar' | 'deletar' | 'editar' | null>(null);

  const [codigoModal, setCodigoModal] = useState<{
    petNumber: string;
    nomePet: string;
  } | null>(null);

  // 🔥 Escuta os pets do dia em tempo real
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribe = subscribeToPets(
      (petsDoFirestore: Pet[]) => setPets(petsDoFirestore ?? []),
      () => toast.error('Erro ao carregar pets. Verifique sua conexão.'),
    );

    return () => unsubscribe();
  }, [isAuthenticated]);

  if (loading) return <SplashScreen />;

  if (!isAuthenticated) {
    return (
      <>
        <Toaster position="top-right" richColors />
        <LoginScreen
          onLogin={async (email, password) => {
            const success = await login(email, password);
            if (success) {
              toast.success('Bem-vindo ao Elite Pet Shop! 🐾');
            } else if (error) {
              toast.error(error);
            }
            return success;
          }}
        />
      </>
    );
  }

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleRevertService = async (petId: string, etapa: string, motivo: string) => {
    const pet = pets.find((p) => p.id === petId);
    if (!pet) return;

    const updates: Partial<Pet> = {
      historicoReversoes: [
        ...(pet.historicoReversoes || []),
        { etapa, motivo, data: new Date().toISOString() },
      ],
    };

    if (etapa === 'banho') {
      updates.status               = 'espera' as SlotStatus;
      updates.profissionalBanho    = null;
      updates.banhoCompleto        = false;
      updates.problemasSaudeBanho  = [];
      updates.atendimentoIniciado  = false;
    } else if (etapa === 'escovar') {
      updates.status                = 'banho' as SlotStatus;
      updates.profissionalEscovar   = null;
      updates.escovarCompleto       = false;
      updates.problemasSaudeEscovar = [];
    } else if (etapa === 'tosa') {
      updates.status              = 'escovar' as SlotStatus;
      updates.profissionalTosa    = null;
      updates.tosaCompleta        = false;
      updates.problemasSaudeTosa  = [];
    }

    try {
      await updatePet(petId, updates);
      toast.success(`Serviço de ${etapa} revertido com sucesso.`);
    } catch {
      toast.error('Erro ao reverter serviço. Tente novamente.');
    }
  };

  const handleUpdateStatus = async (petId: string, newStatus: SlotStatus) => {
    const updates: Partial<Pet> = { status: newStatus };
    if (newStatus === 'banho')   { updates.banhoCompleto = false; updates.escovarCompleto = false; }
    if (newStatus === 'escovar') { updates.escovarCompleto = false; updates.tosaCompleta = false; }
    if (newStatus === 'tosa')    { updates.tosaCompleta = false; }

    try {
      await updatePet(petId, updates);
    } catch {
      toast.error('Erro ao atualizar status. Tente novamente.');
    }
  };

  const handleAddPet = async (petData: Omit<Pet, 'id' | 'checkInTime'>) => {
    try {
      const { petNumber, isNovo } = await addPet(petData);
      setDailyCounter((c) => c + 1);
      toast.success(`${petData.nomePet} cadastrado com sucesso! 🐾`);
      if (isNovo) {
        setCodigoModal({ petNumber, nomePet: petData.nomePet });
      }
    } catch {
      toast.error('Erro ao cadastrar pet. Tente novamente.');
    }
  };

  // ✅ ATUALIZADO: SlotGrid — 'avisado' não queima, 'entregue' queima
  const handleCheckoutWithType = async (petId: string, tipo?: 'entregue' | 'avisado') => {
    const pet = pets.find((p) => p.id === petId);
    if (!pet) return;

    const slot = pet.slotNumber;

    try {
      if (tipo === 'avisado') {
        await marcarComoAvisado(pet);
        toast.success(`${pet.nomePet} marcado como avisado! 📞`);
      } else {
        await encerrarPet(pet, 'entregue');
        if (slot) await marcarUsado(slot);
        toast.success(`${pet.nomePet} entregue ao tutor! 🐾`);
      }
    } catch {
      toast.error('Erro ao atualizar pet. Tente novamente.');
    }
  };

  const handleEditPet = async (petId: string, updatedData: Partial<Pet>) => {
    try {
      await updatePet(petId, updatedData);
    } catch (err) {
      console.error('[handleEditPet] Erro ao editar pet:', err);
      toast.error('Erro ao editar pet. Tente novamente.');
    }
  };

  // ⚠️ Remoção NÃO queima o slot — libera para reuso
  const handleDeletePet = async (petId: string) => {
    const pet = pets.find((p) => p.id === petId);
    if (!pet) return;
    try {
      await encerrarPet(pet, 'removido');
      toast.success(`${pet.nomePet} removido da fila.`);
    } catch (err) {
      console.error('[handleDeletePet] Erro ao remover pet:', err);
      toast.error('Erro ao remover o pet. Tente novamente.');
    }
  };

  const handleAssignProfessional = async (
    petId: string,
    pB?: string,
    pT?: string,
    pE?: string,
  ) => {
    const pet = pets.find((p) => p.id === petId);
    if (!pet) return;

    const updates: Partial<Pet> = {
      ...(pB !== undefined && { profissionalBanho: pB }),
      ...(pT !== undefined && { profissionalTosa: pT }),
      ...(pE !== undefined && { profissionalEscovar: pE }),
      status: pet.status === 'espera' ? ('banho' as SlotStatus) : pet.status,
      atendimentoIniciado: true,
    };

    try {
      await updatePet(petId, updates);
    } catch {
      toast.error('Erro ao atribuir profissional. Tente novamente.');
    }
  };

  const handleAdvanceStage = async (
    petId: string,
    newStatus: SlotStatus,
    profissionais: { pB?: string; pT?: string; pE?: string },
    problemasField?: { campo: string; delta: string[] },
  ) => {
    const updates: Partial<Pet> = {
      status: newStatus,
      atendimentoIniciado: true,
      ...(profissionais.pB !== undefined && { profissionalBanho: profissionais.pB }),
      ...(profissionais.pT !== undefined && { profissionalTosa: profissionais.pT }),
      ...(profissionais.pE !== undefined && { profissionalEscovar: profissionais.pE }),
    };

    if (newStatus === 'banho')   { updates.banhoCompleto = false; updates.escovarCompleto = false; }
    if (newStatus === 'escovar') { updates.escovarCompleto = false; updates.tosaCompleta = false; }
    if (newStatus === 'tosa')    { updates.tosaCompleta = false; }

    if (problemasField) {
      (updates as any)[problemasField.campo] = problemasField.delta;
    }

    try {
      await updatePet(petId, updates);
    } catch {
      toast.error('Erro ao avançar etapa. Tente novamente.');
    }
  };

  const handleMarkServiceComplete = async (
    petId: string,
    type: 'banho' | 'escovar' | 'tosa',
  ) => {
    const updates: Partial<Pet> = {};
    if (type === 'banho')   updates.banhoCompleto   = true;
    if (type === 'escovar') updates.escovarCompleto = true;
    if (type === 'tosa')    updates.tosaCompleta    = true;

    try {
      await updatePet(petId, updates);
    } catch {
      toast.error('Erro ao marcar serviço. Tente novamente.');
    }
  };

  const handleLogoutConfirm = async () => {
    await logout();
    setShowLogoutModal(false);
    setPets([]);
    setDailyCounter(1);
    toast.success('Sessão encerrada com sucesso.');
  };

  return (
    <div className="min-h-screen bg-pet-pattern relative">
      <PawBackground quantidade={25} imgSrc="/paw.png" espacamento={1.2} />

      <Toaster position="top-right" richColors />

      {codigoModal && (
        <PetCodeModal
          petNumber={codigoModal.petNumber}
          nomePet={codigoModal.nomePet}
          onClose={() => setCodigoModal(null)}
        />
      )}

      {showLogoutModal && (
        <LogoutModal
          onConfirm={handleLogoutConfirm}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}

      {showAdminSidebar && (
        <AdminSidebar
          onClose={() => setShowAdminSidebar(false)}
          currentUserRole={isAdmin ? 'admin' : 'user'}
        />
      )}

      <div className="relative z-10">

        <div
          className="shadow-md"
          style={{ background: 'linear-gradient(135deg, #1a1560 0%, #3B2FBE 50%, #E8192C 100%)' }}
        >
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">

            <div className="flex items-center gap-4">
              <div className="bg-white rounded-xl px-4 py-2 shadow-md">
                <img
                  src="/logo-elite.png"
                  alt="Elite Pet Shop"
                  width={63}
                  height={40}
                  className="h-10 w-auto object-contain"
                />
              </div>
              <div className="hidden sm:block">
                <p className="text-white/60 text-xs capitalize">
                  {user?.email?.split('@')[0] ?? 'Sistema de Gestão'}
                </p>
              </div>
            </div>

            <div className="flex-1 flex justify-center">
              <h1 className="text-white text-xl sm:text-2xl font-bold tracking-wide text-center truncate">
                Elite Pet Shop
              </h1>
            </div>

            <div className="flex items-center gap-2">
              {isAdmin && (
                <button
                  onClick={() => setShowAdminSidebar(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white/90 hover:bg-white/10 transition"
                >
                  <Settings size={16} />
                  <span className="hidden sm:inline">Admin</span>
                </button>
              )}
              <button
                onClick={() => setShowLogoutModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white/90 hover:bg-white/10 transition"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          <Tabs defaultValue="grid" className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
              <TabsList className="bg-slate-100">
                <TabsTrigger value="grid"   className="gap-2"><LayoutGrid size={18} /> Grade</TabsTrigger>
                <TabsTrigger value="kanban" className="gap-2"><LayoutList size={18} /> Fluxo</TabsTrigger>
                <TabsTrigger value="entregues" className="gap-2"><PackageCheck size={18} /> Entregues</TabsTrigger>
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
                  <option value="banho_tosa">Banho e Tosa</option>
                  <option value="higienica">Tosa Higiênica</option>
                  <option value="ozonio">Ozônio</option>
                  <option value="hidratacao">Hidratação</option>
                </select>
              </div>
            </div>

            <TabsContent value="grid">
              <SlotGrid
                pets={pets}
                onAddPet={handleAddPet}
                onEditPet={handleEditPet}
                onDeletePet={handleDeletePet}
                onCheckout={handleCheckoutWithType}
                filter={filter}
              />
            </TabsContent>

            <TabsContent value="kanban">
              <KanbanBoard
                pets={pets}
                onUpdateStatus={handleUpdateStatus}
                onCheckout={handleCheckoutWithType}
                onAddPet={handleAddPet}
                onEditPet={handleEditPet}
                onDeletePet={handleDeletePet}
                onAssignProfessional={handleAssignProfessional}
                onMarkServiceComplete={handleMarkServiceComplete}
                onRevertService={handleRevertService}
                onAdvanceStage={handleAdvanceStage}
              />
            </TabsContent>

            <TabsContent value="entregues">
              <EntreguesTab />
            </TabsContent>
          </Tabs>
        </div>

      </div>
    </div>
  );
}
