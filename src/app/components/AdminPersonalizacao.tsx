import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Upload, Trash2, RotateCcw, Save, AlertTriangle, Sparkles } from 'lucide-react';
import { useCloudinaryUpload } from '../../hooks/useCloudinaryUpload';
import { useVisualLoja } from '../../hooks/useVisualLoja';
import { lojaAtual, lojaTemCores } from '../../lib/lojaAtual';
import { salvarPersonalizacao, MSG_LOGO_INVALIDA } from '../../services/personalizacaoService';
import { CORES_PADRAO, fundoTopo, coresDaImagem, corMuitoClara, sugerirCores, type CoresLoja } from '../../utils/cores';

const LOGO_PADRAO = '/logo-pata-gestao.png';

// ─── Aba "Personalização" do Painel Admin: logo e cores do topo da loja ───────
export function SecaoPersonalizacao() {
  const visual = useVisualLoja();
  const { uploadImage, uploading } = useCloudinaryUpload();
  const arquivo = useRef<HTMLInputElement>(null);

  // o que está na tela (só vai para o banco ao salvar)
  const [logoUrl, setLogoUrl]   = useState<string | null>(lojaAtual()?.logoUrl || null);
  const [cores, setCores]       = useState<CoresLoja | null>(lojaTemCores() ? visual.cores : null);
  const [sugestao, setSugestao] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso]       = useState('');

  // ✅ Logo já enviada: lê as cores dela ao abrir a aba. Se a loja ainda não escolheu
  // cores, já deixa as da logo preenchidas (só valem depois de salvar).
  useEffect(() => {
    const atual = lojaAtual()?.logoUrl;
    if (!atual) return;
    let ativo = true;
    coresDaImagem(atual).then((lidas) => {
      if (!ativo || lidas.length === 0) return;
      setSugestao(lidas);
      const sugeridas = sugerirCores(lidas);
      if (sugeridas && !lojaTemCores()) {
        setCores(sugeridas);
        setAviso('Preenchemos as cores com as da sua logo. Confira a prévia e salve para usar.');
      }
    });
    return () => { ativo = false; };
  }, []);

  const coresNaTela = cores ?? CORES_PADRAO;
  const clara = corMuitoClara(coresNaTela.principal) || corMuitoClara(coresNaTela.destaque);
  const mudou = logoUrl !== (lojaAtual()?.logoUrl || null)
    || JSON.stringify(cores) !== JSON.stringify(lojaTemCores() ? visual.cores : null);

  const enviarLogo = async (file?: File) => {
    if (!file) return;
    const doArquivo = await coresDaImagem(file);
    const url = await uploadImage(file, { manterTransparencia: true });
    if (!url) { toast.error('Não foi possível enviar a logo. Verifique a internet e tente de novo.'); return; }
    setLogoUrl(url);
    setSugestao(doArquivo);
    const sugeridas = sugerirCores(doArquivo);
    if (sugeridas) {
      setCores(sugeridas);
      setAviso('Aplicamos as cores da sua logo. Ajuste se quiser e salve.');
      toast.success('Logo enviada! Aplicamos cores que combinam com ela.');
    } else {
      setAviso('Não achamos cores fortes na logo (preto e branco?). Escolha as cores abaixo.');
      toast.success('Logo enviada! Escolha as cores e salve.');
    }
  };

  const mudarCor = (campo: keyof CoresLoja, valor: string) =>
    setCores({ ...coresNaTela, [campo]: valor.toUpperCase() });

  const salvar = async () => {
    setSalvando(true);
    try {
      await salvarPersonalizacao({ logoUrl, cores });
      setAviso('');
      toast.success('Personalização salva! Os outros aparelhos da loja veem na próxima vez que entrarem.');
    } catch (err) {
      console.error('[personalizacao]', err);
      toast.error((err as Error)?.message === MSG_LOGO_INVALIDA
        ? MSG_LOGO_INVALIDA
        : 'Não foi possível salvar. Verifique a internet e tente de novo.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Logo */}
      <div className="border border-slate-200 rounded-2xl p-4">
        <h3 className="font-bold text-gray-800 text-sm">Logo da loja</h3>
        <p className="text-xs text-gray-500">Aparece no topo do sistema. PNG ou JPG, até 5 MB.</p>
        <div className="flex items-center gap-3 mt-3">
          <div className="w-28 h-16 border border-slate-200 rounded-xl bg-white flex items-center justify-center p-1">
            <img src={logoUrl || LOGO_PADRAO} alt="Logo da loja" className="max-h-full max-w-full object-contain" />
          </div>
          <div className="flex flex-col gap-2">
            <input
              ref={arquivo}
              type="file"
              accept="image/*"
              className="hidden"
              aria-label="Arquivo da logo"
              onChange={(e) => { enviarLogo(e.target.files?.[0]); e.target.value = ''; }}
            />
            <button
              onClick={() => arquivo.current?.click()}
              disabled={uploading}
              className="px-3 py-2 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
            >
              <Upload size={14} /> {uploading ? 'Enviando...' : 'Enviar logo'}
            </button>
            {logoUrl && (
              <button
                onClick={() => { setLogoUrl(null); setSugestao([]); }}
                className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5"
              >
                <Trash2 size={14} /> Remover
              </button>
            )}
          </div>
        </div>
        {sugestao.length > 0 && (
          <div className="mt-3 bg-pink-50 border border-pink-200 rounded-xl p-3 text-xs text-pink-900">
            <p className="font-semibold flex items-center gap-1"><Sparkles size={13} /> Cores que combinam com a sua logo</p>
            <div className="flex gap-1.5 my-2">
              {sugestao.map((c) => (
                <span key={c} title={c} className="w-6 h-6 rounded-md border border-black/10" style={{ background: c }} />
              ))}
            </div>
            <button
              onClick={() => { const s = sugerirCores(sugestao); if (s) setCores(s); }}
              className="px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-semibold"
            >
              Aplicar estas cores
            </button>
          </div>
        )}
      </div>

      {/* Cores do topo */}
      <div className="border border-slate-200 rounded-2xl p-4">
        <h3 className="font-bold text-gray-800 text-sm">Cores da loja</h3>
        <p className="text-xs text-gray-500">Usadas no topo da tela e no Painel Admin.</p>
        {aviso && (
          <p className="mt-2 text-xs bg-pink-50 border border-pink-200 text-pink-900 rounded-lg px-3 py-2 flex items-center gap-1.5">
            <Sparkles size={13} className="flex-shrink-0" /> {aviso}
          </p>
        )}
        {([['principal', 'Cor principal'], ['destaque', 'Cor de destaque']] as const).map(([campo, rotulo]) => (
          <label key={campo} className="flex items-center gap-3 mt-3 text-sm text-gray-700">
            <input
              type="color"
              value={coresNaTela[campo]}
              onChange={(e) => mudarCor(campo, e.target.value)}
              aria-label={rotulo}
              className="w-10 h-8 cursor-pointer bg-transparent"
            />
            <span className="flex-1">{rotulo}</span>
            <code className="text-xs text-gray-400">{coresNaTela[campo]}</code>
          </label>
        ))}
        {clara && (
          <p className="mt-2 text-xs text-amber-700 flex items-center gap-1">
            <AlertTriangle size={13} /> Cor muito clara: o texto branco do topo pode ficar difícil de ler.
          </p>
        )}

        {/* Prévia do topo */}
        <div
          className="mt-3 rounded-xl px-3 py-2 flex items-center gap-3"
          style={{ background: fundoTopo(coresNaTela) }}
          data-testid="previa-topo"
        >
          <div className="bg-white rounded-lg px-2 py-1">
            <img src={logoUrl || LOGO_PADRAO} alt="" className="h-6 w-auto object-contain" />
          </div>
          <span className="text-white font-bold text-sm truncate">{visual.nome}</span>
        </div>

        <button
          onClick={() => { setCores(null); setAviso(''); }}
          disabled={!cores}
          className="mt-3 w-full py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40"
        >
          <RotateCcw size={14} /> Voltar às cores padrão
        </button>
      </div>

      <button
        onClick={salvar}
        disabled={salvando || uploading || !mudou}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-pink-700 hover:from-pink-600 hover:to-pink-800 text-white text-sm font-bold shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <Save size={16} /> {salvando ? 'Salvando...' : 'Salvar personalização'}
      </button>
    </div>
  );
}
