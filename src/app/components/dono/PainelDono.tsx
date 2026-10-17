// ✅ Painel do Proprietário do sistema (Pata & Gestão). No código e no banco segue "dono".
// Abre no lugar da fila quando quem entra é a conta marcada em /donos.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  LayoutDashboard, Store, Wallet, Package, Megaphone, Settings, LogOut, Plus, Search,
  AlertTriangle, TrendingUp, CalendarCheck, Ban, CheckCircle2, Clock, MessageCircle,
  ChevronRight, ChevronLeft, X, Sparkles, ShieldCheck, Lock, Send, Pencil, RefreshCw,
  Database, Loader2, Undo2, PlayCircle, Trash2, Users, UserPlus, Eye,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import {
  PLANOS, nomePlano, reais, fmtDia, mesDe, somarMeses, linhasFinanceiro, situacaoDaLoja, alertasDoDono,
  resumoUso, textoUltimoUso, receitaPorMes, primeiroMesCobrado, somarDias, DIAS_PARA_BLOQUEIO,
  type DadosDono, type Loja, type Situacao, type PlanoId, type AlvoComunicado, type LinhaFinanceiro,
} from '../../../utils/dono';
import { telefoneWhatsApp } from '../../../utils/whatsapp';
import { idDoDia } from '../../../utils/dias';
import type { ResultadoMigracao } from '../../../services/migracaoService';
import { LojaAoVivo } from './LojaAoVivo';
import { fonteFirestore, LOJA_DA_MIGRACAO, EMAIL_EM_USO, nomeConfere, type FonteDono, type Proprietario } from './fonteDono';

const COR = { petroleo: '#0B5A70', escuro: '#04394A', azul: '#1A90D0', laranja: '#F7931E' };
const GRADIENTE = `linear-gradient(135deg, ${COR.petroleo}, ${COR.azul})`;

/** Como o painel chama quem administra o sistema (troque aqui para mudar em todas as telas) */
export const PAPEL = 'Proprietário';
/** Nome da aba de quem acessa o painel */
const ABA_ACESSOS = 'Usuários';

type Aba = 'geral' | 'lojas' | 'financeiro' | 'planos' | 'comunicados' | 'acessos' | 'config';

const MENU: { id: Aba; nome: string; icone: React.ElementType }[] = [
  { id: 'geral', nome: 'Visão geral', icone: LayoutDashboard },
  { id: 'lojas', nome: 'Lojas', icone: Store },
  { id: 'financeiro', nome: 'Financeiro', icone: Wallet },
  { id: 'planos', nome: 'Planos', icone: Package },
  { id: 'comunicados', nome: 'Comunicados', icone: Megaphone },
  { id: 'acessos', nome: ABA_ACESSOS, icone: Users },
  { id: 'config', nome: 'Configurações', icone: Settings },
];

const SITUACAO: Record<Situacao, { nome: string; classe: string }> = {
  ativa: { nome: 'Ativa', classe: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  teste: { nome: 'Em teste', classe: 'bg-sky-50 text-sky-700 ring-sky-200' },
  atrasada: { nome: 'Pagamento atrasado', classe: 'bg-amber-50 text-amber-700 ring-amber-200' },
  bloqueada: { nome: 'Bloqueada', classe: 'bg-rose-50 text-rose-700 ring-rose-200' },
};

const NOME_MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const nomeMes = (mes: string) => NOME_MES[+mes.slice(5, 7) - 1];
const dataPorExtenso = (dia: string) =>
  new Date(`${dia}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    .replace(/^./, (c) => c.toUpperCase());

const campo = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300';
const rotulo = 'text-sm font-semibold text-slate-600';
const botaoMarca = 'flex items-center justify-center gap-2 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm disabled:opacity-60';

function Selo({ situacao }: { situacao: Situacao }) {
  const s = SITUACAO[situacao];
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ring-1 whitespace-nowrap ${s.classe}`}>{s.nome}</span>;
}

function Cartao({ titulo, valor, detalhe, icone: Icone, cor }: { titulo: string; valor: string; detalhe: string; icone: React.ElementType; cor: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-500">{titulo}</span>
        <span className="p-2 rounded-xl" style={{ background: `${cor}18`, color: cor }}><Icone size={18} /></span>
      </div>
      <p className="text-3xl font-bold text-slate-900 mt-3">{valor}</p>
      <p className="text-xs text-slate-500 mt-1">{detalhe}</p>
    </div>
  );
}

function Secao({ titulo, acao, children }: { titulo: string; acao?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center justify-between px-5 pt-5 pb-3 gap-3">
        <h3 className="font-bold text-slate-800">{titulo}</h3>
        {acao}
      </div>
      <div className="px-5 pb-5">{children}</div>
    </div>
  );
}

function Vazio({ texto }: { texto: string }) {
  return <p className="text-sm text-slate-500 py-6 text-center">{texto}</p>;
}

/** Janela no padrão dos modais do sistema */
function Modal({ titulo, subtitulo, icone: Icone, fechar, children, rodape, largura = 'max-w-2xl' }:
  { titulo: string; subtitulo?: string; icone: React.ElementType; fechar: () => void; children: React.ReactNode; rodape: React.ReactNode; largura?: string }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={fechar} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${largura} max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200`}>
        <div className="px-6 py-5 flex items-center justify-between shrink-0" style={{ background: GRADIENTE }}>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg"><Icone className="w-5 h-5 text-white" /></div>
            <div>
              <h2 className="text-white font-bold text-base">{titulo}</h2>
              {subtitulo && <p className="text-white/70 text-xs">{subtitulo}</p>}
            </div>
          </div>
          <button onClick={fechar} className="text-white/70 hover:text-white" aria-label="Fechar"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-5 overflow-y-auto">{children}</div>
        <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3 shrink-0">{rodape}</div>
      </div>
    </div>
  );
}

// ─── Visão geral ──────────────────────────────────────────────────────────────
function VisaoGeral({ d, abrirLoja, irPara }: { d: DadosDono; abrirLoja: (l: Loja) => void; irPara: (a: Aba) => void }) {
  const pagantes = d.lojas.filter((l) => l.status === 'ativa' && l.mensalidade > 0);
  const receita = pagantes.reduce((s, l) => s + l.mensalidade, 0);
  const mes = mesDe(d.hoje);
  const atrasadas = [somarMeses(mes, -1), mes].flatMap((m) => linhasFinanceiro(d.lojas, d.cobrancas, m, d.hoje)).filter((x) => x.status === 'atrasada');
  const usos = d.lojas.map((l) => ({ loja: l, uso: resumoUso(d.atividade[l.id], d.hoje) }));
  const hoje = usos.reduce((s, x) => s + x.uso.hoje, 0);
  const alertas = alertasDoDono(d);
  const grafico = receitaPorMes(d.cobrancas, d.hoje).map((x) => ({ ...x, nome: nomeMes(x.mes).slice(0, 3) }));
  const ativas = [...usos].sort((a, b) => b.uso.ultimos30 - a.uso.ultimos30).slice(0, 5);
  const max = Math.max(1, ...ativas.map((x) => x.uso.ultimos30));
  const icone = { atraso: Wallet, teste: Clock, sem_uso: AlertTriangle };
  const corAlerta = { atraso: 'text-amber-600 bg-amber-50', teste: 'text-sky-600 bg-sky-50', sem_uso: 'text-rose-600 bg-rose-50' };

  return (
    <div className="space-y-6">
      {d.migracaoPendente && (
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-amber-50 ring-1 ring-amber-200">
          <Database className="text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-amber-900">Os dados da {LOJA_DA_MIGRACAO.nome} ainda estão no formato antigo</p>
            <p className="text-sm text-amber-800">Enquanto não forem copiados para o espaço da loja, a equipe dela não consegue entrar.</p>
          </div>
          <button onClick={() => irPara('config')} className="text-sm font-semibold text-amber-900 underline whitespace-nowrap">Copiar agora</button>
        </div>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Cartao titulo="Receita por mês" valor={reais(receita)} detalhe={`${pagantes.length} ${pagantes.length === 1 ? 'loja pagante' : 'lojas pagantes'}`} icone={TrendingUp} cor={COR.petroleo} />
        <Cartao titulo="Lojas" valor={String(d.lojas.length)}
          detalhe={`${d.lojas.filter((l) => l.status === 'teste').length} em teste · ${d.lojas.filter((l) => l.status === 'bloqueada').length} bloqueadas`} icone={Store} cor={COR.azul} />
        <Cartao titulo="Atendimentos hoje" valor={String(hoje)} detalhe="somando todas as lojas" icone={CalendarCheck} cor="#059669" />
        <Cartao titulo="Em atraso" valor={reais(atrasadas.reduce((s, x) => s + x.valor, 0))}
          detalhe={atrasadas.length ? `${atrasadas.length} ${atrasadas.length === 1 ? 'mensalidade atrasada' : 'mensalidades atrasadas'}` : 'nenhuma mensalidade atrasada'} icone={AlertTriangle} cor={COR.laranja} />
      </div>

      <div className="grid xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3">
          <Secao titulo="Mensalidades recebidas nos últimos 6 meses">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={grafico} margin={{ left: -6, right: 8, top: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="nome" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip formatter={(v: number) => [reais(v), 'Recebido']} cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="receita" fill={COR.petroleo} radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-slate-500 mt-2">Soma das mensalidades marcadas como pagas em cada mês.</p>
          </Secao>
        </div>

        <div className="xl:col-span-2">
          <Secao titulo="Precisa da sua atenção" acao={alertas.length > 0 && <span className="text-xs font-semibold text-white px-2 py-0.5 rounded-full" style={{ background: COR.laranja }}>{alertas.length}</span>}>
            {alertas.length === 0 ? <Vazio texto="Tudo em dia. Nenhuma loja precisa de você agora." /> : (
              <ul className="space-y-3">
                {alertas.map((a, i) => {
                  const Icone = icone[a.tipo];
                  return (
                    <li key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
                      <span className={`p-2 rounded-lg ${corAlerta[a.tipo]}`}><Icone size={16} /></span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{a.loja.nome}</p>
                        <p className="text-xs text-slate-500">{a.texto}</p>
                      </div>
                      <button onClick={() => abrirLoja(a.loja)} className="text-xs font-semibold whitespace-nowrap hover:underline" style={{ color: COR.petroleo }}>{a.acao}</button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Secao>
        </div>
      </div>

      <Secao titulo="Lojas mais ativas (últimos 30 dias)">
        {ativas.length === 0 ? <Vazio texto="Nenhuma loja cadastrada ainda." /> : (
          <div className="space-y-3">
            {ativas.map(({ loja, uso }) => (
              <button key={loja.id} onClick={() => abrirLoja(loja)} className="w-full flex items-center gap-4 text-left group">
                <span className="w-48 text-sm font-medium text-slate-700 truncate group-hover:underline">{loja.nome}</span>
                <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(uso.ultimos30 / max) * 100}%`, background: `linear-gradient(90deg, ${COR.petroleo}, ${COR.azul})` }} />
                </div>
                <span className="w-40 text-right text-sm text-slate-600 whitespace-nowrap">{uso.ultimos30} atendimentos</span>
              </button>
            ))}
          </div>
        )}
      </Secao>
    </div>
  );
}

// ─── Lojas ────────────────────────────────────────────────────────────────────
function ListaLojas({ d, abrirLoja, novaLoja }: { d: DadosDono; abrirLoja: (l: Loja) => void; novaLoja: () => void }) {
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<Situacao | 'todas'>('todas');
  const linhas = d.lojas.map((l) => ({ loja: l, ...situacaoDaLoja(l, d.cobrancas, d.hoje), uso: resumoUso(d.atividade[l.id], d.hoje) }));
  const lista = linhas.filter((x) => (filtro === 'todas' || x.situacao === filtro)
    && `${x.loja.nome} ${x.loja.cidade ?? ''} ${x.loja.responsavel ?? ''}`.toLowerCase().includes(busca.toLowerCase()));
  const filtros: { id: Situacao | 'todas'; nome: string }[] = [
    { id: 'todas', nome: 'Todas' }, { id: 'ativa', nome: 'Ativas' }, { id: 'teste', nome: 'Em teste' },
    { id: 'atrasada', nome: 'Atrasadas' }, { id: 'bloqueada', nome: 'Bloqueadas' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por loja, cidade ou responsável..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
        </div>
        <div className="flex gap-1 p-1 bg-white rounded-xl ring-1 ring-slate-200">
          {filtros.map((f) => (
            <button key={f.id} onClick={() => setFiltro(f.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${filtro === f.id ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              style={filtro === f.id ? { background: COR.petroleo } : undefined}>{f.nome}</button>
          ))}
        </div>
        <button onClick={novaLoja} className={botaoMarca} style={{ background: GRADIENTE }}><Plus size={18} /> Nova loja</button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 overflow-hidden">
        {lista.length === 0 ? <Vazio texto={d.lojas.length ? 'Nenhuma loja com esse filtro.' : 'Nenhuma loja ainda. Clique em "Nova loja" para começar.'} /> : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left font-semibold px-5 py-3">Loja</th>
                <th className="text-left font-semibold px-3 py-3">Plano</th>
                <th className="text-left font-semibold px-3 py-3">Situação</th>
                <th className="text-right font-semibold px-3 py-3">Atend. 30 dias</th>
                <th className="text-left font-semibold px-3 py-3">Último atendimento</th>
                <th className="text-right font-semibold px-5 py-3">Mensalidade</th>
                <th className="px-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lista.map(({ loja, situacao, uso }) => (
                <tr key={loja.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => abrirLoja(loja)}>
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-slate-800">{loja.nome}</p>
                    <p className="text-xs text-slate-500">{[loja.cidade, loja.responsavel].filter(Boolean).join(' · ')}</p>
                  </td>
                  <td className="px-3 py-3.5 text-slate-700">{nomePlano(loja.plano)}</td>
                  <td className="px-3 py-3.5"><Selo situacao={situacao} /></td>
                  <td className="px-3 py-3.5 text-right text-slate-700">{uso.ultimos30}</td>
                  <td className={`px-3 py-3.5 ${uso.diasSemUso === null || uso.diasSemUso >= 7 ? 'text-rose-600 font-semibold' : 'text-slate-600'}`}>{textoUltimoUso(uso)}</td>
                  <td className="px-5 py-3.5 text-right font-semibold text-slate-800">
                    {loja.mensalidade > 0 ? reais(loja.mensalidade) : 'Cortesia'}
                    {loja.mensalidade > 0 && <span className="block text-xs font-normal text-slate-500">vence dia {loja.vencimentoDia}</span>}
                  </td>
                  <td className="px-3 text-slate-400"><ChevronRight size={18} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Detalhe da loja (painel lateral) ─────────────────────────────────────────
function DetalheLoja({ d, loja, fonte, fechar, editar, recarregar }:
  { d: DadosDono; loja: Loja; fonte: FonteDono; fechar: () => void; editar: () => void; recarregar: () => Promise<void> }) {
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [confirmarBloqueio, setConfirmarBloqueio] = useState(false);
  const [excluir, setExcluir] = useState(false);
  const [aoVivo, setAoVivo] = useState(false);
  const { situacao, diasAtraso } = situacaoDaLoja(loja, d.cobrancas, d.hoje);
  const uso = resumoUso(d.atividade[loja.id], d.hoje);
  const mes = mesDe(d.hoje);
  const pendente = [somarMeses(mes, -1), mes].flatMap((m) => linhasFinanceiro([loja], d.cobrancas, m, d.hoje)).find((x) => x.status !== 'paga');
  const zap = telefoneWhatsApp(loja.telefone);

  const fazer = async (id: string, acao: () => Promise<void>, ok: string) => {
    setOcupado(id);
    try { await acao(); await recarregar(); toast.success(ok); }
    catch (e) { console.error('[painel do dono]', e); toast.error('Não foi possível concluir. Confira a internet e tente de novo.'); }
    finally { setOcupado(null); setConfirmarBloqueio(false); }
  };
  const Botao = ({ id, icone: Icone, cor, children, onClick, perigo }: { id: string; icone: React.ElementType; cor?: string; children: React.ReactNode; onClick: () => void; perigo?: boolean }) => (
    <button onClick={onClick} disabled={!!ocupado}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition disabled:opacity-60 ${perigo ? 'ring-1 ring-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100' : 'ring-1 ring-slate-200 hover:bg-slate-50 text-slate-700'}`}>
      {ocupado === id ? <Loader2 size={18} className="animate-spin" /> : <Icone size={18} style={cor ? { color: cor } : undefined} />} {children}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[80] flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={fechar} />
      <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        <div className="px-6 py-5 text-white" style={{ background: `linear-gradient(135deg, ${COR.escuro}, ${COR.petroleo})` }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-white/60">Loja</p>
              <h2 className="text-xl font-bold mt-1">{loja.nome}</h2>
              <p className="text-sm text-white/70">{[loja.cidade, loja.criadaEm && `cliente desde ${fmtDia(loja.criadaEm)}/${loja.criadaEm.slice(0, 4)}`].filter(Boolean).join(' · ')}</p>
            </div>
            <button onClick={fechar} className="text-white/70 hover:text-white" aria-label="Fechar"><X size={20} /></button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Selo situacao={situacao} />
            {diasAtraso > 0 && <span className="text-xs text-white/80">há {diasAtraso} dias</span>}
            {loja.status === 'teste' && loja.fimTeste && <span className="text-xs text-white/80">até {fmtDia(loja.fimTeste)}</span>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-3 gap-3">
            {[{ v: uso.hoje, t: 'hoje' }, { v: uso.ultimos30, t: 'em 30 dias' }, { v: uso.usuarios, t: 'usuários' }].map((x) => (
              <div key={x.t} className="rounded-xl bg-slate-50 p-3 text-center">
                <p className="text-2xl font-bold text-slate-900">{x.v}</p>
                <p className="text-xs text-slate-500">{x.t}</p>
              </div>
            ))}
          </div>

          <dl className="text-sm divide-y divide-slate-100">
            {[
              ['Responsável', loja.responsavel], ['Telefone', loja.telefone], ['E-mail do admin', loja.emailAdmin],
              ['Plano', `${nomePlano(loja.plano)} · ${loja.mensalidade > 0 ? `${reais(loja.mensalidade)}/mês` : 'cortesia'}`],
              ['Vencimento', loja.mensalidade > 0 ? `todo dia ${loja.vencimentoDia}` : '—'],
              ['Último atendimento', textoUltimoUso(uso)],
            ].filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2.5"><dt className="text-slate-500">{k}</dt><dd className="font-medium text-slate-800 text-right break-all">{v}</dd></div>
            ))}
          </dl>

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Ações</p>
            <Botao id="aovivo" icone={Eye} cor={COR.azul} onClick={() => setAoVivo(true)}>Ver a loja ao vivo (só leitura)</Botao>
            {zap && (
              <a href={`https://wa.me/${zap}`} target="_blank" rel="noreferrer"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl ring-1 ring-slate-200 hover:bg-slate-50 text-sm font-semibold text-slate-700">
                <MessageCircle size={18} className="text-emerald-600" /> Chamar no WhatsApp
              </a>
            )}
            <Botao id="editar" icone={Pencil} cor={COR.petroleo} onClick={editar}>Editar dados, plano ou valor</Botao>
            {loja.status === 'teste' && (
              <Botao id="ativar" icone={PlayCircle} cor="#059669"
                onClick={() => fazer('ativar', () => fonte.atualizarLoja(loja.id, { status: 'ativa', cobrarDesde: primeiroMesCobrado(loja, d.hoje) }), 'Loja ativada. A cobrança começa no próximo vencimento.')}>
                Encerrar o teste e ativar
              </Botao>
            )}
            {pendente && (
              <Botao id="pagar" icone={CheckCircle2} cor="#059669"
                onClick={() => fazer('pagar', () => fonte.registrarPagamento(loja, pendente.mes, pendente.valor, d.hoje), `Pagamento de ${nomeMes(pendente.mes)} registrado.`)}>
                Registrar pagamento de {nomeMes(pendente.mes)} ({reais(pendente.valor)})
              </Botao>
            )}
            {loja.status === 'bloqueada' ? (
              <Botao id="liberar" icone={ShieldCheck} cor="#059669"
                onClick={() => fazer('liberar', () => fonte.atualizarLoja(loja.id, { status: 'ativa' }), 'Loja liberada. A equipe já pode entrar.')}>
                Liberar a loja
              </Botao>
            ) : confirmarBloqueio ? (
              <div className="p-4 rounded-xl bg-rose-50 ring-1 ring-rose-200 space-y-3">
                <p className="text-sm text-rose-800">Ninguém da <b>{loja.nome}</b> vai conseguir entrar até você liberar. Os dados ficam guardados.</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmarBloqueio(false)} className="flex-1 py-2 rounded-lg bg-white ring-1 ring-slate-200 text-sm font-semibold text-slate-600">Cancelar</button>
                  <button onClick={() => fazer('bloquear', () => fonte.atualizarLoja(loja.id, { status: 'bloqueada' }), 'Loja bloqueada.')}
                    disabled={!!ocupado} className="flex-1 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold flex items-center justify-center gap-2">
                    {ocupado === 'bloquear' && <Loader2 size={16} className="animate-spin" />} Bloquear
                  </button>
                </div>
              </div>
            ) : (
              <Botao id="bloquear" icone={Ban} perigo onClick={() => setConfirmarBloqueio(true)}>
                Bloquear a loja{diasAtraso >= DIAS_PARA_BLOQUEIO ? ` (${diasAtraso} dias de atraso)` : ''}
              </Botao>
            )}
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <p className="text-xs font-bold uppercase tracking-wide text-rose-400">Zona de perigo</p>
            <Botao id="excluir" icone={Trash2} perigo onClick={() => setExcluir(true)}>Excluir a loja</Botao>
          </div>
        </div>
      </div>
      {aoVivo && <LojaAoVivo loja={loja} fechar={() => setAoVivo(false)} />}
      {excluir && (
        <ExcluirLoja d={d} loja={loja} fonte={fonte} fechar={() => setExcluir(false)}
          aoExcluir={async () => { setExcluir(false); fechar(); await recarregar(); }} />
      )}
    </div>
  );
}

// ─── Excluir loja (confirmação digitando o nome) ──────────────────────────────
function ExcluirLoja({ d, loja, fonte, fechar, aoExcluir }:
  { d: DadosDono; loja: Loja; fonte: FonteDono; fechar: () => void; aoExcluir: () => Promise<void> }) {
  const [digitado, setDigitado] = useState('');
  const [progresso, setProgresso] = useState<string | null>(null);
  const confere = nomeConfere(digitado, loja.nome);
  const uso = resumoUso(d.atividade[loja.id], d.hoje);

  const confirmar = async () => {
    if (!confere || progresso) return;
    setProgresso('Começando...');
    try {
      await fonte.excluirLoja(loja, d.hoje, setProgresso);
      toast.success(`A loja ${loja.nome} foi excluída.`);
      await aoExcluir();
    } catch (e) {
      console.error('[excluir loja]', e);
      toast.error('A exclusão parou no meio. A loja continua na lista: confira a internet e tente de novo.');
      setProgresso(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={progresso ? undefined : fechar} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-rose-600 px-6 py-5 flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg"><AlertTriangle className="w-6 h-6 text-white" /></div>
          <div>
            <h2 className="text-white font-bold text-lg">Excluir a loja?</h2>
            <p className="text-white/80 text-xs">{loja.nome}</p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="rounded-xl bg-rose-50 ring-2 ring-rose-300 p-4 text-sm text-rose-900 space-y-2">
            <p className="font-bold flex items-center gap-2"><AlertTriangle size={16} /> Esta ação NÃO pode ser desfeita.</p>
            <p>Ao excluir, você perde <b>todas as informações</b> da loja para sempre:</p>
            <ul className="list-disc pl-5 space-y-0.5">
              <li>fila do dia e todo o histórico de atendimentos</li>
              <li>fichas dos pets e dos tutores</li>
              <li>profissionais, raças e funcionários ({uso.usuarios} com acesso)</li>
              <li>mensalidades registradas</li>
            </ul>
            <p>Se a ideia é só impedir o acesso, use <b>Bloquear a loja</b>: os dados ficam guardados.</p>
          </div>
          <label className="block space-y-1.5">
            <span className="text-sm text-slate-700">Para confirmar, digite o nome da loja exatamente como está no cadastro: <b className="select-none">{loja.nome}</b></span>
            <input value={digitado} onChange={(e) => setDigitado(e.target.value)} disabled={!!progresso}
              onPaste={(e) => e.preventDefault()} autoComplete="off" aria-label="Nome da loja para confirmar"
              className={`${campo} ${digitado && !confere ? 'ring-2 ring-rose-300 border-rose-300' : ''}`} placeholder={loja.nome} />
            {digitado && !confere && <span className="text-xs text-rose-600">O nome não confere. Confira maiúsculas, acentos e espaços.</span>}
          </label>
          {progresso && <p className="flex items-center gap-2 text-sm font-semibold text-rose-700"><Loader2 size={16} className="animate-spin" /> {progresso}</p>}
        </div>
        <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
          <button onClick={fechar} disabled={!!progresso} className="px-4 py-2.5 rounded-xl bg-white ring-1 ring-slate-200 text-sm font-semibold text-slate-600 disabled:opacity-60">Cancelar</button>
          <button onClick={confirmar} disabled={!confere || !!progresso}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed">
            <Trash2 size={16} /> Excluir para sempre
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Proprietários (quem acessa este painel) ──────────────────────────────────
function Acessos({ fonte, meuUid, hoje }: { fonte: FonteDono; meuUid?: string; hoje: string }) {
  const [lista, setLista] = useState<Proprietario[] | null>(null);
  const [erro, setErro] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [remover, setRemover] = useState<Proprietario | null>(null);

  const carregar = useCallback(async () => {
    try { setLista(await fonte.listarProprietarios()); setErro(false); }
    catch (e) { console.error('[proprietários]', e); setErro(true); }
  }, [fonte]);
  useEffect(() => { void carregar(); }, [carregar]);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const cadastrar = async () => {
    if (!nome.trim() || !emailOk || salvando) return;
    setSalvando(true);
    try {
      await fonte.cadastrarProprietario(nome, email, hoje);
      toast.success(`Acesso criado. ${email.trim()} vai receber um e-mail para criar a senha.`);
      setNome(''); setEmail('');
      await carregar();
    } catch (e: any) {
      console.error('[proprietários]', e);
      toast.error(e?.message === EMAIL_EM_USO
        ? 'Este e-mail já tem conta no sistema. Use outro e-mail.'
        : 'Não foi possível criar o acesso. Confira a internet e tente de novo.');
    } finally { setSalvando(false); }
  };

  const confirmarRemocao = async () => {
    if (!remover) return;
    try {
      await fonte.removerProprietario(remover.uid, meuUid ?? '', hoje);
      toast.success(`${remover.nome || remover.email} não acessa mais o painel.`);
      setRemover(null);
      await carregar();
    } catch (e) {
      console.error('[proprietários]', e);
      toast.error('Não foi possível remover o acesso. Confira a internet e tente de novo.');
    }
  };

  return (
    <div className="space-y-6">
      <Secao titulo='Novo usuário do painel'>
        <p className="text-sm text-slate-500 mb-4">Para um sócio ou desenvolvedor. A pessoa terá os mesmos acessos que você neste painel e recebe por e-mail o link para criar a senha.</p>
        <div className="grid md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <label className="space-y-1.5"><span className={rotulo}>Nome</span>
            <input value={nome} onChange={(e) => setNome(e.target.value)} className={campo} placeholder="Ex.: Maria Souza" /></label>
          <label className="space-y-1.5"><span className={rotulo}>E-mail</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={campo} placeholder="maria@email.com" /></label>
          <button onClick={cadastrar} disabled={!nome.trim() || !emailOk || salvando} className={botaoMarca} style={{ background: GRADIENTE }}>
            {salvando ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />} Dar acesso
          </button>
        </div>
      </Secao>

      <Secao titulo={`Quem acessa este painel`}>
        {erro ? <Vazio texto="Não foi possível carregar. Confira a internet e clique em Atualizar." />
          : !lista ? <div className="flex items-center justify-center gap-2 py-6 text-slate-500 text-sm"><Loader2 size={16} className="animate-spin" /> Carregando...</div>
          : lista.length === 0 ? <Vazio texto="Ninguém cadastrado ainda." />
          : (
            <ul className="divide-y divide-slate-100">
              {lista.map((p) => (
                <li key={p.uid} className="flex items-center gap-3 py-3">
                  <div className="w-9 h-9 rounded-full grid place-items-center font-bold uppercase text-white shrink-0" style={{ background: COR.petroleo }}>{(p.nome || p.email || '?')[0]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{p.nome || 'Sem nome'}{p.uid === meuUid && <span className="ml-2 text-xs font-medium text-slate-400">(você)</span>}</p>
                    <p className="text-xs text-slate-500 truncate">{p.email}{p.criadoEm && ` · desde ${fmtDia(p.criadoEm)}/${p.criadoEm.slice(0, 4)}`}</p>
                  </div>
                  {p.uid !== meuUid && (
                    remover?.uid === p.uid ? (
                      <div className="flex items-center gap-2">
                        <button onClick={() => setRemover(null)} className="px-3 py-1.5 rounded-lg bg-white ring-1 ring-slate-200 text-xs font-semibold text-slate-600">Cancelar</button>
                        <button onClick={confirmarRemocao} className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold">Tirar acesso</button>
                      </div>
                    ) : (
                      <button onClick={() => setRemover(p)} className="px-3 py-1.5 rounded-lg ring-1 ring-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100">Remover</button>
                    )
                  )}
                </li>
              ))}
            </ul>
          )}
      </Secao>
    </div>
  );
}

// ─── Nova loja / editar loja ──────────────────────────────────────────────────
function FormLoja({ d, fonte, loja, fechar, aoSalvar }: { d: DadosDono; fonte: FonteDono; loja?: Loja; fechar: () => void; aoSalvar: () => Promise<void> }) {
  const editando = !!loja;
  const [f, setF] = useState({
    nome: loja?.nome ?? '', cidade: loja?.cidade ?? '', telefone: loja?.telefone ?? '', responsavel: loja?.responsavel ?? '',
    emailAdmin: loja?.emailAdmin ?? '', plano: (loja?.plano ?? 'profissional') as PlanoId,
    mensalidade: String(loja?.mensalidade ?? PLANOS.find((p) => p.id === 'profissional')!.preco),
    vencimentoDia: String(loja?.vencimentoDia ?? 10), diasDeTeste: '14',
  });
  const [salvando, setSalvando] = useState(false);
  const muda = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const escolherPlano = (p: PlanoId) => setF({ ...f, plano: p, mensalidade: editando ? f.mensalidade : String(PLANOS.find((x) => x.id === p)!.preco) });

  const salvar = async () => {
    const mensalidade = Number(f.mensalidade.replace(',', '.'));
    const vencimentoDia = Math.round(Number(f.vencimentoDia));
    if (!f.nome.trim() || !f.telefone.trim() || !f.responsavel.trim() || (!editando && !/^\S+@\S+\.\S+$/.test(f.emailAdmin.trim()))) {
      toast.error('Preencha nome da loja, telefone, responsável e um e-mail válido.'); return;
    }
    if (!(mensalidade >= 0) || !(vencimentoDia >= 1 && vencimentoDia <= 31)) {
      toast.error('Confira a mensalidade e o dia do vencimento (1 a 31).'); return;
    }
    setSalvando(true);
    try {
      if (editando) {
        await fonte.atualizarLoja(loja!.id, { nome: f.nome.trim(), cidade: f.cidade.trim(), telefone: f.telefone.trim(), responsavel: f.responsavel.trim(), plano: f.plano, mensalidade, vencimentoDia });
        toast.success('Loja atualizada.');
      } else {
        await fonte.criarLoja({ ...f, mensalidade, vencimentoDia, diasDeTeste: Number(f.diasDeTeste) }, d.hoje, d.lojas.map((l) => l.id));
        toast.success(`Loja criada! ${f.emailAdmin.trim()} recebeu o e-mail para criar a senha.`);
      }
      await aoSalvar();
      fechar();
    } catch (e: any) {
      console.error('[painel do dono]', e);
      toast.error(e?.message === EMAIL_EM_USO ? 'Esse e-mail já tem uma conta no sistema. Use outro.' : 'Não foi possível salvar. Confira a internet e tente de novo.');
    } finally { setSalvando(false); }
  };

  return (
    <Modal titulo={editando ? `Editar ${loja!.nome}` : 'Nova loja'} subtitulo={editando ? 'Dados, plano e mensalidade' : 'A loja já nasce com o admin dela criado'}
      icone={editando ? Pencil : Store} fechar={fechar}
      rodape={<>
        <button onClick={fechar} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button>
        <button onClick={salvar} disabled={salvando} className={botaoMarca} style={{ background: GRADIENTE }}>
          {salvando && <Loader2 size={16} className="animate-spin" />} {editando ? 'Salvar' : 'Criar loja'}
        </button>
      </>}>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1"><label className={rotulo}>Nome da loja *</label><input className={campo} value={f.nome} onChange={muda('nome')} placeholder="Ex.: Pet Mania" /></div>
        <div className="space-y-1"><label className={rotulo}>Cidade</label><input className={campo} value={f.cidade} onChange={muda('cidade')} placeholder="Ex.: Volta Redonda/RJ" /></div>
        <div className="space-y-1"><label className={rotulo}>Telefone (WhatsApp) *</label><input className={campo} value={f.telefone} onChange={muda('telefone')} placeholder="(24) 99999-9999" /></div>
        <div className="space-y-1"><label className={rotulo}>Responsável *</label><input className={campo} value={f.responsavel} onChange={muda('responsavel')} placeholder="Nome de quem vai administrar" /></div>
        <div className="space-y-1"><label className={rotulo}>E-mail de acesso do admin {editando ? '' : '*'}</label>
          <input className={`${campo} disabled:opacity-60`} value={f.emailAdmin} onChange={muda('emailAdmin')} placeholder="admin@petmania.com" disabled={editando} type="email" />
        </div>
      </div>

      <div className="space-y-2">
        <label className={rotulo}>Plano</label>
        <div className="grid grid-cols-3 gap-3">
          {PLANOS.map((p) => (
            <button key={p.id} type="button" onClick={() => escolherPlano(p.id)}
              className={`text-left p-3 rounded-xl ring-2 transition ${f.plano === p.id ? 'bg-sky-50' : 'ring-slate-200 hover:ring-slate-300'}`}
              style={f.plano === p.id ? { ['--tw-ring-color' as any]: COR.azul } : undefined}>
              <p className="font-bold text-slate-800 text-sm">{p.nome}</p>
              <p className="text-xs text-slate-500">{reais(p.preco)}/mês{p.id === 'rede' ? ' por loja' : ''}</p>
            </button>
          ))}
        </div>
      </div>

      <div className={`grid ${editando ? 'grid-cols-2' : 'grid-cols-3'} gap-4`}>
        <div className="space-y-1"><label className={rotulo}>Mensalidade (R$)</label><input className={campo} value={f.mensalidade} onChange={muda('mensalidade')} inputMode="decimal" /></div>
        <div className="space-y-1"><label className={rotulo}>Dia do vencimento</label><input className={campo} value={f.vencimentoDia} onChange={muda('vencimentoDia')} inputMode="numeric" /></div>
        {!editando && (
          <div className="space-y-1"><label className={rotulo}>Teste grátis</label>
            <select className={campo} value={f.diasDeTeste} onChange={muda('diasDeTeste')}>
              <option value="0">Sem teste</option><option value="7">7 dias</option><option value="14">14 dias</option><option value="30">30 dias</option>
            </select>
          </div>
        )}
      </div>

      {!editando && (
        <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 rounded-xl p-3">
          <Sparkles size={16} className="shrink-0" style={{ color: COR.laranja }} />
          {Number(f.diasDeTeste) > 0
            ? `A loja começa em teste até ${fmtDia(somarDias(d.hoje, Number(f.diasDeTeste) - 1))}. `
            : 'A loja começa ativa. '}
          O admin recebe por e-mail o link para criar a senha e depois cadastra a equipe dele. Mensalidade 0 = cortesia, sem cobrança.
        </div>
      )}
    </Modal>
  );
}

// ─── Financeiro ───────────────────────────────────────────────────────────────
function Financeiro({ d, fonte, recarregar }: { d: DadosDono; fonte: FonteDono; recarregar: () => Promise<void> }) {
  const [mes, setMes] = useState(mesDe(d.hoje));
  const [ocupado, setOcupado] = useState<string | null>(null);
  const linhas = linhasFinanceiro(d.lojas, d.cobrancas, mes, d.hoje);
  const total = linhas.reduce((s, c) => s + c.valor, 0);
  const pago = linhas.filter((c) => c.status === 'paga').reduce((s, c) => s + c.valor, 0);
  const atrasado = linhas.filter((c) => c.status === 'atrasada').reduce((s, c) => s + c.valor, 0);
  const selo = { paga: 'bg-emerald-50 text-emerald-700 ring-emerald-200', a_vencer: 'bg-slate-100 text-slate-600 ring-slate-200', atrasada: 'bg-amber-50 text-amber-700 ring-amber-200' };

  const fazer = async (id: string, acao: () => Promise<void>, ok: string) => {
    setOcupado(id);
    try { await acao(); await recarregar(); toast.success(ok); }
    catch (e) { console.error('[financeiro]', e); toast.error('Não foi possível concluir. Tente de novo.'); }
    finally { setOcupado(null); }
  };
  const textoSelo = (c: LinhaFinanceiro) => c.status === 'paga' ? `Paga em ${fmtDia(c.pagaEm!)}` : c.status === 'atrasada' ? `Atrasada há ${c.diasAtraso} dias` : 'A vencer';
  const linkCobranca = (c: LinhaFinanceiro) => {
    const n = telefoneWhatsApp(c.loja.telefone);
    if (!n) return null;
    const msg = `Olá, ${(c.loja.responsavel ?? '').split(' ')[0] || 'tudo bem'}! Aqui é do Pata & Gestão. A mensalidade de ${nomeMes(c.mes)} da ${c.loja.nome}, no valor de ${reais(c.valor)}, ${c.status === 'atrasada' ? `venceu em ${fmtDia(c.vencimento)}` : `vence em ${fmtDia(c.vencimento)}`}. Qualquer dúvida, estou à disposição!`;
    return `https://wa.me/${n}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button onClick={() => setMes(somarMeses(mes, -1))} className="p-2 rounded-xl bg-white ring-1 ring-slate-200 hover:bg-slate-50" aria-label="Mês anterior"><ChevronLeft size={18} /></button>
        <span className="px-4 py-2 rounded-xl bg-white ring-1 ring-slate-200 font-semibold text-slate-700 min-w-[160px] text-center">{nomeMes(mes).replace(/^./, (c) => c.toUpperCase())} de {mes.slice(0, 4)}</span>
        <button onClick={() => setMes(somarMeses(mes, 1))} className="p-2 rounded-xl bg-white ring-1 ring-slate-200 hover:bg-slate-50" aria-label="Próximo mês"><ChevronRight size={18} /></button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Cartao titulo={`A receber em ${nomeMes(mes)}`} valor={reais(total)} detalhe={`${linhas.length} ${linhas.length === 1 ? 'mensalidade' : 'mensalidades'}`} icone={Wallet} cor={COR.petroleo} />
        <Cartao titulo="Já recebido" valor={reais(pago)} detalhe={total ? `${Math.round((pago / total) * 100)}% do mês` : '—'} icone={CheckCircle2} cor="#059669" />
        <Cartao titulo="Atrasado" valor={reais(atrasado)} detalhe={`com ${DIAS_PARA_BLOQUEIO} dias de atraso o painel sugere bloquear`} icone={AlertTriangle} cor={COR.laranja} />
      </div>
      <Secao titulo={`Mensalidades de ${nomeMes(mes)}`}>
        {linhas.length === 0 ? <Vazio texto="Nenhuma mensalidade neste mês. Lojas em teste e cortesias não pagam." /> : (
          <table className="w-full text-sm">
            <thead className="text-slate-500 text-xs uppercase tracking-wide">
              <tr><th className="text-left font-semibold py-2">Loja</th><th className="text-left font-semibold">Vencimento</th><th className="text-right font-semibold">Valor</th><th className="text-left font-semibold pl-6">Situação</th><th /></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {linhas.map((c) => {
                const link = linkCobranca(c);
                return (
                  <tr key={c.loja.id}>
                    <td className="py-3 font-semibold text-slate-800">{c.loja.nome}</td>
                    <td className="text-slate-600">{fmtDia(c.vencimento)}</td>
                    <td className="text-right font-semibold text-slate-800">{reais(c.valor)}</td>
                    <td className="pl-6"><span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ${selo[c.status]}`}>{textoSelo(c)}</span></td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        {c.status === 'paga' ? (
                          <button onClick={() => fazer(c.loja.id, () => fonte.desfazerPagamento(c.loja, c.mes), 'Pagamento desfeito.')} disabled={!!ocupado}
                            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-slate-500 hover:bg-slate-50"><Undo2 size={14} /> Desfazer</button>
                        ) : (<>
                          {link && <a href={link} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg ring-1 ring-slate-200 text-slate-600 hover:bg-slate-50"><Send size={14} /> Cobrar</a>}
                          <button onClick={() => fazer(c.loja.id, () => fonte.registrarPagamento(c.loja, c.mes, c.valor, d.hoje), `Pagamento da ${c.loja.nome} registrado.`)} disabled={!!ocupado}
                            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-60" style={{ background: COR.petroleo }}>
                            {ocupado === c.loja.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Marcar paga
                          </button>
                        </>)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Secao>
    </div>
  );
}

// ─── Planos ───────────────────────────────────────────────────────────────────
function Planos({ d }: { d: DadosDono }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 bg-amber-50 ring-1 ring-amber-200 rounded-xl px-4 py-3">
        Valores e recursos de exemplo. Os planos de verdade (por módulos) ainda serão definidos. Até lá, o valor de cada loja é o que você coloca no cadastro dela.
      </p>
      <div className="grid md:grid-cols-3 gap-5">
        {PLANOS.map((p) => (
          <div key={p.id} className={`bg-white rounded-2xl p-6 shadow-sm ring-1 ${p.id === 'profissional' ? 'ring-2' : 'ring-slate-100'}`} style={p.id === 'profissional' ? { ['--tw-ring-color' as any]: COR.azul } : undefined}>
            <h3 className="text-lg font-bold text-slate-900">{p.nome}</h3>
            <p className="text-sm text-slate-500">{p.descricao}</p>
            <p className="text-3xl font-bold mt-4" style={{ color: COR.petroleo }}>{reais(p.preco)}<span className="text-sm font-medium text-slate-500">/mês{p.id === 'rede' ? ' por loja' : ''}</span></p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              {p.recursos.map((r) => <li key={r} className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600" />{r}</li>)}
            </ul>
            <p className="mt-5 pt-4 border-t border-slate-100 text-sm text-slate-500">{d.lojas.filter((l) => l.plano === p.id).length} lojas neste plano</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Comunicados ──────────────────────────────────────────────────────────────
const ALVOS: { id: AlvoComunicado; nome: string }[] = [
  { id: 'todas', nome: 'Todas as lojas' }, { id: 'teste', nome: 'Só lojas em teste' },
  ...PLANOS.map((p) => ({ id: p.id, nome: `Só plano ${p.nome}` })),
];

function Comunicados({ d, fonte, recarregar }: { d: DadosDono; fonte: FonteDono; recarregar: () => Promise<void> }) {
  const [titulo, setTitulo] = useState('');
  const [texto, setTexto] = useState('');
  const [alvo, setAlvo] = useState<AlvoComunicado>('todas');
  const [ocupado, setOcupado] = useState<string | null>(null);

  const publicar = async () => {
    if (!titulo.trim()) { toast.error('Escreva o título do comunicado.'); return; }
    setOcupado('novo');
    try { await fonte.publicarComunicado(titulo, texto, alvo, d.hoje); setTitulo(''); setTexto(''); await recarregar(); toast.success('Comunicado publicado. As lojas veem ao abrir o sistema.'); }
    catch { toast.error('Não foi possível publicar. Tente de novo.'); }
    finally { setOcupado(null); }
  };
  const encerrar = async (id: string) => {
    setOcupado(id);
    try { await fonte.encerrarComunicado(id); await recarregar(); toast.success('Comunicado encerrado.'); }
    catch { toast.error('Não foi possível encerrar. Tente de novo.'); }
    finally { setOcupado(null); }
  };

  return (
    <div className="grid xl:grid-cols-2 gap-6">
      <Secao titulo="Novo comunicado">
        <div className="space-y-3">
          <input className={campo} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título (ex.: Manutenção no domingo às 22h)" maxLength={120} />
          <textarea rows={5} className={campo} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Mensagem (opcional)" maxLength={600} />
          <div className="flex items-center justify-between gap-3">
            <select className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm" value={alvo} onChange={(e) => setAlvo(e.target.value as AlvoComunicado)}>
              {ALVOS.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
            <button onClick={publicar} disabled={!!ocupado} className={botaoMarca} style={{ background: COR.petroleo }}>
              {ocupado === 'novo' ? <Loader2 size={16} className="animate-spin" /> : <Megaphone size={16} />} Publicar
            </button>
          </div>
          <p className="text-xs text-slate-500">Aparece como um aviso no topo do sistema das lojas escolhidas. Cada aparelho pode fechar o aviso.</p>
        </div>
      </Secao>
      <Secao titulo="Publicados">
        {d.comunicados.length === 0 ? <Vazio texto="Nenhum comunicado ainda." /> : (
          <ul className="space-y-3 text-sm">
            {d.comunicados.map((c) => (
              <li key={c.id} className="p-3 rounded-xl bg-slate-50 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800">{c.titulo}</p>
                  {c.texto && <p className="text-slate-600 mt-0.5 line-clamp-2">{c.texto}</p>}
                  <p className="text-xs text-slate-500 mt-1">{fmtDia(c.criadoEm)} · {ALVOS.find((a) => a.id === c.alvo)?.nome} · {c.ativo ? 'no ar' : 'encerrado'}</p>
                </div>
                {c.ativo && (
                  <button onClick={() => encerrar(c.id)} disabled={!!ocupado} className="text-xs font-semibold text-rose-600 hover:underline whitespace-nowrap">
                    {ocupado === c.id ? 'Encerrando...' : 'Encerrar'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Secao>
    </div>
  );
}

// ─── Configurações ────────────────────────────────────────────────────────────
const NOMES_CONTAGEM: Record<string, string> = {
  fichas: 'Fichas de pets', profissionais: 'Profissionais', racas: 'Raças personalizadas', contadores: 'Contador de fichas',
  slotsUsados: 'Dias da grade', dias: 'Dias com movimento', naFila: 'Pets na fila', atendimentos: 'Registros de atendimento', usuarios: 'Funcionários ligados à loja',
};

function Configuracoes({ d, fonte, recarregar }: { d: DadosDono; fonte: FonteDono; recarregar: () => Promise<void> }) {
  const [progresso, setProgresso] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoMigracao | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const migrada = d.lojas.find((l) => l.id === LOJA_DA_MIGRACAO.id && l.migradaEm);

  const migrar = async () => {
    setConfirmar(false);
    setProgresso('Começando...');
    try {
      const r = await fonte.migrar(d.hoje, setProgresso);
      setResultado(r);
      if (r.confere) toast.success('Dados copiados e conferidos.');
      else toast.error('A conferência não bateu. Nada foi marcado como migrado; veja os números.');
      await recarregar();
    } catch (e) {
      console.error('[migração]', e);
      toast.error('A cópia parou no meio. Os dados antigos continuam intactos; tente de novo.');
    } finally { setProgresso(null); }
  };

  const itens = [
    { icone: Lock, titulo: `Acesso de ${PAPEL.toLowerCase()}`, texto: `Só quem já é ${PAPEL.toLowerCase()} dá esse acesso a outra pessoa, na aba ${ABA_ACESSOS}. Funcionário e admin de loja não conseguem.` },
    { icone: Wallet, titulo: 'Regras de cobrança', texto: `Loja em teste não paga. Depois do vencimento, a mensalidade aparece como atrasada; com ${DIAS_PARA_BLOQUEIO} dias o painel sugere bloquear. O bloqueio é sempre você que faz.` },
    { icone: Store, titulo: 'Logo e cores de cada loja', texto: 'Cada loja troca a logo e as cores do topo no Painel Admin dela, na aba Personalização.' },
    { icone: Sparkles, titulo: 'Termos e privacidade', texto: 'Ainda falta: termos de uso e política de privacidade que cada loja aceita ao entrar pela primeira vez.' },
  ];

  return (
    <div className="space-y-6">
      <Secao titulo="Dados antigos da Elite Pet Shop">
        {migrada && !resultado ? (
          <p className="text-sm text-emerald-700 flex items-center gap-2"><CheckCircle2 size={18} /> Migração feita em {fmtDia(migrada.migradaEm!)}/{migrada.migradaEm!.slice(0, 4)}. A Elite já usa o espaço dela.</p>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Copia tudo do formato antigo (fichas, fila, histórico desde 01/01/2026, profissionais, raças e funcionários) para o espaço da {LOJA_DA_MIGRACAO.nome}.
              O original <b>não é apagado</b>. Faça à noite, com a loja fechada, depois de baixar o backup.
            </p>
            {progresso ? (
              <p className="flex items-center gap-2 text-sm font-semibold" style={{ color: COR.petroleo }}><Loader2 size={18} className="animate-spin" /> {progresso}</p>
            ) : confirmar ? (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 ring-1 ring-amber-200">
                <p className="flex-1 text-sm text-amber-900">Confirma? A loja está fechada e o backup foi baixado?</p>
                <button onClick={() => setConfirmar(false)} className="px-3 py-2 rounded-lg bg-white ring-1 ring-slate-200 text-sm font-semibold text-slate-600">Cancelar</button>
                <button onClick={migrar} className={botaoMarca} style={{ background: COR.petroleo }}>Sim, copiar</button>
              </div>
            ) : !resultado?.confere && (
              <button onClick={() => setConfirmar(true)} disabled={!d.migracaoPendente && !resultado} className={botaoMarca} style={{ background: GRADIENTE }}>
                <Database size={16} /> {resultado ? 'Tentar de novo' : 'Copiar dados para a loja'}
              </button>
            )}
            {!d.migracaoPendente && !resultado && <p className="text-xs text-slate-500">Nenhum dado antigo encontrado.</p>}
            {resultado && (
              <table className="w-full text-sm">
                <thead className="text-slate-500 text-xs uppercase tracking-wide">
                  <tr><th className="text-left font-semibold py-2">O quê</th><th className="text-right font-semibold">Antigo</th><th className="text-right font-semibold">Na loja</th><th /></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.keys(resultado.origem).map((k) => {
                    const o = (resultado.origem as any)[k], n = (resultado.destino as any)[k];
                    const ok = k === 'usuarios' ? n >= o : n === o;
                    return (
                      <tr key={k}>
                        <td className="py-2 text-slate-700">{NOMES_CONTAGEM[k] ?? k}</td>
                        <td className="text-right text-slate-700">{o}</td>
                        <td className="text-right font-semibold text-slate-800">{n}</td>
                        <td className="text-right pl-3">{ok ? <CheckCircle2 size={16} className="text-emerald-600 inline" /> : <AlertTriangle size={16} className="text-rose-600 inline" />}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </Secao>

      <div className="grid md:grid-cols-2 gap-5">
        {itens.map((i) => (
          <div key={i.titulo} className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-slate-100 flex gap-4">
            <span className="p-2.5 rounded-xl h-fit" style={{ background: `${COR.petroleo}14`, color: COR.petroleo }}><i.icone size={20} /></span>
            <div><p className="font-bold text-slate-800">{i.titulo}</p><p className="text-sm text-slate-500 mt-1">{i.texto}</p></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Painel ───────────────────────────────────────────────────────────────────
export function PainelDono({ nomeDono = PAPEL, meuUid, onLogout, fonte = fonteFirestore, hoje: hojeFixo, abaInicial = 'geral', lojaAberta, novaAberta = false }:
  { nomeDono?: string; meuUid?: string; onLogout?: () => void; fonte?: FonteDono; hoje?: string; abaInicial?: Aba; lojaAberta?: string; novaAberta?: boolean }) {
  const [aba, setAba] = useState<Aba>(abaInicial);
  const [dados, setDados] = useState<DadosDono | null>(null);
  const [erro, setErro] = useState(false);
  const [lojaId, setLojaId] = useState<string | null>(lojaAberta ?? null);
  const [form, setForm] = useState<'nova' | 'editar' | null>(novaAberta ? 'nova' : null);
  const hoje = hojeFixo ?? idDoDia();

  const recarregar = useCallback(async () => {
    try { setDados(await fonte.carregar(hoje)); setErro(false); }
    catch (e) { console.error('[painel do dono]', e); setErro(true); }
  }, [fonte, hoje]);
  useEffect(() => { void recarregar(); }, [recarregar]);

  const loja = useMemo(() => dados?.lojas.find((l) => l.id === lojaId) ?? null, [dados, lojaId]);
  const titulo = MENU.find((m) => m.id === aba)?.nome ?? '';
  const atrasadas = dados ? dados.lojas.filter((l) => situacaoDaLoja(l, dados.cobrancas, dados.hoje).situacao === 'atrasada').length : 0;

  return (
    <div className="min-h-screen flex bg-[#eef3f6]">
      <aside className="w-64 shrink-0 flex flex-col text-white sticky top-0 h-screen" style={{ background: `linear-gradient(180deg, ${COR.escuro} 0%, ${COR.petroleo} 100%)` }}>
        <div className="p-5">
          <div className="bg-white rounded-2xl px-4 py-3"><img src="/logo-pata-gestao.png" alt="Pata & Gestão" className="h-12 w-auto mx-auto object-contain" /></div>
          <p className="text-[11px] text-center uppercase tracking-widest text-white/60 mt-3 font-semibold">Painel do {PAPEL.toLowerCase()}</p>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {MENU.map((m) => (
            <button key={m.id} onClick={() => setAba(m.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${aba === m.id ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>
              <m.icone size={18} /> {m.nome}
              {m.id === 'financeiro' && atrasadas > 0 && <span className="ml-auto text-[11px] px-1.5 rounded-full" style={{ background: COR.laranja }}>{atrasadas}</span>}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full grid place-items-center font-bold uppercase" style={{ background: COR.laranja }}>{nomeDono[0]}</div>
          <div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate capitalize">{nomeDono}</p><p className="text-xs text-white/60">{PAPEL} do sistema</p></div>
          <button onClick={onLogout} className="text-white/60 hover:text-white" aria-label="Sair"><LogOut size={18} /></button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{titulo}</h1>
            <p className="text-sm text-slate-500">{dataPorExtenso(hoje)}</p>
          </div>
          <button onClick={() => { setDados(null); void recarregar(); }} className="flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-xl bg-white ring-1 ring-slate-200 text-slate-600 hover:bg-slate-50">
            <RefreshCw size={16} /> Atualizar
          </button>
        </header>
        <div className="px-8 pb-10">
          {erro && !dados ? (
            <div className="bg-white rounded-2xl p-8 text-center ring-1 ring-slate-100">
              <p className="font-semibold text-slate-800">Não foi possível carregar os dados.</p>
              <p className="text-sm text-slate-500 mt-1">Confira a internet e clique em Atualizar.</p>
            </div>
          ) : !dados ? (
            <div className="flex items-center justify-center gap-3 py-24 text-slate-500"><Loader2 className="animate-spin" /> Carregando as lojas...</div>
          ) : (<>
            {aba === 'geral' && <VisaoGeral d={dados} abrirLoja={(l) => setLojaId(l.id)} irPara={setAba} />}
            {aba === 'lojas' && <ListaLojas d={dados} abrirLoja={(l) => setLojaId(l.id)} novaLoja={() => setForm('nova')} />}
            {aba === 'financeiro' && <Financeiro d={dados} fonte={fonte} recarregar={recarregar} />}
            {aba === 'planos' && <Planos d={dados} />}
            {aba === 'comunicados' && <Comunicados d={dados} fonte={fonte} recarregar={recarregar} />}
            {aba === 'acessos' && <Acessos fonte={fonte} meuUid={meuUid} hoje={hoje} />}
            {aba === 'config' && <Configuracoes d={dados} fonte={fonte} recarregar={recarregar} />}
          </>)}
        </div>
      </main>

      {dados && loja && !form && (
        <DetalheLoja d={dados} loja={loja} fonte={fonte} fechar={() => setLojaId(null)} editar={() => setForm('editar')} recarregar={recarregar} />
      )}
      {dados && form && (
        <FormLoja d={dados} fonte={fonte} loja={form === 'editar' ? loja ?? undefined : undefined} fechar={() => setForm(null)} aoSalvar={recarregar} />
      )}
    </div>
  );
}
