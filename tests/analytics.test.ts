import { describe, it, expect } from 'vitest';
import { intervalos, resumo, porDia, porHora, porServico, porProfissional, perfil, clientes, variacao, formatarMinutos, diasEntre } from '../src/utils/analytics';

const HOJE = '2026-10-06';
const log = (dia: string, extra: any = {}): any => ({
  dia, id: Math.random().toString(), tipo: 'entregue', petNumber: 'PET-1', nomePet: 'Rex', nomeTutor: 'Ana', servico: 'banho',
  especie: 'cao', porte: 'pequeno', raca: 'SRD', checkInTime: `${dia}T12:30:00.000Z`, duracaoMinutos: 90,
  profissionalBanho: 'Camila', profissionalEscovar: 'Rafael', profissionalTosa: null, ...extra,
});

describe('Análises: períodos', () => {
  it('30 dias compara com os 30 anteriores; 90 dias não compara', () => {
    expect(intervalos('30d', HOJE)).toEqual({ inicio: '2026-09-07', fim: HOJE, anterior: { inicio: '2026-08-08', fim: '2026-09-06' } });
    expect(intervalos('7d', HOJE).inicio).toBe('2026-09-30');
    expect(intervalos('mes', HOJE).inicio).toBe('2026-10-01');
    expect(intervalos('90d', HOJE).anterior).toBeNull();
    expect(diasEntre('2026-02-27', '2026-03-02')).toEqual(['2026-02-27', '2026-02-28', '2026-03-01', '2026-03-02']);
  });
});

describe('Análises: cálculos', () => {
  const logs = [
    log('2026-10-05'), log('2026-10-05', { petNumber: 'PET-2', nomePet: 'Mel', servico: 'tosa', profissionalTosa: 'Diego', porte: 'grande', duracaoMinutos: 150, especie: 'gato', raca: 'Persa' }),
    log('2026-10-06', { tipo: 'removido' }), log('2026-10-06', { tipo: 'avisado' }), log('2026-08-01'),
  ];
  const fichas = [{ petNumber: 'PET-2', nomePet: 'Mel', nomeTutor: 'Ana', criadoEm: '2026-10-05T15:00:00.000Z' }];

  it('resumo conta só entregues, tempo médio, novos, retorno e removidos', () => {
    expect(resumo(logs, fichas, '2026-09-07', HOJE)).toEqual({ atendimentos: 2, tempoMedioMin: 120, clientesNovos: 1, clientesRetorno: 1, removidos: 1 });
  });
  it('por dia preenche dias vazios com zero', () => {
    const d = porDia(logs, '2026-10-04', HOJE);
    expect(d.map((x) => x.atendimentos)).toEqual([0, 2, 0]);
    expect(d[1].label).toBe('05/10');
  });
  it('horário de chegada no fuso de São Paulo (12:30 UTC = 9h)', () => {
    const h = porHora(logs, '2026-10-05', '2026-10-05');
    expect(h.find((x) => x.hora === '9h')?.chegadas).toBe(2);
  });
  it('serviços, profissionais e perfil', () => {
    expect(porServico(logs, '2026-10-01', HOJE)).toEqual([{ servico: 'Banho', total: 1 }, { servico: 'Tosa', total: 1 }]);
    const p = porProfissional(logs, '2026-10-01', HOJE);
    expect(p.find((x) => x.nome === 'Camila')).toMatchObject({ banho: 2, total: 2 });
    expect(p.find((x) => x.nome === 'Diego')).toMatchObject({ tosa: 1 });
    const pf = perfil(logs, '2026-10-01', HOJE);
    expect(pf.especie).toEqual([{ nome: 'Cães', total: 1 }, { nome: 'Gatos', total: 1 }]);
    expect(pf.porte).toEqual([{ nome: 'Pequeno', total: 1 }, { nome: 'Médio', total: 0 }, { nome: 'Grande', total: 1 }]);
  });
  it('clientes fiéis e sumidos', () => {
    const c = clientes(logs, [{ petNumber: 'PET-1', nomePet: 'Rex', nomeTutor: 'Ana', telefone: '24999991234' }], HOJE);
    expect(c.fieis.map((x) => x.nomePet)).toEqual(['Rex']);
    expect(c.sumidos).toEqual([]);
    const s = clientes([log('2026-08-20')], [{ petNumber: 'PET-1', nomePet: 'Rex', nomeTutor: 'Ana', telefone: '24999991234' }], HOJE);
    expect(s.sumidos[0]).toMatchObject({ nomePet: 'Rex', diasSemVir: 47, telefone: '24999991234' });
  });
  it('variação e formatação', () => {
    expect(variacao(12, 10)).toBe(20); expect(variacao(5, 0)).toBeNull(); expect(variacao(5, null)).toBeNull();
    expect(formatarMinutos(0)).toBe('—'); expect(formatarMinutos(115)).toBe('1h55');
  });
});

import { gerarDicas } from '../src/utils/analytics';
describe('Análises: dicas automáticas', () => {
  const muitos = (dia: string, n: number, extra: any = {}) => Array.from({ length: n }, (_, i) => log(dia, { petNumber: `PET-${dia}-${i}`, ...extra }));
  it('poucos dados: pede período maior', () => {
    const d = gerarDicas([log('2026-10-05')], [], '2026-09-07', HOJE, HOJE, null);
    expect(d).toHaveLength(1); expect(d[0].id).toBe('poucos');
  });
  it('detecta queda de movimento, cliente sumido e serviço lento', () => {
    const logs = [
      ...muitos('2026-09-01', 30),                               // período anterior cheio
      ...muitos('2026-09-20', 10), ...muitos('2026-09-21', 5, { servico: 'tosa', porte: 'grande', duracaoMinutos: 200 }),
      ...muitos('2026-09-22', 5, { servico: 'tosa', porte: 'pequeno', duracaoMinutos: 100 }),
      log('2026-08-15', { petNumber: 'SUMIDO', nomePet: 'Bidu' }),
    ];
    const ids = gerarDicas(logs, [], '2026-09-07', HOJE, HOJE, { inicio: '2026-08-08', fim: '2026-09-06' }).map((d) => d.id);
    expect(ids).toContain('queda');
    expect(ids).toContain('sumidos');
    expect(ids).toContain('lento');
  });
  it('dicas vêm ordenadas por prioridade', () => {
    const logs = [...muitos('2026-09-20', 12), log('2026-08-15', { petNumber: 'X' })];
    const d = gerarDicas(logs, [], '2026-09-07', HOJE, HOJE, null);
    expect(d.map((x) => x.prioridade)).toEqual([...d.map((x) => x.prioridade)].sort((a, b) => b - a));
  });
});
