// ✅ Vaga online da grade: dados do pedido e o que a equipe pode fazer com ele.
import { useState } from 'react';
import { CalendarCheck, Check, MessageCircle, UserX, X, LogIn } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import type { Pedido } from '../../../services/agendamentoService';
import { diaCurto } from '../../../utils/agendamento';
import { NOME_SERVICO } from '../../../utils/acompanhamento';
import { confirmar, naoVeio, recusar, whatsDoPedido } from './acoesPedido';

const PORTE: Record<string, string> = { pequeno: 'Pequeno', medio: 'Médio', grande: 'Grande' };

function Linha({ rotulo, valor }: { rotulo: string; valor?: string }) {
  if (!valor) return null;
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-slate-100 last:border-0 text-sm">
      <span className="text-slate-500">{rotulo}</span>
      <span className="font-medium text-slate-800 text-right break-words min-w-0">{valor}</span>
    </div>
  );
}

/** Janela para recusar com motivo (opcional) */
export function RecusarPedido({ pedido, fechar, aoRecusar }: { pedido: Pedido; fechar: () => void; aoRecusar?: () => void }) {
  const [motivo, setMotivo] = useState('');
  const [salvando, setSalvando] = useState(false);
  return (
    <Dialog open onOpenChange={(o) => { if (!o && !salvando) fechar(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Recusar o pedido do {pedido.nomePet}?</DialogTitle>
          <DialogDescription>A vaga {pedido.vaga} volta a ficar livre para outro tutor.</DialogDescription>
        </DialogHeader>
        <label className="text-sm font-semibold text-slate-700" htmlFor="motivo-recusa">Motivo (opcional)</label>
        <textarea
          id="motivo-recusa"
          value={motivo}
          maxLength={200}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ex.: agenda cheia neste dia"
          className="w-full min-h-20 rounded-lg border border-slate-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
        />
        <div className="flex justify-end gap-2">
          <button onClick={fechar} disabled={salvando} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600">Voltar</button>
          <button
            disabled={salvando}
            onClick={async () => {
              setSalvando(true);
              const ok = await recusar(pedido, motivo);
              setSalvando(false);
              if (ok) { fechar(); aoRecusar?.(); }
            }}
            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
          >
            {salvando ? 'Recusando...' : 'Recusar pedido'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PedidoOnlineModal({ pedido, fechar, confirmarChegada }:
  { pedido: Pedido | null; fechar: () => void; confirmarChegada: (p: Pedido) => void }) {
  const [ocupado, setOcupado] = useState(false);
  const [recusando, setRecusando] = useState(false);
  if (!pedido) return null;

  const aConfirmar = pedido.status === 'pendente';
  const whats = whatsDoPedido(pedido, 'confirmado');
  const fazer = async (acao: () => Promise<boolean>) => {
    setOcupado(true);
    const ok = await acao();
    setOcupado(false);
    if (ok) fechar();
  };

  return (
    <>
      <Dialog open={!recusando} onOpenChange={(o) => { if (!o) fechar(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-indigo-600" /> Vaga {pedido.vaga} · agendamento online
            </DialogTitle>
            <DialogDescription>
              {aConfirmar ? 'O tutor marcou esta vaga. Confirme ou recuse o pedido.' : 'Confirmado. Aguardando o pet chegar na loja.'}
            </DialogDescription>
          </DialogHeader>

          <span className={`self-start text-xs font-bold px-2.5 py-1 rounded-full ${aConfirmar ? 'bg-orange-100 text-orange-800' : 'bg-indigo-100 text-indigo-800'}`}>
            {aConfirmar ? 'A confirmar' : 'Aguardando chegada'}
          </span>

          <div>
            <Linha rotulo="Pet" valor={pedido.nomePet} />
            <Linha rotulo="Espécie" valor={pedido.especie === 'gato' ? 'Gato' : 'Cão'} />
            <Linha rotulo="Raça" valor={pedido.raca} />
            <Linha rotulo="Porte" valor={PORTE[pedido.porte]} />
            <Linha rotulo="Serviço" valor={NOME_SERVICO[pedido.servico] ?? pedido.servico} />
            <Linha rotulo="Dia" valor={diaCurto(pedido.dia)} />
            <Linha rotulo="Tutor" valor={pedido.nomeTutor} />
            <Linha rotulo="WhatsApp" valor={pedido.telefone} />
            <Linha rotulo="Observação" valor={pedido.obs} />
          </div>

          {aConfirmar ? (
            <div className="grid grid-cols-2 gap-2">
              <button disabled={ocupado} onClick={() => setRecusando(true)}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-red-300 text-red-700 text-sm font-semibold hover:bg-red-50 disabled:opacity-50">
                <X size={16} /> Recusar
              </button>
              <button disabled={ocupado} onClick={() => fazer(() => confirmar(pedido))}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
                <Check size={16} /> Confirmar
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <button disabled={ocupado} onClick={() => confirmarChegada(pedido)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50">
                <LogIn size={17} /> Confirmar chegada
              </button>
              <div className="grid grid-cols-2 gap-2">
                {whats ? (
                  <a href={whats} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-emerald-300 text-emerald-700 text-sm font-semibold hover:bg-emerald-50">
                    <MessageCircle size={16} /> WhatsApp
                  </a>
                ) : <span />}
                <button disabled={ocupado} onClick={() => fazer(() => naoVeio(pedido))}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-slate-300 text-slate-600 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50">
                  <UserX size={16} /> Não veio
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {recusando && <RecusarPedido pedido={pedido} fechar={() => setRecusando(false)} aoRecusar={fechar} />}
    </>
  );
}
