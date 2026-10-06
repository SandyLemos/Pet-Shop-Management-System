// ✅ Painel de Análises do Painel Admin (gráficos para o dono da loja).
// Cabeçalho no padrão dos modais do Admin; corpo em abas, no estilo de dashboard
// (cartões brancos arredondados, rosca com total no centro, barras arredondadas).
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import {
  BarChart3, X, PackageCheck, Clock, UserPlus, Repeat, CalendarDays, Users, PawPrint, Heart, UserX,
  MessageCircle, RefreshCw, TrendingUp, TrendingDown, LayoutDashboard, Sparkles, Trash2,
  Lightbulb, AlertTriangle, Target, PartyPopper, ChevronRight,
} from 'lucide-react';
import { idDoDia } from '../../utils/dias';
import { carregarDadosAnalise, DIAS_ANALISE } from '../../services/analyticsService';
import {
  PERIODOS, intervalos, resumo, variacao, porDia, porHora, porServico, porProfissional, perfil, clientes,
  formatarMinutos, gerarDicas, type Periodo, type LogDoDia, type FichaResumo, type Dica, type TipoDica,
} from '../../utils/analytics';
import { linkWhatsAppSaudade } from '../../utils/whatsapp';

// Paleta do painel (inspirada no modelo aprovado pelo André)
const C = { azul: '#38a3f5', verde: '#2dd4a7', coral: '#f87e8b', roxo: '#a26cf0', laranja: '#fdb446', trilho: '#e3edf6' };
const PALETA = [C.azul, C.verde, C.coral, C.roxo, C.laranja];
const fmtDia = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const pct = (v: number, t: number) => (t ? Math.round((v / t) * 100) : 0);
const tooltipStyle = { borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(15,23,42,.12)', fontSize: 12 };

type Aba = 'geral' | 'dicas' | 'servicos' | 'pets' | 'clientes';
const ABAS: { id: Aba; label: string; icone: ReactNode }[] = [
  { id: 'geral', label: 'Visão geral', icone: <LayoutDashboard size={14} /> },
  { id: 'dicas', label: 'Dicas', icone: <Lightbulb size={14} /> },
  { id: 'servicos', label: 'Serviços e equipe', icone: <Sparkles size={14} /> },
  { id: 'pets', label: 'Pets', icone: <PawPrint size={14} /> },
  { id: 'clientes', label: 'Clientes', icone: <Heart size={14} /> },
];

// ─── Peças visuais ─────────────────────────────────────────────────────────
function Cartao({ titulo, subtitulo, children, className = '', extra }: { titulo: string; subtitulo?: string; children: ReactNode; className?: string; extra?: ReactNode }) {
  return (
    <div className={`bg-white rounded-3xl p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)] flex flex-col ${className}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-bold text-slate-900 text-base">{titulo}</h3>
          {subtitulo && <p className="text-xs text-slate-500 mt-0.5">{subtitulo}</p>}
        </div>
        {extra}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

function Vazio({ texto = 'Nenhum atendimento neste período.' }: { texto?: string }) {
  return <div className="h-full min-h-[140px] flex items-center justify-center text-sm text-slate-400 text-center">{texto}</div>;
}

function Indicador({ icone, cor, rotulo, valor, delta }: { icone: ReactNode; cor: string; rotulo: string; valor: string; delta?: number | null }) {
  return (
    <div className="bg-white rounded-3xl p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] flex items-center gap-4">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${cor}22`, color: cor }}>{icone}</div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium">{rotulo}</p>
        <p className="text-[26px] font-extrabold text-slate-900 leading-tight">{valor}</p>
        {delta !== undefined && delta !== null && (
          <p className={`text-[11px] font-semibold flex items-center gap-1 ${delta >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
            {delta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{delta >= 0 ? '+' : ''}{delta}% vs. anterior
          </p>
        )}
      </div>
    </div>
  );
}

/** Rosca com total no centro e porcentagem em cada fatia (estilo "Category" do modelo). */
function Rosca({ dados, total, rotuloCentro }: { dados: { nome: string; total: number }[]; total: number; rotuloCentro: string }) {
  return (
    <div className="relative w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={dados} dataKey="total" nameKey="nome" innerRadius="62%" outerRadius="88%" paddingAngle={4} cornerRadius={10} stroke="none"
            labelLine={false}
            label={({ cx, cy, midAngle, innerRadius, outerRadius, value }: any) => {
              const p = pct(value, total); if (p < 6) return null;
              const r = innerRadius + (outerRadius - innerRadius) / 2; const a = (-midAngle * Math.PI) / 180;
              return <text x={cx + r * Math.cos(a)} y={cy + r * Math.sin(a)} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={800}>{p}%</text>;
            }}>
            {dados.map((_, i) => <Cell key={i} fill={PALETA[i % PALETA.length]} />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-3xl font-extrabold text-slate-900">{total}</span>
        <span className="text-xs text-slate-500">{rotuloCentro}</span>
      </div>
    </div>
  );
}

/** Meia-lua (estilo "Active Statistics" do modelo). */
function MeiaLua({ dados, centro, rotulo }: { dados: { nome: string; total: number; cor: string }[]; centro: string; rotulo: string }) {
  const total = dados.reduce((a, d) => a + d.total, 0);
  return (
    <div className="flex flex-col h-full">
      <div className="relative flex-1 min-h-[150px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={total ? dados : [{ nome: '—', total: 1, cor: C.trilho }]} dataKey="total" nameKey="nome" startAngle={180} endAngle={0}
              cx="50%" cy="82%" innerRadius="78%" outerRadius="100%" paddingAngle={total ? 3 : 0} cornerRadius={12} stroke="none">
              {(total ? dados : [{ cor: C.trilho }]).map((d, i) => <Cell key={i} fill={d.cor} />)}
            </Pie>
            {total > 0 && <Tooltip contentStyle={tooltipStyle} />}
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-x-0 bottom-[8%] flex flex-col items-center pointer-events-none">
          <span className="text-3xl font-extrabold text-slate-900">{centro}</span>
          <span className="text-xs text-slate-500">{rotulo}</span>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 mt-3">
        {dados.map((d) => (
          <span key={d.nome} className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-6 h-2.5 rounded-full" style={{ background: d.cor }} />{d.nome} · {pct(d.total, total)}%
          </span>
        ))}
      </div>
    </div>
  );
}

/** Barras em "pílula" com o valor dentro (estilo "Marketing" do modelo). */
function Pilulas({ itens, cor = C.verde, sufixo = '', rotulo = 'w-28' }: { itens: { nome: string; valor: number; detalhe?: string }[]; cor?: string; sufixo?: string; rotulo?: string }) {
  const max = Math.max(1, ...itens.map((i) => i.valor));
  return (
    <ul className="space-y-3.5">
      {itens.map((i) => (
        <li key={i.nome} className="flex items-center gap-3">
          <div className={`${rotulo} shrink-0 min-w-0`}>
            <p className="text-sm text-slate-600 truncate" title={i.nome}>{i.nome}</p>
            {i.detalhe && <p className="text-[10px] text-slate-400 truncate">{i.detalhe}</p>}
          </div>
          <div className="flex-1 h-9 rounded-full bg-slate-50">
            <div className="h-9 rounded-full flex items-center justify-end px-3 min-w-[3.25rem] transition-all"
              style={{ width: `${Math.max(12, (i.valor / max) * 100)}%`, background: cor }}>
              <span className="text-sm font-extrabold text-slate-900">{i.valor}{sufixo}</span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

const ESTILO_DICA: Record<TipoDica, { cor: string; icone: ReactNode; rotulo: string }> = {
  alerta: { cor: C.coral, icone: <AlertTriangle size={20} />, rotulo: 'Atenção' },
  oportunidade: { cor: C.azul, icone: <Lightbulb size={20} />, rotulo: 'Oportunidade' },
  acao: { cor: C.verde, icone: <Target size={20} />, rotulo: 'Ação recomendada' },
  parabens: { cor: C.roxo, icone: <PartyPopper size={20} />, rotulo: 'Bom sinal' },
};

function CartaoDica({ dica }: { dica: Dica }) {
  const e = ESTILO_DICA[dica.tipo];
  return (
    <div className="bg-white rounded-3xl p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] flex gap-4">
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${e.cor}22`, color: e.cor }}>{e.icone}</div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: e.cor }}>{e.rotulo}</p>
        <h4 className="font-bold text-slate-900 text-sm mt-0.5">{dica.titulo}</h4>
        <p className="text-sm text-slate-600 mt-1 leading-relaxed">{dica.texto}</p>
      </div>
    </div>
  );
}

// ─── Tela ──────────────────────────────────────────────────────────────────
type Carregador = (hoje: string) => Promise<{ logs: LogDoDia[]; fichas: FichaResumo[] }>;

export default function AnalyticsModal({ onClose, carregar = carregarDadosAnalise, hojeFixo }: {
  onClose: () => void;
  /** só para testes e prévia: troca a busca no banco */
  carregar?: Carregador;
  hojeFixo?: string;
}) {
  const hoje = hojeFixo ?? idDoDia();
  const [aba, setAba] = useState<Aba>('geral');
  const [periodo, setPeriodo] = useState<Periodo>('30d');
  const [dados, setDados] = useState<{ logs: LogDoDia[]; fichas: FichaResumo[] } | null>(null);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let vivo = true;
    setErro(false); setDados(null);
    carregar(hoje)
      .then((d) => { if (vivo) setDados(d); })
      .catch((e) => { console.error('[analises]', e); if (vivo) setErro(true); });
    return () => { vivo = false; };
  }, [hoje, tentativa]);

  const calc = useMemo(() => {
    if (!dados) return null;
    const { logs, fichas } = dados;
    const { inicio, fim, anterior } = intervalos(periodo, hoje);
    const atual = resumo(logs, fichas, inicio, fim);
    const ant = anterior ? resumo(logs, fichas, anterior.inicio, anterior.fim) : null;
    const hora = porHora(logs, inicio, fim);
    const pico = hora.reduce((m, h) => (h.chegadas > (m?.chegadas ?? 0) ? h : m), null as null | { hora: string; chegadas: number });
    return {
      inicio, fim, atual, pico,
      delta: { atendimentos: variacao(atual.atendimentos, ant?.atendimentos ?? null), novos: variacao(atual.clientesNovos, ant?.clientesNovos ?? null) },
      dia: porDia(logs, inicio, fim), hora,
      servico: porServico(logs, inicio, fim).map((s) => ({ nome: s.servico, total: s.total })),
      prof: porProfissional(logs, inicio, fim),
      perfil: perfil(logs, inicio, fim),
      clientes: clientes(logs, fichas, hoje),
      dicas: gerarDicas(logs, fichas, inicio, fim, hoje, anterior),
    };
  }, [dados, periodo, hoje]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Cabeçalho (padrão dos modais do Admin) */}
        <div className="shrink-0 bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg"><BarChart3 className="w-5 h-5 text-white" /></div>
            <div>
              <h2 className="text-white font-bold text-base">Análises</h2>
              <p className="text-indigo-200 text-xs">Elite Pet Shop{calc ? ` · período de ${fmtDia(calc.inicio)} a ${fmtDia(calc.fim)}` : ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition p-1" aria-label="Fechar"><X size={20} /></button>
        </div>

        {/* Abas + período */}
        <div className="shrink-0 bg-[#eef2f7] px-6 pt-5 pb-1 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1 p-1 bg-white rounded-xl shadow-sm">
            {ABAS.map((a) => (
              <button key={a.id} onClick={() => setAba(a.id)}
                className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${aba === a.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {a.icone}{a.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="grid grid-cols-4 gap-1 p-1 bg-white rounded-xl shadow-sm">
              {PERIODOS.map((p) => (
                <button key={p.id} onClick={() => setPeriodo(p.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${periodo === p.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto bg-[#eef2f7] px-6 pb-6 pt-4">
          {erro && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between gap-3">
              <p className="text-red-600 text-xs font-medium">⚠️ Não foi possível carregar os dados. Verifique a internet.</p>
              <button onClick={() => setTentativa((t) => t + 1)}
                className="py-2 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-gray-700 hover:bg-slate-100 transition flex items-center gap-1.5">
                <RefreshCw size={13} /> Tentar de novo
              </button>
            </div>
          )}

          {!dados && !erro && (
            <div className="py-24 flex flex-col items-center gap-3 text-slate-500">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
              <p className="text-sm">Carregando os dados…</p>
            </div>
          )}

          {/* ── Visão geral ── */}
          {calc && aba === 'geral' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                <Indicador icone={<PackageCheck size={22} />} cor={C.verde} rotulo="Atendimentos concluídos" valor={String(calc.atual.atendimentos)} delta={calc.delta.atendimentos} />
                <Indicador icone={<Clock size={22} />} cor={C.azul} rotulo="Tempo médio na loja" valor={formatarMinutos(calc.atual.tempoMedioMin)} />
                <Indicador icone={<UserPlus size={22} />} cor={C.roxo} rotulo="Clientes novos" valor={String(calc.atual.clientesNovos)} delta={calc.delta.novos} />
                <Indicador icone={<Trash2 size={22} />} cor={C.coral} rotulo="Removidos sem atender" valor={String(calc.atual.removidos)} />
              </div>
              {calc.dicas[0] && (() => {
                const d = calc.dicas[0]; const e = ESTILO_DICA[d.tipo];
                return (
                  <button onClick={() => setAba('dicas')}
                    className="w-full bg-white rounded-3xl px-5 py-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] flex items-center gap-4 text-left hover:shadow-md transition">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-amber-100 text-amber-500"><Lightbulb size={18} /></div>
                    <p className="flex-1 min-w-0 text-sm text-slate-700 truncate">
                      <span className="font-bold" style={{ color: e.cor }}>{e.rotulo}: </span>
                      <span className="font-semibold text-slate-900">{d.titulo}.</span> {d.texto}
                    </p>
                    <span className="shrink-0 text-xs font-semibold text-indigo-600 flex items-center gap-1">
                      Ver {calc.dicas.length} {calc.dicas.length === 1 ? 'dica' : 'dicas'} <ChevronRight size={14} />
                    </span>
                  </button>
                );
              })()}
              <div className="grid lg:grid-cols-3 gap-5">
                <Cartao className="lg:col-span-2" titulo="Atendimentos por dia" subtitulo="Pets entregues em cada dia do período">
                  <div className="h-60">
                    {calc.atual.atendimentos === 0 ? <Vazio /> : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={calc.dia} margin={{ top: 5, right: 0, left: -24, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="4 4" stroke="#eef2f7" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={14} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f1f5f9', radius: 8 }}
                            labelFormatter={(_, p) => (p?.[0] ? `${p[0].payload.semana}, ${p[0].payload.label}` : '')} formatter={(v) => [v, 'Atendimentos']} />
                          <Bar dataKey="atendimentos" fill={C.azul} radius={[10, 10, 10, 10]} maxBarSize={18} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </Cartao>
                <Cartao titulo="Horários de pico" subtitulo={calc.pico ? `Maior movimento às ${calc.pico.hora}` : 'Chegadas por hora'}>
                  <div className="h-60">
                    {calc.hora.length === 0 ? <Vazio /> : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={calc.hora} margin={{ top: 5, right: 0, left: -28, bottom: 0 }}>
                          <XAxis dataKey="hora" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={0} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f1f5f9', radius: 8 }} formatter={(v) => [v, 'Chegadas']} />
                          <Bar dataKey="chegadas" radius={[10, 10, 10, 10]} maxBarSize={16}>
                            {calc.hora.map((h, i) => <Cell key={i} fill={h.hora === calc.pico?.hora ? C.coral : C.roxo} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </Cartao>
              </div>
            </div>
          )}

          {/* ── Dicas ── */}
          {calc && aba === 'dicas' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-3xl px-5 py-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-500 flex items-center justify-center shrink-0"><Lightbulb size={20} /></div>
                <p className="text-sm text-slate-700">
                  <span className="font-bold text-slate-900">Dicas para o seu petshop</span>, calculadas a partir dos números do período escolhido.
                  Elas mudam sozinhas quando o período ou os dados mudam.
                </p>
              </div>
              <div className="grid lg:grid-cols-2 gap-4">
                {calc.dicas.map((d) => <CartaoDica key={d.id} dica={d} />)}
              </div>
            </div>
          )}

          {/* ── Serviços e equipe ── */}
          {calc && aba === 'servicos' && (() => {
            const b = calc.prof.reduce((a, p) => a + p.banho, 0), e = calc.prof.reduce((a, p) => a + p.escovar, 0), t = calc.prof.reduce((a, p) => a + p.tosa, 0);
            return (
              <div className="grid lg:grid-cols-5 gap-5">
                <Cartao className="lg:col-span-2" titulo="Serviços realizados" subtitulo="Participação de cada serviço nos atendimentos">
                  {calc.servico.length === 0 ? <Vazio /> : (
                    <div className="flex flex-col h-full">
                      <div className="h-60"><Rosca dados={calc.servico} total={calc.atual.atendimentos} rotuloCentro="atendimentos" /></div>
                      <ul className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4">
                        {calc.servico.map((s, i) => (
                          <li key={s.nome} className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2 text-slate-600"><span className="w-3 h-3 rounded-full" style={{ background: PALETA[i % PALETA.length] }} />{s.nome}</span>
                            <span className="font-bold text-slate-900">{s.total}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Cartao>
                <Cartao className="lg:col-span-3" titulo="Produção por profissional" subtitulo="Etapas feitas por cada profissional nos atendimentos concluídos">
                  {calc.prof.length === 0 ? <Vazio /> : (
                    <div className="flex flex-col gap-5">
                      <div className="grid grid-cols-3 gap-3">
                        {[{ n: 'Banhos', v: b, c: C.azul }, { n: 'Escovações', v: e, c: C.roxo }, { n: 'Tosas', v: t, c: C.coral }].map((x) => (
                          <div key={x.n} className="rounded-2xl px-4 py-3" style={{ background: `${x.c}1a` }}>
                            <p className="text-xs font-semibold" style={{ color: x.c }}>{x.n}</p>
                            <p className="text-2xl font-extrabold text-slate-900">{x.v}</p>
                          </div>
                        ))}
                      </div>
                      <Pilulas cor={C.verde} rotulo="w-40" itens={calc.prof.slice(0, 6).map((p) => ({
                        nome: p.nome, valor: p.total,
                        detalhe: [p.banho && `Banho ${p.banho}`, p.escovar && `Escovar ${p.escovar}`, p.tosa && `Tosa ${p.tosa}`].filter(Boolean).join(' · '),
                      }))} />
                    </div>
                  )}
                </Cartao>
              </div>
            );
          })()}

          {/* ── Pets ── */}
          {calc && aba === 'pets' && (
            <div className="grid lg:grid-cols-3 gap-5">
              <Cartao titulo="Cães e gatos" subtitulo="Espécies atendidas">
                {calc.perfil.especie.length === 0 ? <Vazio /> : (
                  <div className="h-72"><MeiaLua centro={String(calc.atual.atendimentos)} rotulo="atendimentos"
                    dados={calc.perfil.especie.map((s) => ({ nome: s.nome, total: s.total, cor: s.nome === 'Gatos' ? C.coral : C.azul }))} /></div>
                )}
              </Cartao>
              <Cartao titulo="Porte" subtitulo="Atendimentos por porte">
                {calc.atual.atendimentos === 0 ? <Vazio /> : (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={calc.perfil.porte} margin={{ top: 24, right: 0, left: -24, bottom: 0 }}>
                        <XAxis dataKey="nome" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis hide allowDecimals={false} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f1f5f9', radius: 8 }} formatter={(v) => [v, 'Atendimentos']} />
                        <Bar dataKey="total" radius={[14, 14, 14, 14]} maxBarSize={44}
                          label={{ position: 'top', fill: '#0f172a', fontSize: 14, fontWeight: 800 }}>
                          {calc.perfil.porte.map((_, i) => <Cell key={i} fill={[C.laranja, C.verde, C.azul][i]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Cartao>
              <Cartao titulo="Raças mais atendidas" subtitulo="% dos atendimentos do período">
                {calc.perfil.racas.length === 0 ? <Vazio /> : (
                  <Pilulas cor={C.verde} sufixo="%" itens={calc.perfil.racas.slice(0, 6).map((r) => ({ nome: r.nome, valor: pct(r.total, calc.atual.atendimentos) }))} />
                )}
              </Cartao>
            </div>
          )}

          {/* ── Clientes ── */}
          {calc && aba === 'clientes' && (
            <div className="grid lg:grid-cols-3 gap-5">
              <Cartao titulo="Novos x que voltaram" subtitulo="Pets atendidos no período">
                {(calc.atual.clientesNovos + calc.atual.clientesRetorno) === 0 ? <Vazio /> : (
                  <div className="h-72"><MeiaLua
                    centro={`${pct(calc.atual.clientesRetorno, calc.atual.clientesNovos + calc.atual.clientesRetorno)}%`} rotulo="voltaram"
                    dados={[{ nome: 'Voltaram', total: calc.atual.clientesRetorno, cor: C.verde }, { nome: 'Novos', total: calc.atual.clientesNovos, cor: C.roxo }]} /></div>
                )}
              </Cartao>
              <Cartao titulo="Clientes fiéis" subtitulo={`Mais visitas nos últimos ${DIAS_ANALISE} dias`} extra={<Repeat size={18} className="text-slate-300" />}>
                {calc.clientes.fieis.length === 0 ? <Vazio texto="Ainda não há pets com mais de uma visita." /> : (
                  <ul className="space-y-2.5">
                    {calc.clientes.fieis.slice(0, 6).map((c, i) => (
                      <li key={c.chave} className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-xl text-white text-xs font-extrabold flex items-center justify-center shrink-0" style={{ background: PALETA[i % PALETA.length] }}>{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{c.nomePet}</p>
                          <p className="text-[11px] text-slate-500 truncate">{c.nomeTutor} · última {fmtDia(c.ultima)}</p>
                        </div>
                        <span className="text-sm font-extrabold text-slate-900 shrink-0">{c.visitas}<span className="text-[10px] font-semibold text-slate-400 ml-0.5">visitas</span></span>
                      </li>
                    ))}
                  </ul>
                )}
              </Cartao>
              <Cartao titulo="Clientes sumidos" subtitulo="Há 30 dias ou mais sem vir" extra={<UserX size={18} className="text-slate-300" />}>
                {calc.clientes.sumidos.length === 0 ? <Vazio texto="Nenhum cliente sumido. Ótimo sinal!" /> : (
                  <ul className="space-y-2.5">
                    {calc.clientes.sumidos.slice(0, 6).map((c) => {
                      const link = linkWhatsAppSaudade(c.telefone, c.nomeTutor, c.nomePet);
                      return (
                        <li key={c.chave} className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{c.nomePet}</p>
                            <p className="text-[11px] text-slate-500 truncate">{c.nomeTutor} · há {c.diasSemVir} dias</p>
                          </div>
                          <button disabled={!link} onClick={() => link && window.open(link, '_blank', 'noopener')}
                            title={link ? 'Abrir WhatsApp com mensagem pronta' : 'Sem telefone válido na ficha'}
                            className="shrink-0 py-1.5 px-3 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
                            <MessageCircle size={13} /> WhatsApp
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Cartao>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
