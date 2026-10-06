import { api } from '@/lib/axios'

/** Grupo de funcionários (o cargo virou cadastro): libera o app do garçom e/ou o PDV pelo PIN do ponto. */
export interface EmployeeGroup {
  id: string
  name: string
  can_use_waiter_app: boolean
  can_use_pdv: boolean
  employeesCount?: number
}

export interface EmployeeGroupInput {
  name: string
  can_use_waiter_app: boolean
  can_use_pdv: boolean
}

export async function getEmployeeGroups() {
  const response = await api.get<EmployeeGroup[]>('/hr/employee-groups')
  return response.data
}

export async function createEmployeeGroup(data: EmployeeGroupInput) {
  const response = await api.post<EmployeeGroup>('/hr/employee-groups', data)
  return response.data
}

export async function updateEmployeeGroup({ id, ...data }: EmployeeGroupInput & { id: string }) {
  const response = await api.put<EmployeeGroup>(`/hr/employee-groups/${id}`, data)
  return response.data
}

export async function deleteEmployeeGroup(id: string) {
  await api.delete(`/hr/employee-groups/${id}`)
}

/** Frase do acesso do grupo, igual em todas as telas. */
export function acessoDoGrupo(g: Pick<EmployeeGroup, 'can_use_waiter_app' | 'can_use_pdv'>) {
  if (g.can_use_waiter_app && g.can_use_pdv) return 'App do garçom e PDV'
  if (g.can_use_waiter_app) return 'App do garçom'
  if (g.can_use_pdv) return 'PDV'
  return 'Sem acesso ao app nem ao PDV'
}
