import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Droplet,
  Wind,
  Scissors,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowLeft,
  RotateCcw,
  PackageCheck,
  Calendar,
} from "lucide-react"
import type { Pet, SlotStatus } from '../types/pet';
import { motion, AnimatePresence } from 'motion/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { PetRegistration } from './PetRegistration';
import { ProfessionalSelector } from './ProfessionalSelector';
import { ReversionDialog } from "./ReversionDialog"
import { PetDetailModal } from './PetDetailModal';
import { useState } from 'react';

const DIALOG_SELETOR_CLASS =
  "sm:max-w-lg p-0 gap-0 h-[88vh] max-h-[88vh] sm:h-[80vh] flex flex-col overflow-hidden"

const DIALOG_HEADER_CLASS =
  "shrink-0 px-5 py-4 border-b border-slate-100 text-left"

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
  onAdvanceStage: (
    petId: string,
    newStatus: SlotStatus,
    profissionais: { pB?: string; pT?: string; pE?: string },
    problemasField?: { campo: string; delta: string[] },
  ) => void
}

interface PetCardProps {
  pet: Pet
  onOpenDetail?: (pet: Pet) => void;
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
  onAdvanceStage: (
    petId: string,
    newStatus: SlotStatus,
    profissionais: { pB?: string; pT?: string; pE?: string },
    problemasField?: { campo: string; delta: string[] },
  ) => void
  allPets: Pet[]
}

export function PetCard({
  pet,
  onOpenDetail,
  onUpdateStatus,
  onRevertService,
  onCheckout,
  onEditPet,
  onDeletePet,
  onAssignProfessional,
  onMarkServiceComplete,
  onAdvanceStage,
  allPets,
}: PetCardProps) {
  const [isProfessionalDialogOpen, setIsProfessionalDialogOpen] = useState(false)
  const [isEditPetOpen, setIsEditPetOpen]                       = useState(false)
  const [isEditProfessionalOpen, setIsEditProfessionalOpen]     = useState(false)
  const [isReversionDialogOpen, setIsReversionDialogOpen]       = useState(false)
  const [isFinalizarDialogOpen, setIsFinalizarDialogOpen]       = useState(false)
  const [showSuccessFeedback, setShowSuccessFeedback]           = useState(false)
  const [etapaDestino, setEtapaDestino]                         = useState<string>("")

  const getServiceColor = (servico: string) => {
    switch (servico) {
      case "banho":      return "bg-blue-100 text-blue-800"
      case "tosa":       return "bg-purple-100 text-purple-800"
      case "banho_tosa": return "bg-pink-100 text-pink-800"
      case "higienica":  return "bg-green-100 text-green-800"
      case "ozonio":     return "bg-cyan-100 text-cyan-800"
      case "hidratacao": return "bg-indigo-100 text-indigo-800"
      default:           return "bg-gray-100 text-gray-800"
    }
  }

  const getServiceLabel = (servico: string) => {
    const labels: Record<string, string> = {
      banho:      "Banho",
      tosa:       "Tosa",
      banho_tosa: "Banho + Tosa",
      higienica:  "Higiênica",
      ozonio:     "Ozônio",
      hidratacao: "Hidratação",
    }
    return labels[servico] || servico
  }

  const handlePreviousStatus = () => {
    if (pet.status === "escovar") {
      onEditPet(pet.id, {
        status: "banho",
        profissionalEscovar: null,
        escovarCompleto: false,
        problemasSaudeEscovar: [],
      } as Partial<Pet>)
    } else if (pet.status === "tosa") {
      onEditPet(pet.id, {
        status: "escovar",
        profissionalTosa: null,
        tosaCompleta: false,
        problemasSaudeTosa: [],
      } as Partial<Pet>)
    }
  }

  const handleVoltarParaAguardando = () => {
    onEditPet(pet.id, {
      status: "espera",
      profissionalBanho: null,
      banhoCompleto: false,
      problemasSaudeBanho: [],
      atendimentoIniciado: false,
    } as Partial<Pet>)
  }

  const needsTosa = ["tosa", "banho_tosa", "higienica"].includes(pet.servico)

  const isReadyForPickup = () => {
    const baseReady = pet.banhoCompleto && pet.escovarCompleto
    if (needsTosa) return pet.status === "tosa" && baseReady && pet.tosaCompleta
    return pet.status === "escovar" && baseReady
  }

  const handleMarkAsReady = () => {
    if (isReadyForPickup()) {
      setIsFinalizarDialogOpen(true)
    } else {
      alert("Conclua a escovação antes de finalizar!")
    }
  }

  const handleConfirmarFinalizacao = () => {
    setIsFinalizarDialogOpen(false)
    setShowSuccessFeedback(true)

    setTimeout(() => {
      onUpdateStatus(pet.id, "finalizado")
    }, 1800)
  }

  const temFoto             = !!pet.foto
  const nomeLongo           = pet.nomePet && pet.nomePet.length > 12
  const usarLayoutExpandido = nomeLongo
  const estaProntoParaRetirada = pet.status === "finalizado"

  const prepararAvanco = (e: React.MouseEvent, etapa: string) => {
    e.stopPropagation()
    setEtapaDestino(etapa)
    setIsProfessionalDialogOpen(true)
  }

  const handleQuickEditProfessional = (novoProfissional: string) => {
    let pBanho   = pet.profissionalBanho
    let pEscovar = pet.profissionalEscovar
    let pTosa    = pet.profissionalTosa

    switch (pet.status) {
      case "banho":   pBanho   = novoProfissional; break
      case "escovar": pEscovar = novoProfissional; break
      case "tosa":    pTosa    = novoProfissional; break
      default:        pBanho   = novoProfissional
    }

    onAssignProfessional(
      pet.id,
      pBanho ?? undefined,
      pTosa ?? undefined,
      pEscovar ?? undefined
    )
  }

  const calcularDeltaProblemas = (etapa: string, problemasAcumulados: string[]) => {
    const campo =
      etapa === "banho"   ? "problemasSaudeBanho"   :
      etapa === "escovar" ? "problemasSaudeEscovar" :
      etapa === "tosa"    ? "problemasSaudeTosa"    : null
    if (!campo) return undefined
    const anteriores: string[] =
      etapa === "escovar"
        ? (pet.problemasSaudeBanho ?? [])
        : etapa === "tosa"
          ? [...(pet.problemasSaudeBanho ?? []), ...(pet.problemasSaudeEscovar ?? [])]
          : []
    const setAnteriores = new Set(anteriores)
    const delta = problemasAcumulados.filter((id) => !setAnteriores.has(id))
    return { campo, delta }
  }

  const salvarProblemasSaude = (etapa: string, problemasAcumulados: string[]) => {
    const resultado = calcularDeltaProblemas(etapa, problemasAcumulados)
    if (!resultado) return
    onEditPet(pet.id, { [resultado.campo]: resultado.delta } as Partial<Pet>)
  }

  // ── Card COMPACTO para espera ──
  if (pet.status === "espera") {
    return (
      <>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card
              className="mb-2 mt-1 mr-2 gap-0 relative cursor-pointer hover:shadow-md hover:border-blue-200 transition-all"
              onClick={() => onOpenDetail?.(pet)}
            >
            <div className="absolute -top-2.5 -right-2.5 bg-gradient-to-br from-blue-500 to-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shadow-lg z-20 ring-2 ring-white">
              {pet.slotNumber}
            </div>

          <CardContent className="p-2 [&:last-child]:pb-2">
            <div className="flex items-center gap-2 pr-6">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 text-base sm:text-lg truncate leading-tight">
                  {pet.nomePet}
                </p>
              </div>

              <Badge className={`${getServiceColor(pet.servico)} text-xs px-2.5 py-1 whitespace-nowrap flex-shrink-0`}>
                {getServiceLabel(pet.servico)}
              </Badge>
            </div>

            <Button
              className="w-full bg-blue-500 hover:bg-blue-600 h-7 text-[11px] mt-2"
              onClick={(e) => prepararAvanco(e, "banho")}
            >
              <Droplet className="w-3 h-3 mr-1" /> Iniciar Atendimento
            </Button>
          </CardContent>
          </Card>
        </motion.div>

        <Dialog open={isProfessionalDialogOpen} onOpenChange={setIsProfessionalDialogOpen}>
          <DialogContent
            className={DIALOG_SELETOR_CLASS}
            onClick={(e) => e.stopPropagation()}
          >
            <DialogHeader className={DIALOG_HEADER_CLASS}>
              <DialogTitle>Selecionar Profissional</DialogTitle>
              <DialogDescription className="sr-only">
                Escolha o profissional responsável e marque os problemas de saúde do pet.
              </DialogDescription>
            </DialogHeader>

            <ProfessionalSelector
              fillHeight
              pet={{ ...pet, proximaEtapa: etapaDestino || "banho" }}
              onCancel={() => { setIsProfessionalDialogOpen(false); setEtapaDestino("") }}
              onAssignProfessional={onAssignProfessional}
              onSubmit={(profissionalEscolhido, problemasSaude) => {
                const problemasField = calcularDeltaProblemas("banho", problemasSaude)
                onAdvanceStage(pet.id, "banho", { pB: profissionalEscolhido }, problemasField)
                setIsProfessionalDialogOpen(false)
                setEtapaDestino("")
              }}
            />
          </DialogContent>
        </Dialog>
      </>
    )
  }

  // ── Card COMPLETO ──
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card
        className={`mb-2 mt-1 mr-2 gap-0 relative cursor-pointer hover:shadow-md transition-all ${
          estaProntoParaRetirada ? 'border-green-300 shadow-green-100 shadow-md' : 'hover:border-blue-200'
        }`}
        onClick={() => onOpenDetail?.(pet)}
      >

        <AnimatePresence>
          {showSuccessFeedback && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 z-50 bg-green-500 flex flex-col items-center justify-center gap-2 rounded-xl overflow-hidden"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
              >
                <CheckCircle2 className="w-12 h-12 text-white drop-shadow" />
              </motion.div>
              <div className="text-center px-4">
                <p className="text-white font-bold text-sm leading-tight">
                  {pet.nomePet} está pronto!
                </p>
                <p className="text-green-100 text-[11px] mt-0.5">
                  Disponibilizado para retirada 🐾
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {usarLayoutExpandido ? (
          <CardHeader className="gap-0 px-3 pt-2 pb-0">
            {pet.status !== "finalizado" && !showSuccessFeedback && (
              <div className="absolute -top-2.5 -right-2.5 bg-gradient-to-br from-blue-500 to-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shadow-lg z-20 ring-2 ring-white">
                {pet.slotNumber}
              </div>
            )}
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-start gap-1.5 flex-1 min-w-0 pr-6">
                <Badge className={`${getServiceColor(pet.servico)} text-xs px-2.5 py-1 whitespace-nowrap`}>
                  {getServiceLabel(pet.servico)}
                </Badge>
                <CardTitle className="text-base sm:text-lg font-bold text-gray-800 leading-tight truncate">
                  {pet.nomePet}
                </CardTitle>
              </div>
            </div>
          </CardHeader>
        ) : (
          <CardHeader className="gap-0 px-3 pt-2.5 pb-0">
            {pet.status !== "finalizado" && !showSuccessFeedback && (
              <div className="absolute -top-2.5 -right-2.5 bg-gradient-to-br from-blue-500 to-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shadow-lg z-20 ring-2 ring-white">
                {pet.slotNumber}
              </div>
            )}
            <div className="flex items-start justify-between gap-2 pr-6">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base sm:text-lg font-bold leading-tight break-words whitespace-normal text-gray-800 m-0">
                  {pet.nomePet}
                </CardTitle>
              </div>
              <Badge className={`${getServiceColor(pet.servico)} text-xs px-2.5 py-1 whitespace-nowrap flex-shrink-0`}>
                {getServiceLabel(pet.servico)}
              </Badge>
            </div>
          </CardHeader>
        )}

        <CardContent className="space-y-1 px-3 pt-0 [&:last-child]:pb-2">
          <div className="space-y-0.5 py-1 border-y border-gray-100 mt-0 mb-1 bg-slate-50/50 rounded-sm px-2">
            {pet.profissionalBanho && (
              <div className={`flex items-center gap-2 text-[11px] ${pet.banhoCompleto ? "text-gray-400" : "text-gray-700"}`}>
                <Droplet className={`w-3 h-3 ${pet.banhoCompleto ? "text-gray-300" : "text-blue-500"}`} />
                <span className="flex items-center gap-1">
                  <span className="font-medium">Banho:</span>
                  <span className={pet.banhoCompleto ? "line-through decoration-gray-300" : "font-bold"}>
                    {pet.profissionalBanho}
                  </span>
                  {pet.banhoCompleto && <CheckCircle2 className="w-3 h-3 text-green-500 ml-1" />}
                </span>
              </div>
            )}
            {(pet.profissionalEscovar || pet.status === "escovar" || pet.escovarCompleto) && (
              <div className={`flex items-center gap-2 text-[11px] ${pet.escovarCompleto ? "text-gray-400" : "text-gray-700"}`}>
                <Wind className={`w-3 h-3 ${pet.escovarCompleto ? "text-gray-300" : "text-cyan-500"}`} />
                <span className="flex items-center gap-1">
                  <span className="font-medium">Escovar:</span>
                  <span className={pet.escovarCompleto ? "line-through decoration-gray-300" : "font-bold"}>
                    {pet.profissionalEscovar}
                  </span>
                  {pet.escovarCompleto && <CheckCircle2 className="w-3 h-3 text-green-500 ml-1" />}
                </span>
              </div>
            )}
            {needsTosa && (pet.profissionalTosa || pet.status === "tosa") && (
              <div className={`flex items-center gap-2 text-[11px] ${pet.tosaCompleta ? "text-gray-400" : "text-gray-700"}`}>
                <Scissors className={`w-3 h-3 ${pet.tosaCompleta ? "text-gray-300" : "text-purple-500"}`} />
                <span className="flex items-center gap-1">
                  <span className="font-medium">Tosa:</span>
                  <span className={pet.tosaCompleta ? "line-through decoration-gray-300" : "font-bold"}>
                    {pet.profissionalTosa || "Pendente"}
                  </span>
                  {pet.tosaCompleta && <CheckCircle2 className="w-3 h-3 text-green-500 ml-1" />}
                </span>
              </div>
            )}
          </div>

          {pet.observacoes && (
            <div className="flex items-start gap-2 text-orange-600 bg-orange-50 p-1.5 rounded">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span className="text-[11px]">{pet.observacoes}</span>
            </div>
          )}

          {pet.status !== "finalizado" && (
            <div className="flex gap-1 pt-0.5">
              <Badge variant={pet.banhoCompleto ? "default" : "outline"} className="text-[10px] px-1.5 py-0">
                {pet.banhoCompleto ? "✓" : "○"} Banho
              </Badge>
              <Badge variant={pet.escovarCompleto ? "default" : "outline"} className="text-[10px] px-1.5 py-0">
                {pet.escovarCompleto ? "✓" : "○"} Escovar
              </Badge>
              {needsTosa && (
                <Badge variant={pet.tosaCompleta ? "default" : "outline"} className="text-[10px] px-1.5 py-0">
                  {pet.tosaCompleta ? "✓" : "○"} Tosa
                </Badge>
              )}
            </div>
          )}

          <div className="pt-0 space-y-1">

            <Dialog open={isFinalizarDialogOpen} onOpenChange={setIsFinalizarDialogOpen}>
              <DialogContent className="sm:max-w-sm" onClick={(e) => e.stopPropagation()}>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-green-700">
                    <PackageCheck className="w-5 h-5" />
                    Disponibilizar para Retirada
                  </DialogTitle>
                  <DialogDescription className="pt-1">
                    Tem certeza que deseja finalizar o serviço de{' '}
                    <strong className="text-gray-800">{pet.nomePet}</strong> e
                    disponibilizá-lo para retirada pelo tutor?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex gap-2 sm:gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsFinalizarDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                    onClick={handleConfirmarFinalizacao}
                  >
                    <PackageCheck className="w-4 h-4 mr-2" />
                    Sim, Disponibilizar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isProfessionalDialogOpen} onOpenChange={setIsProfessionalDialogOpen}>
              <DialogContent
                className={DIALOG_SELETOR_CLASS}
                onClick={(e) => e.stopPropagation()}
              >
                <DialogHeader className={DIALOG_HEADER_CLASS}>
                  <DialogTitle>Selecionar Profissional</DialogTitle>
                  <DialogDescription className="sr-only">
                    Escolha o profissional responsável e marque os problemas de saúde do pet.
                  </DialogDescription>
                </DialogHeader>

                <ProfessionalSelector
                  fillHeight
                  pet={{ ...pet, proximaEtapa: etapaDestino || pet.status }}
                  onCancel={() => { setIsProfessionalDialogOpen(false); setEtapaDestino("") }}
                  onAssignProfessional={onAssignProfessional}
                  onSubmit={(profissionalEscolhido, problemasSaude) => {
                    const etapaRef = etapaDestino || pet.status
                    const problemasField = calcularDeltaProblemas(etapaRef, problemasSaude)

                    if (etapaDestino) {
                      const profissionais = {
                        pB: etapaDestino === "banho"   ? profissionalEscolhido : undefined,
                        pE: etapaDestino === "escovar" ? profissionalEscolhido : undefined,
                        pT: etapaDestino === "tosa"    ? profissionalEscolhido : undefined,
                      }
                      onAdvanceStage(
                        pet.id,
                        etapaDestino as SlotStatus,
                        profissionais,
                        problemasField,
                      )
                    } else {
                      handleQuickEditProfessional(profissionalEscolhido)
                      salvarProblemasSaude(etapaRef, problemasSaude)
                    }

                    setIsProfessionalDialogOpen(false)
                    setEtapaDestino("")
                  }}
                />
              </DialogContent>
            </Dialog>

            {pet.status === "banho" && (
              <div className="space-y-1">
                {!pet.banhoCompleto ? (
                  <>
                    <Button onClick={(e) => { e.stopPropagation(); onMarkServiceComplete(pet.id, "banho") }} className="w-full h-7 text-xs bg-blue-500">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Marcar Banho Completo
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full h-6 text-[11px] text-gray-400" onClick={(e) => { e.stopPropagation(); handleVoltarParaAguardando() }}>
                      <ArrowLeft className="w-3 h-3 mr-1.5" /> Voltar para Aguardando
                    </Button>
                  </>
                ) : (
                  <>
                    <Button onClick={(e) => prepararAvanco(e, "escovar")} className="w-full h-7 text-xs bg-cyan-500">
                      <Wind className="w-3.5 h-3.5 mr-1.5" /> Avançar para Escovar
                    </Button>
                    <Button variant="outline" size="sm" className="w-full h-6 text-[11px] border-red-100 text-red-400" onClick={(e) => { e.stopPropagation(); setIsReversionDialogOpen(true) }}>
                      <RotateCcw className="w-3 h-3 mr-1.5" /> Reverter Banho
                    </Button>
                  </>
                )}
              </div>
            )}

            {pet.status === "escovar" && (
              <div className="space-y-1">
                {!pet.escovarCompleto ? (
                  <Button onClick={(e) => { e.stopPropagation(); onMarkServiceComplete(pet.id, "escovar") }} className="w-full h-7 text-xs bg-cyan-500">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Finalizar Escovação
                  </Button>
                ) : needsTosa ? (
                  <Button onClick={(e) => prepararAvanco(e, "tosa")} className="w-full h-7 text-xs bg-purple-500">
                    <Scissors className="w-3.5 h-3.5 mr-1.5" /> Avançar para Tosa
                  </Button>
                ) : (
                  <Button onClick={(e) => { e.stopPropagation(); handleMarkAsReady() }} className="w-full h-7 text-xs bg-green-500 hover:bg-green-600">
                    <PackageCheck className="w-3.5 h-3.5 mr-1.5" /> Disponibilizar para Retirada
                  </Button>
                )}
                <Button onClick={(e) => { e.stopPropagation(); handlePreviousStatus() }} variant="outline" className="w-full h-6 text-[11px]">
                  <ArrowLeft className="w-3 h-3 mr-1.5" /> Voltar para Banho
                </Button>
              </div>
            )}

            {pet.status === "tosa" && (
              <div className="space-y-1">
                {!pet.tosaCompleta ? (
                  <Button onClick={(e) => { e.stopPropagation(); onMarkServiceComplete(pet.id, "tosa") }} className="w-full h-7 text-xs bg-purple-600">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Marcar Tosa Completa
                  </Button>
                ) : (
                  <Button onClick={(e) => { e.stopPropagation(); handleMarkAsReady() }} className="w-full h-7 text-xs bg-green-500 hover:bg-green-600">
                    <PackageCheck className="w-3.5 h-3.5 mr-1.5" /> Disponibilizar para Retirada
                  </Button>
                )}
                <Button onClick={(e) => { e.stopPropagation(); handlePreviousStatus() }} variant="outline" className="w-full h-6 text-[11px]">
                  <ArrowLeft className="w-3 h-3 mr-1.5" /> Voltar para Escovar
                </Button>
              </div>
            )}

            {pet.status === "finalizado" && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1.5">
                  <PackageCheck className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                  <p className="text-[11px] font-semibold text-green-700">
                    Serviço finalizado — aguardando retirada
                  </p>
                </div>
                <Button
                  onClick={(e) => { e.stopPropagation(); onCheckout(pet.id) }}
                  className="w-full h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Retirar Pet
                </Button>
              </div>
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

      <Dialog open={isEditPetOpen} onOpenChange={setIsEditPetOpen}>
        <DialogContent
          className="sm:max-w-2xl h-[85vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>Editar Perfil do Pet</DialogTitle>
            <DialogDescription className="sr-only">
              Edite as informações cadastrais do pet.
            </DialogDescription>
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

      <Dialog open={isEditProfessionalOpen} onOpenChange={setIsEditProfessionalOpen}>
        <DialogContent
          className={DIALOG_SELETOR_CLASS}
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader className={DIALOG_HEADER_CLASS}>
            <DialogTitle>
              {pet.status === "banho"   && "Alterar Responsável pelo Banho"}
              {pet.status === "escovar" && "Alterar Responsável pela Escovação"}
              {pet.status === "tosa"    && "Alterar Tosador"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Altere o profissional responsável por esta etapa.
            </DialogDescription>
          </DialogHeader>

          <ProfessionalSelector
            fillHeight
            pet={{ ...pet, proximaEtapa: pet.status }}
            onCancel={() => setIsEditProfessionalOpen(false)}
            onAssignProfessional={onAssignProfessional}
            onSubmit={(profissionalEscolhido, problemasSaude) => {
              handleQuickEditProfessional(profissionalEscolhido)
              salvarProblemasSaude(pet.status, problemasSaude)
              setIsEditProfessionalOpen(false)
            }}
          />
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

// ── Colunas e Kanban ──
interface KanbanColumnProps {
  status: SlotStatus
  title: string
  icon: React.ReactNode
  pets: Pet[]
  onRevertService: (id: string, etapa: string, motivo: string) => void
  onUpdateStatus: (petId: string, newStatus: SlotStatus) => void
  onCheckout: (petId: string) => void
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
  onAddPet?: (pet: Omit<Pet, "id" | "checkInTime">) => void
  allPets?: Pet[]
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
}: KanbanColumnProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [detailPet, setDetailPet]       = useState<Pet | null>(null)

  const columnPets = pets.filter((p) => p.status === status)

  const getNextAvailableSlot = () => {
    const occupiedSlots = allPets.map((p) => p.slotNumber)
    for (let i = 1; i <= 100; i++) {
      if (!occupiedSlots.includes(i)) return i
    }
    return 1
  }

  const handleAddFromColumn = (petData: any) => {
    if (onAddPet) {
      const finalSlot = Number(petData.slotNumber) || getNextAvailableSlot()
      onAddPet({
        ...petData,
        slotNumber: finalSlot,
        status: "espera" as SlotStatus,
      } as Omit<Pet, "id" | "checkInTime">)
      setIsDialogOpen(false)
    }
  }

  return (
    // 🔧 ALTERADO: coluna virou flex vertical com altura total do trilho
    <div className="flex-1 min-w-[280px] flex flex-col min-h-0 transition-colors rounded-lg">
      {/* 🔧 ALTERADO: header fixo (shrink-0) */}
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

      {/* 🔧 ALTERADO: corpo com scroll próprio; min-h só no desktop */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-gray-50 rounded-b-lg min-h-[200px] xl:min-h-[400px]">
        {columnPets.map((pet) => (
          <PetCard
            key={pet.id}
            pet={pet}
            onOpenDetail={setDetailPet}
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
        {status === "espera" && onAddPet && (
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
                <DialogTitle>Adicionar Animal - Slot {getNextAvailableSlot()}</DialogTitle>
                <DialogDescription className="sr-only">
                  Formulário para cadastrar um novo pet no sistema.
                </DialogDescription>
              </DialogHeader>
              <PetRegistration
                onSubmit={handleAddFromColumn}
                defaultSlot={getNextAvailableSlot()}
                allPets={allPets}
                showSlotSelector={true}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <PetDetailModal
        pet={detailPet}
        open={!!detailPet}
        onClose={() => setDetailPet(null)}
        onEdit={onEditPet}
        onDelete={(id) => { onDeletePet(id); setDetailPet(null) }}
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
  return (
    // 🔧 ALTERADO: wrapper com a classe .flow-area (travada só no tablet via CSS)
    <div className="flex gap-6 flow-area md:h-[calc(100dvh-300px)] md:overflow-hidden xl:h-auto xl:overflow-visible">
      {/* 🔧 ALTERADO: coluna flex vertical, sem overflow aqui */}
      <div className="flex-1 flex flex-col min-h-0">
        <h2 className="shrink-0 text-lg font-semibold mb-4 text-gray-800">
          Fluxo de Trabalho
        </h2>

        {/* 🔧 ALTERADO: trilho rolável que ocupa o espaço restante */}
        <div className="flex-1 min-h-0 overflow-x-auto md:overflow-y-auto">
          <div className="flex gap-4 pb-4 h-full">
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
            />
          </div>
        </div>
      </div>
    </div>
  )
}
