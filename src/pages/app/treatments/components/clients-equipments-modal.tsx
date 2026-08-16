import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Users } from 'lucide-react'

export function ClientsEquipmentsModal() {
  return (
    <Button variant="outline" asChild>
      <Link to="/clients-equipments">
        <Users className="mr-2 h-4 w-4" />
        Central de Clientes & Equipamentos
      </Link>
    </Button>
  )
}

