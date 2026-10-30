// ✅ Agendamento online: janela para a loja recusar um pedido (motivo opcional).
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import type { Pedido } from '../../../services/agendamentoService';
import { recusar } from './acoesPedido';

/** Janela para recusar com motivo (opcional) */
export function RecusarPedido({ pedido, fechar, aoRecusar }: { pedido: Pedido; fechar: () => void; aoRecusar?: () => void }) {
  const [motivo, setMotivo] = useState('');
  const [salvando, setSalvando] = useState(false);
  return (
    <Dialog open onOpenChange={(o) => { if (!o && !salvando) fechar(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Recusar o pedido do {pedido.nomePet}?</DialogTitle>
          <DialogDescription>O lugar online do dia volta a ficar livre para outro tutor.</DialogDescription>
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
