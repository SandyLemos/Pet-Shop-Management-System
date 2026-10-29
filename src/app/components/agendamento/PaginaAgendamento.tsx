// ✅ Páginas públicas do agendamento online (sem login):
//   /agendar/<loja>        → o tutor escolhe o dia e a vaga e faz o pedido
//   /agendamento/<código>  → o tutor acompanha o pedido (e pode cancelar)
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast, Toaster } from 'sonner';
import { CalendarCheck, Check, Loader2, ArrowLeft } from 'lucide-react';
import {
  VAGA_TOMADA, cancelarPedido, criarPedido, ouvirAgenda, ouvirDiasOnline, ouvirMarcadas, ouvirPedido,
  type AgendaPublica, type DiaOnline, type Pedido,
} from '../../../services/agendamentoService';
import {
  SERVICOS_ONLINE, diaCurto, fraseDoPedido, problemaNoPedido, vagasLivres, type DadosPedido,
} from '../../../utils/agendamento';
import { NOME_SERVICO } from '../../../utils/acompanhamento';
import { CORES_PADRAO, coresValidas, fundoTopo } from '../../../utils/cores';
import { idDoDia } from '../../../utils/dias';

function Moldura({ agenda, subtitulo, children }: { agenda?: Pick<AgendaPublica, 'nomeLoja' | 'logoUrl' | 'cores'> | null; subtitulo: string; children: ReactNode }) {
  const cores = coresValidas(agenda?.cores) ?? CORES_PADRAO;
  return (
    <div className="min-h-screen bg-slate-100 flex justify-center">
      <Toaster position="top-center" richColors />
      <div className="w-full max-w-md min-h-screen bg-[#F4F8FA] flex flex-col">
        <header className="px-5 pt-6 pb-5 text-white flex items-center gap-3" style={{ background: fundoTopo(cores) }}>
          {agenda?.logoUrl && (
            <div className="bg-white rounded-xl px-2 py-1 shrink-0">
              <img src={agenda.logoUrl} alt="" className="h-9 w-auto max-w-[90px] object-contain"
                onError={(e) => { (e.currentTarget.parentElement as HTMLElement).hidden = true; }} />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-bold text-lg leading-tight break-words">{agenda?.nomeLoja || 'Pet shop'}</p>
            <p className="text-xs text-white/80">{subtitulo}</p>
          </div>
        </header>
        <main className="flex-1 px-4 py-5 space-y-4">{children}</main>
        <footer className="text-center text-[11px] text-slate-400 pb-5 px-4">Pata &amp; Gestão</footer>
      </div>
    </div>
  );
}

const Carregando = () => (
  <div className="min-h-screen grid place-items-center bg-slate-50 text-slate-500"><Loader2 className="w-7 h-7 animate-spin" aria-label="Carregando" /></div>
);

function Aviso({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 px-6">
      <div className="max-w-sm text-center space-y-2">
        <p className="text-4xl" aria-hidden>🐾</p>
        <h1 className="text-xl font-bold text-slate-800">{titulo}</h1>
        <p className="text-sm text-slate-500">{texto}</p>
      </div>
    </div>
  );
}

const cartao = 'bg-white rounded-2xl p-4 shadow-sm';
const campo = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-300';
const rotulo = 'block text-sm font-semibold text-slate-700 mb-1';

function Opcoes<T extends string>({ valor, opcoes, aoEscolher, nome }: { valor: T | ''; opcoes: { id: T; nome: string }[]; aoEscolher: (v: T) => void; nome: string }) {
  return (
    <div role="radiogroup" aria-label={nome} className="flex flex-wrap gap-2">
      {opcoes.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={valor === o.id} onClick={() => aoEscolher(o.id)}
          className={`px-3 py-2 rounded-xl border-2 text-sm font-semibold transition ${valor === o.id ? 'border-[#0B5A70] bg-sky-50 text-[#0B5A70]' : 'border-slate-200 bg-white text-slate-600'}`}>
          {o.nome}
        </button>
      ))}
    </div>
  );
}

const VAZIO: DadosPedido = { nomeTutor: '', telefone: '', nomePet: '', especie: '', raca: '', porte: '', servico: 'banho', obs: '' };

// ─── /agendar/<loja> ──────────────────────────────────────────────────────────
export function AgendarOnline({ loja }: { loja: string }) {
  const hoje = idDoDia();
  const [agenda, setAgenda] = useState<AgendaPublica | null | undefined>(undefined);
  const [dias, setDias] = useState<DiaOnline[]>([]);
  const [marcadasPorDia, setMarcadasPorDia] = useState<Record<string, number[]>>({});
  const [dia, setDia] = useState<string | null>(null);
  const [vaga, setVaga] = useState<number | null>(null);
  const [dados, setDados] = useState<DadosPedido>(VAZIO);
  const [consentimento, setConsentimento] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => { document.title = 'Agende o banho do seu pet'; return ouvirAgenda(loja, setAgenda); }, [loja]);
  useEffect(() => ouvirDiasOnline(loja, hoje, (d) => setDias(d.filter((x) => x.vagas.length > 0))), [loja, hoje]);
  const chaveDias = dias.map((d) => d.dia).join(',');
  useEffect(() => {
    const fins = dias.map((d) => ouvirMarcadas(loja, d.dia, (m) => setMarcadasPorDia((x) => ({ ...x, [d.dia]: m }))));
    return () => fins.forEach((f) => f());
  }, [loja, chaveDias]); // eslint-disable-line react-hooks/exhaustive-deps

  const livresDe = (d: DiaOnline) => vagasLivres(d.vagas, marcadasPorDia[d.dia] ?? []);
  const diaEscolhido = useMemo(() => dias.find((d) => d.dia === dia) ?? null, [dias, dia]);
  const livres = diaEscolhido ? livresDe(diaEscolhido) : [];

  // a vaga escolhida foi marcada por outra pessoa enquanto o tutor preenchia
  useEffect(() => {
    if (vaga !== null && diaEscolhido && !livres.includes(vaga)) {
      setVaga(null);
      toast.info('Essa vaga acabou de ser marcada por outra pessoa. Escolha outra.');
    }
  }, [livres.join(','), vaga]); // eslint-disable-line react-hooks/exhaustive-deps

  if (agenda === undefined) return <Carregando />;
  if (!agenda || !agenda.ativo) {
    return <Aviso titulo="Agendamento indisponível" texto="Esta loja não está recebendo agendamentos online agora. Fale direto com a loja." />;
  }

  const mudar = <K extends keyof DadosPedido>(k: K, v: DadosPedido[K]) => setDados((d) => ({ ...d, [k]: v }));

  const enviar = async () => {
    if (!dia || vaga === null) return;
    const problema = problemaNoPedido(dados) ?? (consentimento ? null : 'Marque a autorização para a loja guardar seus dados.');
    if (problema) { toast.error(problema); return; }
    setEnviando(true);
    try {
      const codigo = await criarPedido(loja, agenda, dia, vaga, dados);
      window.location.assign(`/agendamento/${codigo}`);
    } catch (e) {
      if (e instanceof Error && e.message === VAGA_TOMADA) {
        toast.error('Essa vaga acabou de ser marcada por outra pessoa. Escolha outra.');
        setVaga(null);
      } else {
        console.error('[agendar]', e);
        toast.error('Não foi possível enviar. Confira a internet e tente de novo.');
      }
      setEnviando(false);
    }
  };

  return (
    <Moldura agenda={agenda} subtitulo="Agende o banho do seu pet">
      {/* 1. Dia */}
      <section className={cartao}>
        <h1 className="font-bold text-slate-800 mb-1">1. Escolha o dia</h1>
        {dias.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma vaga online aberta no momento. Volte mais tarde ou fale com a loja.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 mt-2">
            {dias.map((d) => {
              const n = livresDe(d).length;
              const sel = d.dia === dia;
              return (
                <button key={d.dia} disabled={n === 0} onClick={() => { setDia(d.dia); setVaga(null); }}
                  className={`rounded-xl border-2 py-2 text-center transition disabled:opacity-40 ${sel ? 'border-[#0B5A70] bg-sky-50' : 'border-slate-200 bg-white'}`}>
                  <span className="block text-sm font-bold text-slate-800">{d.dia === hoje ? 'Hoje' : diaCurto(d.dia).split(',')[0]}</span>
                  <span className="block text-xs text-slate-500">{d.dia.slice(8, 10)}/{d.dia.slice(5, 7)}</span>
                  <span className={`block text-[11px] font-semibold ${n ? 'text-emerald-700' : 'text-slate-400'}`}>{n ? `${n} ${n === 1 ? 'vaga' : 'vagas'}` : 'esgotado'}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* 2. Vaga */}
      {diaEscolhido && (
        <section className={cartao}>
          <h2 className="font-bold text-slate-800 mb-1">2. Escolha a vaga</h2>
          <p className="text-xs text-slate-500 mb-2">Vagas livres para {dia === hoje ? 'hoje' : diaCurto(diaEscolhido.dia)}. É só levar o pet na loja no dia.</p>
          <div className="grid grid-cols-4 gap-2">
            {[...diaEscolhido.vagas].sort((a, b) => a - b).map((n) => {
              const livre = livres.includes(n);
              const sel = n === vaga;
              return (
                <button key={n} disabled={!livre} onClick={() => setVaga(n)} aria-pressed={sel}
                  className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center text-sm font-bold transition ${
                    sel ? 'border-[#0B5A70] bg-[#0B5A70] text-white' : livre ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-100 text-slate-400 line-through'}`}>
                  <span className="text-[10px] font-semibold opacity-80">Vaga</span>{n}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. Dados */}
      {diaEscolhido && vaga !== null && (
        <section className={`${cartao} space-y-3`}>
          <h2 className="font-bold text-slate-800">3. Seus dados e do pet</h2>
          <div>
            <label className={rotulo} htmlFor="ag-tutor">Seu nome</label>
            <input id="ag-tutor" className={campo} maxLength={100} value={dados.nomeTutor} onChange={(e) => mudar('nomeTutor', e.target.value)} autoComplete="name" />
          </div>
          <div>
            <label className={rotulo} htmlFor="ag-tel">WhatsApp (com DDD)</label>
            <input id="ag-tel" className={campo} inputMode="tel" maxLength={20} placeholder="(24) 99999-1234" value={dados.telefone} onChange={(e) => mudar('telefone', e.target.value)} autoComplete="tel" />
          </div>
          <div>
            <label className={rotulo} htmlFor="ag-pet">Nome do pet</label>
            <input id="ag-pet" className={campo} maxLength={100} value={dados.nomePet} onChange={(e) => mudar('nomePet', e.target.value)} />
          </div>
          <div>
            <span className={rotulo}>Espécie</span>
            <Opcoes nome="Espécie" valor={dados.especie} aoEscolher={(v) => mudar('especie', v)} opcoes={[{ id: 'cao', nome: '🐶 Cão' }, { id: 'gato', nome: '🐱 Gato' }]} />
          </div>
          <div>
            <span className={rotulo}>Porte</span>
            <Opcoes nome="Porte" valor={dados.porte} aoEscolher={(v) => mudar('porte', v)} opcoes={[{ id: 'pequeno', nome: 'Pequeno' }, { id: 'medio', nome: 'Médio' }, { id: 'grande', nome: 'Grande' }]} />
          </div>
          <div>
            <label className={rotulo} htmlFor="ag-raca">Raça (opcional)</label>
            <input id="ag-raca" className={campo} maxLength={60} placeholder="Ex.: Shih-tzu, SRD" value={dados.raca} onChange={(e) => mudar('raca', e.target.value)} />
          </div>
          <div>
            <label className={rotulo} htmlFor="ag-serv">Serviço</label>
            <select id="ag-serv" className={campo} value={dados.servico} onChange={(e) => mudar('servico', e.target.value)}>
              {SERVICOS_ONLINE.map((s) => <option key={s} value={s}>{NOME_SERVICO[s]}</option>)}
            </select>
          </div>
          <div>
            <label className={rotulo} htmlFor="ag-obs">Observação (opcional)</label>
            <textarea id="ag-obs" className={`${campo} min-h-16`} maxLength={300} placeholder="Ex.: tem medo de secador" value={dados.obs} onChange={(e) => mudar('obs', e.target.value)} />
          </div>
          <label className="flex items-start gap-2 text-xs text-slate-600">
            <input type="checkbox" className="mt-0.5" checked={consentimento} onChange={(e) => setConsentimento(e.target.checked)} />
            Autorizo a loja a guardar meu nome e WhatsApp para o atendimento do meu pet.
          </label>
          <button onClick={enviar} disabled={enviando}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold shadow-sm disabled:opacity-60"
            style={{ background: '#0B5A70' }}>
            {enviando ? <Loader2 size={18} className="animate-spin" /> : <CalendarCheck size={18} />}
            Marcar vaga {vaga} · {dia === hoje ? 'hoje' : diaCurto(dia!)}
          </button>
          <p className="text-[11px] text-slate-500 text-center">A loja vai confirmar o seu pedido. Você acompanha tudo pela próxima tela.</p>
        </section>
      )}
    </Moldura>
  );
}

// ─── /agendamento/<código> ────────────────────────────────────────────────────
export function AcompanharPedido({ codigo }: { codigo: string }) {
  const [pedido, setPedido] = useState<Pedido | null | undefined>(undefined);
  const [cancelando, setCancelando] = useState(false);
  const [perguntar, setPerguntar] = useState(false);

  useEffect(() => { document.title = 'Seu agendamento'; return ouvirPedido(codigo, setPedido); }, [codigo]);

  if (pedido === undefined) return <Carregando />;
  if (!pedido) return <Aviso titulo="Agendamento não encontrado" texto="Este link não existe mais ou já venceu. Os links valem até o dia seguinte ao agendamento." />;

  const frase = fraseDoPedido(pedido.status, pedido.nomePet);
  const podeCancelar = pedido.status === 'pendente' || pedido.status === 'confirmado';
  const etapas = [
    { nome: 'Pedido enviado', feito: true },
    { nome: 'Loja confirmou', feito: ['confirmado', 'chegou'].includes(pedido.status) },
    { nome: 'Chegou na loja', feito: pedido.status === 'chegou' },
  ];
  const encerrado = ['recusado', 'faltou', 'cancelado', 'cancelado_ok'].includes(pedido.status);

  const cancelar = async () => {
    setCancelando(true);
    try { await cancelarPedido(codigo); toast.success('Agendamento cancelado.'); }
    catch (e) { console.error('[cancelar]', e); toast.error('Não foi possível cancelar. Tente de novo.'); }
    finally { setCancelando(false); setPerguntar(false); }
  };

  return (
    <Moldura agenda={pedido} subtitulo="Seu agendamento">
      <section className={`${cartao} text-center flex flex-col items-center gap-2 p-5`}>
        <div className="w-20 h-20 rounded-full bg-sky-100 grid place-items-center text-4xl" aria-hidden>{pedido.especie === 'gato' ? '🐱' : '🐶'}</div>
        <h1 className="text-2xl font-extrabold text-slate-800 break-words">{pedido.nomePet}</h1>
        <span className="text-white text-sm font-bold px-4 py-1.5 rounded-full" style={{ background: frase.cor }}>{frase.titulo}</span>
        <p className="text-sm text-slate-600">{frase.texto}</p>
        {pedido.status === 'recusado' && pedido.motivo && <p className="text-xs text-slate-500">Motivo: {pedido.motivo}</p>}
        <p className="text-xs text-slate-400">{NOME_SERVICO[pedido.servico] ?? pedido.servico} · {diaCurto(pedido.dia)} · vaga {pedido.vaga}</p>
      </section>

      {!encerrado && (
        <ol className={`${cartao} px-5 py-3`} aria-label="Etapas do agendamento">
          {etapas.map((e) => (
            <li key={e.nome} className="flex items-center gap-3 py-2">
              <span className={`w-6 h-6 rounded-full border-2 grid place-items-center ${e.feito ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'}`}>
                {e.feito && <Check className="w-3.5 h-3.5" />}
              </span>
              <span className={`text-sm ${e.feito ? 'text-slate-800 font-semibold' : 'text-slate-400'}`}>{e.nome}</span>
            </li>
          ))}
        </ol>
      )}

      {encerrado && (
        <a href={`/agendar/${pedido.lojaId}`} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-[#0B5A70] font-semibold shadow-sm">
          <ArrowLeft size={16} /> Marcar outra vaga
        </a>
      )}

      {podeCancelar && (
        <div className={`${cartao} space-y-2`}>
          <p className="text-xs text-slate-500">Guarde este link para acompanhar o pedido. Esta página se atualiza sozinha.</p>
          {perguntar ? (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setPerguntar(false)} disabled={cancelando} className="py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600">Voltar</button>
              <button onClick={cancelar} disabled={cancelando} className="py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-60">
                {cancelando ? 'Cancelando...' : 'Sim, cancelar'}
              </button>
            </div>
          ) : (
            <button onClick={() => setPerguntar(true)} className="w-full py-2.5 rounded-xl border border-red-200 text-red-700 text-sm font-semibold">Cancelar agendamento</button>
          )}
        </div>
      )}
    </Moldura>
  );
}
