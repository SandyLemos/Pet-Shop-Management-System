// ✅ Agendamento online: o pet chegou. Abre o cadastro já preenchido com o que o tutor informou;
// a vaga da grade é dada na hora (a próxima livre depois da última ocupada).
import { useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { PetRegistration } from '../PetRegistration';
import type { Pet } from '../../types/pet';
import type { Pedido } from '../../../services/agendamentoService';
import { soDigitos } from '../../../utils/agendamento';

type DadosPet = Omit<Pet, 'id' | 'checkInTime' | 'slotNumber' | 'status'>;

export function ConfirmarChegada({ pedido, proximaVaga, pets, slotsUsados, fechar, aoCadastrar }: {
  pedido: Pedido | null;
  /** vaga que o pet vai receber (só para mostrar; é calculada de novo ao salvar) */
  proximaVaga: number | null;
  pets: Pet[];
  slotsUsados: Set<number>;
  fechar: () => void;
  /** devolve true se o pet entrou na fila */
  aoCadastrar: (pedido: Pedido, dados: DadosPet) => Promise<boolean>;
}) {
  const salvando = useRef(false);
  if (!pedido) return null;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) fechar(); }}>
      {/* ✅ altura FIXA para o scroll interno do formulário funcionar (igual ao cadastro da grade) */}
      <DialogContent className="sm:max-w-2xl h-[85vh]" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Confirmar chegada - {pedido.nomePet}{proximaVaga ? ` (vai para a vaga ${proximaVaga})` : ''}</DialogTitle>
          <DialogDescription className="text-xs text-indigo-800 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
            Dados que o tutor informou no agendamento online. Se o pet já tem ficha, escolha ela na busca (já procuramos pelo telefone).
            A vaga é a próxima livre depois da última ocupada.
          </DialogDescription>
        </DialogHeader>
        <PetRegistration
          key={pedido.codigo}
          allPets={pets}
          slotsUsados={slotsUsados}
          initialData={{
            nomePet: pedido.nomePet, nomeTutor: pedido.nomeTutor, telefone: pedido.telefone,
            especie: pedido.especie || undefined, raca: pedido.raca, porte: pedido.porte || undefined,
            servico: pedido.servico, alertaObs: pedido.obs,
          } as unknown as Pet}
          buscaInicial={soDigitos(pedido.telefone).slice(-8)}
          onSubmit={async (dados) => {
            if (salvando.current) return;
            salvando.current = true;
            try {
              if (await aoCadastrar(pedido, dados as DadosPet)) fechar();
            } finally {
              salvando.current = false;
            }
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
