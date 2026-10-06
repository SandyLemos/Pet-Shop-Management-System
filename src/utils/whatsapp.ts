// ✅ Link do WhatsApp com mensagem pronta (abre o app, sem custo de envio).

/** Telefone só com dígitos e com o código do Brasil (55). Null se não der para usar. */
export function telefoneWhatsApp(telefone?: string | null): string | null {
  const d = String(telefone ?? '').replace(/\D/g, '');
  if (d.length === 10 || d.length === 11) return `55${d}`;             // DDD + número
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) return d; // já tem 55
  return null;
}

export function mensagemPetPronto(nomeTutor: string, nomePet: string): string {
  const tutor = (nomeTutor || '').trim().split(/\s+/)[0];
  return `Olá${tutor ? `, ${tutor}` : ''}! 🐾 O(a) ${nomePet} já está pronto(a) para retirada aqui no Elite Pet Shop. Estamos te esperando!`;
}

/** URL wa.me pronta, ou null se o telefone não for válido. */
export function linkWhatsAppPetPronto(telefone: string | null | undefined, nomeTutor: string, nomePet: string): string | null {
  const numero = telefoneWhatsApp(telefone);
  if (!numero) return null;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagemPetPronto(nomeTutor, nomePet))}`;
}

/** Mensagem para chamar de volta um cliente que não aparece há tempo. */
export function linkWhatsAppSaudade(telefone: string | null | undefined, nomeTutor: string, nomePet: string): string | null {
  const numero = telefoneWhatsApp(telefone);
  if (!numero) return null;
  const tutor = (nomeTutor || '').trim().split(/\s+/)[0];
  const msg = `Olá${tutor ? `, ${tutor}` : ''}! 🐾 Estamos com saudade do(a) ${nomePet} aqui no Elite Pet Shop. Que tal agendar um banho? Estamos te esperando!`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`;
}
