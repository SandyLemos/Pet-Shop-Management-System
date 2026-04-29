import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import {
  Dog, Clock, Droplet, Wind, Scissors,
  CheckCircle2, ChevronDown, Minus, MinusCircle, PhoneCall,
} from 'lucide-react';
import { PetRegistration } from './PetRegistration';
import { Button } from './ui/button';
import { PetDetailModal } from './PetDetailModal';
import type { Pet, SlotStatus } from '../types/pet';

interface SlotGridProps {
  pets: Pet[];
  onAddPet: (pet: Omit<Pet, 'id' | 'checkInTime'>) => void;
  onEditPet: (petId: string, updatedData: Partial<Pet>) => void;
  onDeletePet: (petId: string) => void;
  onCheckout: (petId: string, tipo: 'entregue' | 'avisado') => void;
  filter: 'all' | 'banho' | 'tosa' | 'banho_tosa' | 'higienica' | 'ozonio' | 'hidratacao';
}

export function SlotGrid({ pets, onAddPet, onEditPet, onDeletePet, onCheckout, filter }: SlotGridProps) {
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [visibleSlots, setVisibleSlots] = useState(10);

  // ── estados do modal de detalhes ──
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const totalSlots      = 100;
  const SLOTS_PER_BATCH = 10;
  const MIN_VISIBLE_SLOTS = 10;

  const occupiedSlotsInVisibleRange = useMemo(() => {
    return pets.filter(p => p.slotNumber <= visibleSlots).length;
  }, [pets, visibleSlots]);

  const freeSlotsInVisibleRange = visibleSlots - occupiedSlotsInVisibleRange;

  useEffect(() => {
    if (freeSlotsInVisibleRange === 0 && visibleSlots < totalSlots) {
      setVisibleSlots(prev => Math.min(prev + SLOTS_PER_BATCH, totalSlots));
    }
  }, [freeSlotsInVisibleRange, visibleSlots, totalSlots]);

  // ── helpers de slot ──────────────────────────────────────────────────────────

  const getSlotStatus = (slotNumber: number): { status: SlotStatus; pet?: Pet } => {
    const pet = pets.find(p => p.slotNumber === slotNumber);
    if (!pet) return { status: 'livre' };
    return { status: pet.status, pet };
  };

  // ── NOVO: cor separada para slot "avisado" ───────────────────────────────────
  const getStatusColor = (status: SlotStatus, avisado?: boolean) => {
    // Finalizado + avisado → azul (aguardando retirada)
    if (status === 'finalizado' && avisado) {
      return 'bg-blue-100 hover:bg-blue-200 border-blue-400 text-blue-700';
    }
    switch (status) {
      case 'livre':
        return 'bg-emerald-100 hover:bg-emerald-200 border-emerald-300 text-emerald-700';
      case 'espera':
        return 'bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-700';
      case 'banho':
      case 'escovar':
      case 'tosa':
        return 'bg-sky-100 hover:bg-sky-200 border-sky-300 text-sky-700';
      case 'finalizado':
        return 'bg-purple-100 hover:bg-purple-200 border-purple-300 text-purple-700';
    }
  };

  // ── NOVO: ícone separado para slot "avisado" ─────────────────────────────────
  const getStatusIcon = (status: SlotStatus, avisado?: boolean) => {
    if (status === 'finalizado' && avisado) {
      return <PhoneCall className="w-4 h-4" />;
    }
    switch (status) {
      case 'livre':
        return <Dog className="w-4 h-4" />;
      case 'espera':
        return <Clock className="w-4 h-4" />;
      case 'banho':
        return <Droplet className="w-4 h-4" />;
      case 'escovar':
        return <Wind className="w-4 h-4" />;
      case 'tosa':
        return <Scissors className="w-4 h-4" />;
      case 'finalizado':
        return <CheckCircle2 className="w-4 h-4" />;
    }
  };

  // ── handlers ─────────────────────────────────────────────────────────────────

  const handleSlotClick = (slotNumber: number) => {
    const { status, pet } = getSlotStatus(slotNumber);
    if (status === 'livre') {
      setSelectedSlot(slotNumber);
      setIsDialogOpen(true);
    } else if (pet) {
      setSelectedPet(pet);
      setIsDetailOpen(true);
    }
  };

  const handleRegister = (petData: Omit<Pet, 'id' | 'checkInTime' | 'slotNumber' | 'status'>) => {
    if (selectedSlot !== null) {
      onAddPet({
        ...petData,
        slotNumber: selectedSlot,
        status: 'espera',
      });
      setIsDialogOpen(false);
      setSelectedSlot(null);
    }
  };

  const handleExpandSlots = () => {
    setVisibleSlots(prev => Math.min(prev + SLOTS_PER_BATCH, totalSlots));
  };

  const handleRemoveOneSlot = () => {
    setVisibleSlots(prev => {
      const newValue          = prev - 1;
      const lastSlotOccupied  = pets.some(p => p.slotNumber === prev);
      if (newValue < MIN_VISIBLE_SLOTS || lastSlotOccupied) return prev;
      return newValue;
    });
  };

  const handleRemoveBatchSlots = () => {
    setVisibleSlots(prev => {
      const newValue = prev - SLOTS_PER_BATCH;
      if (newValue < MIN_VISIBLE_SLOTS) return prev;
      const slotsToRemove = Array.from({ length: SLOTS_PER_BATCH }, (_, i) => prev - i);
      const hasOccupied   = slotsToRemove.some(n => pets.some(p => p.slotNumber === n));
      if (hasOccupied) return prev;
      return newValue;
    });
  };

  const canRemoveSlots = visibleSlots > MIN_VISIBLE_SLOTS &&
    !pets.some(p => p.slotNumber === visibleSlots);

  const canRemoveBatch = useMemo(() => {
    if (visibleSlots - SLOTS_PER_BATCH < MIN_VISIBLE_SLOTS) return false;
    const slotsToRemove = Array.from({ length: SLOTS_PER_BATCH }, (_, i) => visibleSlots - i);
    return !slotsToRemove.some(n => pets.some(p => p.slotNumber === n));
  }, [visibleSlots, pets]);

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <div>

      {/* ── Indicador de slots visíveis ── */}
      <div className="px-4 pt-4 pb-2">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500 text-white px-3 py-1 rounded-md font-bold text-sm">
                {visibleSlots}/{totalSlots}
              </div>
              <div className="text-sm text-blue-800">
                <span className="font-semibold">{freeSlotsInVisibleRange}</span> slots livres visíveis
              </div>
            </div>
          </div>

          {/* Controles */}
          <div className="flex items-center gap-2">

            {/* Remoção */}
            <div className="flex items-center gap-1 mr-2">
              <span className="text-xs text-slate-600 font-medium mr-2">Remover:</span>
              <Button
                onClick={handleRemoveOneSlot}
                disabled={!canRemoveSlots}
                variant="outline"
                size="sm"
                className="h-8 px-2 gap-1 border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
                title={
                  !canRemoveSlots
                    ? visibleSlots === MIN_VISIBLE_SLOTS
                      ? `Mínimo de ${MIN_VISIBLE_SLOTS} slots necessário`
                      : 'Último slot está ocupado'
                    : 'Remover 1 slot'
                }
              >
                <Minus className="w-3 h-3" />
                <span className="text-xs font-semibold">1</span>
              </Button>
              <Button
                onClick={handleRemoveBatchSlots}
                disabled={!canRemoveBatch}
                variant="outline"
                size="sm"
                className="h-8 px-2 gap-1 border-red-400 text-red-700 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
                title={
                  !canRemoveBatch
                    ? visibleSlots - SLOTS_PER_BATCH < MIN_VISIBLE_SLOTS
                      ? `Mínimo de ${MIN_VISIBLE_SLOTS} slots necessário`
                      : 'Alguns dos últimos 10 slots estão ocupados'
                    : 'Remover 10 slots'
                }
              >
                <MinusCircle className="w-3 h-3" />
                <span className="text-xs font-semibold">10</span>
              </Button>
            </div>

            {/* Separador */}
            <div className="h-6 w-px bg-slate-300" />

            {/* Adição */}
            <div className="flex items-center gap-1 ml-2">
              <span className="text-xs text-slate-600 font-medium mr-2">Adicionar:</span>
              {visibleSlots < totalSlots ? (
                <Button
                  onClick={handleExpandSlots}
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 gap-1 border-green-300 text-green-700 hover:bg-green-50"
                  title="Adicionar 10 slots"
                >
                  <ChevronDown className="w-3 h-3" />
                  <span className="text-xs font-semibold">+10</span>
                </Button>
              ) : (
                <div className="text-xs text-slate-500 italic px-2">
                  Limite máximo atingido
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Grade de slots ── */}
      <div className="grid grid-cols-10 gap-2 p-4">
        {Array.from({ length: visibleSlots }, (_, i) => {
          const slotNumber = i + 1;
          const { status, pet } = getSlotStatus(slotNumber);
          const avisado    = !!pet?.avisado;                              // ← NOVO
          const isFiltered = filter !== 'all' && pet && pet.servico !== filter;

          return (
            <Dialog
              key={slotNumber}
              open={isDialogOpen && selectedSlot === slotNumber}
              onOpenChange={(open) => {
                if (!open) {
                  setIsDialogOpen(false);
                  setSelectedSlot(null);
                }
              }}
            >
              <DialogTrigger asChild>
                <button
                  onClick={() => handleSlotClick(slotNumber)}
                  className={`
                    aspect-square rounded-lg border-2 transition-all
                    flex flex-col items-center justify-center gap-1
                    cursor-pointer
                    ${isFiltered ? 'opacity-30' : getStatusColor(status, avisado)}
                    ${status !== 'livre' ? 'hover:ring-2 hover:ring-blue-400 hover:ring-offset-1' : ''}
                  `}
                  title={
                    pet
                      ? `${pet.nomePet} - ${pet.nomeTutor}${avisado ? ' 📞 Tutor avisado' : ''} (clique para detalhes)`
                      : `Slot ${slotNumber} - Livre`
                  }
                >
                  {getStatusIcon(status, avisado)}
                  <span className="text-xs font-semibold">{slotNumber}</span>
                  {pet && (
                    <span className="text-[8px] font-medium truncate w-full px-1 text-center">
                      {pet.nomePet}
                    </span>
                  )}
                </button>
              </DialogTrigger>

              {/* Dialog de cadastro (apenas slots livres) */}
              {status === 'livre' && (
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Cadastrar Pet - Slot {selectedSlot}</DialogTitle>
                  </DialogHeader>
                  <PetRegistration onSubmit={handleRegister} />
                </DialogContent>
              )}
            </Dialog>
          );
        })}
      </div>

      {/* ── Modal de detalhes do pet ── */}
      <PetDetailModal
        pet={selectedPet}
        open={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedPet(null);
        }}
        onEdit={(pet) => {
          setIsDetailOpen(false);
          onEditPet(pet.id, pet);
        }}
        onDelete={(petId) => {
          onDeletePet(petId);
          setIsDetailOpen(false);
          setSelectedPet(null);
        }}
        onCheckout={(petId, tipo) => {
          onCheckout(petId, tipo);
          // ✅ Só fecha o modal se for 'entregue' — 'avisado' mantém o pet na fila
          if (tipo === 'entregue') {
            setIsDetailOpen(false);
            setSelectedPet(null);
          }
        }}
      />

      {/* ── Legenda ── */}
      <div className="flex gap-4 px-4 pb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-emerald-100 border-2 border-emerald-300" />
          <span className="text-sm text-gray-600">Livre</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-amber-100 border-2 border-amber-300" />
          <span className="text-sm text-gray-600">Espera</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-sky-100 border-2 border-sky-300" />
          <span className="text-sm text-gray-600">Em Produção</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-purple-100 border-2 border-purple-300" />
          <span className="text-sm text-gray-600">Finalizado</span>
        </div>
        {/* ── NOVO: legenda Avisado ── */}
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-100 border-2 border-blue-400 flex items-center justify-center">
            <PhoneCall className="w-2.5 h-2.5 text-blue-600" />
          </div>
          <span className="text-sm text-gray-600">Tutor Avisado</span>
        </div>
      </div>

    </div>
  );
}
