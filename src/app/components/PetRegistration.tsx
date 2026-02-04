"use client"

import React, { useState, useMemo } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { Upload } from "lucide-react"
import type { Pet } from "../types/pet"

const RACAS_CAO = [
  "SRD (Sem Raça Definida)",
  "Akita",
  "Beagle",
  "Border Collie",
  "Boxer",
  "Bulldog Francês",
  "Bulldog Inglês",
  "Chihuahua",
  "Cocker Spaniel",
  "Dachshund",
  "Dálmata",
  "Dobermann",
  "Golden Retriever",
  "Husky Siberiano",
  "Labrador",
  "Lhasa Apso",
  "Maltês",
  "Pastor Alemão",
  "Pinscher",
  "Pitbull",
  "Pomerânia",
  "Poodle",
  "Pug",
  "Rottweiler",
  "Schnauzer",
  "Shih Tzu",
  "Yorkshire",
]
const RACAS_GATO = [
  "SRD (Sem Raça Definida)",
  "Angorá",
  "Bengal",
  "British Shorthair",
  "Maine Coon",
  "Persa",
  "Ragdoll",
  "Siamês",
  "Sphynx",
]

interface PetRegistrationProps {
  onSubmit: (
    pet: Omit<Pet, "id" | "checkInTime" | "slotNumber" | "status"> & {
      slotNumber?: number
    },
  ) => void
  defaultSlot?: number
  allPets?: Pet[]
  showSlotSelector?: boolean
  initialData?: Pet
  isEditing?: boolean
}

// Componente de Select Nativo Estilizado
const NativeSelect = ({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
}: any) => (
  <div className="space-y-2">
    <Label className="text-sm font-semibold text-slate-700">{label}</Label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="flex h-11 w-full rounded-xl border-none bg-[#f1f3f5] px-3 py-2 text-sm font-medium text-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer"
      >
        <option value="" disabled className="text-slate-400">
          {placeholder || "Selecione..."}
        </option>
        {options.map((opt: any) => (
          <option
            key={typeof opt === "object" ? opt.value : opt}
            value={typeof opt === "object" ? opt.value : opt}
            className="text-slate-800"
          >
            {typeof opt === "object" ? opt.label : opt}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </div>
  </div>
)

export function PetRegistration({
  onSubmit,
  defaultSlot,
  allPets = [],
  showSlotSelector = false,
  initialData,
  isEditing = false,
}: PetRegistrationProps) {
  const [nomePet, setNomePet] = useState(initialData?.nomePet || "")
  const [nomeTutor, setNomeTutor] = useState(initialData?.nomeTutor || "")
  const [especie, setEspecie] = useState<"cao" | "gato" | "">(
    initialData?.especie || "",
  )
  const [raca, setRaca] = useState(initialData?.raca || "")
  const [porte, setPorte] = useState<"pequeno" | "medio" | "grande" | "">(
    initialData?.porte || "",
  )
  const [foto, setFoto] = useState(initialData?.foto || "")
  const [servico, setServico] = useState(() => {
    if (initialData?.servico === "banho_tosa") {
      return "tosa" // Converte o valor antigo (banho + tosa) para o novo automaticamente
    }
    return initialData?.servico || ""
  })
  const [observacoes, setObservacoes] = useState(initialData?.observacoes || "")
  const [selectedSlot, setSelectedSlot] = useState(
    initialData?.slotNumber || defaultSlot || 1,
  )

  const availableSlots = useMemo(() => {
    const occupiedSlots = allPets
      .filter((p) => (isEditing ? p.id !== initialData?.id : true))
      .map((p) => p.slotNumber)
    const slots = []
    for (let i = 1; i <= 100; i++) {
      if (!occupiedSlots.includes(i))
        slots.push({ value: i, label: `Slot ${i}` })
    }
    return slots
  }, [allPets, isEditing, initialData])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nomePet || !nomeTutor || !servico) return
    onSubmit({
      nomePet,
      nomeTutor,
      especie: especie || undefined,
      raca: raca || undefined,
      porte: porte || undefined,
      foto,
      servico: servico as any,
      observacoes,
      slotNumber: selectedSlot || defaultSlot,
    })
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setFoto(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  // Estilo comum para campos de texto
  const inputStyle =
    "h-11 rounded-xl border-none bg-[#f1f3f5] text-slate-800 font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20"

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 px-1 max-h-[80vh] overflow-y-auto"
    >
      {showSlotSelector && (
        <NativeSelect
          label="Slot/Vaga *"
          value={selectedSlot}
          onChange={(v: string) => setSelectedSlot(Number(v))}
          options={availableSlots}
        />
      )}

      <div className="border-t pt-4 space-y-4">
        <h3 className="font-bold text-sm text-slate-700 uppercase tracking-tight">
          Dados do Pet
        </h3>

        <div className="space-y-2">
          <Label htmlFor="nomePet" className="text-slate-700 font-semibold">
            Nome do Pet *
          </Label>
          <Input
            id="nomePet"
            placeholder="Ex: Bob"
            disabled={isEditing && initialData?.atendimentoIniciado} // Bloqueia
            className={inputStyle}
            value={nomePet}
            onChange={(e) => setNomePet(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NativeSelect
            label="Espécie"
            disabled={isEditing && initialData?.atendimentoIniciado}
            value={especie}
            onChange={(v: any) => {
              setEspecie(v)
              setRaca("")
            }}
            options={[
              { value: "cao", label: "🐕 Cão" },
              { value: "gato", label: "🐈 Gato" },
            ]}
          />
          <NativeSelect
            label="Porte"
            value={porte}
            disabled={(isEditing && initialData?.atendimentoIniciado)}
            onChange={(v: any) => setPorte(v)}
            options={["pequeno", "medio", "grande"]}
          />
        </div>

        <NativeSelect
          label="Raça"
          value={raca}
          onChange={setRaca}
          disabled={!especie || (isEditing && initialData?.atendimentoIniciado)}
          options={
            especie === "cao" ? RACAS_CAO : especie === "gato" ? RACAS_GATO : []
          }
          placeholder={
            especie ? "Selecione a raça..." : "Escolha a espécie primeiro"
          }
        />

        <div className="space-y-2">
          <Label className="text-slate-700 font-semibold">Foto do Pet</Label>
          <div className="flex gap-3">
            {foto && (
              <img
                src={foto}
                className="w-16 h-16 rounded-xl object-cover border-2 border-slate-100"
                alt="Pet"
              />
            )}
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="photo-upload"
              />
              <Label
                htmlFor="photo-upload"
                className="flex flex-col items-center justify-center h-16 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors text-slate-500"
              >
                <Upload className="w-4 h-4" />
                <span className="text-[10px] font-medium mt-1">
                  Fazer upload
                </span>
              </Label>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t pt-4 space-y-4">
        <h3 className="font-bold text-sm text-slate-700 uppercase tracking-tight">
          Dados do Tutor
        </h3>
        <div className="space-y-2">
          <Label htmlFor="nomeTutor" className="text-slate-700 font-semibold">
            Nome do Tutor *
          </Label>
          <Input
            id="nomeTutor"
            placeholder="Ex: João Silva"
            className={inputStyle}
            value={nomeTutor}
            onChange={(e) => setNomeTutor(e.target.value)}
            required
          />
        </div>

        <h3 className="font-bold text-sm text-slate-700 uppercase tracking-tight mt-4">
          Serviço
        </h3>
        <NativeSelect
          label="Tipo de Serviço *"
          disabled={isEditing && initialData?.atendimentoIniciado}
          value={servico}
          onChange={(v: any) => setServico(v)}
          options={[
            { value: "banho", label: "💧 Banho" },
            { value: "tosa", label: "✂️ Tosa" },
            { value: "higienica", label: "🌿 Higiênica (Tosa)" },
            { value: "ozonio", label: "⚡ Ozônio (Banho)" },
            { value: "hidratacao", label: "💧 Hidratação (Banho)" },
          ]}
        />

        <div className="space-y-2">
          <Label className="text-slate-700 font-semibold">Observações</Label>
          <Textarea
            placeholder="Observações importantes..."
            className="rounded-xl border-none bg-[#f1f3f5] text-slate-800 font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={2}
          />
        </div>
      </div>

      <Button
        type="submit"
        className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-all mt-4"
      >
        {isEditing ? "Salvar Alterações" : "Cadastrar Pet"}
      </Button>
    </form>
  )
}
