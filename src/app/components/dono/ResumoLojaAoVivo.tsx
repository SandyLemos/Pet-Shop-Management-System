// 💤 GUARDADO para o futuro painel de admin de cada loja (pedido do André em 17/10/2026):
// resumo da loja ao vivo (números do momento, fluxo e entregues). Ainda não é usado em nenhuma tela.
// Recebe os dados prontos; falta ligar à escuta em tempo real quando for usado.
import { X, Eye, Clock, Droplet, Wind, Scissors, CheckCircle2, PackageCheck, PhoneCall, AlertTriangle } from 'lucide-react';
import type { Pet } from '../../types/pet';
import { estaParado, minutosNaLoja, formatarTempo } from '../../../utils/parado';
import { labelServico } from '../../../utils/relatorioPdf';
import { fundoTopo, type CoresLoja, CORES_PADRAO } from '../../../utils/cores';

export interface EntregaDoDia { nomePet: string; servico: string; hora: string }

interface Props {
  nome: string;
  logoUrl?: string;
  cores?: CoresLoja;
  pets: Pet[];
  entregues: EntregaDoDia[];
  agora: number;
  atualizadoHa: string;
  fechar: () => void;
}

// mesmas cores da tela da loja
const COR_VAGA: Record<string, string> = {
  espera: 'bg-amber-100 border-amber-300 text-amber-800',
  banho: 'bg-sky-100 border-sky-300 text-sky-800',
  escovar: 'bg-sky-100 border-sky-300 text-sky-800',
  tosa: 'bg-sky-100 border-sky-300 text-sky-800',
  finalizado: 'bg-purple-100 border-purple-300 text-purple-800',
  avisado: 'bg-blue-100 border-blue-400 text-blue-800',
};
const ETAPAS = [
  { id: 'espera', nome: 'Aguardando', icone: Clock, cor: '#F7931E' },
  { id: 'banho', nome: 'Banho', icone: Droplet, cor: '#0B5A70' },
  { id: 'escovar', nome: 'Escovar', icone: Wind, cor: '#0B5A70' },
  { id: 'tosa', nome: 'Tosa', icone: Scissors, cor: '#0B5A70' },
  { id: 'finalizado', nome: 'Pronto', icone: CheckCircle2, cor: '#7E22CE' },
] as const;

export function ResumoLojaAoVivo({ nome, logoUrl, cores = CORES_PADRAO, pets, entregues, agora, atualizadoHa, fechar }: Props) {
  const emAtendimento = pets.filter((p) => ['banho', 'escovar', 'tosa'].includes(p.status)).length;
  const prontos = pets.filter((p) => p.status === 'finalizado').length;
  const parados = pets.filter((p) => estaParado(p, agora)).length;
  const numeros = [
    { v: pets.length, t: 'na loja agora' },
    { v: pets.filter((p) => p.status === 'espera').length, t: 'aguardando' },
    { v: emAtendimento, t: 'em atendimento' },
    { v: prontos, t: 'prontos p/ retirar' },
    { v: entregues.length, t: 'entregues hoje' },
  ];

  return (
    <div className="fixed inset-0 z-[96] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={fechar} />
      <div className="relative w-full max-w-6xl max-h-[94vh] bg-slate-50 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* topo igual ao da loja */}
        <div className="px-6 py-3 flex items-center justify-between shrink-0" style={{ background: fundoTopo(cores) }}>
          <div className="flex items-center gap-4">
            <div className="bg-white rounded-xl px-3 py-1.5"><img src={logoUrl || '/logo-pata-gestao.png'} alt="" className="h-9 w-auto object-contain" /></div>
            <div>
              <p className="text-white font-bold text-lg leading-tight">{nome}</p>
              <p className="text-white/70 text-xs flex items-center gap-1.5"><Eye size={13} /> Só para ver: nada pode ser alterado daqui</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 bg-white/15 text-white text-xs font-bold px-3 py-1.5 rounded-full">
              <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" /><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" /></span>
              AO VIVO · {atualizadoHa}
            </span>
            <button onClick={fechar} className="text-white/80 hover:text-white" aria-label="Fechar"><X size={22} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-5 gap-3">
            {numeros.map((n) => (
              <div key={n.t} className="bg-white rounded-xl p-4 text-center shadow-sm ring-1 ring-slate-100">
                <p className="text-3xl font-bold text-slate-900">{n.v}</p>
                <p className="text-xs text-slate-500">{n.t}</p>
              </div>
            ))}
          </div>
          {parados > 0 && (
            <p className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 ring-1 ring-rose-200 rounded-xl px-4 py-2.5">
              <AlertTriangle size={16} /> {parados} {parados === 1 ? 'pet está' : 'pets estão'} parado(s) há muito tempo na mesma etapa.
            </p>
          )}

          {/* fluxo do dia */}
          <div className="grid grid-cols-5 gap-3">
            {ETAPAS.map((e) => {
              const lista = pets.filter((p) => p.status === e.id);
              return (
                <div key={e.id} className="bg-white rounded-xl overflow-hidden shadow-sm ring-1 ring-slate-100 flex flex-col">
                  <div className="px-3 py-2 text-white text-sm font-semibold flex items-center justify-between" style={{ background: e.cor }}>
                    <span className="flex items-center gap-1.5"><e.icone size={15} /> {e.nome}</span>
                    <span className="text-xs bg-white/25 rounded px-1.5">{lista.length}</span>
                  </div>
                  <div className="p-2 space-y-2 min-h-[120px]">
                    {lista.length === 0 && <p className="text-xs text-slate-400 text-center pt-6">vazio</p>}
                    {lista.map((p) => {
                      const min = minutosNaLoja(p, agora);
                      const parado = estaParado(p, agora);
                      return (
                        <div key={p.id} className={`rounded-lg border-2 px-2.5 py-2 ${p.avisado ? COR_VAGA.avisado : COR_VAGA[p.status]} ${parado ? 'ring-2 ring-red-400' : ''}`}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-sm truncate">{p.nomePet}</span>
                            <span className="text-[10px] font-bold bg-white/70 rounded px-1">vaga {p.slotNumber}</span>
                          </div>
                          <p className="text-[11px] opacity-80 truncate">{labelServico(p.servico)}{p.profissionalBanho || p.profissionalTosa ? ` · ${p.profissionalTosa || p.profissionalBanho}` : ''}</p>
                          <p className="text-[11px] mt-0.5 flex items-center gap-1">
                            <Clock size={11} /> {formatarTempo(min)} na loja
                            {p.avisado && <span className="ml-auto flex items-center gap-0.5 font-semibold"><PhoneCall size={11} /> avisado</span>}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-100 p-4">
            <p className="font-bold text-slate-800 text-sm flex items-center gap-2 mb-2"><PackageCheck size={16} className="text-emerald-600" /> Entregues hoje</p>
            {entregues.length === 0 ? <p className="text-xs text-slate-400">Nenhum ainda.</p> : (
              <div className="flex flex-wrap gap-2">
                {entregues.map((e, i) => (
                  <span key={i} className="text-xs bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 rounded-full px-2.5 py-1">
                    <b>{e.hora}</b> {e.nomePet} · {labelServico(e.servico)}
                  </span>
                ))}
              </div>
            )}
          </div>
          <p className="text-[11px] text-slate-400 text-center">Mostra o mesmo que a equipe vê na tela, sem telefone nem dados do tutor. Atualiza sozinho a cada mudança.</p>
        </div>
      </div>
    </div>
  );
}
