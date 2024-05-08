type TreatmentStatus =
  | 'pending'
  | 'in_progress'
  | 'on_hold'
  | 'resolved'
  | 'canceled'
  | 'follow_up'
  | 'in_workbench'

interface TreatmentStatusProps {
  status: TreatmentStatus
}

const treatmentStatusMap: Record<TreatmentStatus, string> = {
  pending: 'Pendente',
  canceled: 'Cancelado',
  in_progress: 'Em andamento',
  on_hold: 'Em espera',
  resolved: 'Resolvido',
  follow_up: 'Acompanhamento',
  in_workbench: 'Na bancada',
}
export function TreatmentStatus({ status }: TreatmentStatusProps) {
  return (
    <div className="flex items-center gap-2">
      {status === 'pending' && (
        <span className="h-2 w-2 rounded-full bg-stone-500" />
      )}
      {status === 'canceled' && (
        <span className="h-2 w-2 rounded-full bg-rose-500" />
      )}
      {status === 'in_progress' && (
        <span className="h-2 w-2 rounded-full bg-blue-400" />
      )}
      {status === 'on_hold' && (
        <span className="h-2 w-2 rounded-full bg-amber-400" />
      )}
      {status === 'resolved' && (
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
      )}
      {status === 'follow_up' && (
        <span className="h-2 w-2 rounded-full bg-indigo-400" />
      )}
      {status === 'in_workbench' && (
        <span className="h-2 w-2 rounded-full bg-orange-300" />
      )}
      <span className="font-medium text-muted-foreground">
        {treatmentStatusMap[status]}
      </span>
    </div>
  )
}
