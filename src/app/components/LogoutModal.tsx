import { LogOut, AlertTriangle } from 'lucide-react';

// ─── Modal de Confirmação de Logout ──────────────────────────────────────────
export function LogoutModal({
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
