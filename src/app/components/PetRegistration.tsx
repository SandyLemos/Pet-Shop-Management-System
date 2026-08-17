"use client"

import { toast } from "sonner"
import React, { useState, useMemo, useEffect, useRef } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { Upload, Save, CheckCircle2, Search, X, Loader2, AlertTriangle } from "lucide-react"
import type { Pet } from "../types/pet"
import { useCloudinaryUpload } from "../../hooks/useCloudinaryUpload"
import { buscarPetsCadastro, type PetCadastro } from "../../services/petService"

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
  const [telefone, setTelefone] = useState((initialData as any)?.telefone || "")
  const [petNumber, setPetNumber] = useState((initialData as any)?.petNumber || "")
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
      return "tosa"
    }
    return initialData?.servico || ""
  })
  const [observacoes, setObservacoes] = useState(initialData?.observacoes || "")
  const [selectedSlot, setSelectedSlot] = useState(
    initialData?.slotNumber || defaultSlot || 1,
  )

  // Estados de busca de cadastro permanente
  const [termoBusca, setTermoBusca] = useState("")
  const [resultados, setResultados] = useState<PetCadastro[]>([])
  const [buscando, setBuscando] = useState(false)
  const [jaBuscou, setJaBuscou] = useState(false)
  const [petVinculado, setPetVinculado] = useState(!!(initialData as any)?.petNumber)

  // ✅ modal de aviso de telefone vazio
  const [showTelefoneAviso, setShowTelefoneAviso] = useState(false)

  // Ref para o bloco de busca (usado no scrollIntoView ao focar, importante em landscape)
  const buscaWrapperRef = useRef<HTMLDivElement>(null)

  // ✅ Ref para o input de busca (usado para fechar o teclado ao encontrar resultados)
  const inputBuscaRef = useRef<HTMLInputElement>(null)

  // Hook do Cloudinary
  const { uploadImage, uploading, error } = useCloudinaryUpload()

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

  // Executa busca no cadastro permanente (aceita termo do debounce)
  const handleBuscar = async (termo: string = termoBusca) => {
    const t = termo.trim()
    if (!t) {
      setResultados([])
      setJaBuscou(false)
      return
    }
    setBuscando(true)
    setJaBuscou(false)
    try {
      const achados = await buscarPetsCadastro(t)
      setResultados(achados)

      // ✅ Fecha o teclado automaticamente ao encontrar resultados
      if (achados.length > 0) {
        inputBuscaRef.current?.blur()
      }
    } catch (err) {
      console.error("[buscarPetsCadastro]", err)
    } finally {
      setBuscando(false)
      setJaBuscou(true)
    }
  }

  // ✅ Busca automática com debounce (350ms)
  useEffect(() => {
    if (petVinculado || isEditing) return
    const t = termoBusca.trim()

    // ✅ Se for só dígitos (busca por número), basta 1 caractere; senão, 2
    const apenasNumero = /^\d+$/.test(t)
    const minimo = apenasNumero ? 1 : 2

    if (t.length < minimo) {
      setResultados([])
      setJaBuscou(false)
      return
    }

    const timer = setTimeout(() => {
      handleBuscar(t)
    }, 350)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termoBusca, petVinculado, isEditing])

  // ✅ Limpa o campo de busca
  const limparBusca = () => {
    setTermoBusca("")
    setResultados([])
    setJaBuscou(false)
    setBuscando(false)
  }

  // Garante que o campo de busca fique visível ao ganhar foco (evita ficar escondido pelo teclado, principalmente em landscape)
  const handleFocusBusca = () => {
    setTimeout(() => {
      buscaWrapperRef.current?.scrollIntoView({ block: "center", behavior: "smooth" })
    }, 300)
  }

  // Preenche o formulário com um pet encontrado
  const selecionarPet = (p: PetCadastro) => {
    setNomePet(p.nomePet)
    setNomeTutor(p.nomeTutor)
    setTelefone(p.telefone || "")
    setEspecie(p.especie || "")
    setRaca(p.raca || "")
    setPorte(p.porte || "")
    setFoto(p.foto || "")
    setPetNumber(p.petNumber)
    setPetVinculado(true)
    setResultados([])
    setTermoBusca("")
    setJaBuscou(false)
  }

  // Desvincula (volta a ser cadastro novo)
  const limparVinculo = () => {
    setPetVinculado(false)
    setPetNumber("")
    setJaBuscou(false)
  }

  // ✅ Envio real do cadastro
  const enviarCadastro = () => {
    onSubmit({
      nomePet,
      nomeTutor,
      telefone: telefone || undefined,
      petNumber: petNumber || undefined,
      especie: especie || undefined,
      raca: raca || undefined,
      porte: porte || undefined,
      foto,
      servico: servico as any,
      observacoes,
      slotNumber: selectedSlot || defaultSlot,
    } as any)
    setShowTelefoneAviso(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!nomePet || !nomeTutor) return

    if (!servico) {
      toast.error("Selecione um serviço antes de finalizar o cadastro.")
      return
    }

    // ✅ Telefone não é obrigatório, mas avisa sobre o WhatsApp
    const telefoneVazio = !telefone || telefone.trim() === ""
    if (telefoneVazio && !isEditing) {
      setShowTelefoneAviso(true)
      return
    }
    enviarCadastro()
  }

  // Upload para o Cloudinary
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const url = await uploadImage(file)
    if (url) setFoto(url)
  }

  const inputStyle =
    "h-11 rounded-xl border-none bg-[#f1f3f5] text-slate-800 font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20"

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col h-full min-h-0 relative bg-white"
    >
      {/* ÁREA DE CAMPOS COM SCROLL */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 pt-2 pb-32 space-y-6 scrollbar-hide">

        {/* BARRA DE BUSCA DE PET CADASTRADO (só em cadastro novo) */}
        {!isEditing && (
          <div ref={buscaWrapperRef} className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 space-y-2">
            {petVinculado ? (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm text-indigo-700 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  Pet vinculado:{" "}
                  <span className="font-mono">{petNumber}</span>
                </div>
                <button
                  type="button"
                  onClick={limparVinculo}
                  className="text-indigo-400 hover:text-indigo-600 transition-colors"
                  title="Desvincular e cadastrar como novo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <Label className="text-xs font-bold text-indigo-700 uppercase tracking-wide">
                  Buscar pet já cadastrado
                </Label>

                {/* Campo de busca com ícone, spinner e botão limpar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <Input
                    ref={inputBuscaRef}
                    placeholder="Nº, nome ou telefone..."
                    value={termoBusca}
                    onChange={(e) => setTermoBusca(e.target.value)}
                    onFocus={handleFocusBusca}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleBuscar()
                      }
                    }}
                    className="h-10 rounded-lg border-none bg-white text-slate-800 font-medium pl-9 pr-9"
                  />
                  {/* Spinner enquanto busca / botão limpar quando há texto */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                    {buscando ? (
                      <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                    ) : (
                      termoBusca && (
                        <button
                          type="button"
                          onClick={limparBusca}
                          className="text-slate-400 hover:text-slate-600 transition-colors"
                          title="Limpar busca"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Feedback "buscando..." */}
                {buscando && (
                  <p className="flex items-center gap-1.5 text-xs text-indigo-500 font-medium px-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Buscando...
                  </p>
                )}

                {/* Resultados */}
                {!buscando && resultados.length > 0 && (
                  <ul className="bg-white rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto border border-slate-100">
                    {resultados.map((p) => (
                      <li key={p.petNumber}>
                        <button
                          type="button"
                          onClick={() => selecionarPet(p)}
                          className="w-full text-left px-3 py-2 hover:bg-indigo-50 transition-colors flex items-center gap-2"
                        >
                          <span className="text-base shrink-0">
                            {p.especie === "gato" ? "🐈" : "🐕"}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">
                              {p.nomePet}{" "}
                              <span className="font-mono text-xs text-indigo-500">
                                {p.petNumber}
                              </span>
                            </p>
                            <p className="text-xs text-slate-400 truncate">
                              {p.nomeTutor} · {p.telefone || "sem telefone"}
                            </p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Nenhum resultado */}
                {!buscando && jaBuscou && resultados.length === 0 && (
                  <p className="text-xs text-slate-400 italic px-1">
                    Nenhum pet encontrado — preencha abaixo para cadastrar novo.
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* 1. SLOT (SE DISPONÍVEL) */}
        {showSlotSelector && (
          <NativeSelect
            label="Slot/Vaga *"
            value={selectedSlot}
            onChange={(v: string) => setSelectedSlot(Number(v))}
            options={availableSlots}
          />
        )}

        <div className="pt-2 space-y-4">

          {/* 2. NOME DO PET */}
          <div className="space-y-2">
            <Label
              htmlFor="nomePet"
              className="text-slate-700 font-bold text-base"
            >
              Nome do Pet *
            </Label>
            <Input
              id="nomePet"
              placeholder="Ex: Bob"
              //autoFocus
              disabled={isEditing && initialData?.atendimentoIniciado}
              className={inputStyle}
              value={nomePet}
              onChange={(e) => setNomePet(e.target.value)}
              required
            />
          </div>

          {/* 3. ESPÉCIE, PORTE E RAÇA */}
          <div className="grid grid-cols-2 gap-3">
            <NativeSelect
              label="Espécie *"
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
              label="Porte *"
              value={porte}
              disabled={isEditing && initialData?.atendimentoIniciado}
              onChange={(v: any) => setPorte(v)}
              options={["pequeno", "medio", "grande"]}
            />
          </div>

          <NativeSelect
            label="Raça *"
            value={raca}
            onChange={setRaca}
            disabled={!especie || (isEditing && initialData?.atendimentoIniciado)}
            options={
              especie === "cao"
                ? RACAS_CAO
                : especie === "gato"
                ? RACAS_GATO
                : []
            }
            placeholder={
              especie ? "Selecione a raça..." : "Escolha a espécie primeiro"
            }
          />

          {/* 4. NOME DO TUTOR */}
          <div className="space-y-2">
            <Label
              htmlFor="nomeTutor"
              className="text-slate-700 font-bold text-base"
            >
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

          {/* 4b. TELEFONE DO TUTOR */}
          <div className="space-y-2">
            <Label
              htmlFor="telefone"
              className="text-slate-700 font-bold text-base"
            >
              Telefone do Tutor
            </Label>
            <Input
              id="telefone"
              type="tel"
              placeholder="Ex: (24) 99999-9999"
              className={inputStyle}
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />
          </div>

          {/* 5. SERVIÇO */}
          <div className="space-y-2">
            <Label
              htmlFor="tipoServico"
              className="text-slate-700 font-bold text-base"
            >
              Tipo de Serviço *
            </Label>
            <NativeSelect
              id="tipoServico"
              label=""
              disabled={isEditing && initialData?.atendimentoIniciado}
              value={servico}
              onChange={(v: any) => setServico(v)}
              className={`${inputStyle} h-12`}
              options={[
                { value: "banho", label: "💧 Banho" },
                { value: "tosa", label: "✂️ Tosa" },
                { value: "higienica", label: "🌿 Higiênica (Tosa)" },
                { value: "ozonio", label: "⚡ Ozônio (Banho)" },
                { value: "hidratacao", label: "💧 Hidratação (Banho)" },
              ]}
            />
          </div>

          {/* DIVISOR OPCIONAL */}
          <div className="border-t border-dashed pt-4 opacity-60">
            <h3 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest">
              Informações Opcionais
            </h3>
          </div>

          {/* 6. FOTO DO PET */}
          <div className="space-y-2">
            <Label className="text-slate-600 font-semibold text-sm">
              Foto do Pet
            </Label>
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
                  disabled={uploading}
                />
                <Label
                  htmlFor="photo-upload"
                  className="flex flex-col items-center justify-center h-16 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors text-slate-500"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-[10px] font-medium mt-1">
                        Enviando...
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span className="text-[10px] font-medium mt-1">
                        Upload Foto
                      </span>
                    </>
                  )}
                </Label>

                {/* Erro de upload */}
                {error && (
                  <p className="text-[11px] text-red-500 font-medium mt-1 px-1">
                    ⚠️ {error}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 7. OBSERVAÇÕES */}
          <div className="space-y-2 pb-4">
            <Label className="text-slate-600 font-semibold text-sm">
              Observações
            </Label>
            <Textarea
              placeholder="Alergias, comportamento, etc..."
              className="rounded-xl border-none bg-[#f1f3f5] text-slate-800 font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* RODAPÉ FIXO */}
      <div className="absolute bottom-0 left-0 right-0 p-5 bg-white/80 backdrop-blur-md border-t border-slate-100/50 z-10">
        <Button
          type="submit"
          disabled={uploading}
          className="w-full h-14 rounded-2xl bg-indigo-700 hover:bg-indigo-600 text-white font-bold text-lg shadow-[0_10px_15px_-3px_rgba(79,70,229,0.3)] transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isEditing ? (
            <>
              <Save className="w-5 h-5 stroke-[2.5px]" />
              <span>Atualizar Registro</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5 stroke-[2.5px]" />
              <span>Finalizar e Cadastrar</span>
            </>
          )}
        </Button>
      </div>

      {/* ✅ MODAL DE AVISO — TELEFONE VAZIO */}
      {showTelefoneAviso && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowTelefoneAviso(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-sm p-6 flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-orange-100 p-3 rounded-2xl">
              <AlertTriangle className="w-7 h-7 text-orange-500" />
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-base font-bold text-slate-800">
                Telefone não informado
              </h2>
              <p className="text-sm text-slate-500">
                Sem o número de telefone, o{" "}
                <strong>aviso automático via WhatsApp</strong> não será enviado
                ao tutor quando o pet estiver pronto.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full mt-1">
              <button
                type="button"
                onClick={() => setShowTelefoneAviso(false)}
                className="w-full py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-600 text-white text-sm font-semibold transition"
              >
                Cadastrar número
              </button>
              <button
                type="button"
                onClick={enviarCadastro}
                className="w-full py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm font-semibold hover:bg-slate-100 transition"
              >
                Continuar sem telefone
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  )
}
