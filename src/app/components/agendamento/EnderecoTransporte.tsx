// ✅ Agendamento online: busca e entrega. Janela do endereço completo + localização opcional.
import { useState } from 'react';
import { Check, Loader2, MapPin, Navigation, Truck, X } from 'lucide-react';
import {
  ENDERECO_VAZIO, NOME_TRANSPORTE, linkMapa, problemaNoEndereco, textoEndereco,
  type Endereco, type Localizacao, type Transporte,
} from '../../../utils/agendamento';
import { MARCA } from '../../../utils/cores';

const campo = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:bg-white transition';
const rotulo = 'block text-sm font-semibold text-slate-600 mb-1.5';

/** Formata o CEP enquanto digita: 00000-000 */
const mascaraCep = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
};

export function JanelaEndereco({ transporte, inicial, localInicial, fechar, salvar }: {
  transporte: Transporte;
  inicial?: Endereco;
  localInicial?: Localizacao | null;
  fechar: () => void;
  salvar: (endereco: Endereco, localizacao: Localizacao | null) => void;
}) {
  const [e, setE] = useState<Endereco>(inicial ?? ENDERECO_VAZIO);
  const [local, setLocal] = useState<Localizacao | null>(localInicial ?? null);
  const [buscandoLocal, setBuscandoLocal] = useState(false);
  const [erro, setErro] = useState('');
  const [erroLocal, setErroLocal] = useState('');
  const mudar = (k: keyof Endereco, v: string) => setE((x) => ({ ...x, [k]: v }));

  const pegarLocalizacao = () => {
    setErroLocal('');
    if (!('geolocation' in navigator)) { setErroLocal('Este aparelho não consegue mandar a localização.'); return; }
    setBuscandoLocal(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocal({ lat: pos.coords.latitude, lng: pos.coords.longitude, precisao: pos.coords.accuracy });
        setBuscandoLocal(false);
      },
      (err) => {
        setErroLocal(err.code === err.PERMISSION_DENIED
          ? 'Você não permitiu a localização. Tudo bem: ela é opcional.'
          : 'Não foi possível pegar a localização agora. Ela é opcional.');
        setBuscandoLocal(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const confirmar = () => {
    const problema = problemaNoEndereco(e);
    if (problema) { setErro(problema); return; }
    salvar(e, local);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center sm:px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={fechar} />
      <div role="dialog" aria-modal="true" aria-label={`Endereço para ${NOME_TRANSPORTE[transporte]}`}
        className="relative bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between gap-3 shrink-0" style={{ background: `linear-gradient(135deg, ${MARCA.petroleo}, ${MARCA.azul})` }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-white/20 p-2 rounded-lg shrink-0"><Truck className="w-5 h-5 text-white" /></div>
            <div className="min-w-0">
              <h2 className="text-white font-bold text-base">Endereço para {NOME_TRANSPORTE[transporte].toLowerCase()}</h2>
              <p className="text-white/75 text-xs">Onde a loja vai buscar ou entregar o pet</p>
            </div>
          </div>
          <button onClick={fechar} className="shrink-0 p-1 text-white/70 hover:text-white" aria-label="Fechar"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-3 overflow-y-auto">
          <div className="grid grid-cols-[120px_1fr] gap-3">
            <div>
              <label className={rotulo} htmlFor="end-cep">CEP</label>
              <input id="end-cep" className={campo} inputMode="numeric" placeholder="00000-000" value={e.cep} onChange={(ev) => mudar('cep', mascaraCep(ev.target.value))} autoComplete="postal-code" />
            </div>
            <div>
              <label className={rotulo} htmlFor="end-cidade">Cidade</label>
              <input id="end-cidade" className={campo} maxLength={80} value={e.cidade} onChange={(ev) => mudar('cidade', ev.target.value)} autoComplete="address-level2" />
            </div>
          </div>
          <div className="grid grid-cols-[1fr_100px] gap-3">
            <div>
              <label className={rotulo} htmlFor="end-rua">Rua</label>
              <input id="end-rua" className={campo} maxLength={120} placeholder="Rua, avenida..." value={e.rua} onChange={(ev) => mudar('rua', ev.target.value)} autoComplete="address-line1" />
            </div>
            <div>
              <label className={rotulo} htmlFor="end-numero">Número</label>
              <input id="end-numero" className={campo} maxLength={20} value={e.numero} onChange={(ev) => mudar('numero', ev.target.value)} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className={rotulo} htmlFor="end-bairro">Bairro</label>
              <input id="end-bairro" className={campo} maxLength={80} value={e.bairro} onChange={(ev) => mudar('bairro', ev.target.value)} />
            </div>
            <div>
              <label className={rotulo} htmlFor="end-compl">Complemento <span className="font-normal text-slate-400">(opcional)</span></label>
              <input id="end-compl" className={campo} maxLength={60} placeholder="Apto, bloco, casa..." value={e.complemento} onChange={(ev) => mudar('complemento', ev.target.value)} autoComplete="address-line2" />
            </div>
          </div>
          <div>
            <label className={rotulo} htmlFor="end-ref">Ponto de referência <span className="font-normal text-slate-400">(opcional)</span></label>
            <input id="end-ref" className={campo} maxLength={120} placeholder="Ex.: portão azul, perto da padaria" value={e.referencia} onChange={(ev) => mudar('referencia', ev.target.value)} />
          </div>

          <div className="rounded-xl bg-sky-50 p-3 space-y-2">
            <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5"><MapPin size={15} style={{ color: MARCA.petroleo }} /> Localização <span className="font-normal text-slate-400">(opcional)</span></p>
            {local ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold"><Check size={15} /> Localização adicionada</span>
                <a href={linkMapa(null, local)!} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold underline" style={{ color: MARCA.petroleo }}>ver no mapa</a>
                <button onClick={() => setLocal(null)} className="text-xs font-semibold text-red-600 underline ml-auto">remover</button>
              </div>
            ) : (
              <button onClick={pegarLocalizacao} disabled={buscandoLocal}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 bg-white text-sm font-semibold disabled:opacity-60"
                style={{ borderColor: MARCA.petroleo, color: MARCA.petroleo }}>
                {buscandoLocal ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />} Usar minha localização atual
              </button>
            )}
            <p className="text-[11px] text-slate-500">{erroLocal || 'Ajuda o motorista a achar a casa. Use só se estiver no endereço da busca/entrega.'}</p>
          </div>

          {erro && <p className="text-sm text-red-600 font-semibold" role="alert">{erro}</p>}
        </div>

        <div className="px-5 py-4 bg-slate-50 flex gap-3 shrink-0">
          <button onClick={fechar} className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600">Cancelar</button>
          <button onClick={confirmar} className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold" style={{ background: `linear-gradient(135deg, ${MARCA.petroleo}, ${MARCA.azul})` }}>
            Salvar endereço
          </button>
        </div>
      </div>
    </div>
  );
}

/** Resumo do endereço escolhido (formulário do tutor e telas da loja) */
export function ResumoEndereco({ transporte, endereco, localizacao, aoAlterar }:
  { transporte: Transporte; endereco?: Endereco; localizacao?: Localizacao | null; aoAlterar?: () => void }) {
  const mapa = linkMapa(endereco, localizacao);
  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 flex items-start gap-3">
      <Truck size={18} className="shrink-0 mt-0.5" style={{ color: MARCA.petroleo }} />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold text-slate-800">{NOME_TRANSPORTE[transporte]}</p>
        <p className="text-slate-600 break-words">{textoEndereco(endereco)}</p>
        <div className="flex flex-wrap gap-3 mt-1">
          {mapa && <a href={mapa} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold underline" style={{ color: MARCA.petroleo }}>{localizacao ? 'Ver localização no mapa' : 'Ver no mapa'}</a>}
          {aoAlterar && <button onClick={aoAlterar} className="text-xs font-semibold underline text-slate-600">Alterar endereço</button>}
        </div>
      </div>
    </div>
  );
}
