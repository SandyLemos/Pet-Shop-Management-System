// ✅ Painel do Proprietário: a tela da loja ao vivo, exatamente como a equipe vê, só para olhar.
// Usa as mesmas telas da loja (Grade, Fluxo e Entregues) com todos os toques e teclas bloqueados
// e sem nenhuma ação ligada: daqui nada é gravado no banco.
import React, { useEffect, useState } from 'react';
import { X, Eye, LayoutGrid, LayoutList, PackageCheck, Lock } from 'lucide-react';
import { SlotGrid } from '../SlotGrid';
import { KanbanBoard } from '../KanbanBoard';
import { EntreguesTab } from '../EntreguesTab';
import PawBackground from '../PawBackground';
import type { Pet } from '../../types/pet';
import { subscribeToPets } from '../../../services/petService';
import { definirLoja, lojaAtual } from '../../../lib/lojaAtual';
import { useDiaAtual } from '../../../hooks/useDiaAtual';
import { fundoTopo, coresValidas, CORES_PADRAO } from '../../../utils/cores';
import type { Loja } from '../../../utils/dono';

type Aba = 'grid' | 'kanban' | 'entregues';
const ABAS: { id: Aba; nome: string; icone: React.ElementType }[] = [
  { id: 'grid', nome: 'Grade', icone: LayoutGrid },
  { id: 'kanban', nome: 'Fluxo', icone: LayoutList },
  { id: 'entregues', nome: 'Entregues', icone: PackageCheck },
];

const nada = () => {};
const nadaAsync = async () => false;

/** Trava a tela: nenhum toque, clique ou tecla chega nos botões da loja (rolar continua funcionando) */
const bloquear = (e: React.SyntheticEvent) => { e.preventDefault(); e.stopPropagation(); };
const parar = (e: React.SyntheticEvent) => { e.stopPropagation(); };
export const TRAVAS = {
  onClickCapture: bloquear, onDoubleClickCapture: bloquear, onMouseDownCapture: bloquear, onMouseUpCapture: bloquear,
  onPointerDownCapture: parar, onPointerUpCapture: parar, onTouchStartCapture: parar, onTouchEndCapture: parar,
  onKeyDownCapture: bloquear, onKeyUpCapture: bloquear, onChangeCapture: bloquear, onInputCapture: bloquear,
  onSubmitCapture: bloquear, onDragStartCapture: bloquear, onDropCapture: bloquear, onContextMenuCapture: bloquear,
};

/** A tela em si (separada para a prévia e os testes passarem os pets prontos) */
export function TelaDaLoja({ loja, pets, fechar }: { loja: Loja; pets: Pet[]; fechar: () => void }) {
  const [aba, setAba] = useState<Aba>('grid');
  const cores = coresValidas(loja.cores) ?? CORES_PADRAO;

  return (
    <div className="fixed inset-0 z-[96] flex flex-col bg-pet-pattern">
      <PawBackground quantidade={25} imgSrc="/paw.png" espacamento={1.2} />

      <div className="relative z-10 shrink-0 shadow-md" style={{ background: fundoTopo(cores) }}>
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="bg-white rounded-xl px-4 py-2 shadow-md">
            <img src={loja.logoUrl || '/logo-pata-gestao.png'} alt={loja.nome} className="h-10 w-auto object-contain" />
          </div>
          <h1 className="text-white text-xl sm:text-2xl font-bold tracking-wide text-center truncate">{loja.nome}</h1>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 bg-white/15 text-white text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap">
              <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" /><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" /></span>
              AO VIVO
            </span>
            <button onClick={fechar} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white/90 hover:bg-white/10" aria-label="Fechar">
              <X size={18} /> Fechar
            </button>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <div className="inline-flex bg-slate-100 rounded-lg p-1">
              {ABAS.map((a) => (
                <button key={a.id} onClick={() => setAba(a.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium ${aba === a.id ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600'}`}>
                  <a.icone size={18} /> {a.nome}
                </button>
              ))}
            </div>
            <span className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Eye size={15} /> Só para ver: a tela é a mesma da loja, mas nada pode ser alterado daqui <Lock size={13} />
            </span>
          </div>

          {/* tudo daqui para baixo é a tela da loja, travada */}
          <div {...TRAVAS} className="select-none" data-testid="tela-travada">
            {aba === 'grid' && (
              <SlotGrid pets={pets} onAddPet={nadaAsync} onEditPet={nada} onDeletePet={nada} onCheckout={nada} filter="all" />
            )}
            {aba === 'kanban' && (
              <KanbanBoard pets={pets} onUpdateStatus={nada} onRevertService={nada} onCheckout={nada} onAddPet={nadaAsync}
                onEditPet={nada} onDeletePet={nada} onAssignProfessional={nada} onMarkServiceComplete={nada as any} onAdvanceStage={nada as any} />
            )}
            {aba === 'entregues' && <EntreguesTab />}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Abre a loja ao vivo. Enquanto está aberta, o sistema "olha" para os dados desta loja
 * (o proprietário pode ler tudo de todas as lojas); ao fechar, volta para o painel.
 */
export function LojaAoVivo({ loja, fechar }: { loja: Loja; fechar: () => void }) {
  const dia = useDiaAtual();
  const [pronta, setPronta] = useState(false);
  const [pets, setPets] = useState<Pet[]>([]);

  useEffect(() => {
    definirLoja({ id: loja.id, nome: loja.nome, logoUrl: loja.logoUrl, cores: loja.cores, plano: loja.plano, status: loja.status });
    setPronta(true);
    return () => { if (lojaAtual()?.id === loja.id) definirLoja(null); };
  }, [loja.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!pronta) return;
    return subscribeToPets(setPets, (e) => console.error('[loja ao vivo]', e), dia);
  }, [pronta, dia]);

  if (!pronta) return null;
  return <TelaDaLoja loja={loja} pets={pets} fechar={fechar} />;
}
