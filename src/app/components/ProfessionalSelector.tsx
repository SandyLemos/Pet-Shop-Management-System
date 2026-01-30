import { useState } from 'react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import type { Pet } from '../types/pet';

interface ProfessionalSelectorProps {
  pet: Pet;
  onSubmit: (profissionalBanho?: string, profissionalTosa?: string) => void;
  onCancel: () => void;
}

const PROFISSIONAIS = [
  'Ana Silva',
  'Carlos Santos',
  'Maria Oliveira',
  'Pedro Costa',
  'Julia Ferreira',
  'Roberto Alves',
];

export function ProfessionalSelector({ pet, onSubmit, onCancel }: ProfessionalSelectorProps) {
  const [profissionalBanho, setProfissionalBanho] = useState('');
  const [profissionalTosa, setProfissionalTosa] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validações baseadas no tipo de serviço
    if ((pet.servico === 'banho' || pet.servico === 'hidratacao' || pet.servico === 'ozonio') && !profissionalBanho) {
      return;
    }
    if ((pet.servico === 'tosa' || pet.servico === 'higienica') && !profissionalTosa) {
      return;
    }
    if (pet.servico === 'banho_tosa' && (!profissionalBanho || !profissionalTosa)) {
      return;
    }

    onSubmit(profissionalBanho || undefined, profissionalTosa || undefined);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <h3 className="font-semibold text-blue-900 mb-2">Informações do Atendimento</h3>
        <div className="space-y-1 text-sm text-blue-800">
          <p><strong>Pet:</strong> {pet.nomePet}</p>
          <p><strong>Tutor:</strong> {pet.nomeTutor}</p>
          <p><strong>Serviço:</strong> {
            pet.servico === 'banho_tosa' ? 'Banho + Tosa' : 
            pet.servico === 'higienica' ? 'Serviço Higiênico' :
            pet.servico === 'ozonio' ? 'Serviço com Ozônio' :
            pet.servico === 'hidratacao' ? 'Serviço de Hidratação' :
            pet.servico.charAt(0).toUpperCase() + pet.servico.slice(1)
          }</p>
          <p><strong>Slot:</strong> {pet.slotNumber}</p>
        </div>
      </div>

      {/* Campo para Profissional de Banho */}
      {(pet.servico === 'banho' || pet.servico === 'banho_tosa' || pet.servico === 'hidratacao' || pet.servico === 'ozonio') && (
        <div className="space-y-2">
          <Label htmlFor="profBanho">
            Profissional Responsável *
          </Label>
          <Select value={profissionalBanho} onValueChange={setProfissionalBanho}>
            <SelectTrigger id="profBanho">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {PROFISSIONAIS.map(prof => (
                <SelectItem key={prof} value={prof}>
                  {prof}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Campo para Profissional de Tosa */}
      {(pet.servico === 'tosa' || pet.servico === 'banho_tosa' || pet.servico === 'higienica') && (
        <div className="space-y-2">
          <Label htmlFor="profTosa">
            Profissional {pet.servico === 'banho_tosa' ? 'de Tosa' : 'Responsável'} *
          </Label>
          <Select value={profissionalTosa} onValueChange={setProfissionalTosa}>
            <SelectTrigger id="profTosa">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {PROFISSIONAIS.map(prof => (
                <SelectItem key={prof} value={prof}>
                  {prof}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" className="flex-1 bg-blue-500 hover:bg-blue-600">
          Confirmar e Iniciar
        </Button>
      </div>
    </form>
  );
}