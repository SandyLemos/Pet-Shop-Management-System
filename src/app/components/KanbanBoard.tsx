import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Droplet,
  Wind,
  Scissors,
  CheckCircle2,
  User,
  Calendar,
  AlertCircle,
  Plus,
  Pencil,
  ArrowLeft,
  Trash2,
  RotateCcw,
} from "lucide-react"
import type { Pet, SlotStatus } from '../types/pet';
import { motion } from 'motion/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from './ui/dialog';
import { PetRegistration } from './PetRegistration';
import { ProfessionalSelector } from './ProfessionalSelector';
import { ReversionDialog } from "./ReversionDialog"
import { useState } from 'react';

interface KanbanBoardProps {
  pets: Pet[]
  onRevertService: (id: string, etapa: string, motivo: string) => void
  onUpdateStatus: (petId: string, newStatus: SlotStatus) => void
  onCheckout: (petId: string) => void
  onAddPet: (pet: Omit<Pet, "id" | "checkInTime">) => void
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
}

interface PetCardProps {
  pet: Pet
  onUpdateStatus: (petId: string, newStatus: SlotStatus) => void
  onRevertService: (petId: string, etapa: string, motivo: string) => void
  onCheckout: (petId: string) => void
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
  allPets: Pet[]
}

export function PetCard({
  pet,
  onUpdateStatus,
  onRevertService,
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

  const [isEditPetOpen, setIsEditPetOpen] = useState(false)
  const [isEditProfessionalOpen, setIsEditProfessionalOpen] = useState(false)
  const [isReversionDialogOpen, setIsReversionDialogOpen] = useState(false)

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation()

    // VERIFICAÇÃO DE SEGURANÇA: Bloqueia edição se o serviço da coluna atual já acabou
    const servicoConcluido =
      (pet.status === "banho" && pet.banhoCompleto) ||
      (pet.status === "escovar" && pet.escovarCompleto) ||
      (pet.status === "tosa" && pet.tosaCompleta)

    if (servicoConcluido) {
      alert(
        "Este serviço já foi marcado como completo e não pode mais ser editado.",
      )
      return
    }

    if (pet.atendimentoIniciado) {
      setIsEditProfessionalOpen(true)
    } else {
      setIsEditPetOpen(true)
    }
  }

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

  const [etapaDestino, setEtapaDestino] = useState<string>("")

  const prepararAvanco = (e: React.MouseEvent, etapa: string) => {
    e.stopPropagation()
    setEtapaDestino(etapa)
    setIsProfessionalDialogOpen(true)
  }

  // Verificação para o ícone
  const podeEditar = !(
    (pet.status === "banho" && pet.banhoCompleto) ||
    (pet.status === "escovar" && pet.escovarCompleto) ||
    (pet.status === "tosa" && pet.tosaCompleta)
  )

  const isInicioAtendimento = pet.status === "espera"

  // Dentro do seu componente PetCard
  const handleQuickEditProfessional = (novoProfissional: string) => {
    // Inicializamos as variáveis com o que já existe no pet
    let pBanho = pet.profissionalBanho
    let pEscovar = pet.profissionalEscovar
    let pTosa = pet.profissionalTosa

    // O "Cérebro" da edição: identifica o serviço pela coluna atual
    switch (pet.status) {
      case "banho":
        pBanho = novoProfissional
        break
      case "escovar":
        pEscovar = novoProfissional
        break
      case "tosa":
        pTosa = novoProfissional
        break
      default:
        // Se estiver em espera, tratamos como atribuição inicial de banho
        pBanho = novoProfissional
    }

    // Chama a função que já ajustamos no App.tsx
    onAssignProfessional(pet.id, pBanho, pTosa, pEscovar)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="mb-3 relative">
        {/* 1. Definimos a lógica de decisão antes do return */}
        {usarLayoutExpandido ? (
          /* --- CONFIGURAÇÃO 1: COM IMAGEM OU NOME GRANDE --- */
          <CardHeader className="pb-3">
            {/* Badge com número do slot */}
            <div className="absolute -top-2 -right-2 bg-gradient-to-br from-blue-500 to-purple-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold shadow-lg z-10">
              {pet.slotNumber}
            </div>
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
                <Badge
                  className={`${getServiceColor(pet.servico)} text-[10px] px-2 py-0.5 whitespace-nowrap`}
                >
                  {getServiceLabel(pet.servico)}
                </Badge>

                {podeEditar && (
                  <button
                    className="flex items-center gap-2 text-xs text-gray-500 hover:text-blue-600 transition-colors"
                    onClick={handleEditClick}
                  >
                    <div className="h-7 w-7 flex items-center justify-center rounded-full bg-gray-50 border border-gray-100">
                      <Pencil className="w-3.5 h-3.5" />
                    </div>
                    {usarLayoutExpandido && <span>Editar</span>}
                  </button>
                )}

                {pet.status === "espera" && (
                  <button
                    className="flex items-center gap-2 text-xs text-gray-500 hover:text-red-600 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeletePet(pet.id)
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
            {/* Badge com número do slot */}
            <div className="absolute -top-2 -right-2 bg-gradient-to-br from-blue-500 to-purple-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold shadow-lg z-10">
              {pet.slotNumber}
            </div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg truncate">
                  {pet.nomePet}
                </CardTitle>
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
                {/* SUBSTITUIÇÃO AQUI: Botão inteligente que decide qual modal abrir */}
                {podeEditar && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-gray-500 hover:text-blue-600 transition-colors"
                    onClick={handleEditClick}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                )}
                {pet.status === "espera" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-gray-500 hover:text-red-600"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeletePet(pet.id)
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
          {/* Seção de Profissionais: Só não aparece se estiver em "Aguardando" e sem ninguém atribuído */}
          {pet.status !== "espera" && (
            <div className="space-y-1.5 py-2 border-y border-gray-100 my-2 bg-slate-50/50 rounded-sm px-2">
              {/* BANHO: Mostra sempre que houver o nome */}
              {pet.profissionalBanho && (
                <div
                  className={`flex items-center gap-2 text-xs ${pet.banhoCompleto ? "text-gray-400" : "text-gray-700"}`}
                >
                  <Droplet
                    className={`w-3.5 h-3.5 ${pet.banhoCompleto ? "text-gray-300" : "text-blue-500"}`}
                  />
                  <span className="flex items-center gap-1">
                    <span className="font-medium">Banho:</span>
                    <span
                      className={
                        pet.banhoCompleto
                          ? "line-through decoration-gray-300"
                          : "font-bold"
                      }
                    >
                      {pet.profissionalBanho}
                    </span>
                    {pet.banhoCompleto && (
                      <CheckCircle2 className="w-3 h-3 text-green-500 ml-1" />
                    )}
                  </span>
                </div>
              )}

              {/* ESCOVAR: Mostra se tiver profissionalEscovar OU se estiver na coluna de escovação */}
              {(pet.profissionalEscovar ||
                pet.status === "escovar" ||
                pet.escovarCompleto) && (
                <div
                  className={`flex items-center gap-2 text-xs ${pet.escovarCompleto ? "text-gray-400" : "text-gray-700"}`}
                >
                  <Wind
                    className={`w-3.5 h-3.5 ${pet.escovarCompleto ? "text-gray-300" : "text-cyan-500"}`}
                  />
                  <span className="flex items-center gap-1">
                    <span className="font-medium">Escovar:</span>
                    <span
                      className={
                        pet.escovarCompleto
                          ? "line-through decoration-gray-300"
                          : "font-bold"
                      }
                    >
                      {/* Lógica de prioridade: Profissional da Escova > Profissional do Banho > Julia Ferreira (fallback) */}
                      {pet.profissionalEscovar}
                    </span>
                    {pet.escovarCompleto && (
                      <CheckCircle2 className="w-3 h-3 text-green-500 ml-1" />
                    )}
                  </span>
                </div>
              )}

              {/* TOSA: Mantém sua lógica original */}
              {needsTosa && (pet.profissionalTosa || pet.status === "tosa") && (
                <div
                  className={`flex items-center gap-2 text-xs ${pet.tosaCompleta ? "text-gray-400" : "text-gray-700"}`}
                >
                  <Scissors
                    className={`w-3.5 h-3.5 ${pet.tosaCompleta ? "text-gray-300" : "text-purple-500"}`}
                  />
                  <span className="flex items-center gap-1">
                    <span className="font-medium">Tosa:</span>
                    <span
                      className={
                        pet.tosaCompleta
                          ? "line-through decoration-gray-300"
                          : "font-bold"
                      }
                    >
                      {pet.profissionalTosa || "Pendente"}
                    </span>
                    {pet.tosaCompleta && (
                      <CheckCircle2 className="w-3 h-3 text-green-500 ml-1" />
                    )}
                  </span>
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
            {/* MODAL ÚNICO PARA SELEÇÃO DE PROFISSIONAL */}
            <Dialog
              open={isProfessionalDialogOpen}
              onOpenChange={setIsProfessionalDialogOpen}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Selecionar Profissional</DialogTitle>
                </DialogHeader>
                <ProfessionalSelector
                  pet={{ ...pet, proximaEtapa: etapaDestino }}
                  onAssignProfessional={onAssignProfessional}
                  onSubmit={(profissional) => {
                    if (pet.status === "espera") {
                      onAssignProfessional(pet.id, profissional)
                      onUpdateStatus(pet.id, "banho")
                    } else {
                      // Define quem é quem baseado para onde o pet está indo
                      const pBanho =
                        etapaDestino === "banho" ? profissional : undefined
                      const pEscovar =
                        etapaDestino === "escovar" ? profissional : undefined // NOVO
                      const pTosa =
                        etapaDestino === "tosa" ? profissional : undefined

                      // Envia os 4 parâmetros para a função pai
                      onAssignProfessional(pet.id, pBanho, pTosa, pEscovar)
                      onUpdateStatus(pet.id, etapaDestino as any)
                    }
                    setIsProfessionalDialogOpen(false)
                    setEtapaDestino("")
                  }}
                  onCancel={() => {
                    setIsProfessionalDialogOpen(false)
                    setEtapaDestino("")
                  }}
                />
              </DialogContent>
            </Dialog>

            {/* LOGICA DE EXIBIÇÃO DOS BOTÕES POR STATUS */}
            {pet.status === "espera" && (
              <Button
                className="w-full bg-blue-500 hover:bg-blue-600"
                onClick={(e) => prepararAvanco(e, "banho")}
              >
                <Droplet className="w-4 h-4 mr-2" />
                Iniciar Atendimento
              </Button>
            )}

            {pet.status === "banho" && (
              <div className="space-y-2">
                {!pet.banhoCompleto ? (
                  <>
                    <Button
                      onClick={() => onMarkServiceComplete(pet.id, "banho")}
                      className="w-full bg-blue-500"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Marcar Banho
                      Completo
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-gray-400"
                      onClick={() => onUpdateStatus(pet.id, "espera")}
                    >
                      <ArrowLeft className="w-3 h-3 mr-2" /> Voltar para
                      Aguardando
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={(e) => prepararAvanco(e, "escovar")}
                      className="w-full bg-cyan-500"
                    >
                      <Wind className="w-4 h-4 mr-2" /> Avançar para Escovar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-red-100 text-red-400"
                      onClick={() => setIsReversionDialogOpen(true)}
                    >
                      <RotateCcw className="w-3 h-3 mr-2" /> Reverter Banho
                    </Button>
                  </>
                )}
              </div>
            )}

            {pet.status === "escovar" && (
              <div className="space-y-2">
                {!pet.escovarCompleto ? (
                  <Button
                    onClick={() => onMarkServiceComplete(pet.id, "escovar")}
                    className="w-full bg-cyan-500"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Finalizar
                    Escovação
                  </Button>
                ) : needsTosa ? (
                  <Button
                    onClick={(e) => prepararAvanco(e, "tosa")}
                    className="w-full bg-purple-500"
                  >
                    <Scissors className="w-4 h-4 mr-2" /> Avançar para Tosa
                  </Button>
                ) : (
                  <Button
                    onClick={handleMarkAsReady}
                    className="w-full bg-green-500"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Enviar para
                    Retirada
                  </Button>
                )}
                <Button
                  onClick={handlePreviousStatus}
                  variant="outline"
                  className="w-full"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para Banho
                </Button>
              </div>
            )}

            {pet.status === "tosa" && (
              <div className="space-y-2">
                {!pet.tosaCompleta ? (
                  <Button
                    onClick={() => onMarkServiceComplete(pet.id, "tosa")}
                    className="w-full bg-purple-600"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Marcar Tosa
                    Completa
                  </Button>
                ) : (
                  <Button
                    onClick={handleMarkAsReady}
                    className="w-full bg-green-500"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Enviar para
                    Retirada
                  </Button>
                )}
                <Button
                  onClick={handlePreviousStatus}
                  variant="outline"
                  className="w-full"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para Escovar
                </Button>
              </div>
            )}

            {pet.status === "finalizado" && (
              <Button
                onClick={() => onCheckout(pet.id)}
                className="w-full bg-green-600"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" /> Retirar Pet
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <ReversionDialog
        open={isReversionDialogOpen}
        onOpenChange={setIsReversionDialogOpen}
        petName={pet.nomePet}
        onConfirm={(motivo) => {
          onRevertService(pet.id, "banho", motivo)
          setIsReversionDialogOpen(false)
        }}
      />

      {/* MODAL 1: EDITAR DADOS (BLOQUEADO SE INICIADO) */}
      <Dialog open={isEditPetOpen} onOpenChange={setIsEditPetOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Perfil do Pet</DialogTitle>
          </DialogHeader>
          <PetRegistration
            isEditing={true}
            initialData={pet}
            onSubmit={(updatedData) => {
              onEditPet(pet.id, updatedData)
              setIsEditPetOpen(false)
            }}
          />
        </DialogContent>
      </Dialog>

      {/* MODAL 2: EDITAR APENAS PROFISSIONAIS (DISPONÍVEL APÓS INÍCIO) */}
      <Dialog
        open={isEditProfessionalOpen}
        onOpenChange={setIsEditProfessionalOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pet.status === "espera" && "Selecionar Banhista"}
              {pet.status === "banho" && "Alterar Responsável pelo Banho"}
              {pet.status === "escovar" && "Alterar Responsável pela Escovação"}
              {pet.status === "tosa" && "Alterar Tosador"}
            </DialogTitle>
          </DialogHeader>
          <ProfessionalSelector
            pet={{ ...pet, proximaEtapa: etapaDestino || pet.status }}
            onCancel={() => {
              setIsEditProfessionalOpen(false)
              setEtapaDestino("")
            }}
            onAssignProfessional={onAssignProfessional} // Apenas repassa a prop
            onSubmit={(profissionalEscolhido) => {
              if (pet.status === "espera") {
                // Início do atendimento
                onAssignProfessional(pet.id, profissionalEscolhido)
                onUpdateStatus(pet.id, "banho")
              } else if (etapaDestino) {
                // Avançando para outra coluna
                const pBanho =
                  etapaDestino === "banho" ? profissionalEscolhido : undefined
                const pEscovar =
                  etapaDestino === "escovar" ? profissionalEscolhido : undefined
                const pTosa =
                  etapaDestino === "tosa" ? profissionalEscolhido : undefined

                onAssignProfessional(pet.id, pBanho, pTosa, pEscovar)
                onUpdateStatus(pet.id, etapaDestino as SlotStatus)
              } else {
                // EDIÇÃO VIA LÁPIS: Apenas troca o nome no serviço que já está ocorrendo
                // Aqui usamos aquela função "Cérebro" que você já tem no PetCard
                handleQuickEditProfessional(profissionalEscolhido)
              }

              setIsEditProfessionalOpen(false)
              setEtapaDestino("")
            }}
          />
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

interface KanbanColumnProps {
  status: SlotStatus;
  title: string;
  icon: React.ReactNode;
  pets: Pet[];
  onRevertService: (id: string, etapa: string, motivo: string) => void;
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
  onRevertService,
  onCheckout,
  onEditPet,
  onDeletePet,
  onAssignProfessional,
  onMarkServiceComplete,
  color,
  onAddPet,
  allPets,
}: KanbanColumnProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const columnPets = pets.filter((p) => p.status === status)

  // Função para encontrar o próximo slot disponível
  const getNextAvailableSlot = () => {
    const occupiedSlots = (allPets || []).map((p) => p.slotNumber)
    for (let i = 1; i <= 100; i++) {
      if (!occupiedSlots.includes(i)) {
        return i
      }
    }
    return 1 // Fallback
  }

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
            onRevertService={onRevertService}
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
  onRevertService,
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
        <h2 className="text-lg font-semibold mb-4 text-gray-800">
          Fluxo de Trabalho
        </h2>
        <div className="flex gap-4 pb-4">
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
            color="bg-amber-400"
            onAddPet={onAddPet}
            allPets={pets}
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
            color="bg-sky-400"
            allPets={pets}
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
            color="bg-sky-400"
            allPets={pets}
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
            color="bg-sky-400"
            allPets={pets}
          />
        </div>
      </div>
    </div>
  )
}