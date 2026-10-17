import { useEffect, useState } from 'react';
import { aoMudarLoja, coresLoja, logoLoja, nomeLoja, lojaTemCores, lojaAtual } from '../lib/lojaAtual';
import type { CoresLoja } from '../utils/cores';

export interface VisualLoja {
  nome: string;
  logo: string;
  cores: CoresLoja;
  personalizado: boolean; // a loja escolheu cores próprias
}

const ler = (): VisualLoja => ({ nome: nomeLoja(), logo: logoLoja(), cores: coresLoja(), personalizado: lojaTemCores() });

/**
 * ✅ Nome, logo e cores da loja atual; a tela muda assim que a Personalização é salva.
 * Enquanto ninguém está com loja (saindo da conta, ou entrando), fica o visual da última loja:
 * assim o topo não pisca com a logo da Pata & Gestão ao clicar em Sair.
 */
export function useVisualLoja(): VisualLoja {
  const [visual, setVisual] = useState(ler);
  useEffect(() => {
    const atualizar = () => { if (lojaAtual()) setVisual(ler()); };
    atualizar();
    return aoMudarLoja(atualizar);
  }, []);
  return visual;
}

/** ✅ Leva as cores da loja (ou as da Pata & Gestão) para o sistema todo (ver styles/personalizacao.css) */
export function useAplicarCoresLoja(visual: VisualLoja) {
  const { cores } = visual;
  useEffect(() => {
    const raiz = document.documentElement;
    raiz.style.setProperty('--loja-principal', cores.principal);
    raiz.style.setProperty('--loja-destaque', cores.destaque);
    raiz.setAttribute('data-cores-loja', '');
  }, [cores.principal, cores.destaque]);
}
