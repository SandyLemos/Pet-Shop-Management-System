import { Badge } from './ui/badge';
import { Droplet, Wind, Scissors, Plus, Calendar } from "lucide-react";
import type { Pet, SlotStatus } from '../types/pet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { PetRegistration } from './PetRegistration';
import { PetDetailModal } from './PetDetailModal';
import { useSlotsUsadosHoje } from '../../hooks/useSlotsUsadosHoje';
import { useRef, useState } from 'react';
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
}: KanbanColumnProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // ✅ guarda só o ID → o modal sempre reflete os dados vivos do Firestore
  const [detailPetId, setDetailPetId] = useState<string | null>(null)
  const detailPet = detailPetId
    ? allPets.find((p) => p.id === detailPetId) ?? null
    : null

  const columnPets = pets.filter((p) => p.status === status)

  const getNextAvailableSlot = () => {
    const occupiedSlots = allPets.map((p) => p.slotNumber)
    for (let i = 1; i <= 100; i++) {
      if (!occupiedSlots.includes(i) && !slotsUsados.has(i)) return i
    }
    return 0
  }

  const proximoSlot = getNextAvailableSlot()

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
    <div className="shrink-0 w-[280px] xl:w-auto xl:flex-1 xl:min-w-0 flex flex-col min-h-0 transition-colors rounded-lg">
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
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <button
              onClick={() => setIsDialogOpen(true)}
              className="w-full mt-3 border-dashed border-2 border-yellow-500 hover:bg-yellow-50 text-yellow-700 hover:text-yellow-800 hover:border-yellow-600 rounded-md py-2 flex items-center justify-center gap-2 text-sm font-medium transition-colors"
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
        onClose={() => setDetailPetId(null)}
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

  return (
    <div className="flex w-full min-w-0 gap-6 flow-area md:h-[calc(100dvh-300px)] md:overflow-hidden xl:h-auto xl:overflow-visible">
      <div className="flex-1 min-w-0 w-full flex flex-col min-h-0">
        <h2 className="shrink-0 text-lg font-semibold mb-4 text-gray-800">
          Fluxo de Trabalho
        </h2>

        <div className="flex-1 min-h-0 w-full min-w-0 overflow-x-auto overflow-y-hidden touch-pan-x [-webkit-overflow-scrolling:touch]">
          <div className="flex flex-nowrap gap-4 pb-4 h-full w-max xl:w-full">
            <KanbanColumn
              status="espera"
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
              color="bg-amber-400"
              onAddPet={onAddPet}
              allPets={pets}
              slotsUsados={usados}
            />
            <KanbanColumn
              status="banho"
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
              color="bg-sky-400"
              allPets={pets}
              slotsUsados={usados}
            />
            <KanbanColumn
              status="escovar"
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
              color="bg-sky-400"
              allPets={pets}
              slotsUsados={usados}
            />
            <KanbanColumn
              status="tosa"
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
              color="bg-sky-400"
              allPets={pets}
              slotsUsados={usados}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
