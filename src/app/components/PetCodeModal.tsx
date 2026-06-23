"use client"

import React from "react"
import { Button } from "./ui/button"
import { CheckCircle2, Copy, BadgeCheck } from "lucide-react"

interface PetCodeModalProps {
  petNumber: string
  nomePet: string
  onClose: () => void
}

export function PetCodeModal({ petNumber, nomePet, onClose }: PetCodeModalProps) {
  const [copiado, setCopiado] = React.useState(false)

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(petNumber)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      /* clipboard pode falhar em http — ignora */
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl text-center animate-in fade-in zoom-in duration-200">
        {/* Ícone de sucesso */}
        <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-9 h-9 text-green-600" />
        </div>

        <h2 className="text-xl font-bold text-slate-800">
          {nomePet} cadastrado! 🐾
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          <strong>Anote o código abaixo.</strong> Use-o na próxima visita para
          já trazer os dados do pet automaticamente.
        </p>

        {/* Código em destaque */}
        <div className="mt-5 bg-indigo-50 border-2 border-dashed border-indigo-200 rounded-2xl py-4 px-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-400">
            Código do Pet
          </p>
          <p className="text-3xl font-mono font-extrabold text-indigo-700 tracking-wide mt-1">
            {petNumber}
          </p>
        </div>

        {/* Botão copiar */}
        <button
          type="button"
          onClick={copiar}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          {copiado ? (
            <>
              <BadgeCheck className="w-4 h-4" /> Copiado!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" /> Copiar código
            </>
          )}
        </button>

        {/* Botão fechar */}
        <Button
          onClick={onClose}
          className="w-full h-12 mt-5 rounded-2xl bg-indigo-700 hover:bg-indigo-600 text-white font-bold text-base"
        >
          Entendi, anotei!
        </Button>
      </div>
    </div>
  )
}
