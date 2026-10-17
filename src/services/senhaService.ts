// ✅ Senhas: a provisória que o admin passa para o funcionário, a troca obrigatória
//    no primeiro acesso e o "Esqueci a senha" da tela de login.
import { updatePassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

// sem os caracteres que se confundem ao ditar ou ler: 0/O, 1/l/I
const MAIUSCULAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const MINUSCULAS = 'abcdefghijkmnopqrstuvwxyz';
const NUMEROS    = '23456789';
const RESTO      = MINUSCULAS + NUMEROS;

/** Índice sorteado de 0 a n-1, sem viés (descarta o que sobra do byte) */
function sortear(n: number): number {
  const limite = 256 - (256 % n);
  const b = new Uint8Array(1);
  do crypto.getRandomValues(b); while (b[0] >= limite);
  return b[0] % n;
}

const grupo = () => MAIUSCULAS[sortear(MAIUSCULAS.length)]
  + Array.from({ length: 3 }, () => RESTO[sortear(RESTO.length)]).join('');

/**
 * Senha provisória no formato "Xxxx-Xxxx": fácil de ditar, com maiúscula,
 * minúscula e número. Não é gravada em lugar nenhum.
 */
export function gerarSenhaProvisoria(): string {
  for (;;) {
    const senha = `${grupo()}-${grupo()}`;
    if (/[a-z]/.test(senha) && /[0-9]/.test(senha)) return senha;
  }
}

/** Regras da senha nova (cada uma fica verde na tela quando é cumprida) */
export function regrasSenha(nova: string, repetida: string) {
  return {
    tamanho: nova.length >= 8,
    letra:   /\p{L}/u.test(nova),
    numero:  /[0-9]/.test(nova),
    iguais:  nova.length > 0 && nova === repetida,
  };
}

export const senhaValida = (nova: string, repetida: string) =>
  Object.values(regrasSenha(nova, repetida)).every(Boolean);

/** Primeiro acesso: troca a senha provisória pela do funcionário e tira a marca do cadastro */
export async function trocarSenhaPrimeiroAcesso(nova: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw Object.assign(new Error('sem login'), { code: 'auth/requires-recent-login' });
  await updatePassword(user, nova);
  await updateDoc(doc(db, 'usuarios', user.uid), { trocarSenha: false });
}

export function mensagemErroSenha(code: string | undefined): string {
  switch (code) {
    case 'auth/requires-recent-login':
      return 'Por segurança, saia e entre de novo com a senha provisória para criar a sua senha.';
    case 'auth/weak-password':
    case 'auth/password-does-not-meet-requirements':
      return 'Essa senha é fraca. Use pelo menos 8 caracteres, com letra e número.';
    case 'auth/network-request-failed':
      return 'Falha de conexão. Confira a internet e tente de novo.';
    default:
      return 'Não foi possível salvar a senha. Tente de novo.';
  }
}

/** A mesma resposta para qualquer e-mail: não revela quem tem cadastro */
export const MSG_LINK_ENVIADO = 'Se este e-mail estiver cadastrado, você vai receber um link para criar uma nova senha.';
export const MSG_LINK_SEM_CONEXAO = 'Falha de conexão. Confira a internet e tente de novo.';

/** "Esqueci a senha": envia o link do Firebase. Só falha de internet é mostrada como erro. */
export async function enviarLinkNovaSenha(email: string): Promise<string> {
  try {
    await sendPasswordResetEmail(auth, email.trim());
  } catch (err: any) {
    if (err?.code === 'auth/network-request-failed') return MSG_LINK_SEM_CONEXAO;
  }
  return MSG_LINK_ENVIADO;
}
