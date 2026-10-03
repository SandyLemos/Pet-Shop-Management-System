import { useState } from 'react';
import { toast } from 'sonner';
import { HardDriveDownload } from 'lucide-react';
import { gerarBackup, nomeArquivoBackup, DIAS_NO_BACKUP } from '../../services/backupService';

// ✅ Botão "Baixar backup" do painel Admin: salva todos os dados num arquivo no aparelho.
export function BackupButton() {
  const [gerando, setGerando] = useState(false);

  const baixar = async () => {
    if (gerando) return;
    setGerando(true);
    try {
      const dados = await gerarBackup();
      const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nomeArquivoBackup();
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success('Backup baixado! Guarde o arquivo em local seguro.');
    } catch (err) {
      console.error('[backup]', err);
      toast.error('Não foi possível gerar o backup. Verifique a internet e tente de novo.');
    } finally {
      setGerando(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-6 flex flex-col items-center gap-3 text-center">
      <div className="bg-emerald-100 p-4 rounded-2xl">
        <HardDriveDownload className="w-8 h-8 text-emerald-600" />
      </div>
      <div>
        <h3 className="font-bold text-gray-800 text-base">Backup dos dados</h3>
        <p className="text-xs text-gray-500 mt-1">
          Baixa um arquivo com usuários, profissionais, raças, fichas dos pets e os atendimentos dos últimos {DIAS_NO_BACKUP} dias.
          Faça uma vez por semana e guarde o arquivo no computador ou no Google Drive.
        </p>
      </div>
      <button
        onClick={baixar}
        disabled={gerando}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-60 text-white text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2"
      >
        <HardDriveDownload size={16} /> {gerando ? 'Gerando backup…' : 'Baixar backup'}
      </button>
    </div>
  );
}
