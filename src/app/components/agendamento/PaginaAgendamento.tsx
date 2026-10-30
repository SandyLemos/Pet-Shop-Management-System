// ✅ Páginas públicas do agendamento online (sem login), no visual do sistema:
//   /agendar/<loja>        → o tutor escolhe o dia e a vaga e faz o pedido
//   /agendamento/<código>  → o tutor acompanha o pedido (e, depois da chegada, o atendimento ao vivo)
// Celular: uma coluna, com o botão de marcar preso no rodapé.
// Computador: duas colunas, com o resumo do agendamento fixo ao lado.
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast, Toaster } from 'sonner';
import {
  Ban, CalendarCheck, CalendarDays, Check, ChevronRight, ClipboardList, Dog, Droplet, Info, Loader2,
  MessageCircle, PawPrint, RotateCcw, Scissors, ShieldCheck, Sparkles, User, Wind, X,
} from 'lucide-react';
import PawBackground from '../PawBackground';
import {
  VAGA_TOMADA, cancelarPedido, criarPedido, ouvirAgenda, ouvirDiasOnline, ouvirMarcadas, ouvirPedido,
  type AgendaPublica, type DiaOnline, type Pedido,
} from '../../../services/agendamentoService';
import { ouvirLinkTutor, type Acompanhamento } from '../../../services/acompanhamentoService';
import {
  SERVICOS_ONLINE, andamentoDoPedido, diaCurto, problemaNoPedido, vagasLivres, type DadosPedido,
} from '../../../utils/agendamento';
import { NOME_SERVICO } from '../../../utils/acompanhamento';
import { CORES_PADRAO, MARCA, coresValidas, fundoTopo } from '../../../utils/cores';
import { idDoDia } from '../../../utils/dias';

const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const SEMANA_LONGA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const diaDaSemana = (dia: string) => SEMANA_LONGA[new Date(`${dia}T12:00:00Z`).getUTCDay()];
const hora = (ms?: number) =>
  ms ? new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : '';
const PORTE: Record<string, string> = { pequeno: 'Pequeno', medio: 'Médio', grande: 'Grande' };
const ICONE_SERVICO: Record<string, typeof Droplet> = {
  banho: Droplet, banho_tosa: Scissors, tosa: Scissors, higienica: Scissors, hidratacao: Sparkles, ozonio: Wind,
};

// ─── Moldura: topo igual ao do sistema + fundo com patinhas ───────────────────
type Visual = Pick<AgendaPublica, 'nomeLoja' | 'logoUrl' | 'cores'> | null | undefined;

function Moldura({ agenda, subtitulo, children, rodape }: { agenda: Visual; subtitulo: string; children: ReactNode; rodape?: ReactNode }) {
  const cores = coresValidas(agenda?.cores) ?? CORES_PADRAO;
  return (
    <div className="min-h-screen bg-pet-pattern relative">
      <PawBackground quantidade={14} imgSrc="/paw.png" espacamento={1.2} />
      <Toaster position="top-center" richColors />
      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="shadow-md" style={{ background: fundoTopo(cores) }}>
          <div className="max-w-6xl mx-auto px-4 py-3 sm:px-6 sm:py-4 flex items-center gap-3 sm:gap-4">
            <div className="bg-white rounded-lg px-2 py-1 sm:rounded-xl sm:px-3 sm:py-1.5 shadow-md shrink-0">
              <img
                src={agenda?.logoUrl || '/logo-pata-gestao.png'}
                alt=""
                className="h-8 sm:h-10 w-auto max-w-[80px] sm:max-w-[120px] object-contain"
                onError={(e) => { e.currentTarget.src = '/logo-pata-gestao.png'; }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white font-bold text-base sm:text-2xl leading-tight truncate">{agenda?.nomeLoja || 'Pet shop'}</p>
              <p className="text-white/75 text-xs sm:text-sm">{subtitulo}</p>
            </div>
            <span className="hidden md:flex items-center gap-1.5 text-white/85 text-xs font-semibold bg-white/10 rounded-full px-3 py-1.5">
              <ShieldCheck size={14} /> Sem cadastro e sem senha
            </span>
          </div>
        </header>
        <main className="flex-1 w-full max-w-6xl mx-auto px-3 py-4 sm:px-6 sm:py-8">{children}</main>
        {rodape}
        <footer className="text-center text-[11px] text-slate-500 pb-5 px-4">Pata &amp; Gestão</footer>
      </div>
    </div>
  );
}

const Carregando = () => (
  <div className="min-h-screen grid place-items-center bg-pet-pattern text-slate-500"><Loader2 className="w-7 h-7 animate-spin" aria-label="Carregando" /></div>
);

function Aviso({ agenda, titulo, texto, acao }: { agenda?: Visual; titulo: string; texto: string; acao?: ReactNode }) {
  return (
    <Moldura agenda={agenda} subtitulo="Agendamento online">
      <div className="max-w-md mx-auto mt-6 sm:mt-16 bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 p-8 text-center space-y-3">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-sky-50 grid place-items-center"><PawPrint className="w-8 h-8" style={{ color: MARCA.petroleo }} /></div>
        <h1 className="text-xl font-bold text-slate-800">{titulo}</h1>
        <p className="text-sm text-slate-500">{texto}</p>
        {acao}
      </div>
    </Moldura>
  );
}

/** Cartão numerado de cada passo */
function Passo({ numero, titulo, descricao, feito, children }: { numero: number; titulo: string; descricao?: string; feito?: boolean; children: ReactNode }) {
  return (
    <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 p-4 sm:p-6">
      <div className="flex items-start gap-3 mb-4">
        <span className={`w-8 h-8 shrink-0 rounded-full grid place-items-center text-sm font-bold text-white ${feito ? 'bg-emerald-600' : ''}`}
          style={feito ? undefined : { background: MARCA.petroleo }}>
          {feito ? <Check size={16} /> : numero}
        </span>
        <div className="min-w-0">
          <h2 className="font-bold text-slate-800 text-base sm:text-lg leading-tight">{titulo}</h2>
          {descricao && <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{descricao}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

const campo = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:bg-white transition';
const rotulo = 'block text-sm font-semibold text-slate-600 mb-1.5';

function Escolha<T extends string>({ valor, opcoes, aoEscolher, nome, colunas = 'grid-cols-2' }:
  { valor: T | ''; opcoes: { id: T; nome: string; icone?: ReactNode }[]; aoEscolher: (v: T) => void; nome: string; colunas?: string }) {
  return (
    <div role="radiogroup" aria-label={nome} className={`grid ${colunas} gap-2`}>
      {opcoes.map((o) => {
        const sel = valor === o.id;
        return (
          <button key={o.id} type="button" role="radio" aria-checked={sel} onClick={() => aoEscolher(o.id)}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition ${
              sel ? 'text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300'}`}
            style={sel ? { background: MARCA.petroleo, borderColor: MARCA.petroleo } : undefined}>
            {o.icone}{o.nome}
          </button>
        );
      })}
    </div>
  );
}

const VAZIO: DadosPedido = { nomeTutor: '', telefone: '', nomePet: '', especie: '', raca: '', porte: '', servico: 'banho', obs: '' };

// ─── /agendar/<loja> ──────────────────────────────────────────────────────────
export function AgendarOnline({ loja }: { loja: string }) {
  const hoje = idDoDia();
  const [agenda, setAgenda] = useState<AgendaPublica | null | undefined>(undefined);
  const [dias, setDias] = useState<DiaOnline[] | null>(null);
  const [marcadasPorDia, setMarcadasPorDia] = useState<Record<string, number[]>>({});
  const [dia, setDia] = useState<string | null>(null);
  const [vaga, setVaga] = useState<number | null>(null);
  const [dados, setDados] = useState<DadosPedido>(VAZIO);
  const [consentimento, setConsentimento] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => { document.title = 'Agende o banho do seu pet'; return ouvirAgenda(loja, setAgenda); }, [loja]);
  useEffect(() => ouvirDiasOnline(loja, hoje, (d) => setDias(d.filter((x) => x.vagas.length > 0))), [loja, hoje]);
  const chaveDias = (dias ?? []).map((d) => d.dia).join(',');
  useEffect(() => {
    const fins = (dias ?? []).map((d) => ouvirMarcadas(loja, d.dia, (m) => setMarcadasPorDia((x) => ({ ...x, [d.dia]: m }))));
    return () => fins.forEach((f) => f());
  }, [loja, chaveDias]); // eslint-disable-line react-hooks/exhaustive-deps

  const livresDe = (d: DiaOnline) => vagasLivres(d.vagas, marcadasPorDia[d.dia] ?? []);
  const diaEscolhido = useMemo(() => (dias ?? []).find((d) => d.dia === dia) ?? null, [dias, dia]);
  const livres = diaEscolhido ? livresDe(diaEscolhido) : [];

  // já abre no primeiro dia que tem vaga
  useEffect(() => {
    if (dia || !dias) return;
    const primeiro = dias.find((d) => d.dia in marcadasPorDia && livresDe(d).length > 0);
    if (primeiro) setDia(primeiro.dia);
  }, [dias, marcadasPorDia]); // eslint-disable-line react-hooks/exhaustive-deps

  // a vaga escolhida foi marcada por outra pessoa enquanto o tutor preenchia
  useEffect(() => {
    if (vaga !== null && diaEscolhido && !livres.includes(vaga)) {
      setVaga(null);
      toast.info('Essa vaga acabou de ser marcada por outra pessoa. Escolha outra.');
    }
  }, [livres.join(','), vaga]); // eslint-disable-line react-hooks/exhaustive-deps

  if (agenda === undefined || dias === null) return <Carregando />;
  if (!agenda || !agenda.ativo) {
    return <Aviso agenda={agenda} titulo="Agendamento indisponível" texto="Esta loja não está recebendo agendamentos online agora. Fale direto com a loja." />;
  }

  const mudar = <K extends keyof DadosPedido>(k: K, v: DadosPedido[K]) => setDados((d) => ({ ...d, [k]: v }));
  const dadosOk = !problemaNoPedido(dados) && consentimento;
  const pronto = !!dia && vaga !== null;

  const enviar = async () => {
    if (!dia || vaga === null) { toast.error('Escolha o dia e a vaga.'); return; }
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

  const textoBotao = pronto ? `Marcar vaga ${vaga} · ${dia === hoje ? 'hoje' : diaCurto(dia!)}` : 'Escolha o dia e a vaga';
  const Botao = ({ classe = '' }: { classe?: string }) => (
    <button onClick={enviar} disabled={enviando || !pronto}
      className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold shadow-md transition disabled:opacity-50 ${classe}`}
      style={{ background: `linear-gradient(135deg, ${MARCA.petroleo}, ${MARCA.azul})` }}>
      {enviando ? <Loader2 size={18} className="animate-spin" /> : <CalendarCheck size={18} />} {textoBotao}
    </button>
  );

  return (
    <Moldura
      agenda={agenda}
      subtitulo="Agendamento online"
      rodape={
        /* celular: resumo e botão presos no rodapé */
        <div className="lg:hidden sticky bottom-0 z-20 bg-white/95 backdrop-blur border-t border-slate-200 px-3 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <Botao />
        </div>
      }
    >
      {/* Apresentação */}
      <div className="mb-4 sm:mb-6 bg-white/80 backdrop-blur rounded-2xl ring-1 ring-white p-4 sm:p-6 flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900">Agende o banho do seu pet</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">Escolha o dia e uma vaga livre. A loja confirma e você acompanha tudo por um link.</p>
        </div>
        <ol className="grid grid-cols-3 gap-2 lg:w-[460px]">
          {[
            { icone: CalendarDays, texto: 'Você escolhe a vaga' },
            { icone: ShieldCheck, texto: 'A loja confirma' },
            { icone: PawPrint, texto: 'Leve o pet no dia' },
          ].map(({ icone: I, texto }, i) => (
            <li key={texto} className="flex flex-col items-center text-center gap-1.5 rounded-xl bg-sky-50 px-2 py-3">
              <span className="w-8 h-8 rounded-full grid place-items-center text-white" style={{ background: i === 2 ? MARCA.laranja : MARCA.petroleo }}><I size={16} /></span>
              <span className="text-[11px] sm:text-xs font-semibold text-slate-700 leading-tight">{texto}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-4 sm:gap-6 items-start">
        <div className="space-y-4 sm:space-y-6 min-w-0">
          {/* 1. Dia */}
          <Passo numero={1} titulo="Escolha o dia" descricao="Dias com vagas abertas pela loja" feito={!!dia}>
            {dias.length === 0 ? (
              <p className="text-sm text-slate-500 bg-slate-50 rounded-xl p-4 text-center">Nenhuma vaga online aberta no momento. Volte mais tarde ou fale com a loja.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3">
                {dias.map((d) => {
                  const n = livresDe(d).length;
                  const sel = d.dia === dia;
                  return (
                    <button key={d.dia} disabled={n === 0} aria-pressed={sel} onClick={() => { setDia(d.dia); setVaga(null); }}
                      className={`rounded-xl border-2 py-2.5 px-1 text-center transition disabled:opacity-40 disabled:cursor-not-allowed ${
                        sel ? 'text-white shadow-md' : 'border-slate-200 bg-white hover:border-sky-300'}`}
                      style={sel ? { background: MARCA.petroleo, borderColor: MARCA.petroleo } : undefined}>
                      <span className={`block text-[11px] font-semibold uppercase tracking-wide ${sel ? 'text-white/80' : 'text-slate-500'}`}>
                        {d.dia === hoje ? 'Hoje' : diaDaSemana(d.dia).slice(0, 3)}
                      </span>
                      <span className="block text-2xl font-extrabold leading-tight">{+d.dia.slice(8, 10)}</span>
                      <span className={`block text-[11px] ${sel ? 'text-white/80' : 'text-slate-500'}`}>{MES[+d.dia.slice(5, 7) - 1]}</span>
                      <span className={`inline-block mt-1 text-[10px] font-bold rounded-full px-2 py-0.5 ${
                        sel ? 'bg-white/20 text-white' : n ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {n ? `${n} ${n === 1 ? 'vaga' : 'vagas'}` : 'esgotado'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </Passo>

          {/* 2. Vaga */}
          <Passo numero={2} titulo="Escolha a vaga"
            descricao={diaEscolhido ? `${diaDaSemana(diaEscolhido.dia)}, ${diaCurto(diaEscolhido.dia).split(', ')[1]}. Não tem horário: é só levar o pet na loja no dia.` : 'Escolha um dia primeiro'}
            feito={vaga !== null}>
            {!diaEscolhido ? (
              <p className="text-sm text-slate-400 bg-slate-50 rounded-xl p-4 text-center">As vagas aparecem aqui quando você escolher o dia.</p>
            ) : (
              <>
                <div className="grid grid-cols-4 sm:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-2.5">
                  {[...diaEscolhido.vagas].sort((a, b) => a - b).map((n) => {
                    const livre = livres.includes(n);
                    const sel = n === vaga;
                    return (
                      <button key={n} disabled={!livre} onClick={() => setVaga(n)} aria-pressed={sel} aria-label={`Vaga ${n}${livre ? '' : ' (ocupada)'}`}
                        className={`relative aspect-square rounded-lg border-2 flex flex-col items-center justify-center gap-0.5 transition ${
                          sel ? 'text-white shadow-md scale-[1.03]'
                            : livre ? 'bg-emerald-100 hover:bg-emerald-200 border-emerald-300 text-emerald-700'
                              : 'bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed opacity-70'}`}
                        style={sel ? { background: MARCA.petroleo, borderColor: MARCA.petroleo } : undefined}>
                        {sel ? <Check className="w-4 h-4" /> : livre ? <Dog className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                        <span className="text-sm font-bold">{n}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-emerald-100 border-2 border-emerald-300" /> Livre</span>
                  <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-slate-200 border-2 border-slate-300" /> Ocupada</span>
                  <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded border-2" style={{ background: MARCA.petroleo, borderColor: MARCA.petroleo }} /> Sua escolha</span>
                </div>
              </>
            )}
          </Passo>

          {/* 3. Dados */}
          <Passo numero={3} titulo="Seus dados e do pet" descricao="A loja usa estes dados para confirmar e receber o pet" feito={dadosOk}>
            <div className="space-y-5">
              <fieldset className="space-y-3">
                <legend className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500 mb-2"><User size={14} /> Tutor</legend>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className={rotulo} htmlFor="ag-tutor">Seu nome</label>
                    <input id="ag-tutor" className={campo} maxLength={100} placeholder="Nome e sobrenome" value={dados.nomeTutor} onChange={(e) => mudar('nomeTutor', e.target.value)} autoComplete="name" />
                  </div>
                  <div>
                    <label className={rotulo} htmlFor="ag-tel">WhatsApp (com DDD)</label>
                    <input id="ag-tel" className={campo} inputMode="tel" maxLength={20} placeholder="(24) 99999-1234" value={dados.telefone} onChange={(e) => mudar('telefone', e.target.value)} autoComplete="tel" />
                  </div>
                </div>
              </fieldset>

              <fieldset className="space-y-3">
                <legend className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500 mb-2"><PawPrint size={14} /> Pet</legend>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className={rotulo} htmlFor="ag-pet">Nome do pet</label>
                    <input id="ag-pet" className={campo} maxLength={100} placeholder="Ex.: Thor" value={dados.nomePet} onChange={(e) => mudar('nomePet', e.target.value)} />
                  </div>
                  <div>
                    <label className={rotulo} htmlFor="ag-raca">Raça <span className="font-normal text-slate-400">(opcional)</span></label>
                    <input id="ag-raca" className={campo} maxLength={60} placeholder="Ex.: Shih-tzu, SRD" value={dados.raca} onChange={(e) => mudar('raca', e.target.value)} />
                  </div>
                  <div>
                    <span className={rotulo}>Espécie</span>
                    <Escolha nome="Espécie" valor={dados.especie} aoEscolher={(v) => mudar('especie', v)}
                      opcoes={[{ id: 'cao', nome: 'Cão', icone: <span aria-hidden>🐶</span> }, { id: 'gato', nome: 'Gato', icone: <span aria-hidden>🐱</span> }]} />
                  </div>
                  <div>
                    <span className={rotulo}>Porte</span>
                    <Escolha nome="Porte" colunas="grid-cols-3" valor={dados.porte} aoEscolher={(v) => mudar('porte', v)}
                      opcoes={[{ id: 'pequeno', nome: 'Pequeno' }, { id: 'medio', nome: 'Médio' }, { id: 'grande', nome: 'Grande' }]} />
                  </div>
                </div>
                <div>
                  <span className={rotulo}>Serviço</span>
                  <Escolha nome="Serviço" colunas="grid-cols-2 sm:grid-cols-3" valor={dados.servico} aoEscolher={(v) => mudar('servico', v)}
                    opcoes={SERVICOS_ONLINE.map((s) => { const I = ICONE_SERVICO[s] ?? Droplet; return { id: s, nome: NOME_SERVICO[s], icone: <I size={15} /> }; })} />
                </div>
                <div>
                  <label className={rotulo} htmlFor="ag-obs">Observação <span className="font-normal text-slate-400">(opcional)</span></label>
                  <textarea id="ag-obs" className={`${campo} min-h-20`} maxLength={300} placeholder="Ex.: tem medo de secador, alergia a algum produto" value={dados.obs} onChange={(e) => mudar('obs', e.target.value)} />
                </div>
              </fieldset>

              <label className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-600 bg-slate-50 rounded-xl p-3 cursor-pointer">
                <input type="checkbox" className="mt-0.5 w-4 h-4 accent-[#0B5A70]" checked={consentimento} onChange={(e) => setConsentimento(e.target.checked)} />
                Autorizo a loja a guardar meu nome e WhatsApp para o atendimento do meu pet.
              </label>
            </div>
          </Passo>
        </div>

        {/* computador: resumo fixo ao lado */}
        <aside className="hidden lg:block sticky top-6 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 overflow-hidden">
            <div className="px-5 py-4 text-white" style={{ background: `linear-gradient(135deg, ${MARCA.petroleo}, ${MARCA.azul})` }}>
              <p className="text-xs text-white/75 font-semibold uppercase tracking-wide">Resumo</p>
              <p className="text-lg font-bold">Seu agendamento</p>
            </div>
            <dl className="px-5 py-3 divide-y divide-slate-100 text-sm">
              {[
                { nome: 'Dia', valor: dia ? `${diaDaSemana(dia)}, ${diaCurto(dia).split(', ')[1]}` : null },
                { nome: 'Vaga', valor: vaga !== null ? `Vaga ${vaga}` : null },
                { nome: 'Pet', valor: dados.nomePet.trim() || null },
                { nome: 'Serviço', valor: NOME_SERVICO[dados.servico] ?? null },
              ].map((l) => (
                <div key={l.nome} className="flex justify-between gap-3 py-2.5">
                  <dt className="text-slate-500">{l.nome}</dt>
                  <dd className={`font-semibold text-right ${l.valor ? 'text-slate-800' : 'text-slate-300'}`}>{l.valor ?? '—'}</dd>
                </div>
              ))}
            </dl>
            <div className="px-5 pb-5 space-y-2">
              <Botao />
              <p className="text-[11px] text-slate-500 text-center">A loja vai confirmar o pedido. Você acompanha tudo na próxima tela.</p>
            </div>
          </div>
          <div className="bg-white/80 rounded-2xl ring-1 ring-white p-4 flex gap-3 text-xs text-slate-600">
            <Info size={16} className="shrink-0 mt-0.5" style={{ color: MARCA.petroleo }} />
            Não precisa criar conta. Depois de marcar, guarde o link da próxima tela para acompanhar ou cancelar.
          </div>
        </aside>
      </div>
    </Moldura>
  );
}

// ─── /agendamento/<código> ────────────────────────────────────────────────────
export function AcompanharPedido({ codigo }: { codigo: string }) {
  const [pedido, setPedido] = useState<Pedido | null | undefined>(undefined);
  const [aoVivo, setAoVivo] = useState<Acompanhamento | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [perguntar, setPerguntar] = useState(false);

  useEffect(() => { document.title = 'Seu agendamento'; return ouvirPedido(codigo, setPedido); }, [codigo]);
  // depois da chegada: segue o pet na fila da loja, etapa por etapa
  const link = pedido?.status === 'chegou' ? pedido.linkTutor : undefined;
  useEffect(() => { setAoVivo(null); if (link) return ouvirLinkTutor(link, setAoVivo); }, [link]);

  if (pedido === undefined) return <Carregando />;
  if (!pedido) return <Aviso titulo="Agendamento não encontrado" texto="Este link não existe mais ou já venceu. Os links valem até o dia seguinte ao agendamento." />;

  const { titulo, texto, cor, etapas } = andamentoDoPedido(pedido, aoVivo);
  const podeCancelar = pedido.status === 'pendente' || pedido.status === 'confirmado';
  const encerrado = ['recusado', 'faltou', 'cancelado', 'cancelado_ok'].includes(pedido.status) || aoVivo?.status === 'removido';
  const IconeServico = ICONE_SERVICO[pedido.servico] ?? Droplet;

  const cancelar = async () => {
    setCancelando(true);
    try { await cancelarPedido(codigo); toast.success('Agendamento cancelado.'); }
    catch (e) { console.error('[cancelar]', e); toast.error('Não foi possível cancelar. Tente de novo.'); }
    finally { setCancelando(false); setPerguntar(false); }
  };

  const copiarLink = async () => {
    try { await navigator.clipboard.writeText(window.location.href); toast.success('Link copiado. Guarde para acompanhar.'); }
    catch { toast.info(window.location.href); }
  };

  return (
    <Moldura agenda={pedido} subtitulo="Seu agendamento">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-4 sm:gap-6 items-start">
        <div className="space-y-4 sm:space-y-6 min-w-0">
          {/* Situação */}
          <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 overflow-hidden">
            <div className="h-2" style={{ background: cor }} />
            <div className="p-5 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 text-center sm:text-left">
              <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-2xl grid place-items-center text-5xl" style={{ background: `${cor}1A` }} aria-hidden>
                {pedido.especie === 'gato' ? '🐱' : '🐶'}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 break-words">{pedido.nomePet}</h1>
                <span className="inline-flex items-center gap-1.5 text-white text-sm font-bold px-3.5 py-1.5 rounded-full" style={{ background: cor }}>
                  {!encerrado && <span className="w-2 h-2 rounded-full bg-white/90 animate-pulse" />} {titulo}
                </span>
                <p className="text-sm sm:text-base text-slate-600">{texto}</p>
                {pedido.status === 'recusado' && pedido.motivo && <p className="text-sm text-slate-500">Motivo: {pedido.motivo}</p>}
                <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-1">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-full px-3 py-1"><IconeServico size={13} /> {NOME_SERVICO[pedido.servico] ?? pedido.servico}</span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-full px-3 py-1"><CalendarDays size={13} /> {diaDaSemana(pedido.dia)}, {diaCurto(pedido.dia).split(', ')[1]}</span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-full px-3 py-1"><Dog size={13} /> Vaga {pedido.vaga}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Andamento */}
          {!encerrado && (
            <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 p-5 sm:p-6">
              <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><ClipboardList size={18} style={{ color: MARCA.petroleo }} /> Andamento</h2>
              <ol aria-label="Etapas do agendamento">
                {etapas.map((e, i) => (
                  <li key={e.id} className="relative grid grid-cols-[28px_1fr_auto] items-center gap-3 py-2.5">
                    {i < etapas.length - 1 && (
                      <span className={`absolute left-[13px] top-[34px] h-[calc(100%-20px)] w-0.5 ${e.estado === 'feito' ? 'bg-emerald-500' : 'bg-slate-200'}`} aria-hidden />
                    )}
                    <span className={`relative z-10 w-7 h-7 rounded-full border-2 grid place-items-center ${
                      e.estado === 'feito' ? 'bg-emerald-600 border-emerald-600 text-white'
                        : e.estado === 'agora' ? 'text-white ring-4 ring-sky-100' : 'border-slate-300 bg-white'}`}
                      style={e.estado === 'agora' ? { background: MARCA.petroleo, borderColor: MARCA.petroleo } : undefined}>
                      {e.estado === 'feito' ? <Check className="w-4 h-4" /> : e.estado === 'agora' ? <span className="w-2 h-2 rounded-full bg-white" /> : null}
                    </span>
                    <span className={`text-sm ${e.estado === 'futuro' ? 'text-slate-400' : 'text-slate-800'} ${e.estado === 'agora' ? 'font-bold' : 'font-medium'}`}>
                      {e.nome}
                      {e.estado === 'agora' && <span className="ml-2 text-[11px] font-semibold text-sky-700 bg-sky-50 rounded-full px-2 py-0.5">agora</span>}
                    </span>
                    <time className="text-xs text-slate-400 tabular-nums">{e.estado !== 'futuro' ? hora(e.hora) : ''}</time>
                  </li>
                ))}
              </ol>
              <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5"><RotateCcw size={12} /> Esta página se atualiza sozinha.</p>
            </section>
          )}
        </div>

        {/* Lateral (no celular vem embaixo) */}
        <aside className="space-y-4 lg:sticky lg:top-6">
          <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 p-5">
            <h2 className="font-bold text-slate-800 mb-2">Dados do agendamento</h2>
            <dl className="divide-y divide-slate-100 text-sm">
              {[
                ['Tutor', pedido.nomeTutor],
                ['Pet', `${pedido.especie === 'gato' ? 'Gato' : 'Cão'}${pedido.raca ? ` · ${pedido.raca}` : ''}${PORTE[pedido.porte] ? ` · ${PORTE[pedido.porte]}` : ''}`],
                ['Serviço', NOME_SERVICO[pedido.servico] ?? pedido.servico],
                ['Loja', pedido.nomeLoja],
                ['Observação', pedido.obs],
              ].filter(([, v]) => v).map(([n, v]) => (
                <div key={n} className="flex justify-between gap-3 py-2">
                  <dt className="text-slate-500 shrink-0">{n}</dt>
                  <dd className="font-semibold text-slate-800 text-right break-words min-w-0">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 p-5 space-y-2.5">
            <button onClick={copiarLink}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold hover:bg-sky-50 transition"
              style={{ borderColor: MARCA.petroleo, color: MARCA.petroleo }}>
              <MessageCircle size={16} /> Copiar link para acompanhar
            </button>
            {encerrado && (
              <a href={`/agendar/${pedido.lojaId}`} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-bold"
                style={{ background: `linear-gradient(135deg, ${MARCA.petroleo}, ${MARCA.azul})` }}>
                <CalendarCheck size={16} /> Marcar outra vaga <ChevronRight size={16} />
              </a>
            )}
            {podeCancelar && (perguntar ? (
              <div className="rounded-xl bg-red-50 p-3 space-y-2">
                <p className="text-sm font-semibold text-red-800">Cancelar este agendamento?</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setPerguntar(false)} disabled={cancelando} className="py-2 rounded-lg bg-white border border-slate-200 text-sm font-semibold text-slate-600">Voltar</button>
                  <button onClick={cancelar} disabled={cancelando} className="py-2 rounded-lg bg-red-600 text-white text-sm font-semibold disabled:opacity-60">
                    {cancelando ? 'Cancelando...' : 'Sim, cancelar'}
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setPerguntar(true)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 text-red-700 text-sm font-semibold hover:bg-red-50">
                <X size={16} /> Cancelar agendamento
              </button>
            ))}
          </section>
        </aside>
      </div>
    </Moldura>
  );
}
