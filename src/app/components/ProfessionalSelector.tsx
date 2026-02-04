import { useState } from "react"
import { Button } from "./ui/button"
import { Label } from "./ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"
import type { Pet } from "../types/pet"

interface ProfessionalSelectorProps {
  pet: Pet
  onSubmit: (profissionalNome: string) => void
  onCancel: () => void
  onAssignProfessional: (
    id: string,
    banho?: string,
    tosa?: string,
    escovar?: string,
  ) => void
}

const PROFISSIONAIS = [
  "Ana Silva",
  "Carlos Santos",
  "Maria Oliveira",
  "Pedro Costa",
  "Julia Ferreira",
  "Roberto Alves",
]

export function ProfessionalSelector({
  pet,
  onSubmit,
  onCancel,
  onAssignProfessional,
}: ProfessionalSelectorProps) {

 const [profissionalResponsavel, setProfissionalResponsavel] = useState(
   // Tenta pegar o nome já existente para facilitar a edição
   pet.status === "banho"
     ? pet.profissionalBanho || ""
     : pet.status === "escovar"
       ? pet.profissionalEscovar || ""
       : pet.status === "tosa"
         ? pet.profissionalTosa || ""
         : "",
 )

  // 2. Definição das variáveis que o erro apontou (Devem estar dentro da função)
  const isInicioAtendimento = pet.status === "espera"

  const labelDinamico = isInicioAtendimento
    ? "Profissional do BANHO *"
    : `Profissional de ${pet.proximaEtapa?.toUpperCase() || "SERVIÇO"} *`

  // 3. Função de envio
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault()
  e.stopPropagation()

  if (!profissionalResponsavel) return

  onSubmit(profissionalResponsavel)
}

const servicoEstaBloqueado =
  (pet.status === "banho" && pet.banhoCompleto) ||
  (pet.status === "escovar" && pet.escovarCompleto) ||
  (pet.status === "tosa" && pet.tosaCompleta)

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Quadro de Informações do Atendimento */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <h3 className="font-semibold text-blue-900 mb-2">
          Informações do Atendimento
        </h3>
        <div className="space-y-1 text-sm text-blue-800">
          <p>
            <strong>Pet:</strong> {pet.nomePet}
          </p>
          <p>
            <strong>Tutor:</strong> {pet.nomeTutor}
          </p>
          <p>
            <strong>Serviço:</strong> {pet.servico}
          </p>
          <p>
            <strong>Slot:</strong> {pet.slotNumber}
          </p>
        </div>
      </div>

      {/* CAMPO ÚNICO DINÂMICO */}
      <div className="space-y-3">
        <Label
          htmlFor="profResposavel"
          className="text-lg font-extrabold text-blue-700 block"
        >
          {labelDinamico}
        </Label>

        <Select
          value={profissionalResponsavel}
          onValueChange={setProfissionalResponsavel}
        >
          <SelectTrigger
            id="profResposavel"
            className="h-14 border-2 border-blue-200 focus:ring-blue-500 text-base"
          >
            <SelectValue placeholder="Selecione o profissional..." />
          </SelectTrigger>
          <SelectContent>
            {PROFISSIONAIS.map((prof) => (
              <SelectItem key={prof} value={prof} className="py-3">
                {prof}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <p className="text-xs text-blue-500 font-medium italic">
          {isInicioAtendimento
            ? "* Registre quem dará o banho inicial para começar."
            : `* Selecione o responsável pela etapa atual.`}
        </p>
      </div>

      <div className="flex gap-3 pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={(e) => {
            e.preventDefault()
            onCancel()
          }}
          className="flex-1 h-12"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={!profissionalResponsavel}
          className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold"
        >
          {servicoEstaBloqueado
            ? "Serviço Finalizado"
            : isInicioAtendimento
              ? "Confirmar BANHO"
              : "Confirmar"}
        </Button>
      </div>
    </form>
  )
}
