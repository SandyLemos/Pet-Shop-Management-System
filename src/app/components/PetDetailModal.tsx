import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Dog,
  Cat,
  User,
  Hash,
  Scissors,
  Droplet,
  Wind,
  Clock,
  AlertCircle,
  Pencil,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import type { Pet } from '../types/pet';

interface PetDetailModalProps {
  pet: Pet | null;
  open: boolean;
  onClose: () => void;
  onEdit: (pet: Pet) => void;
  onDelete: (petId: string) => void;
}

export function PetDetailModal({
  pet,
  open,
  onClose,
  onEdit,
  onDelete,
}: PetDetailModalProps) {
  if (!pet) return null;

  const getServiceLabel = (servico: string) => {
    const labels: Record<string, string> = {
      banho: 'Banho',
      tosa: 'Tosa',
      banho_tosa: 'Banho + Tosa',
      higienica: 'Higiênica',
      ozonio: 'Ozônio',
      hidratacao: 'Hidratação',
    };
    return labels[servico] || servico;
  };

  const getServiceColor = (servico: string) => {
    switch (servico) {
      case 'banho':       return 'bg-blue-100 text-blue-800';
      case 'tosa':        return 'bg-purple-100 text-purple-800';
      case 'banho_tosa':  return 'bg-pink-100 text-pink-800';
      case 'higienica':   return 'bg-green-100 text-green-800';
      case 'ozonio':      return 'bg-cyan-100 text-cyan-800';
      case 'hidratacao':  return 'bg-indigo-100 text-indigo-800';
      default:            return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      espera:     'Aguardando',
      banho:      'Em Banho',
      escovar:    'Escovando',
      tosa:       'Em Tosa',
      finalizado: 'Finalizado',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'espera':      return 'bg-amber-100 text-amber-800';
      case 'banho':       return 'bg-sky-100 text-sky-800';
      case 'escovar':     return 'bg-sky-100 text-sky-800';
      case 'tosa':        return 'bg-sky-100 text-sky-800';
      case 'finalizado':  return 'bg-purple-100 text-purple-800';
      default:            return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '--:--';
    }
  };

  const canDelete = pet.status === 'espera';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {pet.especie === 'cao' ? (
              <Dog className="w-5 h-5 text-blue-500" />
            ) : (
              <Cat className="w-5 h-5 text-purple-500" />
            )}
            Detalhes do Pet
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">

          {/* ── Foto + Nome ── */}
          <div className="flex items-center gap-4">
            {pet.foto ? (
              <img
                src={pet.foto}
                alt={pet.nomePet}
                className="w-20 h-20 rounded-xl object-cover border-2 border-gray-100 shadow-sm flex-shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center flex-shrink-0 border-2 border-gray-100">
                {pet.especie === 'cao' ? (
                  <Dog className="w-8 h-8 text-blue-400" />
                ) : (
                  <Cat className="w-8 h-8 text-purple-400" />
                )}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-gray-800 break-words">
                {pet.nomePet}
              </h2>
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                <User className="w-3.5 h-3.5" />
                {pet.nomeTutor}
              </p>
            </div>
          </div>

          {/* ── Badges de status ── */}
          <div className="flex gap-2 flex-wrap">
            <Badge className={getServiceColor(pet.servico)}>
              {getServiceLabel(pet.servico)}
            </Badge>
            <Badge className={getStatusColor(pet.status)}>
              {getStatusLabel(pet.status)}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Hash className="w-3 h-3" />
              Slot {pet.slotNumber}
            </Badge>
          </div>

          {/* ── Informações do pet ── */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Informações
            </h3>

            {pet.especie && (
              <InfoRow
                icon={pet.especie === 'cao' ? '🐕' : '🐈'}
                label="Espécie"
                value={pet.especie === 'cao' ? 'Cão' : 'Gato'}
              />
            )}
            {pet.raca && (
              <InfoRow icon="🦴" label="Raça" value={pet.raca} />
            )}
            {pet.porte && (
              <InfoRow
                icon="📏"
                label="Porte"
                value={pet.porte.charAt(0).toUpperCase() + pet.porte.slice(1)}
              />
            )}
            <InfoRow
              icon={<Clock className="w-4 h-4 text-gray-400" />}
              label="Check-in"
              value={formatTime(pet.checkInTime)}
            />
          </div>

          {/* ── Profissionais ── */}
          {(pet.profissionalBanho || pet.profissionalTosa || pet.profissionalEscovar) && (
            <div className="bg-blue-50 rounded-xl p-4 space-y-2">
              <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-3">
                Profissionais
              </h3>
              {pet.profissionalBanho && (
                <InfoRow
                  icon={<Droplet className="w-4 h-4 text-blue-400" />}
                  label="Banho"
                  value={pet.profissionalBanho}
                  done={pet.banhoCompleto}
                />
              )}
              {pet.profissionalEscovar && (
                <InfoRow
                  icon={<Wind className="w-4 h-4 text-cyan-400" />}
                  label="Escovar"
                  value={pet.profissionalEscovar}
                  done={pet.escovarCompleto}
                />
              )}
              {pet.profissionalTosa && (
                <InfoRow
                  icon={<Scissors className="w-4 h-4 text-purple-400" />}
                  label="Tosa"
                  value={pet.profissionalTosa}
                  done={pet.tosaCompleta}
                />
              )}
            </div>
          )}

          {/* ── Observações ── */}
          {pet.observacoes && (
            <div className="flex items-start gap-2 bg-orange-50 border border-orange-100 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-orange-700">{pet.observacoes}</p>
            </div>
          )}

          {/* ── Progresso ── */}
          {pet.status !== 'espera' && pet.status !== 'finalizado' && (
            <div className="flex gap-2 flex-wrap">
              <ProgressBadge label="Banho" done={!!pet.banhoCompleto} />
              <ProgressBadge label="Escovar" done={!!pet.escovarCompleto} />
              {['tosa', 'banho_tosa', 'higienica'].includes(pet.servico) && (
                <ProgressBadge label="Tosa" done={!!pet.tosaCompleta} />
              )}
            </div>
          )}

          {/* ── Ações ── */}
          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1 bg-blue-500 hover:bg-blue-600"
              onClick={() => onEdit(pet)}
            >
              <Pencil className="w-4 h-4 mr-2" />
              Editar
            </Button>

            {canDelete && (
              <Button
                variant="outline"
                className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => {
                  onDelete(pet.id);
                  onClose();
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </Button>
            )}

            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Sub-componentes internos ─────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
  done,
}: {
  icon: React.ReactNode | string;
  label: string;
  value: string;
  done?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-5 flex items-center justify-center text-base">
        {icon}
      </span>
      <span className="text-gray-500 w-16 flex-shrink-0">{label}:</span>
      <span className={`font-medium flex items-center gap-1 ${done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
        {value}
        {done && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 no-underline" />}
      </span>
    </div>
  );
}

function ProgressBadge({ label, done }: { label: string; done: boolean }) {
  return (
    <Badge
      variant={done ? 'default' : 'outline'}
      className={`text-xs ${done ? 'bg-green-500' : ''}`}
    >
      {done ? '✓' : '○'} {label}
    </Badge>
  );
}
