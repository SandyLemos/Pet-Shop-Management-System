// ✅ De onde o Painel do Dono lê e grava. Separado para a prévia/testes trocarem por dados de exemplo.
import * as dono from '../../../services/donoService';
import { migrarDadosAntigos, type ResultadoMigracao } from '../../../services/migracaoService';
import type { AlvoComunicado, DadosDono, Loja } from '../../../utils/dono';

export interface FonteDono {
  carregar(hoje: string): Promise<DadosDono>;
  criarLoja(n: dono.NovaLoja, hoje: string, existentes: string[]): Promise<Loja>;
  atualizarLoja(id: string, campos: dono.CamposLoja): Promise<void>;
  registrarPagamento(loja: Loja, mes: string, valor: number, hoje: string): Promise<void>;
  desfazerPagamento(loja: Loja, mes: string): Promise<void>;
  publicarComunicado(titulo: string, texto: string, alvo: AlvoComunicado, hoje: string): Promise<void>;
  encerrarComunicado(id: string): Promise<void>;
  migrar(hoje: string, aoAvancar: (t: string) => void): Promise<ResultadoMigracao>;
  excluirLoja(loja: Loja, hoje: string, aoAvancar: (t: string) => void): Promise<void>;
  listarProprietarios(): Promise<dono.Proprietario[]>;
  cadastrarProprietario(nome: string, email: string, hoje: string): Promise<dono.Proprietario>;
  removerProprietario(uid: string, meuUid: string, hoje?: string): Promise<void>;
}

export { EMAIL_EM_USO, NAO_PODE_REMOVER_A_SI, nomeConfere, type Proprietario } from '../../../services/donoService';

/** Loja que recebe os dados do formato antigo */
export const LOJA_DA_MIGRACAO = { id: 'elite-pet-shop', nome: 'Elite Pet Shop', logoUrl: '/logo-elite.png' };

export const fonteFirestore: FonteDono = {
  carregar: dono.carregarDadosDono,
  criarLoja: dono.criarLoja,
  atualizarLoja: dono.atualizarLoja,
  registrarPagamento: dono.registrarPagamento,
  desfazerPagamento: dono.desfazerPagamento,
  publicarComunicado: dono.publicarComunicado,
  encerrarComunicado: dono.encerrarComunicado,
  migrar: (hoje, aoAvancar) => migrarDadosAntigos(LOJA_DA_MIGRACAO, hoje, aoAvancar),
  excluirLoja: dono.excluirLoja,
  listarProprietarios: dono.listarProprietarios,
  cadastrarProprietario: dono.cadastrarProprietario,
  removerProprietario: dono.removerProprietario,
};
