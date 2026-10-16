import { useEffect, useState } from 'react';
import { aoMudarLoja, coresLoja, logoLoja, nomeLoja } from '../lib/lojaAtual';
import type { CoresLoja } from '../utils/cores';

export interface VisualLoja {
  nome: string;
  logo: string;
  cores: CoresLoja;
}

const ler = (): VisualLoja => ({ nome: nomeLoja(), logo: logoLoja(), cores: coresLoja() });

/** ✅ Nome, logo e cores da loja atual; a tela muda assim que a Personalização é salva */
export function useVisualLoja(): VisualLoja {
  const [visual, setVisual] = useState(ler);
  useEffect(() => {
    setVisual(ler());
    return aoMudarLoja(() => setVisual(ler()));
  }, []);
  return visual;
}
