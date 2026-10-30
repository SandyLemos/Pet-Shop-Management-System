import { useState, lazy, Suspense } from 'react';
import {
  X, Users, ShieldCheck, Briefcase, PawPrint,
  FileText, Download, PackageCheck, PhoneCall, BarChart3, Palette, CalendarCheck, ChevronRight,
} from 'lucide-react';
// ✅ Análises: carregado só quando aberto (não pesa no app dos tablets)
const AnalyticsModal = lazy(() => import('./AnalyticsModal'));
import { SecaoPetsCadastro } from './PetsRegistrationSection';
import { BackupButton } from './BackupButton';

import { ModalRelatorios } from './ModalRelatorios';
import { SecaoUsuarios } from './AdminUsuarios';
import { SecaoProfissionais } from './AdminProfissionais';
import { SecaoPersonalizacao } from './AdminPersonalizacao';
import { nomeLoja, temModulo } from '../../lib/lojaAtual';
import { AdminVagasOnline } from './agendamento/AdminVagasOnline';

// ─── AdminSidebar — Componente Principal (export default) ─────────────────────
export default function AdminSidebar({
  onClose,
}: {
  onClose: () => void;
  currentUserRole?: 'admin' | 'user';
}) {
  const [abaAtiva, setAbaAtiva]             = useState<'usuarios' | 'profissionais' | 'pets' | 'relatorios' | 'personalizacao'>('usuarios');
  const [showRelatorios, setShowRelatorios] = useState(false);
  const [showAnalises, setShowAnalises]     = useState(false);
  const [showVagasOnline, setShowVagasOnline] = useState(false);

  return (
    <div className="painel-admin">
      {showVagasOnline && <AdminVagasOnline onClose={() => setShowVagasOnline(false)} />}
      {showRelatorios && <ModalRelatorios onClose={() => setShowRelatorios(false)} />}
      {showAnalises && (
        <Suspense fallback={null}>
          <AnalyticsModal onClose={() => setShowAnalises(false)} />
        </Suspense>
      )}

      <div className="fixed inset-0 z-50 flex">
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

        {/* Painel lateral direito */}
        <div className="relative ml-auto w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">

          {/* Header */}
          <div className="topo-admin bg-gradient-to-r from-purple-700 to-indigo-700 px-4 py-4 sm:px-6 sm:py-5 flex items-center justify-between gap-3 flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="bg-white/20 p-2 rounded-xl shrink-0">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-white font-bold text-base">Painel Admin</h2>
                <p className="text-purple-200 text-xs truncate">{nomeLoja()}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="shrink-0 text-white/70 hover:text-white transition p-2 sm:p-1 rounded-lg hover:bg-white/10"
            >
              <X size={20} />
            </button>
          </div>

          {/* ✅ Módulo Agendamento online */}
          {temModulo('agendamento') && (
            <button
              onClick={() => setShowVagasOnline(true)}
              className="mx-4 mt-3 sm:mx-5 flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-left hover:bg-indigo-100 transition flex-shrink-0"
            >
              <span className="bg-indigo-600 text-white p-1.5 rounded-lg shrink-0"><CalendarCheck size={16} /></span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-bold text-indigo-900">Liberar vagas para agendamento online</span>
                <span className="block text-[11px] text-indigo-700">Escolha quantas vagas do dia o tutor pode marcar</span>
              </span>
              <ChevronRight size={16} className="text-indigo-500 shrink-0" />
            </button>
          )}

          {/* Abas */}
          <div className="flex border-b border-slate-100 bg-slate-50 flex-shrink-0">
            <button
              onClick={() => setAbaAtiva('usuarios')}
              className={`flex-1 min-w-0 px-0.5 py-2.5 text-[11px] font-semibold flex flex-col items-center justify-center gap-1 border-b-2 transition-all ${
                abaAtiva === 'usuarios'
                  ? 'border-purple-500 text-purple-700 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users size={14} /> <span>Usuários</span>
            </button>
            <button
              onClick={() => setAbaAtiva('profissionais')}
              aria-label="Profissionais"
              className={`flex-1 min-w-0 px-0.5 py-2.5 text-[11px] font-semibold flex flex-col items-center justify-center gap-1 border-b-2 transition-all ${
                abaAtiva === 'profissionais'
                  ? 'border-orange-500 text-orange-700 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Briefcase size={14} /> <span className="hidden sm:inline">Profissionais</span><span aria-hidden="true" className="sm:hidden">Equipe</span>
            </button>
            <button
              onClick={() => setAbaAtiva('pets')}
              className={`flex-1 min-w-0 px-0.5 py-2.5 text-[11px] font-semibold flex flex-col items-center justify-center gap-1 border-b-2 transition-all ${
                abaAtiva === 'pets'
                  ? 'border-pink-500 text-pink-700 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <PawPrint size={14} /> <span>Pets</span>
            </button>
            <button
              onClick={() => setAbaAtiva('relatorios')}
              className={`flex-1 min-w-0 px-0.5 py-2.5 text-[11px] font-semibold flex flex-col items-center justify-center gap-1 border-b-2 transition-all ${
                abaAtiva === 'relatorios'
                  ? 'border-indigo-500 text-indigo-700 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileText size={14} /> <span>Relatórios</span>
            </button>
            <button
              onClick={() => setAbaAtiva('personalizacao')}
              aria-label="Personalização"
              className={`flex-1 min-w-0 px-0.5 py-2.5 text-[11px] font-semibold flex flex-col items-center justify-center gap-1 border-b-2 transition-all ${
                abaAtiva === 'personalizacao'
                  ? 'border-pink-500 text-pink-700 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Palette size={14} /> <span className="hidden sm:inline">Personalização</span><span aria-hidden="true" className="sm:hidden">Visual</span>
            </button>
          </div>

          {/* Conteúdo */}
          <div className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-5 space-y-4">
            {abaAtiva === 'usuarios'      && <SecaoUsuarios />}
            {abaAtiva === 'profissionais' && <SecaoProfissionais />}
            {abaAtiva === 'pets'          && <SecaoPetsCadastro />}
            {abaAtiva === 'personalizacao' && <SecaoPersonalizacao />}
            {abaAtiva === 'relatorios'    && (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-6 flex flex-col items-center gap-4 text-center">
                  <div className="bg-indigo-100 p-4 rounded-2xl">
                    <FileText className="w-8 h-8 text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-base">Relatório de Atendimentos</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Gere relatórios em PDF por dia ou por período. Cada pet aparece em uma única linha com todas as informações consolidadas.
                    </p>
                  </div>
                  <div className="w-full grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white rounded-xl p-3 border border-indigo-100">
                      <PackageCheck className="w-4 h-4 text-green-500 mx-auto mb-1" />
                      <p className="text-[10px] text-gray-500 font-medium">Entregues</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-indigo-100">
                      <PhoneCall className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                      <p className="text-[10px] text-gray-500 font-medium">Avisados</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-indigo-100">
                      <Download className="w-4 h-4 text-purple-500 mx-auto mb-1" />
                      <p className="text-[10px] text-gray-500 font-medium">PDF</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowRelatorios(true)}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <FileText size={16} /> Gerar Relatório
                  </button>
                </div>
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-6 flex flex-col items-center gap-4 text-center">
                  <div className="bg-indigo-100 p-4 rounded-2xl">
                    <BarChart3 className="w-8 h-8 text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-base">Análises</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Gráficos com atendimentos, horários de pico, serviços, produção por profissional e clientes fiéis e sumidos.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAnalises(true)}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <BarChart3 size={16} /> Abrir Análises
                  </button>
                </div>
                <BackupButton />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
