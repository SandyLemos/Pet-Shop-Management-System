import { Badge } from './ui/badge';
import { Droplet, Wind, Scissors, Plus, Calendar } from "lucide-react";
import type { Pet, SlotStatus } from '../types/pet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { PetRegistration } from './PetRegistration';
import { PetDetailModal } from './PetDetailModal';
import { useSlotsUsadosHoje } from '../../hooks/useSlotsUsadosHoje';
import { useContext, useEffect, useRef, useState } from 'react';
import { informarJanela, JanelaRemota } from '../../lib/espelho';
import { PetCard } from './PetCard';

interface KanbanBoardProps {
  pets: Pet[]
  onRevertService: (id: string, etapa: string, motivo: string) => void
  onUpdateStatus: (petId: string, newStatus: SlotStatus) => void
  onCheckout: (petId: string, tipo?: 'entregue' | 'avisado') => void
  onAddPet: (pet: Omit<Pet, "id" | "checkInTime">) => void | Promise<boolean>
  onEditPet: (petId: string, updatedData: Partial<Pet>) => void
  onDeletePet: (petId: string) => void
  onAssignProfessional: (
    petId: string,
    profissionalBanho?: string,
    profissionalTosa?: string,
    profissionalEscovar?: string,
  ) => void
  onMarkServiceComplete: (
    petId: string,
    serviceType: "banho" | "escovar" | "tosa",
  ) => void
  onAdvanceStage: (
    petId: string,
    newStatus: SlotStatus,
    profissionais: { pB?: string; pT?: string; pE?: string },
    problemasField?: { campo: string; delta: string[] },
  ) => void
}

// ── Colunas e Kanban ──
interface KanbanColumnProps {
  status: SlotStatus
  title: string
  icon: React.ReactNode
  pets: Pet[]
  onRevertService: (id: string, etapa: string, motivo: string) => void
  onUpdateStatus: (petId: string, newStatus: SlotStatus) => void
  onCheckout: (petId: string, tipo?: 'entregue' | 'avisado') => void
  onEditPet: (petId: string, updatedData: Partial<Pet>) => void
  onDeletePet: (petId: string) => void
  onAssignProfessional: (
    petId: string,
    profissionalBanho?: string,
    profissionalTosa?: string,
    profissionalEscovar?: string,
  ) => void
  onMarkServiceComplete: (petId: string, serviceType: "banho" | "escovar" | "tosa") => void
  onAdvanceStage: (
    petId: string,
    newStatus: SlotStatus,
    profissionais: { pB?: string; pT?: string; pE?: string },
    problemasField?: { campo: string; delta: string[] },
  ) => void
  color: string
  onAddPet?: (pet: Omit<Pet, "id" | "checkInTime">) => void | Promise<boolean>
  allPets?: Pet[]
  /** ✅ slots já queimados hoje (recebido do KanbanBoard) */
  slotsUsados: Set<number>
  /** celular: só a etapa escolhida no seletor aparece */
  ocultaNoCelular?: boolean
}

function KanbanColumn({
  status,
  title,
  icon,
  pets = [],
  onUpdateStatus,
  onRevertService,
  onCheckout,
  onEditPet,
  onDeletePet,
  onAssignProfessional,
  onMarkServiceComplete,
  onAdvanceStage,
  color,
  onAddPet,
  allPets = [],
  slotsUsados,
  ocultaNoCelular = false,
}: KanbanColumnProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // ✅ guarda só o ID → o modal sempre reflete os dados vivos do Firestore
  const [detailPetId, setDetailPetId] = useState<string | null>(null)
  const detailPet = detailPetId
    ? allPets.find((p) => p.id === detailPetId) ?? null
    : null

  const columnPets = pets.filter((p) => p.status === status)

  // ✅ Suporte ao vivo (igual à Grade): conta a janela aberta ou segue a do aparelho acompanhado
  const remoto = useContext(JanelaRemota)
  const primeira = useRef(true)
  useEffect(() => {
    if (remoto) return
    if (primeira.current) { primeira.current = false; return } // abrir a aba não fecha janela de outra coluna
    informarJanela(
      isDialogOpen ? { tipo: 'cadastro', vaga: proximoSlotRef.current }
        : detailPetId ? { tipo: 'detalhe', petId: detailPetId }
        : null,
    )
  }, [remoto, isDialogOpen, detailPetId]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!remoto) return
    const j = remoto.janela
    setIsDialogOpen(j?.tipo === 'cadastro' && status === 'espera')
    setDetailPetId(j?.tipo === 'detalhe' && columnPets.some((p) => p.id === j.petId) ? j.petId : null)
  }, [remoto, remoto?.janela, pets]) // eslint-disable-line react-hooks/exhaustive-deps

  const getNextAvailableSlot = () => {
    const occupiedSlots = allPets.map((p) => p.slotNumber)
    for (let i = 1; i <= 100; i++) {
      if (!occupiedSlots.includes(i) && !slotsUsados.has(i)) return i
    }
    return 0
  }

  const proximoSlot = getNextAvailableSlot()
  const proximoSlotRef = useRef(proximoSlot)
  proximoSlotRef.current = proximoSlot

  // ✅ evita cadastro duplo por toque repetido enquanto salva
  const salvandoRef = useRef(false)

  const handleAddFromColumn = async (petData: any) => {
    if (!onAddPet || salvandoRef.current) return
    salvandoRef.current = true
    try {
      const finalSlot = Number(petData.slotNumber) || proximoSlot
      const ok = await onAddPet({
        ...petData,
        slotNumber: finalSlot,
        status: "espera" as SlotStatus,
      } as Omit<Pet, "id" | "checkInTime">)
      // ✅ só fecha se cadastrou; se a vaga foi tomada, mantém o formulário preenchido
      if (ok !== false) setIsDialogOpen(false)
    } finally {
      salvandoRef.current = false
    }
  }

  return (
    <div className={`${ocultaNoCelular ? 'hidden sm:flex' : 'flex'} shrink-0 w-full sm:w-[280px] xl:w-auto xl:flex-1 xl:min-w-0 flex-col min-h-0 transition-colors rounded-lg`}>
      <div className={`${color} p-4 rounded-t-lg shrink-0`}>
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="font-semibold">{title}</h3>
          </div>
          <Badge variant="secondary" className="bg-white/20 text-white">
            {columnPets.length}
          </Badge>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y p-4 bg-gray-50 rounded-b-lg">
        {columnPets.map((pet) => (
          <PetCard
            key={pet.id}
            pet={pet}
            onOpenDetail={(p) => setDetailPetId(p.id)}
            onRevertService={onRevertService}
            onUpdateStatus={onUpdateStatus}
            onCheckout={onCheckout}
            onEditPet={onEditPet}
            onDeletePet={onDeletePet}
            onAssignProfessional={onAssignProfessional}
            onMarkServiceComplete={onMarkServiceComplete}
            onAdvanceStage={onAdvanceStage}
            allPets={allPets}
          />
        ))}
        {columnPets.length === 0 && !onAddPet && (
          <div className="text-center text-gray-400 mt-8">
            <p className="text-sm">Nenhum pet nesta etapa</p>
          </div>
        )}
        {status === "espera" && onAddPet && proximoSlot > 0 && (
          <Dialog open={isDialogOpen} onOpenChange={(v) => { if (!remoto) setIsDialogOpen(v) }}>
            <button
              onClick={() => setIsDialogOpen(true)}
              className="w-full mt-3 border-dashed border-2 border-[#F7931E] hover:bg-orange-50 text-[#B8650A] hover:text-[#8F4E07] rounded-md py-2 flex items-center justify-center gap-2 text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Adicionar Animal
            </button>
            <DialogContent className="sm:max-w-2xl h-[85vh]">
              <DialogHeader>
                <DialogTitle>Adicionar Animal - Slot {proximoSlot}</DialogTitle>
                <DialogDescription className="sr-only">
                  Formulário para cadastrar um novo pet no sistema.
                </DialogDescription>
              </DialogHeader>
              <PetRegistration
                onSubmit={handleAddFromColumn}
                defaultSlot={proximoSlot}
                allPets={allPets}
                showSlotSelector={true}
                slotsUsados={slotsUsados}
              />
            </DialogContent>
          </Dialog>
        )}
        {status === "espera" && onAddPet && proximoSlot === 0 && (
          <p className="mt-3 text-center text-xs text-slate-400 italic">
            Todos os slots do dia já foram utilizados.
          </p>
        )}
      </div>

      <PetDetailModal
        pet={detailPet}
        open={!!detailPet}
        onClose={() => { if (!remoto) setDetailPetId(null) }}
        onEdit={onEditPet}
        onDelete={(id) => { onDeletePet(id); setDetailPetId(null) }}
        onCheckout={(id, tipo) => {
          onCheckout(id, tipo)
          if (tipo === 'entregue') setDetailPetId(null)
        }}
      />
    </div>
  )
}

// ── Kanban completo (export) ──
export function KanbanBoard({
  pets = [],
  onUpdateStatus,
  onRevertService,
  onCheckout,
  onAddPet,
  onEditPet,
  onDeletePet,
  onAssignProfessional,
  onMarkServiceComplete,
  onAdvanceStage,
}: KanbanBoardProps) {
  // ✅ um único listener para todas as colunas
  const { usados } = useSlotsUsadosHoje()

  // celular: uma etapa por vez, escolhida no seletor do topo
  const [etapaCelular, setEtapaCelular] = useState<SlotStatus>('espera')
  const etapas: { status: SlotStatus; titulo: string; icone: React.ReactNode; cor: string }[] = [
    { status: 'espera',  titulo: 'Aguardando', icone: <Calendar className="w-4 h-4" />, cor: '#F7931E' },
    { status: 'banho',   titulo: 'Banho',      icone: <Droplet className="w-4 h-4" />,  cor: '#0B5A70' },
    { status: 'escovar', titulo: 'Escovar',    icone: <Wind className="w-4 h-4" />,     cor: '#0B5A70' },
    { status: 'tosa',    titulo: 'Tosa',       icone: <Scissors className="w-4 h-4" />, cor: '#0B5A70' },
  ]

  return (
    <div className="flex w-full min-w-0 gap-6 flow-area md:h-[calc(100dvh-300px)] md:overflow-hidden xl:h-auto xl:overflow-visible">
      <div className="flex-1 min-w-0 w-full flex flex-col min-h-0">
        <h2 className="shrink-0 text-lg font-semibold mb-3 sm:mb-4 text-gray-800">
          Fluxo de Trabalho
        </h2>

        {/* celular: seletor de etapas (no tablet e no computador as colunas ficam lado a lado) */}
        <div role="tablist" aria-label="Etapas" className="sm:hidden sticky top-0 z-20 grid grid-cols-4 gap-1.5 mb-3 p-1.5 bg-white rounded-xl shadow-sm border border-slate-100">
          {etapas.map((e) => {
            const ativa = etapaCelular === e.status
            return (
              <button
                key={e.status}
                type="button"
                role="tab"
                aria-selected={ativa}
                data-etapa={e.status}
                aria-label={`${e.titulo} (${pets.filter((p) => p.status === e.status).length})`}
                onClick={() => setEtapaCelular(e.status)}
                className="min-w-0 flex flex-col items-center gap-0.5 rounded-lg py-2 px-1 text-[11px] leading-tight font-semibold transition-colors"
                style={ativa ? { background: e.cor, color: '#fff' } : { color: e.cor }}
              >
                <span aria-hidden="true" className="flex items-center gap-1">
                  {e.icone}
                  <span
                    className="min-w-[1.25rem] rounded-full px-1.5 text-[11px] leading-5"
                    style={ativa ? { background: 'rgba(255,255,255,0.25)' } : { background: `${e.cor}1A` }}
                  >
                    {pets.filter((p) => p.status === e.status).length}
                  </span>
                </span>
                {/* nome pelo CSS: o texto da coluna continua único na página */}
                <span aria-hidden="true" data-titulo={e.titulo} className="w-full truncate text-center before:content-[attr(data-titulo)]" />
              </button>
            )
          })}
        </div>

        <div className="flex-1 min-h-0 w-full min-w-0 sm:overflow-x-auto sm:overflow-y-hidden sm:touch-pan-x [-webkit-overflow-scrolling:touch]">
          <div className="flex flex-nowrap gap-4 pb-4 h-full w-full sm:w-max xl:w-full">
            <KanbanColumn
              status="espera"
              ocultaNoCelular={etapaCelular !== 'espera'}
              title="Aguardando"
              onRevertService={onRevertService}
              icon={<Calendar className="w-5 h-5" />}
              pets={pets}
              onUpdateStatus={onUpdateStatus}
              onCheckout={onCheckout}
              onEditPet={onEditPet}
              onDeletePet={onDeletePet}
              onAssignProfessional={onAssignProfessional}
              onMarkServiceComplete={onMarkServiceComplete}
              onAdvanceStage={onAdvanceStage}
              color="bg-[#F7931E]"
              onAddPet={onAddPet}
              allPets={pets}
              slotsUsados={usados}
            />
            <KanbanColumn
              status="banho"
              ocultaNoCelular={etapaCelular !== 'banho'}
              title="Banho"
              onRevertService={onRevertService}
              icon={<Droplet className="w-5 h-5" />}
              pets={pets}
              onUpdateStatus={onUpdateStatus}
              onCheckout={onCheckout}
              onEditPet={onEditPet}
              onDeletePet={onDeletePet}
              onAssignProfessional={onAssignProfessional}
              onMarkServiceComplete={onMarkServiceComplete}
              onAdvanceStage={onAdvanceStage}
              color="bg-[#0B5A70]"
              allPets={pets}
              slotsUsados={usados}
            />
            <KanbanColumn
              status="escovar"
              ocultaNoCelular={etapaCelular !== 'escovar'}
              title="Escovar"
              onRevertService={onRevertService}
              icon={<Wind className="w-5 h-5" />}
              pets={pets}
              onUpdateStatus={onUpdateStatus}
              onCheckout={onCheckout}
              onEditPet={onEditPet}
              onDeletePet={onDeletePet}
              onAssignProfessional={onAssignProfessional}
              onMarkServiceComplete={onMarkServiceComplete}
              onAdvanceStage={onAdvanceStage}
              color="bg-[#0B5A70]"
              allPets={pets}
              slotsUsados={usados}
            />
            <KanbanColumn
              status="tosa"
              ocultaNoCelular={etapaCelular !== 'tosa'}
              title="Tosa"
              onRevertService={onRevertService}
              icon={<Scissors className="w-5 h-5" />}
              pets={pets}
              onUpdateStatus={onUpdateStatus}
              onCheckout={onCheckout}
              onEditPet={onEditPet}
              onDeletePet={onDeletePet}
              onAssignProfessional={onAssignProfessional}
              onMarkServiceComplete={onMarkServiceComplete}
              onAdvanceStage={onAdvanceStage}
              color="bg-[#0B5A70]"
              allPets={pets}
              slotsUsados={usados}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
