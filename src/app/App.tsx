import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { SlotGrid } from './components/SlotGrid';
import { KanbanBoard } from './components/KanbanBoard';
import AdminSidebar from './components/AdminSidebar';
import { PetCodeModal } from './components/PetCodeModal';
import PawBackground from './components/PawBackground';
import { toast, Toaster } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { useSlotsUsadosHoje } from '../hooks/useSlotsUsadosHoje'; // ✅ NOVO
import { useDiaAtual } from '../hooks/useDiaAtual';
import type { Pet, SlotStatus } from './types/pet';
import { mesmosAlertas } from '../utils/alertas';
import { addPet, subscribeToPets, encerrarPet, updatePet, marcarComoAvisado, getPetsPendentes, SLOT_OCUPADO, SLOT_USADO, JA_ENCERRADO, CAMPOS_OBRIGATORIOS, garantirReservasDeVaga, atualizarFichaComEdicao, CAMPOS_FICHA } from '../services/petService';
import { PendentesBanner } from './components/PendentesBanner';
import { LayoutGrid, LayoutList, Filter, LogOut, Settings, PackageCheck, Eye } from 'lucide-react';
import { useSuporteAcompanhando } from '../hooks/useSuporteAcompanhando';
import { informarAba, type AbaLoja } from '../lib/espelho';
import { EntreguesTab } from './components/EntreguesTab';
import { criarLinkTutor, atualizarLinkTutor } from '../services/acompanhamentoService';
import type { SituacaoTutor } from '../utils/acompanhamento';

import { LogoutModal } from './components/LogoutModal';
import { LoginScreen, SplashScreen } from './components/TelaLogin';
import { TelaPrimeiroAcesso } from './components/TelaPrimeiroAcesso';
// o Painel do Dono só é baixado por quem é dono (as lojas não carregam esse código)
const PainelDono = lazy(() => import('./components/dono/PainelDono').then((m) => ({ default: m.PainelDono })));
import { AvisoSistema } from './components/AvisoSistema';
import { nomeLoja } from '../lib/lojaAtual';
import { useVisualLoja, useAplicarCoresLoja } from '../hooks/useVisualLoja';
import { fundoTopo } from '../utils/cores';

// ─── App Principal ────────────────────────────────────────────────────────────
export default function App() {
  const { user, loading, error, isAuthenticated, login, logout, isAdmin, isDono, trocarSenha, nome, senhaTrocada } = useAuth();
  const visual = useVisualLoja(); // logo e cores da Personalização
  useAplicarCoresLoja(visual);    // e as mesmas cores no Painel Admin

  // ✅ NOVO: slots já queimados hoje (compartilhado entre todos os dispositivos)
  const { marcarUsado } = useSlotsUsadosHoje();

  const [pets, setPets]                         = useState<Pet[]>([]);
  const [filter, setFilter]                     = useState<'all' | 'banho' | 'tosa' | 'banho_tosa' | 'higienica' | 'ozonio' | 'hidratacao'>('all');
  const [showLogoutModal, setShowLogoutModal]   = useState(false);
  const [showAdminSidebar, setShowAdminSidebar] = useState(false);

  const [codigoModal, setCodigoModal] = useState<{
    petNumber: string;
    nomePet: string;
  } | null>(null);

  // ✅ Dia atual que muda sozinho na meia-noite (tablet ligado direto)
  const dia = useDiaAtual();

  // ✅ Pets esquecidos na fila de dias anteriores (aviso para encerrar)
  const [pendentes, setPendentes] = useState<Pet[]>([]);

  // 🔥 Escuta os pets do dia em tempo real
  // ✅ Depende da CONTA (uid) e do DIA: se a conta mudar ou o dia virar
  //    sem recarregar a página, a lista é zerada e buscada de novo.
  // ✅ o dono do sistema não tem loja: nada da fila é carregado para ele
  // ✅ primeiro acesso (senha provisória): nada da loja é carregado até a pessoa criar a senha
  const uid = isDono || trocarSenha ? null : user?.uid ?? null;

  // ✅ Suporte ao vivo: enquanto o proprietário acompanha, este aparelho conta o que está aberto
  const acompanhando = useSuporteAcompanhando(!!uid, user?.displayName || user?.email?.split('@')[0] || 'Aparelho');
  useEffect(() => {
    setPets([]); // nunca mostra a lista de outra conta / de outro dia
    if (!uid) return;

    const unsubscribe = subscribeToPets(
      (petsDoFirestore: Pet[]) => setPets(petsDoFirestore ?? []),
      () => {
        setPets([]); // acesso negado/erro: não deixa dados antigos na tela
        toast.error('Erro ao carregar pets. Verifique sua conexão.');
      },
      dia,
    );

    return () => unsubscribe();
  }, [uid, dia]);

  // ✅ Reserva a vaga de pets que já estavam na fila antes desta versão.
  //    Confere cada pet uma única vez por dia/conta; pets novos já chegam reservados.
  const reservasConferidas = useRef(new Set<string>());
  useEffect(() => {
    reservasConferidas.current = new Set();
  }, [uid, dia]);
  useEffect(() => {
    if (!uid) return;
    const aConferir = pets.filter((p) => p.dia === dia && !reservasConferidas.current.has(p.id));
    if (aConferir.length === 0) return;
    aConferir.forEach((p) => reservasConferidas.current.add(p.id));
    garantirReservasDeVaga(dia, aConferir).catch((err) => {
      console.error('[reservas de vaga]', err);
      aConferir.forEach((p) => reservasConferidas.current.delete(p.id)); // tenta de novo depois
    });
  }, [pets, uid, dia]);

  // ✅ Busca pendentes ao entrar e a cada virada de dia
  const carregarPendentes = async () => {
    try {
      setPendentes(await getPetsPendentes(dia));
    } catch (err) {
      console.error('[pendentes] erro ao carregar:', err);
      setPendentes([]);
    }
  };
  useEffect(() => {
    setPendentes([]);
    if (!uid) return;
    void carregarPendentes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, dia]);

  if (loading) return <SplashScreen />;

  if (!isAuthenticated) {
    return (
      <>
        <Toaster position="top-right" richColors />
        <LoginScreen
          error={error}
          onLogin={async (email, password) => {
            const success = await login(email, password);
            // ✅ só dá boas-vindas quando o acesso foi realmente liberado;
            //    em caso de recusa, o motivo aparece na própria tela de login
            if (success) toast.success(`Bem-vindo ao ${nomeLoja() || 'Pata & Gestão'}! 🐾`);
            return success;
          }}
        />
      </>
    );
  }

  // ✅ Primeiro acesso: a pessoa cria a própria senha antes de usar o sistema
  if (trocarSenha) {
    return (
      <>
        <Toaster position="top-right" richColors />
        <TelaPrimeiroAcesso nome={nome} onSalvo={senhaTrocada} onSair={logout} />
      </>
    );
  }

  // ✅ Dono do sistema: abre o Painel do Dono em vez da fila
  if (isDono) {
    return (
      <>
        <Toaster position="top-right" richColors />
        <Suspense fallback={<SplashScreen />}>
          <PainelDono nomeDono={user?.displayName || user?.email?.split('@')[0] || 'Proprietário'} meuUid={user?.uid} onLogout={logout} />
        </Suspense>
      </>
    );
  }

  // ── Handlers ─────────────────────────────────────────────────────────────────

  /** ✅ Dia da fila onde o pet está (para editar no lugar certo) */
  const diaDoPet = (petId: string) => pets.find((p) => p.id === petId)?.dia;

  /** ✅ Portal do tutor: leva a nova etapa ao link do pet (se ele tiver link) */
  const seguirLink = (petId: string, status?: SlotStatus) => {
    const pet = pets.find((p) => p.id === petId);
    if (pet?.linkTutor && status && status !== 'livre' && status !== pet.status) {
      void atualizarLinkTutor(pet.linkTutor, status as SituacaoTutor);
    }
  };

  /** ✅ Encerra um pet esquecido de dia anterior (registro vai para o dia dele) */
  const handleEncerrarPendente = async (pet: Pet, tipo: 'entregue' | 'removido') => {
    try {
      await encerrarPet(pet, tipo); // usa pet.dia → log e exclusão no dia certo
      void atualizarLinkTutor(pet.linkTutor, tipo);
      toast.success(
        tipo === 'entregue'
          ? `${pet.nomePet} registrado como entregue.`
          : `${pet.nomePet} removido da fila antiga.`,
      );
    } catch (err) {
      if (err instanceof Error && err.message === JA_ENCERRADO) {
        toast.info(`${pet.nomePet} já tinha sido encerrado em outro aparelho.`);
      } else {
        console.error('[handleEncerrarPendente]', err);
        toast.error('Erro ao encerrar o pet. Tente novamente.');
      }
    } finally {
      await carregarPendentes();
    }
  };

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
      await updatePet(petId, updates, diaDoPet(petId));
      seguirLink(petId, updates.status);
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
      await updatePet(petId, updates, diaDoPet(petId));
      seguirLink(petId, newStatus);
    } catch {
      toast.error('Erro ao atualizar status. Tente novamente.');
    }
  };

  /** ✅ Retorna true se cadastrou; false mantém o formulário aberto (dados preservados) */
  const handleAddPet = async (petData: Omit<Pet, 'id' | 'checkInTime'>): Promise<boolean> => {
    try {
      const { id, petNumber, isNovo } = await addPet(petData, dia);
      toast.success(`${petData.nomePet} cadastrado com sucesso! 🐾`);
      // ✅ Portal do tutor: o link nasce na entrada do pet (falha aqui não atrapalha o cadastro)
      criarLinkTutor({ ...petData, id, dia, checkInTime: new Date().toISOString() } as Pet)
        .catch((err) => console.error('[link do tutor] não foi criado', err));
      if (isNovo) {
        setCodigoModal({ petNumber, nomePet: petData.nomePet });
      }
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === SLOT_OCUPADO) {
        toast.error(`O slot ${petData.slotNumber} acabou de ser ocupado em outro aparelho. Escolha outro slot.`);
      } else if (msg === SLOT_USADO) {
        toast.error(`O slot ${petData.slotNumber} já foi usado hoje. Escolha outro slot.`);
      } else if (msg === CAMPOS_OBRIGATORIOS) {
        toast.error('Preencha espécie, porte e raça antes de finalizar o cadastro.');
      } else {
        console.error('[handleAddPet]', err);
        toast.error('Erro ao cadastrar pet. Tente novamente.');
      }
      return false;
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
        void atualizarLinkTutor(pet.linkTutor, 'entregue');
        // ✅ só "queima" o slot de hoje se o pet for da fila de hoje
        if (slot && (!pet.dia || pet.dia === dia)) await marcarUsado(slot);
        toast.success(`${pet.nomePet} entregue ao tutor! 🐾`);
      }
    } catch (err) {
      if (err instanceof Error && err.message === JA_ENCERRADO) {
        // toque duplo ou outro aparelho já entregou: nada a fazer
        toast.info(`${pet.nomePet} já tinha sido encerrado.`);
      } else {
        toast.error('Erro ao atualizar pet. Tente novamente.');
      }
    }
  };

  const handleEditPet = async (petId: string, updatedData: Partial<Pet>) => {
    const pet = pets.find((p) => p.id === petId);
    try {
      await updatePet(petId, updatedData, diaDoPet(petId));
    } catch (err) {
      console.error('[handleEditPet] Erro ao editar pet:', err);
      toast.error('Erro ao editar pet. Tente novamente.');
      return;
    }

    // ✅ Correções de nome, tutor, telefone, espécie, raça, porte, foto
    //    e alertas também vão para a ficha permanente (valem na próxima visita).
    //    Observação e serviço continuam só no atendimento do dia.
    if (!pet?.petNumber) return;
    const mudancas: Record<string, string | string[]> = {};
    for (const k of CAMPOS_FICHA) {
      const novo = (updatedData as any)[k];
      if (novo === undefined) continue;
      const mudou = Array.isArray(novo)
        ? !mesmosAlertas(novo, (pet as any)[k])
        : novo !== ((pet as any)[k] ?? (k === 'alertaObs' ? '' : undefined));
      if (mudou) mudancas[k] = novo;
    }
    if (Object.keys(mudancas).length === 0) return;
    try {
      await atualizarFichaComEdicao(pet.petNumber, mudancas);
    } catch (err) {
      console.error('[handleEditPet] Erro ao atualizar a ficha:', err);
      toast.error('O atendimento foi salvo, mas a ficha permanente não foi atualizada.');
    }
  };

  // ⚠️ Remoção NÃO queima o slot — libera para reuso
  const handleDeletePet = async (petId: string) => {
    const pet = pets.find((p) => p.id === petId);
    if (!pet) return;
    try {
      await encerrarPet(pet, 'removido');
      void atualizarLinkTutor(pet.linkTutor, 'removido');
      toast.success(`${pet.nomePet} removido da fila.`);
    } catch (err) {
      if (err instanceof Error && err.message === JA_ENCERRADO) {
        toast.info(`${pet.nomePet} já tinha sido encerrado.`);
      } else {
        console.error('[handleDeletePet] Erro ao remover pet:', err);
        toast.error('Erro ao remover o pet. Tente novamente.');
      }
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
      await updatePet(petId, updates, diaDoPet(petId));
      seguirLink(petId, updates.status);
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
      await updatePet(petId, updates, diaDoPet(petId));
      seguirLink(petId, newStatus);
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
      await updatePet(petId, updates, diaDoPet(petId));
    } catch {
      toast.error('Erro ao marcar serviço. Tente novamente.');
    }
  };

  const handleLogoutConfirm = async () => {
    await logout();
    setShowLogoutModal(false);
    setPets([]);
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
          style={{ background: fundoTopo(visual.cores) }}
        >
          <div className="max-w-7xl mx-auto px-3 py-2 gap-2 sm:gap-0 sm:px-6 sm:py-3 flex items-center justify-between">

            <div className="flex items-center gap-4 shrink-0">
              <div className="bg-white rounded-lg px-2 py-1 sm:rounded-xl sm:px-4 sm:py-2 shadow-md">
                <img
                  src={visual.logo}
                  alt={visual.nome}
                  width={63}
                  height={40}
                  className="h-7 sm:h-10 w-auto max-w-[72px] sm:max-w-none object-contain"
                />
              </div>
              <div className="hidden sm:block">
                <p className="text-white/60 text-xs capitalize">
                  {user?.email?.split('@')[0] ?? 'Pata & Gestão'}
                </p>
              </div>
            </div>

            <div className="flex-1 min-w-0 flex justify-center">
              <h1 className="text-white text-base leading-tight line-clamp-2 break-words sm:line-clamp-none sm:leading-normal sm:text-2xl font-bold tracking-wide text-center sm:truncate">
                {visual.nome}
              </h1>
            </div>

            <div className="flex items-center gap-0.5 sm:gap-2 shrink-0">
              {isAdmin && (
                <button
                  onClick={() => setShowAdminSidebar(true)}
                  aria-label="Admin"
                  className="flex items-center gap-2 p-2.5 sm:px-4 sm:py-2 rounded-lg text-sm font-semibold text-white/90 hover:bg-white/10 transition"
                >
                  <Settings size={16} />
                  <span className="hidden sm:inline">Admin</span>
                </button>
              )}
              <button
                onClick={() => setShowLogoutModal(true)}
                aria-label="Sair"
                className="flex items-center gap-2 p-2.5 sm:px-4 sm:py-2 rounded-lg text-sm font-semibold text-white/90 hover:bg-white/10 transition"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-3 py-4 sm:px-6 sm:py-8">
          <AvisoSistema />

          {acompanhando && (
            <div className="fixed bottom-4 left-4 z-[60] flex items-center gap-2 rounded-full bg-slate-900/85 text-white text-xs font-semibold px-3.5 py-2 shadow-lg">
              <Eye size={14} /> Suporte Pata &amp; Gestão acompanhando esta tela
            </div>
          )}

          {/* ✅ Aviso de pets esquecidos em dias anteriores */}
          {pendentes.length > 0 && (
            <div className="mb-6">
              <PendentesBanner pendentes={pendentes} onEncerrar={handleEncerrarPendente} />
            </div>
          )}

          <Tabs defaultValue="grid" className="space-y-6" onValueChange={(v) => informarAba(v as AbaLoja)}>
            <div className="flex flex-col items-stretch gap-3 p-3 sm:flex-row sm:justify-between sm:items-center sm:gap-0 sm:p-4 bg-white rounded-xl shadow-sm border border-slate-100">
              {/* celular: abas na largura toda e o filtro na linha de baixo */}
              <TabsList className="bg-slate-100 w-full h-11 sm:w-fit sm:h-9">
                <TabsTrigger value="grid"   className="gap-1.5 px-1 sm:gap-2 sm:px-2"><LayoutGrid size={18} /> Grade</TabsTrigger>
                <TabsTrigger value="kanban" className="gap-1.5 px-1 sm:gap-2 sm:px-2"><LayoutList size={18} /> Fluxo</TabsTrigger>
                <TabsTrigger value="entregues" className="gap-1.5 px-1 sm:gap-2 sm:px-2"><PackageCheck size={18} /> Entregues</TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 sm:bg-transparent sm:px-0">
                <Filter size={16} className="text-slate-400 shrink-0" />
                <select
                  className="flex-1 min-w-0 py-2 sm:flex-none sm:py-0 text-sm border-none bg-transparent font-medium focus:ring-0"
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
