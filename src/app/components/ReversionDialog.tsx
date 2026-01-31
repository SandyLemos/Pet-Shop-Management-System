import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface ReversionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (motivo: string) => void;
  petName: string;
}

export function ReversionDialog({ 
  open, 
  onOpenChange, 
  onConfirm, 
  petName 
}: ReversionDialogProps) {
  const [motivo, setMotivo] = useState<string>("");
  const [outroMotivo, setOutroMotivo] = useState("");

  const handleConfirm = () => {
    const motivoFinal = motivo === "outro" ? outroMotivo : motivo;
    if (!motivoFinal) return;
    
    onConfirm(motivoFinal);
    // Resetar campos após confirmar
    setMotivo("");
    setOutroMotivo("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-red-600 flex items-center gap-2">
            <RotateCcw className="w-5 h-5" /> Reverter Atendimento
          </DialogTitle>
          <DialogDescription>
            O serviço de <strong>{petName}</strong> já foi marcado como concluído. 
            Esta ação será registrada no relatório de auditoria.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Motivo da Reversão *</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="erro_marcacao">Erro de marcação (clique acidental)</SelectItem>
                <SelectItem value="servico_incompleto">Serviço não condiz com o padrão</SelectItem>
                <SelectItem value="desistencia">Cliente desistiu/alterou na hora</SelectItem>
                <SelectItem value="outro">Outro (especificar)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {motivo === "outro" && (
            <div className="space-y-2">
              <Label>Descrição detalhada *</Label>
              <Textarea 
                placeholder="Explique o que aconteceu..." 
                value={outroMotivo}
                onChange={(e) => setOutroMotivo(e.target.value)}
                className="h-24 resize-none"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            disabled={!motivo || (motivo === 'outro' && !outroMotivo)}
            onClick={handleConfirm}
            className="bg-red-600 hover:bg-red-700"
          >
            Confirmar e Reverter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}