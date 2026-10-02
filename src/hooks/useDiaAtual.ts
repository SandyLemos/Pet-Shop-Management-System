import { useEffect, useState } from 'react';
import { idDoDia } from '../utils/dias';

/**
 * ✅ Dia atual (fuso de São Paulo), ex: "2026-10-02", que MUDA SOZINHO na
 * virada da meia-noite. Confere a cada minuto e quando o tablet "acorda"
 * (volta a ficar visível ou recebe foco). Mesma estratégia do
 * useSlotsUsadosHoje e da aba Entregues.
 */
export function useDiaAtual(): string {
  const [dia, setDia] = useState(idDoDia);

  useEffect(() => {
    // setDia com o mesmo valor não re-renderiza: só age quando o dia muda
    const sincronizar = () => setDia(idDoDia());

    const id = setInterval(sincronizar, 60_000);
    const onVisivel = () => {
      if (document.visibilityState === 'visible') sincronizar();
    };
    document.addEventListener('visibilitychange', onVisivel);
    window.addEventListener('focus', sincronizar);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisivel);
      window.removeEventListener('focus', sincronizar);
    };
  }, []);

  return dia;
}
