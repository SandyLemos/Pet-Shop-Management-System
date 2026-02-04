import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Button } from './components/ui/button';
import { SlotGrid } from './components/SlotGrid';
import { KanbanBoard, PetCard } from './components/KanbanBoard';
import { LayoutGrid, LayoutList, Dog, Filter, CheckCircle2 } from "lucide-react"
import { toast, Toaster } from 'sonner';
import type { Pet, SlotStatus } from './types/pet';

function App() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [filter, setFilter] = useState<'all' | 'banho' | 'tosa' | 'banho_tosa' | 'higienica' | 'ozonio' | 'hidratacao'>('all');
  const [dailyCounter, setDailyCounter] = useState(1);

  // --- LÓGICA DE FLUXO CUSTOMIZADA ---
  
  // Verifica se o pet tem algum tipo de tosa (Fluxo Longo)
 const needsTosaFlow = (servico: string) => {
   const s = servico.toLowerCase()
   // Agora inclui higienica, tosa e banho_tosa
   return s === "tosa" || s === "banho_tosa" || s === "higienica"
 }

 const handleRevertService = (petId: string, etapa: string, motivo: string) => {
   setPets((prevPets) =>
     prevPets.map((pet) => {
       if (pet.id === petId) {
         return {
           ...pet,
           status: "espera" as SlotStatus, // Volta para a primeira coluna
           banhoCompleto: false,
           escovarCompleto: false,
           tosaCompleta: false,
           atendimentoIniciado: false, // Libera edição total do perfil
           // Grava a auditoria
           historicoReversoes: [
             ...(pet.historicoReversoes || []),
             {
               etapa,
               motivo,
               data: new Date().toISOString(),
             },
           ],
         }
       }
       return pet
     }),
   )

   toast.success(`Serviço de ${etapa} revertido com sucesso.`)
 }

const handleUpdateStatus = (petId: string, newStatus: SlotStatus) => {
  setPets((currentPets) =>
    currentPets.map((pet) => {
      if (pet.id === petId) {
        const updatedPet = { ...pet, status: newStatus }

        // Se voltar para 'banho', desmarca a conclusão do banho e da escovação
        if (newStatus === "banho") {
          updatedPet.banhoCompleto = false
          updatedPet.escovarCompleto = false
        }

        // Se voltar para 'escovar', desmarca a conclusão da escovação e da tosa
        if (newStatus === "escovar") {
          updatedPet.escovarCompleto = false
          updatedPet.tosaCompleta = false
        }

        // Se voltar para 'tosa', desmarca apenas a conclusão da tosa
        if (newStatus === "tosa") {
          updatedPet.tosaCompleta = false
        }

        return updatedPet
      }
      return pet
    }),
  )

  // Feedback visual
  toast.info(`Movido para etapa: ${newStatus}`)
}

  // ----------------------------------

  const handleAddPet = (petData: Omit<Pet, 'id' | 'checkInTime'>) => {
    const newPet: Pet = {
      ...petData,
      id: String(dailyCounter).padStart(3, '0'),
      checkInTime: new Date().toISOString(),
    };
    setPets([...pets, newPet]);
    setDailyCounter(dailyCounter + 1);
    toast.success(`${petData.nomePet} cadastrado com sucesso!`);
  };

  const onRevertService = (petId: string, etapa: string, motivo: string) => {
    console.log(`Auditoria: Pet ${petId} teve o ${etapa} revertido: ${motivo}`)

    setPets((prevPets) =>
      prevPets.map((pet) => {
        if (pet.id === petId) {
          return {
            ...pet,
            // Se a etapa for banho, desmarcamos apenas o banho
            ...(etapa === "banho" && { banhoCompleto: false }),
            // Se no futuro tiver reversão de tosa:
            ...(etapa === "tosa" && { tosaCompleta: false }),
          }
        }
        return pet
      }),
    )
  }

  const handleCheckout = (petId: string) => {
    const pet = pets.find(p => p.id === petId);
    setPets(pets.filter(p => p.id !== petId));
    if (pet) toast.success(`${pet.nomePet} retirado com sucesso!`);
  };

  const handleEditPet = (petId: string, updatedData: Partial<Pet>) => {
    setPets(pets.map(pet => pet.id === petId ? { ...pet, ...updatedData } : pet));
    toast.success('Dados atualizados!');
  };

  const handleDeletePet = (petId: string) => {
    setPets(pets.filter(p => p.id !== petId));
    toast.success(`Pet removido`);
  };

 const handleAssignProfessional = (
   petId: string,
   profissionalBanho?: string,
   profissionalTosa?: string,
   profissionalEscovar?: string, 
 ) => {
   setPets((prevPets) =>
     prevPets.map((pet) => {
       if (pet.id === petId) {
         return {
           ...pet,
           profissionalBanho: profissionalBanho ?? pet.profissionalBanho,
           profissionalTosa: profissionalTosa ?? pet.profissionalTosa,
           profissionalEscovar: profissionalEscovar ?? pet.profissionalEscovar,

           // Só muda para "banho" se o pet ainda estiver em "espera"
           status: pet.status === "espera" ? "banho" : pet.status,
           atendimentoIniciado: true,
         }
       }
       return pet
     }),
   )
   toast.success("Profissional registrado com sucesso!")
 }

  const handleMarkServiceComplete = (
    petId: string,
    serviceType: "banho" | "escovar" | "tosa",
  ) => {
    setPets((currentPets) =>
      currentPets.map((pet) => {
        if (pet.id === petId) {
          const update = { ...pet }
          if (serviceType === "banho") update.banhoCompleto = true
          if (serviceType === "escovar") update.escovarCompleto = true
          if (serviceType === "tosa") update.tosaCompleta = true

          return update
        }
        return pet
      }),
    )
  }

  const getStats = () => ({
    total: pets.length,
    aguardando: pets.filter(p => p.status === 'espera').length,
    emProducao: pets.filter(p => ['banho', 'escovar', 'tosa'].includes(p.status)).length,
    prontos: pets.filter(p => p.status === 'finalizado').length,
    slotsLivres: 100 - pets.length
  });

  const stats = getStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <Toaster position="top-right" />

      {/* Header e Stats (Mantidos como seu original) */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-purple-500 p-3 rounded-lg">
              <Dog className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                PetShop Manager
              </h1>
              <p className="text-sm text-gray-600">
                Sistema de Gestão de Atendimento
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold">
              {new Date().toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-500">
            <p className="text-sm text-gray-600">Slots Livres</p>
            <p className="text-3xl font-bold text-green-600">
              {stats.slotsLivres}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-yellow-500">
            <p className="text-sm text-gray-600">Aguardando</p>
            <p className="text-3xl font-bold text-yellow-600">
              {stats.aguardando}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
            <p className="text-sm text-gray-600">Em Produção</p>
            <p className="text-3xl font-bold text-blue-600">
              {stats.emProducao}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-emerald-500">
            <p className="text-sm text-gray-600">Prontos</p>
            <p className="text-3xl font-bold text-emerald-600">
              {stats.prontos}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-gray-500">
            <p className="text-sm text-gray-600">Total Hoje</p>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-8">
        <Tabs defaultValue="grid" className="space-y-4">
          <div className="flex items-center justify-between bg-white rounded-lg p-4 shadow-sm">
            <TabsList>
              <TabsTrigger value="grid" className="gap-2">
                <LayoutGrid className="w-4 h-4" />
                Visão Geral
              </TabsTrigger>
              <TabsTrigger value="kanban" className="gap-2">
                <LayoutList className="w-4 h-4" />
                Fluxo de Trabalho
              </TabsTrigger>
              <TabsTrigger value="ready" className="gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                Prontos para Retirada
                {stats.prontos > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-green-500 text-white rounded-full font-bold">
                    {stats.prontos}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Filtros de Serviço */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-600" />
              <div className="flex gap-1">
                {[
                  "all",
                  "banho",
                  "tosa",
                  "banho_tosa",
                  "higienica",
                  "ozonio",
                  "hidratacao",
                ].map((f) => (
                  <Button
                    key={f}
                    variant={filter === f ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilter(f as any)}
                    className="capitalize"
                  >
                    {f.replace("_", " ")}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <TabsContent value="grid" className="bg-white rounded-lg shadow-sm">
            <SlotGrid pets={pets} onAddPet={handleAddPet} filter={filter} />
          </TabsContent>

          <TabsContent
            value="kanban"
            className="bg-white rounded-lg shadow-sm p-6"
          >
            <KanbanBoard
              pets={pets}
              onRevertService={onRevertService}
              onUpdateStatus={handleUpdateStatus}
              onCheckout={handleCheckout}
              onAddPet={handleAddPet}
              onEditPet={handleEditPet}
              onDeletePet={handleDeletePet}
              onAssignProfessional={handleAssignProfessional}
              onMarkServiceComplete={handleMarkServiceComplete}
            />
          </TabsContent>

          <TabsContent value="ready">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {pets
                .filter((p) => p.status === "finalizado")
                .map((pet) => (
                  <PetCard
                    key={pet.id}
                    pet={pet}
                    onRevertService={handleRevertService}
                    onUpdateStatus={handleUpdateStatus}
                    onCheckout={handleCheckout}
                    onEditPet={handleEditPet}
                    onDeletePet={handleDeletePet}
                    onAssignProfessional={handleAssignProfessional}
                    onMarkServiceComplete={handleMarkServiceComplete}
                    allPets={pets}
                  />
                ))}
              {stats.prontos === 0 && (
                <div className="col-span-full py-20 text-center bg-white rounded-xl border-2 border-dashed border-slate-200">
                  <CheckCircle2 className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                  <p className="text-slate-400">
                    Nenhum animal pronto para retirada.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default App;