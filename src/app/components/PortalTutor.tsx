// ✅ Portal do tutor: página pública do link (sem login). Mostra o pet ao vivo, etapa por etapa.
import { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { ouvirLinkTutor, type Acompanhamento } from '../../services/acompanhamentoService';
import { CAMPO_HORA, NOME_ETAPA, NOME_SERVICO, etapasDoServico, fraseDaSituacao } from '../../utils/acompanhamento';
import { CORES_PADRAO, coresValidas, fundoTopo } from '../../utils/cores';

const hora = (ms?: number) =>
  ms ? new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : '';

const COR_SITUACAO: Record<string, string> = {
  espera: '#F7931E', banho: '#0B5A70', escovar: '#0B5A70', tosa: '#0B5A70',
  finalizado: '#1E7F4F', entregue: '#1E7F4F', removido: '#64748B',
};

export function PortalTutor({ codigo }: { codigo: string }) {
  const [dados, setDados] = useState<Acompanhamento | null | undefined>(undefined); // undefined = carregando

  useEffect(() => {
    document.title = 'Acompanhe seu pet';
    return ouvirLinkTutor(codigo, setDados);
  }, [codigo]);

  if (dados === undefined) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 text-slate-500">
        <Loader2 className="w-7 h-7 animate-spin" aria-label="Carregando" />
      </div>
    );
  }

  if (dados === null) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 px-6">
        <div className="max-w-sm text-center space-y-2">
          <p className="text-4xl" aria-hidden>🐾</p>
          <h1 className="text-xl font-bold text-slate-800">Link indisponível</h1>
          <p className="text-sm text-slate-500">Este link de acompanhamento não existe mais ou já venceu. Os links valem só no dia do atendimento.</p>
        </div>
      </div>
    );
  }

  const cores = coresValidas(dados.cores) ?? CORES_PADRAO;
  const etapas = etapasDoServico(dados.servico);
  const encerrado = dados.status === 'entregue' || dados.status === 'removido';
  const indiceAtual = encerrado ? etapas.length : Math.max(0, etapas.indexOf(dados.status as any));
  const frase = fraseDaSituacao(dados.status, dados.nomePet);
  const diaFmt = dados.dia.split('-').reverse().slice(0, 2).join('/');

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center">
      <div className="w-full max-w-md min-h-screen bg-[#F4F8FA] flex flex-col">
        <header className="px-5 pt-6 pb-5 text-white flex items-center gap-3" style={{ background: fundoTopo(cores) }}>
          {dados.logoUrl && (
            <div className="bg-white rounded-xl px-2 py-1 shrink-0">
              <img
                src={dados.logoUrl}
                alt=""
                className="h-9 w-auto max-w-[90px] object-contain"
                onError={(e) => { (e.currentTarget.parentElement as HTMLElement).hidden = true; }}
              />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-bold text-lg leading-tight break-words">{dados.nomeLoja || 'Pet shop'}</p>
            <p className="text-xs text-white/80">Acompanhamento ao vivo</p>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 space-y-4">
          <section className="bg-white rounded-2xl p-5 shadow-sm text-center flex flex-col items-center gap-2">
            <div className="w-20 h-20 rounded-full bg-sky-100 grid place-items-center text-4xl" aria-hidden>
              {dados.especie === 'gato' ? '🐱' : '🐶'}
            </div>
            <h1 className="text-2xl font-extrabold text-slate-800 break-words">{dados.nomePet}</h1>
            <span className="text-white text-sm font-bold px-4 py-1.5 rounded-full" style={{ background: COR_SITUACAO[dados.status] ?? '#0B5A70' }}>
              {frase.titulo}
            </span>
            <p className="text-sm text-slate-600">{frase.texto}</p>
            <p className="text-xs text-slate-400">{NOME_SERVICO[dados.servico] ?? dados.servico} · {diaFmt}</p>
          </section>

          {dados.status !== 'removido' && (
            <ol className="bg-white rounded-2xl px-5 py-3 shadow-sm" aria-label="Etapas do atendimento">
              {etapas.map((e, i) => {
                const feito = i < indiceAtual || (i === indiceAtual && e === 'finalizado');
                const agora = i === indiceAtual && !feito;
                const ms = (dados as any)[CAMPO_HORA[e]] as number | undefined;
                return (
                  <li key={e} className="relative grid grid-cols-[26px_1fr_auto] items-center gap-3 py-2">
                    {i < etapas.length - 1 && <span className="absolute left-[11px] top-[30px] h-[calc(100%-18px)] w-0.5 bg-slate-200" aria-hidden />}
                    <span
                      className={`relative z-10 w-6 h-6 rounded-full border-2 grid place-items-center ${
                        feito ? 'bg-emerald-600 border-emerald-600 text-white' : agora ? 'border-[#0B5A70] bg-[#0B5A70] ring-4 ring-sky-100' : 'border-slate-300 bg-white'
                      }`}
                    >
                      {feito && <Check className="w-3.5 h-3.5" />}
                    </span>
                    <span className={`text-sm ${feito || agora ? 'text-slate-800' : 'text-slate-400'} ${agora ? 'font-bold' : ''}`}>{NOME_ETAPA[e]}</span>
                    <time className="text-xs text-slate-400 tabular-nums">{feito || agora ? hora(ms) : ''}</time>
                  </li>
                );
              })}
              {dados.status === 'entregue' && (
                <li className="grid grid-cols-[26px_1fr_auto] items-center gap-3 py-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white grid place-items-center"><Check className="w-3.5 h-3.5" /></span>
                  <span className="text-sm text-slate-800 font-bold">Entregue</span>
                  <time className="text-xs text-slate-400 tabular-nums">{hora(dados.entregueEm)}</time>
                </li>
              )}
            </ol>
          )}
        </main>

        <footer className="text-center text-[11px] text-slate-400 pb-5 px-4">
          Esta página se atualiza sozinha · Pata &amp; Gestão
        </footer>
      </div>
    </div>
  );
}
