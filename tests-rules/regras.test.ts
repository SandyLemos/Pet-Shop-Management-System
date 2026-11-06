// Testes das regras do Firestore no emulador (projeto "demo-", nunca o real).
// Cobrem as mudanças de 06/11/2026: "Banho + Tosa" fora do pedido online e
// a limpeza LGPD (nome, telefone, endereço e localização) feita pelo admin da loja.
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { deleteDoc, doc, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore'

const DIA = '2026-11-10'
const REMOVIDO = 'Removido (LGPD)'
let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-pata-regras',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})

afterAll(async () => {
  await env?.cleanup()
})

beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'usuarios/adminA'), { role: 'admin', lojaId: 'lojaA', nome: 'Admin A' })
    await setDoc(doc(db, 'usuarios/equipeA'), { role: 'funcionario', lojaId: 'lojaA', nome: 'Equipe A' })
    await setDoc(doc(db, 'usuarios/adminB'), { role: 'admin', lojaId: 'lojaB', nome: 'Admin B' })
    await setDoc(doc(db, 'lojas/lojaA'), { nome: 'Loja A', modulos: { agendamento: true } })
    await setDoc(doc(db, 'lojas/lojaB'), { nome: 'Loja B' })
    await setDoc(doc(db, 'agendaPublica/lojaA'), { ativo: true, nomeLoja: 'Loja A' })
    await setDoc(doc(db, `agendaPublica/lojaA/dias/${DIA}`), { dia: DIA, vagas: [1, 2, 3] })

    const base = {
      lojaId: 'lojaA', nomeLoja: 'Loja A', dia: DIA, vaga: 1,
      nomeTutor: 'Maria', telefone: '11999998888', nomePet: 'Rex',
      especie: 'cao', porte: 'medio', servico: 'banho',
      transporte: 'busca_entrega',
      endereco: { rua: 'Rua A', numero: '10', bairro: 'Centro', cidade: 'SP' },
      localizacao: { lat: -23.5, lng: -46.6 },
      expiraEm: Date.now() + 86400000,
    }
    await setDoc(doc(db, 'agendamentos/pedidoChegou'), { ...base, status: 'chegou' })
    await setDoc(doc(db, 'agendamentos/pedidoPendente'), { ...base, status: 'pendente' })
    await setDoc(doc(db, 'agendamentos/pedidoConfirmado'), { ...base, status: 'confirmado' })
    await setDoc(doc(db, 'agendamentos/pedidoBuscando'), { ...base, status: 'buscando' })

    await setDoc(doc(db, `lojas/lojaA/dias/${DIA}/logs/log1`), { nomeTutor: 'Maria', telefone: '11999998888', nomePet: 'Rex' })
    await setDoc(doc(db, `lojas/lojaA/dias/${DIA}/logs/log2`), { nomeTutor: 'Maria', nomePet: 'Rex' })
  })
})

const comoAdminA = () => env.authenticatedContext('adminA').firestore()
const comoEquipeA = () => env.authenticatedContext('equipeA').firestore()
const comoAdminB = () => env.authenticatedContext('adminB').firestore()
const comoTutor = () => env.unauthenticatedContext().firestore()

const limpezaPedido = { nomeTutor: REMOVIDO, telefone: '', endereco: null, localizacao: null }

function pedidoNovo(servico: string, vaga = 2) {
  const db = comoTutor()
  const codigo = `codigo${servico.replace(/[^a-z]/g, '')}${vaga}`.padEnd(24, 'x')
  const lote = writeBatch(db)
  lote.set(doc(db, `agendaPublica/lojaA/dias/${DIA}/marcadas/${vaga}`), { criadoEm: serverTimestamp() })
  lote.set(doc(db, `agendamentos/${codigo}`), {
    lojaId: 'lojaA', nomeLoja: 'Loja A', dia: DIA, vaga, status: 'pendente',
    nomeTutor: 'João', telefone: '11988887777', nomePet: 'Bolt',
    especie: 'cao', porte: 'pequeno', servico, raca: '', obs: '',
    criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp(),
    expiraEm: Date.now() + 5 * 86400000,
  })
  return lote.commit()
}

describe('agendamento online: serviços do pedido novo', () => {
  it('aceita pedido novo com Banho', async () => {
    await assertSucceeds(pedidoNovo('banho'))
  })

  it('aceita pedido novo com Tosa', async () => {
    await assertSucceeds(pedidoNovo('tosa', 3))
  })

  it('recusa pedido novo com Banho + Tosa (banho_tosa)', async () => {
    await assertFails(pedidoNovo('banho_tosa'))
  })
})

describe('agendamento online: limpeza LGPD', () => {
  it('admin da loja apaga nome, telefone, endereço e localização de pedido encerrado', async () => {
    await assertSucceeds(updateDoc(doc(comoAdminA(), 'agendamentos/pedidoChegou'), limpezaPedido))
  })

  it('admin não limpa pedido em andamento (pendente, confirmado, saiu para buscar)', async () => {
    for (const id of ['pedidoPendente', 'pedidoConfirmado', 'pedidoBuscando']) {
      await assertFails(updateDoc(doc(comoAdminA(), `agendamentos/${id}`), limpezaPedido))
    }
  })

  it('admin não pode deixar o telefone, nem mudar outro campo junto', async () => {
    const db = comoAdminA()
    await assertFails(updateDoc(doc(db, 'agendamentos/pedidoChegou'), { ...limpezaPedido, telefone: '11999998888' }))
    await assertFails(updateDoc(doc(db, 'agendamentos/pedidoChegou'), { ...limpezaPedido, nomeTutor: 'Outro' }))
    await assertFails(updateDoc(doc(db, 'agendamentos/pedidoChegou'), { ...limpezaPedido, nomePet: 'X' }))
  })

  it('funcionário que não é admin não faz a limpeza', async () => {
    await assertFails(updateDoc(doc(comoEquipeA(), 'agendamentos/pedidoChegou'), limpezaPedido))
  })

  it('admin de outra loja não mexe nos pedidos da loja A', async () => {
    await assertFails(updateDoc(doc(comoAdminB(), 'agendamentos/pedidoChegou'), limpezaPedido))
    await assertFails(deleteDoc(doc(comoAdminB(), 'agendamentos/pedidoChegou')))
  })

  it('tutor sem login não apaga dados nem o pedido', async () => {
    await assertFails(updateDoc(doc(comoTutor(), 'agendamentos/pedidoChegou'), limpezaPedido))
    await assertFails(updateDoc(doc(comoTutor(), 'agendamentos/pedidoPendente'), limpezaPedido))
    await assertFails(deleteDoc(doc(comoTutor(), 'agendamentos/pedidoChegou')))
  })
})

describe('histórico do dia (logs): limpeza LGPD', () => {
  const log1 = `lojas/lojaA/dias/${DIA}/logs/log1`
  const log2 = `lojas/lojaA/dias/${DIA}/logs/log2`

  it('admin da loja troca o nome e apaga o telefone', async () => {
    await assertSucceeds(updateDoc(doc(comoAdminA(), log1), { nomeTutor: REMOVIDO, telefone: '' }))
  })

  it('admin troca só o nome em registro sem telefone', async () => {
    await assertSucceeds(updateDoc(doc(comoAdminA(), log2), { nomeTutor: REMOVIDO }))
  })

  it('admin não pode manter o telefone nem mudar outro campo', async () => {
    await assertFails(updateDoc(doc(comoAdminA(), log1), { nomeTutor: REMOVIDO, telefone: '11000000000' }))
    await assertFails(updateDoc(doc(comoAdminA(), log1), { nomeTutor: REMOVIDO, nomePet: 'X' }))
  })

  it('funcionário, admin de outra loja e tutor sem login não fazem a limpeza', async () => {
    await assertFails(updateDoc(doc(comoEquipeA(), log1), { nomeTutor: REMOVIDO, telefone: '' }))
    await assertFails(updateDoc(doc(comoAdminB(), log1), { nomeTutor: REMOVIDO, telefone: '' }))
    await assertFails(updateDoc(doc(comoTutor(), log1), { nomeTutor: REMOVIDO, telefone: '' }))
  })
})
