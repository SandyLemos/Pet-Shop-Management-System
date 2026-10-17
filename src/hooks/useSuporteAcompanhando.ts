import { useEffect, useState } from 'react';
import { aoMudarTela, telaAtual } from '../lib/espelho';
import { apagarTela, idDoAparelho, ouvirSuporte, publicarTela } from '../services/suporteService';

/**
 * ✅ Na loja: o proprietário está acompanhando ao vivo? Enquanto estiver, este aparelho
 * conta a aba e a janela aberta (com uma pausa curta para juntar mudanças seguidas).
 * Quando ele fecha a tela ao vivo, o aparelho para de enviar e apaga o próprio registro.
 */
export function useSuporteAcompanhando(ligado: boolean, nomeAparelho: string): boolean {
  const [ativoAte, setAtivoAte] = useState(0);
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    setAtivoAte(0);
    if (!ligado) return;
    try { return ouvirSuporte(setAtivoAte); }
    catch { return; } // ainda sem loja
  }, [ligado]);

  // a marcação vence sozinha se o proprietário fechar sem avisar (sem internet, aba fechada)
  useEffect(() => {
    if (ativoAte <= Date.now()) return;
    const t = setTimeout(() => setAgora(Date.now()), ativoAte - Date.now() + 500);
    return () => clearTimeout(t);
  }, [ativoAte, agora]);

  const ativo = ligado && ativoAte > agora;

  useEffect(() => {
    if (!ativo) return;
    const aparelho = idDoAparelho();
    const enviar = () => { publicarTela(aparelho, nomeAparelho, telaAtual()).catch(() => {}); };
    enviar();
    let pausa: ReturnType<typeof setTimeout> | undefined;
    const parar = aoMudarTela(() => { clearTimeout(pausa); pausa = setTimeout(enviar, 300); });
    const sinal = setInterval(enviar, 60_000); // "ainda estou aqui"
    return () => {
      parar();
      clearTimeout(pausa);
      clearInterval(sinal);
      apagarTela(aparelho).catch(() => {});
    };
  }, [ativo, nomeAparelho]);

  return ativo;
}
