import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription, // 🔧 adicionado
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
  PackageCheck,
  PhoneCall,
} from 'lucide-react';
import type { Pet } from '../types/pet';

interface PetDetailModalProps {
  pet: Pet | null;
  open: boolean;
  onClose: () => void;
  onEdit: (pet: Pet) => void;
  onDelete: (petId: string) => void;
  onCheckout?: (petId: string, tipo: 'entregue' | 'avisado') => void;
}

export function PetDetailModal({
  pet,
  open,
  onClose,
  onEdit,
  onDelete,
  onCheckout,
}: PetDetailModalProps) {
  if (!pet) return null;

  const getServiceLabel = (servico: string) => {
    const labels: Record<string, string> = {
      banho:      'Banho',
      tosa:       'Tosa',
      banho_tosa: 'Banho + Tosa',
      higienica:  'Higiênica',
      ozonio:     'Ozônio',
      hidratacao: 'Hidratação',
    };
    return labels[servico] || servico;
  };

  const getServiceColor = (servico: string) => {
    switch (servico) {
      case 'banho':      return 'bg-blue-100 text-blue-800';
      case 'tosa':       return 'bg-purple-100 text-purple-800';
      case 'banho_tosa': return 'bg-pink-100 text-pink-800';
      case 'higienica':  return 'bg-green-100 text-green-800';
      case 'ozonio':     return 'bg-cyan-100 text-cyan-800';
      case 'hidratacao': return 'bg-indigo-100 text-indigo-800';
      default:           return 'bg-gray-100 text-gray-800';
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
      case 'espera':     return 'bg-amber-100 text-amber-800';
      case 'banho':      return 'bg-sky-100 text-sky-800';
      case 'escovar':    return 'bg-sky-100 text-sky-800';
      case 'tosa':       return 'bg-sky-100 text-sky-800';
      case 'finalizado': return 'bg-purple-100 text-purple-800';
      default:           return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('pt-BR', {
        hour:   '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '--:--';
    }
  };

  const canDelete    = pet.status === 'espera';
  const isFinalizado = pet.status === 'finalizado';
  const jaAvisado    = !!pet.avisado;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm w-full p-4 gap-3"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >

        {/* ── Header: foto + nome + tutor ── */}
        <DialogHeader className="pb-0">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            {pet.foto ? (
              <img
                src={pet.foto}
                alt={pet.nomePet}
                className="w-12 h-12 rounded-lg object-cover border border-gray-100 shadow-sm flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center flex-shrink-0 border border-gray-100">
                {pet.especie === 'cao'
                  ? <Dog className="w-6 h-6 text-blue-400" />
                  : <Cat className="w-6 h-6 text-purple-400" />
                }
              </div>
            )}
            {/* Nome + tutor */}
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-bold text-gray-800 leading-tight truncate">
                {pet.nomePet}
              </DialogTitle>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                <User className="w-3 h-3" />
                {pet.nomeTutor}
              </p>
            </div>
          </div>

          {/* 🔧 descrição acessível adicionada */}
          <DialogDescription className="sr-only">
            Detalhes do pet {pet.nomePet}, tutor {pet.nomeTutor}, no slot {pet.slotNumber}.
          </DialogDescription>
        </DialogHeader>

        {/* ── Badges ── */}
        <div className="flex gap-1.5 flex-wrap">
          <Badge className={`${getServiceColor(pet.servico)} text-xs`}>
            {getServiceLabel(pet.servico)}
          </Badge>
          <Badge className={`${getStatusColor(pet.status)} text-xs`}>
            {getStatusLabel(pet.status)}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1 text-xs">
            <Hash className="w-2.5 h-2.5" />
            Slot {pet.slotNumber}
          </Badge>
          {jaAvisado && (
            <Badge className="bg-blue-100 text-blue-700 flex items-center gap-1 text-xs border border-blue-200">
              <PhoneCall className="w-2.5 h-2.5" />
              Tutor Avisado
            </Badge>
          )}
        </div>

        {/* ── Banner tutor avisado ── */}
        {jaAvisado && pet.avisadoEm && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1.5">
            <PhoneCall className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
            <p className="text-xs text-blue-700">
              Tutor avisado às{' '}
              <span className="font-semibold">{formatTime(pet.avisadoEm)}</span>
              . Aguardando retirada.
            </p>
          </div>
        )}

        {/* ── Grid: Informações + Profissionais lado a lado ── */}
        <div className="grid grid-cols-2 gap-2">

          {/* Informações */}
          <div className="bg-gray-50 rounded-lg p-2.5 space-y-1.5">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Informações
            </p>
            {pet.especie && (
              <InfoRow
                icon={pet.especie === 'cao' ? '🐕' : '🐈'}
                label="Espécie"
                value={pet.especie === 'cao' ? 'Cão' : 'Gato'}
              />
            )}
            {pet.raca && <InfoRow icon="🦴" label="Raça" value={pet.raca} />}
            {pet.porte && (
              <InfoRow
                icon="📏"
                label="Porte"
                value={pet.porte.charAt(0).toUpperCase() + pet.porte.slice(1)}
              />
            )}
            <InfoRow
              icon={<Clock className="w-3 h-3 text-gray-400" />}
              label="Check-in"
              value={formatTime(pet.checkInTime)}
            />
          </div>

          {/* Profissionais */}
          {(pet.profissionalBanho || pet.profissionalTosa || pet.profissionalEscovar) && (
            <div className="bg-blue-50 rounded-lg p-2.5 space-y-1.5">
              <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">
                Profissionais
              </p>
              {pet.profissionalBanho && (
                <InfoRow
                  icon={<Droplet className="w-3 h-3 text-blue-400" />}
                  label="Banho"
                  value={pet.profissionalBanho}
                  done={pet.banhoCompleto}
                />
              )}
              {pet.profissionalEscovar && (
                <InfoRow
                  icon={<Wind className="w-3 h-3 text-cyan-400" />}
                  label="Escovar"
                  value={pet.profissionalEscovar}
                  done={pet.escovarCompleto}
                />
              )}
              {pet.profissionalTosa && (
                <InfoRow
                  icon={<Scissors className="w-3 h-3 text-purple-400" />}
                  label="Tosa"
                  value={pet.profissionalTosa}
                  done={pet.tosaCompleta}
                />
              )}
            </div>
          )}
        </div>

        {/* ── Observações ── */}
        {pet.observacoes && (
          <div className="flex items-start gap-2 bg-orange-50 border border-orange-100 rounded-lg p-2">
            <AlertCircle className="w-3.5 h-3.5 text-orange-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-orange-700">{pet.observacoes}</p>
          </div>
        )}

        {/* ── Progresso ── */}
        {pet.status !== 'espera' && pet.status !== 'finalizado' && (
          <div className="flex gap-1.5 flex-wrap">
            <ProgressBadge label="Banho"   done={!!pet.banhoCompleto} />
            <ProgressBadge label="Escovar" done={!!pet.escovarCompleto} />
            {['tosa', 'banho_tosa', 'higienica'].includes(pet.servico) && (
              <ProgressBadge label="Tosa" done={!!pet.tosaCompleta} />
            )}
          </div>
        )}

        {/* ── Encerrar atendimento (finalizado) ── */}
        {isFinalizado && onCheckout && (
          <div className="rounded-lg border border-purple-100 bg-purple-50 p-2.5 space-y-2">
            <p className="text-[10px] font-semibold text-purple-500 uppercase tracking-wider">
              Encerrar Atendimento
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 bg-green-500 hover:bg-green-600 text-white h-8 text-xs"
                onClick={() => { onCheckout(pet.id, 'entregue'); onClose(); }}
              >
                <PackageCheck className="w-3.5 h-3.5 mr-1" />
                Entregue
              </Button>
              <Button
                size="sm"
                className={`flex-1 h-8 text-xs transition-all duration-200 ${
                  jaAvisado
                    ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
                disabled={jaAvisado}
                onClick={() => { if (!jaAvisado) onCheckout(pet.id, 'avisado'); }}
              >
                <PhoneCall className="w-3.5 h-3.5 mr-1" />
                {jaAvisado ? '✓ Já Avisado' : 'Avisar'}
              </Button>
            </div>
            {jaAvisado && (
              <p className="text-[11px] text-blue-500 text-center">
                📞 Tutor já foi avisado. Clique em <strong>Entregue</strong> quando retirar o pet.
              </p>
            )}
          </div>
        )}

        {/* ── Ações padrão ── */}
        <div className="flex gap-2 pt-1">
          {!isFinalizado && (
            <Button
              size="sm"
              className="flex-1 bg-blue-500 hover:bg-blue-600 h-8 text-xs"
              onClick={() => onEdit(pet)}
            >
              <Pencil className="w-3.5 h-3.5 mr-1" />
              Editar
            </Button>
          )}
          {canDelete && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50 h-8 text-xs"
              onClick={() => { onDelete(pet.id); onClose(); }}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Excluir
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onClose}>
            Fechar
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}

// ── Sub-componentes ───────────────────────────────────────────────

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
    <div className="flex items-center gap-1.5 text-xs">
      <span className="w-4 flex items-center justify-center">{icon}</span>
      <span className="text-gray-400 flex-shrink-0">{label}:</span>
      <span className={`font-medium truncate flex items-center gap-1 ${done ? 'line-through text-gray-300' : 'text-gray-700'}`}>
        {value}
        {done && <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />}
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
