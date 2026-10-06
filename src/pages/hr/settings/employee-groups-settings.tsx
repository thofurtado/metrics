import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Loader2, Pencil, Plus, Trash2, Users, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import {
  createEmployeeGroup,
  deleteEmployeeGroup,
  EmployeeGroup,
  getEmployeeGroups,
  updateEmployeeGroup,
} from '@/api/hr/employee-groups'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function mensagemDeErro(error: any, padrao: string) {
  const codigo = error?.response?.data?.message
  if (codigo === 'GROUP_ALREADY_EXISTS') return 'Já existe um grupo com esse nome.'
  if (codigo === 'GROUP_HAS_EMPLOYEES')
    return 'O grupo tem colaboradores. Mude o grupo deles no cadastro antes de apagar.'
  return padrao
}

/**
 * Grupos de funcionários (06/10/2026): o cargo virou cadastro e cada grupo diz quem pode entrar no app do garçom e no PDV
 * com o PIN do ponto. Os grupos nasceram dos cargos que já existiam.
 */
export function EmployeeGroupsSettings() {
  const queryClient = useQueryClient()
  const [novoNome, setNovoNome] = useState('')
  const [novoApp, setNovoApp] = useState(false)
  const [novoPdv, setNovoPdv] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [nomeEditado, setNomeEditado] = useState('')

  const { data: grupos, isLoading, isError } = useQuery({
    queryKey: ['employee-groups'],
    queryFn: getEmployeeGroups,
  })

  function atualizarListas() {
    queryClient.invalidateQueries({ queryKey: ['employee-groups'] })
    queryClient.invalidateQueries({ queryKey: ['employees'] })
  }

  const criar = useMutation({
    mutationFn: createEmployeeGroup,
    onSuccess: () => {
      atualizarListas()
      toast.success('Grupo criado!')
      setNovoNome('')
      setNovoApp(false)
      setNovoPdv(false)
    },
    onError: (e) => toast.error(mensagemDeErro(e, 'Não foi possível criar o grupo.')),
  })

  const salvar = useMutation({
    mutationFn: updateEmployeeGroup,
    onSuccess: () => {
      atualizarListas()
      setEditandoId(null)
    },
    onError: (e) => toast.error(mensagemDeErro(e, 'Não foi possível salvar o grupo.')),
  })

  const apagar = useMutation({
    mutationFn: deleteEmployeeGroup,
    onSuccess: () => {
      atualizarListas()
      toast.success('Grupo apagado.')
    },
    onError: (e) => toast.error(mensagemDeErro(e, 'Não foi possível apagar o grupo.')),
  })

  function alternar(g: EmployeeGroup, campo: 'can_use_waiter_app' | 'can_use_pdv', valor: boolean) {
    salvar.mutate({
      id: g.id,
      name: g.name,
      can_use_waiter_app: g.can_use_waiter_app,
      can_use_pdv: g.can_use_pdv,
      [campo]: valor,
    })
  }

  function salvarNome(g: EmployeeGroup) {
    const nome = nomeEditado.trim()
    if (nome.length < 2) {
      toast.error('Digite o nome do grupo.')
      return
    }
    salvar.mutate({ id: g.id, name: nome, can_use_waiter_app: g.can_use_waiter_app, can_use_pdv: g.can_use_pdv })
  }

  return (
    <Card className="rounded-2xl border border-slate-200/70 shadow-sm dark:border-slate-800">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-bold">
          <Users className="h-5 w-5 text-primary" />
          Grupos de funcionários
        </CardTitle>
        <CardDescription>
          O grupo é o cargo do colaborador e diz se ele pode entrar no app do garçom e no PDV (caixa) com o PIN do
          ponto. Quem está inativo nunca entra.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (novoNome.trim().length < 2) {
              toast.error('Digite o nome do grupo.')
              return
            }
            criar.mutate({ name: novoNome.trim(), can_use_waiter_app: novoApp, can_use_pdv: novoPdv })
          }}
          className="flex flex-col gap-4 rounded-2xl border border-slate-200/60 bg-muted/20 p-4 dark:border-slate-800 lg:flex-row lg:items-end"
        >
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="novo-grupo" className="text-xs font-bold text-muted-foreground">
              Nome do grupo
            </Label>
            <Input
              id="novo-grupo"
              placeholder="Ex: Garçom, Caixa, Cozinha..."
              className="h-10 rounded-xl bg-background"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
            />
          </div>
          <label className="flex h-10 items-center gap-2 text-sm font-medium">
            <Switch checked={novoApp} onCheckedChange={setNovoApp} />
            App do garçom
          </label>
          <label className="flex h-10 items-center gap-2 text-sm font-medium">
            <Switch checked={novoPdv} onCheckedChange={setNovoPdv} />
            PDV (caixa)
          </label>
          <Button type="submit" disabled={criar.isPending} className="h-10 rounded-xl px-5 font-bold shadow-sm">
            {criar.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Adicionar
          </Button>
        </form>

        <div className="overflow-x-auto rounded-xl border border-slate-200/70 dark:border-slate-800">
          <Table>
            <TableHeader>
              <TableRow className="border-b bg-muted/40">
                <TableHead>Grupo</TableHead>
                <TableHead className="w-[150px]">App do garçom</TableHead>
                <TableHead className="w-[130px]">PDV (caixa)</TableHead>
                <TableHead className="w-[120px]">Colaboradores</TableHead>
                <TableHead className="w-[110px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Não foi possível carregar os grupos. Se o sistema acabou de ser atualizado, peça a sincronização do
                    banco no painel administrativo.
                  </TableCell>
                </TableRow>
              ) : !grupos?.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Nenhum grupo ainda. Crie acima ou cadastre um colaborador com o cargo dele.
                  </TableCell>
                </TableRow>
              ) : (
                grupos.map((g) => (
                  <TableRow key={g.id} className="transition-colors hover:bg-muted/30">
                    <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                      {editandoId === g.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            autoFocus
                            className="h-9 rounded-lg"
                            value={nomeEditado}
                            onChange={(e) => setNomeEditado(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') salvarNome(g)
                              if (e.key === 'Escape') setEditandoId(null)
                            }}
                          />
                          <Button size="icon" variant="ghost" className="h-9 w-9" title="Salvar nome" onClick={() => salvarNome(g)}>
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-9 w-9" title="Cancelar" onClick={() => setEditandoId(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        g.name
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={g.can_use_waiter_app}
                        disabled={salvar.isPending}
                        onCheckedChange={(v) => alternar(g, 'can_use_waiter_app', v)}
                        aria-label={`${g.name}: app do garçom`}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={g.can_use_pdv}
                        disabled={salvar.isPending}
                        onCheckedChange={(v) => alternar(g, 'can_use_pdv', v)}
                        aria-label={`${g.name}: PDV`}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{g.employeesCount ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          title="Mudar o nome"
                          onClick={() => {
                            setEditandoId(g.id)
                            setNomeEditado(g.name)
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10"
                          title={(g.employeesCount ?? 0) > 0 ? 'Grupo com colaboradores' : 'Apagar grupo'}
                          disabled={(g.employeesCount ?? 0) > 0 || apagar.isPending}
                          onClick={() => apagar.mutate(g.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
