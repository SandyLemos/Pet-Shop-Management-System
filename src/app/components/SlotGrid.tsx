import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { Dog, Clock, Droplet, Wind, Scissors, CheckCircle2 } from 'lucide-react';
import { PetRegistration } from './PetRegistration';
import type { Pet, SlotStatus } from '../types/pet';

interface SlotGridProps {
  pets: Pet[];
  onAddPet: (pet: Omit<Pet, 'id' | 'checkInTime'>) => void;
  filter: 'all' | 'banho' | 'tosa' | 'banho_tosa' | 'higienica' | 'ozonio' | 'hidratacao';
}

export function SlotGrid({ pets, onAddPet, filter }: SlotGridProps) {
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const totalSlots = 100;
  
  const getSlotStatus = (slotNumber: number): { status: SlotStatus; pet?: Pet } => {
    const pet = pets.find(p => p.slotNumber === slotNumber);
    if (!pet) return { status: 'livre' };
    return { status: pet.status, pet };
  };

  const getStatusColor = (status: SlotStatus) => {
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

  const getStatusIcon = (status: SlotStatus) => {
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

  const handleSlotClick = (slotNumber: number) => {
    const { status } = getSlotStatus(slotNumber);
    if (status === 'livre') {
      setSelectedSlot(slotNumber);
      setIsDialogOpen(true);
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

  const shouldShowSlot = (pet?: Pet) => {
    if (filter === 'all') return true;
    if (!pet) return true; // Sempre mostra slots livres
    return pet.servico === filter;
  };

  return (
    <div>
      <div className="grid grid-cols-10 gap-2 p-4">
        {Array.from({ length: totalSlots }, (_, i) => {
          const slotNumber = i + 1;
          const { status, pet } = getSlotStatus(slotNumber);
          
          // Sempre renderiza o slot, não importa o filtro
          const isFiltered = filter !== 'all' && pet && pet.servico !== filter;

          return (
            <Dialog key={slotNumber} open={isDialogOpen && selectedSlot === slotNumber} onOpenChange={(open) => {
              if (!open) {
                setIsDialogOpen(false);
                setSelectedSlot(null);
              }
            }}>
              <DialogTrigger asChild>
                <button
                  onClick={() => handleSlotClick(slotNumber)}
                  className={`
                    aspect-square rounded-lg border-2 transition-all
                    flex flex-col items-center justify-center gap-1
                    ${isFiltered ? 'opacity-30' : getStatusColor(status)}
                    ${status === 'livre' ? 'cursor-pointer' : 'cursor-default'}
                  `}
                  title={pet ? `${pet.nomePet} - ${pet.nomeTutor}` : `Slot ${slotNumber} - Livre`}
                >
                  {getStatusIcon(status)}
                  <span className="text-xs font-semibold">{slotNumber}</span>
                  {pet && (
                    <span className="text-[8px] font-medium truncate w-full px-1 text-center">
                      {pet.nomePet}
                    </span>
                  )}
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Cadastrar Pet - Slot {selectedSlot}</DialogTitle>
                </DialogHeader>
                <PetRegistration onSubmit={handleRegister} />
              </DialogContent>
            </Dialog>
          );
        })}
      </div>

      {/* Legenda */}
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
      </div>
    </div>
  );
}