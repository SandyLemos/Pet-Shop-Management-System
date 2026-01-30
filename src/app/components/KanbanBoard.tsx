import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Droplet, Wind, Scissors, CheckCircle2, User, Calendar, AlertCircle, Plus, Pencil, ArrowLeft, Trash2 } from 'lucide-react';
import type { Pet, SlotStatus } from '../types/pet';
import { motion } from 'motion/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from './ui/dialog';
import { PetRegistration } from './PetRegistration';
import { ProfessionalSelector } from './ProfessionalSelector';
import { useState } from 'react';

interface KanbanBoardProps {
  pets: Pet[];
  onUpdateStatus: (petId: string, newStatus: SlotStatus) => void;
  onCheckout: (petId: string) => void;
  onAddPet: (pet: Omit<Pet, 'id' | 'checkInTime'>) => void;
  onEditPet: (petId: string, updatedData: Partial<Pet>) => void;
  onDeletePet: (petId: string) => void;
  onAssignProfessional: (petId: string, profissionalBanho?: string, profissionalTosa?: string) => void;
  onMarkServiceComplete: (petId: string, serviceType: 'banho' | 'escovar' | 'tosa') => void;
}

interface PetCardProps {
  pet: Pet;
  onUpdateStatus: (petId: string, newStatus: SlotStatus) => void;
  onCheckout: (petId: string) => void;
  onEditPet: (petId: string, updatedData: Partial<Pet>) => void;
  onDeletePet: (petId: string) => void;
  onAssignProfessional: (petId: string, profissionalBanho?: string, profissionalTosa?: string) => void;
  onMarkServiceComplete: (petId: string, serviceType: 'banho' | 'escovar' | 'tosa') => void;
  allPets: Pet[];
}

export function PetCard({
  pet,
  onUpdateStatus,
  onCheckout,
  onEditPet,
  onDeletePet,
  onAssignProfessional,
  onMarkServiceComplete,
  allPets,
}: PetCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isProfessionalDialogOpen, setIsProfessionalDialogOpen] =
    useState(false)

  const getServiceColor = (servico: string) => {
    switch (servico) {
      case "banho":
        return "bg-blue-100 text-blue-800"
      case "tosa":
        return "bg-purple-100 text-purple-800"
      case "banho_tosa":
        return "bg-pink-100 text-pink-800"
      case "higienica":
        return "bg-green-100 text-green-800"
      case "ozonio":
        return "bg-cyan-100 text-cyan-800"
      case "hidratacao":
        return "bg-indigo-100 text-indigo-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getServiceLabel = (servico: string) => {
    const labels: Record<string, string> = {
      banho: "Banho",
      tosa: "Tosa",
      banho_tosa: "Banho + Tosa",
      higienica: "Higiênica",
      ozonio: "Ozônio",
      hidratacao: "Hidratação",
    }
    return labels[servico] || servico
  }

  const handlePreviousStatus = () => {
    if (pet.status === "escovar") {
      onUpdateStatus(pet.id, "banho")
    } else if (pet.status === "tosa") {
      onUpdateStatus(pet.id, "escovar")
    }
  }

  // Verifica se o serviço atual exige tosa
  const needsTosa = ["tosa", "banho_tosa", "higienica"].includes(pet.servico)

  // Verifica se todos os serviços exigidos foram completados
  const isReadyForPickup = () => {
    const baseReady = pet.banhoCompleto && pet.escovarCompleto

    if (needsTosa) {
      return pet.status === "tosa" && baseReady && pet.tosaCompleta
    }

    // Para Banho: Só está pronto se estiver na coluna 'escovar' e a escovação estiver OK
    return pet.status === "escovar" && baseReady
  }

  const handleMarkAsReady = () => {
    // Só permite mudar o status se a verificação de segurança passar
    if (isReadyForPickup()) {
      onUpdateStatus(pet.id, "finalizado")
    } else {
      alert("Conclua a escovação antes de finalizar!")
    }
  }

  const temFoto = !!pet.foto
  const nomeLongo = pet.nomePet && pet.nomePet.length > 12
  const usarLayoutExpandido = temFoto || nomeLongo

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="mb-3 relative">
        {/* Badge com número do slot */}
        <div className="absolute -top-2 -right-2 bg-gradient-to-br from-blue-500 to-purple-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold shadow-lg z-10">
          {pet.slotNumber}
        </div>
{/* 1. Definimos a lógica de decisão antes do return */}
    {usarLayoutExpandido ? (
      /* --- CONFIGURAÇÃO 1: COM IMAGEM OU NOME GRANDE --- */
      <CardHeader className="pb-3">
        {/* Bloco Superior: Foto à esquerda e Ações à direita */}
        <div className="flex items-start gap-4 mb-3">
          {pet.foto && (
            <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-gray-100 shadow-sm flex-shrink-0">
              <img
                src={pet.foto}
                alt={pet.nomePet}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Coluna de Ações (Badge, Editar e Excluir) */}
          <div className="flex flex-col items-start gap-2 flex-1">
            <Badge className={`${getServiceColor(pet.servico)} text-[10px] px-2 py-0.5 whitespace-nowrap`}>
              {getServiceLabel(pet.servico)}
            </Badge>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <button
                  className="flex items-center gap-2 text-xs text-gray-500 hover:text-blue-600 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="h-7 w-7 flex items-center justify-center rounded-full bg-gray-50 border border-gray-100">
                    <Pencil className="w-3.5 h-3.5" />
                  </div>
                  <span>Editar perfil</span>
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <PetRegistration
                  onSubmit={(updatedData) => {
                    onEditPet(pet.id, updatedData);
                    setIsEditDialogOpen(false);
                  }}
                  initialData={pet}
                  allPets={allPets}
                  showSlotSelector={true}
                  isEditing={true}
                />
              </DialogContent>
            </Dialog>

            {pet.status === "espera" && (
              <button
                className="flex items-center gap-2 text-xs text-gray-500 hover:text-red-600 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeletePet(pet.id);
                }}
              >
                <div className="h-7 w-7 flex items-center justify-center rounded-full bg-gray-50 border border-gray-100">
                  <Trash2 className="w-3.5 h-3.5" />
                </div>
                <span>Excluir Registro</span>
              </button>
            )}
          </div>
        </div>

        {/* Bloco Inferior: Nome e Informações (Ocupa a largura total) */}
        <div className="w-full space-y-1 mt-2">
          <CardTitle className="text-xl font-bold leading-tight break-words whitespace-normal text-gray-800">
            {pet.nomePet}
          </CardTitle>

          <div className="flex flex-col gap-1">
            <p className="text-sm text-gray-600 flex items-center gap-1">
              <User className="w-3 h-3 text-gray-400" />
              <span className="font-medium">{pet.nomeTutor}</span>
            </p>

            {pet.especie && (
              <div className="text-xs text-gray-900 flex items-center flex-wrap gap-2">
                <span className="flex items-center gap-1">
                  {pet.especie === "cao" ? "🐕 Cão " : "🐈 Gato "}
                  <span className="text-gray-500">•</span>
                  {pet.raca}
                </span>
                {pet.porte && (
                  <span className="flex items-center gap-2">
                    <span className="text-gray-300">•</span>
                    <span className="capitalize">{pet.porte}</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
    ) : (
      /* --- CONFIGURAÇÃO 2: CASO NÃO USE IMAGEM E NOME SEJA CURTO --- */
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{pet.nomePet}</CardTitle>
            <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
              <User className="w-3 h-3" />
              {pet.nomeTutor}
            </p>
            {pet.especie && pet.raca && (
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                <span>{pet.especie === "cao" ? "🐕" : "🐈"}</span>
                <span>{pet.raca}</span>
                {pet.porte && (
                  <>
                    <span>•</span>
                    <span className="capitalize">{pet.porte}</span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <Badge className={getServiceColor(pet.servico)}>
              {getServiceLabel(pet.servico)}
            </Badge>
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-gray-500 hover:text-blue-600"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Editar Animal - Slot {pet.slotNumber}</DialogTitle>
                </DialogHeader>
                <PetRegistration
                  onSubmit={(updatedData) => {
                    onEditPet(pet.id, updatedData);
                    setIsEditDialogOpen(false);
                  }}
                  initialData={pet}
                  allPets={allPets}
                  showSlotSelector={true}
                  isEditing={true}
                />
              </DialogContent>
            </Dialog>
            {pet.status === "espera" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-gray-500 hover:text-red-600"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeletePet(pet.id);
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
    )}
        <CardContent className="space-y-2">
          {/* Mostrar profissional(is) apenas se já foi atribuído */}
          {(pet.profissionalBanho || pet.profissionalTosa) && (
            <div className="space-y-1">
              {pet.profissionalBanho && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Droplet className="w-4 h-4" />
                  <span>Banho: {pet.profissionalBanho}</span>
                </div>
              )}
              {pet.profissionalTosa && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Scissors className="w-4 h-4" />
                  <span>Tosa: {pet.profissionalTosa}</span>
                </div>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>Slot {pet.slotNumber}</span>
          </div>
          {pet.observacoes && (
            <div className="flex items-start gap-2 text-sm text-orange-600 bg-orange-50 p-2 rounded">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="text-xs">{pet.observacoes}</span>
            </div>
          )}

          {/* Indicadores de progresso */}
          {pet.status !== "espera" && pet.status !== "finalizado" && (
            <div className="flex gap-2 pt-2">
              <Badge
                variant={pet.banhoCompleto ? "default" : "outline"}
                className="text-xs"
              >
                {pet.banhoCompleto ? "✓" : "○"} Banho
              </Badge>
              <Badge
                variant={pet.escovarCompleto ? "default" : "outline"}
                className="text-xs"
              >
                {pet.escovarCompleto ? "✓" : "○"} Escovar
              </Badge>
              {needsTosa && (
                <Badge
                  variant={pet.tosaCompleta ? "default" : "outline"}
                  className="text-xs"
                >
                  {pet.tosaCompleta ? "✓" : "○"} Tosa
                </Badge>
              )}
            </div>
          )}

          {/* Botões de ação baseados no status */}
          <div className="pt-2 space-y-2">
            {/* Aguardando - Iniciar Atendimento */}
            {pet.status === "espera" && (
              <Dialog
                open={isProfessionalDialogOpen}
                onOpenChange={setIsProfessionalDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full bg-blue-500 hover:bg-blue-600"
                  >
                    <Droplet className="w-4 h-4 mr-2" />
                    Iniciar Atendimento
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Selecionar Profissional</DialogTitle>
                  </DialogHeader>
                  <ProfessionalSelector
                    pet={pet}
                    onSubmit={(profBanho, profTosa) => {
                      onAssignProfessional(pet.id, profBanho, profTosa)
                      setIsProfessionalDialogOpen(false)
                    }}
                    onCancel={() => setIsProfessionalDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            )}

            {/* Banho - Marcar como completo e Avançar para Escovar */}
            {/* Coluna Banho */}
            {pet.status === "banho" && (
              <>
                {!pet.banhoCompleto ? (
                  <Button
                    onClick={() => onMarkServiceComplete(pet.id, "banho")}
                    className="w-full bg-blue-500 hover:bg-blue-600"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Marcar Banho Completo
                  </Button>
                ) : (
                  /* Só mostra o botão de avançar DEPOIS que o banho for marcado como completo */
                  <Button
                    onClick={() => onUpdateStatus(pet.id, "escovar")}
                    className="w-full bg-cyan-500 hover:bg-cyan-600"
                  >
                    <Wind className="w-4 h-4 mr-2" />
                    Avançar para Escovar
                  </Button>
                )}
              </>
            )}

            {/* Escovar - Marcar como completo e Avançar para Tosa */}
            {/* Escovar - Ações */}
            {pet.status === "escovar" && (
              <>
                {!pet.escovarCompleto ? (
                  <Button
                    onClick={() => onMarkServiceComplete(pet.id, "escovar")}
                    className="w-full bg-cyan-500 hover:bg-cyan-600"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Finalizar Escovação
                  </Button>
                ) : (
                  // APÓS concluir a escovação, decide para onde vai
                  <>
                    {needsTosa ? (
                      <Button
                        onClick={() => onUpdateStatus(pet.id, "tosa")}
                        className="w-full bg-purple-500 hover:bg-purple-600"
                      >
                        <Scissors className="w-4 h-4 mr-2" />
                        Avançar para Tosa
                      </Button>
                    ) : (
                      <Button
                        onClick={handleMarkAsReady}
                        className="w-full bg-green-500 hover:bg-green-600"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Enviar para Retirada
                      </Button>
                    )}
                  </>
                )}

                <Button
                  onClick={handlePreviousStatus}
                  variant="outline"
                  className="w-full"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar para Banho
                </Button>

                {/* <Button
                  onClick={handlePreviousStatus}
                  variant="ghost"
                  className="w-full text-xs text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <ArrowLeft className="w-3 h-3 mr-2" />
                  Voltar para Banho (Corrige)
                </Button> */}
              </>
            )}

            {/* --- BOTÕES PARA O STATUS TOSA --- */}
            {pet.status === "tosa" && (
              <div className="space-y-2 mt-4">
                {!pet.tosaCompleta ? (
                  <Button
                    onClick={() => onMarkServiceComplete(pet.id, "tosa")}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Marcar Tosa Completa
                  </Button>
                ) : (
                  <Button
                    onClick={handleMarkAsReady}
                    className="w-full bg-green-500 hover:bg-green-600"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Enviar para Retirada
                  </Button>
                )}

                {/* Botão para voltar caso precise corrigir algo na secagem */}
                <Button
                  onClick={handlePreviousStatus}
                  variant="outline"
                  className="w-full"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar para Escova
                </Button>
              </div>
            )}

            {/* Finalizado - Pronto para Retirada */}
            {pet.status === "finalizado" && (
              <Button
                onClick={() => onCheckout(pet.id)}
                variant="default"
                size="sm"
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Retirar Pet
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

interface KanbanColumnProps {
  status: SlotStatus;
  title: string;
  icon: React.ReactNode;
  pets: Pet[];
  onUpdateStatus: (petId: string, newStatus: SlotStatus) => void;
  onCheckout: (petId: string) => void;
  onEditPet: (petId: string, updatedData: Partial<Pet>) => void;
  onDeletePet: (petId: string) => void;
  onAssignProfessional: (petId: string, profissionalBanho?: string, profissionalTosa?: string) => void;
  onMarkServiceComplete: (petId: string, serviceType: 'banho' | 'escovar' | 'tosa') => void;
  color: string;
  onAddPet?: (pet: Omit<Pet, 'id' | 'checkInTime'>) => void;
  allPets?: Pet[];
}

function KanbanColumn({ 
  status, 
  title, 
  icon, 
  pets, 
  onUpdateStatus, 
  onCheckout, 
  onEditPet, 
  onDeletePet,
  onAssignProfessional,
  onMarkServiceComplete,
  color, 
  onAddPet, 
  allPets 
}: KanbanColumnProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const columnPets = pets.filter(p => p.status === status);

  // Função para encontrar o próximo slot disponível
  const getNextAvailableSlot = () => {
    const occupiedSlots = (allPets || []).map(p => p.slotNumber);
    for (let i = 1; i <= 100; i++) {
      if (!occupiedSlots.includes(i)) {
        return i;
      }
    }
    return 1; // Fallback
  };

  const handleAddFromColumn = (petData: any) => {
    if (onAddPet) {
      // Aqui garantimos a obrigatoriedade:
      // Ou vem do formulário (petData.slotNumber) ou do próximo disponível.
      const finalSlot = Number(petData.slotNumber) || getNextAvailableSlot()

      const newPetData = {
        ...petData,
        slotNumber: finalSlot,
        status: "espera" as SlotStatus,
      }

      // Usamos o type assertion aqui para dizer ao TS:
      // "Eu garanto que este objeto tem todos os campos obrigatórios do Pet"
      onAddPet(newPetData as Omit<Pet, "id" | "checkInTime">)

      setIsDialogOpen(false)
    }
  }

  return (
    <div className="flex-1 min-w-[280px] transition-colors rounded-lg">
      <div className={`${color} p-4 rounded-t-lg`}>
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
      <div className="p-4 bg-gray-50 rounded-b-lg min-h-[400px]">
        {columnPets.map((pet) => (
          <PetCard
            key={pet.id}
            pet={pet}
            onUpdateStatus={onUpdateStatus}
            onCheckout={onCheckout}
            onEditPet={onEditPet}
            onDeletePet={onDeletePet}
            onAssignProfessional={onAssignProfessional}
            onMarkServiceComplete={onMarkServiceComplete}
            allPets={allPets || []}
          />
        ))}
        {columnPets.length === 0 && !onAddPet && (
          <div className="text-center text-gray-400 mt-8">
            <p className="text-sm">Nenhum pet nesta etapa</p>
          </div>
        )}

        {/* Botão de adicionar animal (apenas na coluna Aguardando) */}
        {status === "espera" && onAddPet && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full mt-3 border-dashed border-2 border-yellow-500 hover:bg-yellow-50 text-yellow-700 hover:text-yellow-800 hover:border-yellow-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Animal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  Adicionar Animal - Slot {getNextAvailableSlot()}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Formulário para cadastrar um novo pet no sistema.
                </DialogDescription>
              </DialogHeader>
              <PetRegistration
                onSubmit={handleAddFromColumn}
                defaultSlot={getNextAvailableSlot()}
                allPets={allPets || []}
                showSlotSelector={true}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}

export function KanbanBoard({ 
  pets, 
  onUpdateStatus, 
  onCheckout, 
  onAddPet, 
  onEditPet, 
  onDeletePet,
  onAssignProfessional,
  onMarkServiceComplete,
}: KanbanBoardProps) {
 const petsReady = pets.filter(
   (p) => p.status === "finalizado" && p.banhoCompleto && p.escovarCompleto,
 )
  
  return (
    <div className="flex gap-6">
      {/* Fluxo de Trabalho */}
      <div className="flex-1 overflow-x-auto">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Fluxo de Trabalho</h2>
        <div className="flex gap-4 pb-4">
          <KanbanColumn
            status="espera"
            title="Aguardando"
            icon={<Calendar className="w-5 h-5" />}
            pets={pets}
            onUpdateStatus={onUpdateStatus}
            onCheckout={onCheckout}
            onEditPet={onEditPet}
            onDeletePet={onDeletePet}
            onAssignProfessional={onAssignProfessional}
            onMarkServiceComplete={onMarkServiceComplete}
            color="bg-amber-400"
            onAddPet={onAddPet}
            allPets={pets}
          />
          <KanbanColumn
            status="banho"
            title="Banho"
            icon={<Droplet className="w-5 h-5" />}
            pets={pets}
            onUpdateStatus={onUpdateStatus}
            onCheckout={onCheckout}
            onEditPet={onEditPet}
            onDeletePet={onDeletePet}
            onAssignProfessional={onAssignProfessional}
            onMarkServiceComplete={onMarkServiceComplete}
            color="bg-sky-400"
            allPets={pets}
          />
          <KanbanColumn
            status="escovar"
            title="Escovar"
            icon={<Wind className="w-5 h-5" />}
            pets={pets}
            onUpdateStatus={onUpdateStatus}
            onCheckout={onCheckout}
            onEditPet={onEditPet}
            onDeletePet={onDeletePet}
            onAssignProfessional={onAssignProfessional}
            onMarkServiceComplete={onMarkServiceComplete}
            color="bg-sky-400"
            allPets={pets}
          />
          <KanbanColumn
            status="tosa"
            title="Tosa"
            icon={<Scissors className="w-5 h-5" />}
            pets={pets}
            onUpdateStatus={onUpdateStatus}
            onCheckout={onCheckout}
            onEditPet={onEditPet}
            onDeletePet={onDeletePet}
            onAssignProfessional={onAssignProfessional}
            onMarkServiceComplete={onMarkServiceComplete}
            color="bg-sky-400"
            allPets={pets}
          />
        </div>
      </div>

    </div>
  );
}