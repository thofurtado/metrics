// Regra de hora extra da loja (08/10/2026, ESPEC-PONTO-REGRAS-E-BANCO-DE-HORAS.md, decisões D10 e D18):
// perguntas guiadas e modelos; ao lado de cada campo, o que a lei pede, só como sugestão. Nada bloqueia.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  AlertTriangle,
  ExternalLink,
  Info,
  Loader2,
  Save,
  Scale,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import {
  ModeloDeRegra,
  obterRegraDoPonto,
  percentual,
  RegraDaLoja,
  RegraParaSalvar,
  salvarRegraDoPonto,
} from '@/api/hr/ponto'
import { Badge } from '@/components/ui/badge'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

const NOMES_DOS_MODELOS: Record<ModeloDeRegra, string> = {
  CLT: 'CLT (o mínimo da lei)',
  SP_BARES_RESTAURANTES: 'Bares e restaurantes de SP',
  LITORAL_NORTE: 'Litoral Norte de SP',
  PERSONALIZADO: 'Do meu jeito',
  LEGADO: 'Conta antiga do espelho (7h20, 60%)',
}

const hoje = () => format(new Date(), 'yyyy-MM-dd')
const paraHoraMin = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
const deHoraMin = (v: string) => {
  const [h, m] = v.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
const pct = (mult: number) => Math.round((mult - 1) * 1000) / 10
const mult = (p: number) => 1 + p / 100

function paraFormulario(r: RegraDaLoja): RegraParaSalvar {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, ...resto } = r
  return {
    ...resto,
    modelo: r.modelo === 'LEGADO' ? 'PERSONALIZADO' : r.modelo,
    vigenteDesde: hoje(),
  }
}

/** Sugestão ao lado do campo: o que a lei pede (D18). Só aparece quando a escolha fica abaixo. */
function Sugestao({
  abaixo,
  children,
}: {
  abaixo: boolean
  children: React.ReactNode
}) {
  return (
    <p
      className={cn(
        'mt-1 flex items-start gap-1 text-xs leading-snug',
        abaixo ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground',
      )}
    >
      {abaixo ? (
        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
      ) : (
        <Scale className="mt-0.5 h-3 w-3 shrink-0" />
      )}
      <span>{children}</span>
    </p>
  )
}

export function RegraHoraExtraSettings() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['ponto-regra'],
    queryFn: obterRegraDoPonto,
  })
  const [form, setForm] = useState<RegraParaSalvar | null>(null)
  const [convencao, setConvencao] = useState<'NAO' | 'SIM' | null>(null)

  useEffect(() => {
    if (data && !form) {
      setForm(paraFormulario(data.atual))
      if (data.confirmada)
        setConvencao(data.atual.modelo === 'CLT' ? 'NAO' : 'SIM')
    }
  }, [data, form])

  const salvar = useMutation({
    mutationFn: salvarRegraDoPonto,
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ['ponto-regra'] })
      queryClient.invalidateQueries({ queryKey: ['ponto-apuracao'] })
      queryClient.invalidateQueries({ queryKey: ['ponto-resumo'] })
      toast.success(
        `Regra salva. Vale a partir de ${format(new Date(`${r.regra.vigenteDesde}T12:00:00`), 'dd/MM/yyyy')}.`,
      )
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(
        e?.response?.data?.message ?? 'Não foi possível salvar a regra.',
      ),
  })

  const modelo = useMemo(
    () => data?.modelos.find((m) => m.chave === form?.modelo),
    [data, form?.modelo],
  )

  if (isLoading || !data || !form) {
    return (
      <Card className="rounded-2xl border border-slate-200/70 p-6 shadow-sm dark:border-slate-800">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
      </Card>
    )
  }

  const muda = <K extends keyof RegraParaSalvar>(
    campo: K,
    valor: RegraParaSalvar[K],
  ) => setForm({ ...form, [campo]: valor })

  const escolherModelo = (chave: ModeloDeRegra) => {
    const m = data.modelos.find((x) => x.chave === chave)
    // "Do meu jeito" mantém os números que já estão na tela; os outros trazem a sugestão do modelo
    const base =
      chave === 'PERSONALIZADO' ? form : { ...form, ...(m?.valores ?? {}) }
    setForm({
      ...base,
      modelo: chave as RegraParaSalvar['modelo'],
      vigenteDesde: form.vigenteDesde,
      observacao: form.observacao,
    })
  }

  const atual = data.atual
  const semEscolha = !data.confirmada

  return (
    <Card className="rounded-2xl border border-slate-200/70 shadow-sm dark:border-slate-800">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-bold">
          Regra de hora extra da loja
        </CardTitle>
        <CardDescription>
          Diz como o ponto calcula a hora extra, o domingo, o feriado e o
          adicional noturno. A conta é a mesma no espelho, no resumo do mês e no
          PDF.
        </CardDescription>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Em uso hoje:</span>
          <Badge
            variant={semEscolha ? 'outline' : 'secondary'}
            className="rounded-lg"
          >
            {semEscolha && atual.modelo === 'CLT'
              ? 'Padrão da CLT (a loja ainda não escolheu)'
              : NOMES_DOS_MODELOS[atual.modelo]}
          </Badge>
          <span className="text-muted-foreground">
            extra {percentual(atual.multiplicadorExtra)} · domingo e feriado{' '}
            {percentual(atual.multiplicadorEspecial)} · noturno{' '}
            {atual.noturnoLigado
              ? `${Math.round(atual.adicionalNoturno * 100)}%`
              : 'desligado'}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 1. A pergunta guiada */}
        <div className="space-y-3 rounded-2xl border border-slate-200/60 bg-muted/20 p-4 dark:border-slate-800">
          <p className="font-semibold">
            1. Sua loja segue uma convenção coletiva do sindicato?
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={convencao === 'NAO' ? 'default' : 'outline'}
              className="rounded-xl"
              onClick={() => {
                setConvencao('NAO')
                escolherModelo('CLT')
              }}
            >
              Não / não sei
            </Button>
            <Button
              type="button"
              variant={convencao === 'SIM' ? 'default' : 'outline'}
              className="rounded-xl"
              onClick={() => {
                setConvencao('SIM')
                if (form.modelo === 'CLT') escolherModelo('PERSONALIZADO')
              }}
            >
              Sim
            </Button>
          </div>
          {convencao === 'NAO' && (
            <p className="text-sm text-muted-foreground">
              Fica a CLT, o mínimo da lei. Se a sua convenção pagar mais, volte
              aqui e escolha &ldquo;Sim&rdquo;: o sindicato da sua cidade ou o
              seu contador sabem qual é.
            </p>
          )}
          {convencao === 'SIM' && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Qual delas?</p>
              <div className="flex flex-wrap gap-2">
                {data.modelos
                  .filter((m) => m.chave !== 'CLT')
                  .map((m) => (
                    <Button
                      key={m.chave}
                      type="button"
                      size="sm"
                      variant={form.modelo === m.chave ? 'default' : 'outline'}
                      className="rounded-xl"
                      onClick={() => escolherModelo(m.chave)}
                    >
                      {NOMES_DOS_MODELOS[m.chave]}
                    </Button>
                  ))}
              </div>
            </div>
          )}
          {modelo && convencao !== null && (
            <div className="rounded-xl border border-blue-200/60 bg-blue-50/40 p-3 text-sm dark:border-blue-900/50 dark:bg-blue-950/20">
              <p className="flex items-center gap-1.5 font-semibold">
                <Info className="h-4 w-4 text-blue-500" />
                {modelo.nome}
              </p>
              <p className="mt-1 text-muted-foreground">{modelo.paraQuem}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {modelo.explicacao.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
              {modelo.conferir.length > 0 && (
                <p className="mt-2 font-medium text-amber-700 dark:text-amber-400">
                  Confira na sua convenção: {modelo.conferir.join('; ')}.
                </p>
              )}
              {modelo.fonte && (
                <a
                  href={modelo.fonte.link}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary underline"
                >
                  {modelo.fonte.texto} <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* 2. Os números */}
        <div className="space-y-4">
          <p className="font-semibold">2. Os números da sua regra</p>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <Label className="text-xs font-bold text-muted-foreground">
                Hora extra em dia comum (%)
              </Label>
              <Input
                type="number"
                min={0}
                step={1}
                className="mt-1 h-10 rounded-xl"
                value={pct(form.multiplicadorExtra)}
                onChange={(e) =>
                  muda('multiplicadorExtra', mult(Number(e.target.value)))
                }
              />
              <Sugestao abaixo={form.multiplicadorExtra < 1.5}>
                A lei pede pelo menos 50%.
              </Sugestao>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="regra-segunda-faixa"
                  className="text-xs font-bold text-muted-foreground"
                >
                  Percentual maior depois de algumas horas extras
                </Label>
                <Switch
                  id="regra-segunda-faixa"
                  checked={form.segundaFaixaAPartirMin !== null}
                  onCheckedChange={(v) =>
                    setForm({
                      ...form,
                      segundaFaixaAPartirMin: v ? 120 : null,
                      multiplicadorSegundaFaixa: v ? 1.7 : null,
                    })
                  }
                />
              </div>
              {form.segundaFaixaAPartirMin !== null && (
                <div className="mt-1 flex items-center gap-2 text-sm">
                  <span>depois de</span>
                  <Input
                    type="number"
                    min={1}
                    className="h-9 w-16 rounded-xl"
                    value={form.segundaFaixaAPartirMin / 60}
                    onChange={(e) =>
                      muda(
                        'segundaFaixaAPartirMin',
                        Math.max(1, Math.round(Number(e.target.value) * 60)),
                      )
                    }
                  />
                  <span>h extras no dia:</span>
                  <Input
                    type="number"
                    min={0}
                    className="h-9 w-20 rounded-xl"
                    value={pct(form.multiplicadorSegundaFaixa ?? 1.7)}
                    onChange={(e) =>
                      muda(
                        'multiplicadorSegundaFaixa',
                        mult(Number(e.target.value)),
                      )
                    }
                  />
                  <span>%</span>
                </div>
              )}
              <Sugestao abaixo={false}>
                Algumas convenções pagam mais a partir da 3ª hora extra do dia.
              </Sugestao>
            </div>

            <div>
              <Label className="text-xs font-bold text-muted-foreground">
                Domingo e feriado (%)
              </Label>
              <Input
                type="number"
                min={0}
                step={1}
                className="mt-1 h-10 rounded-xl"
                value={pct(form.multiplicadorEspecial)}
                onChange={(e) =>
                  muda('multiplicadorEspecial', mult(Number(e.target.value)))
                }
              />
              <Sugestao abaixo={form.multiplicadorEspecial < 2}>
                Trabalhado sem folga compensatória, a lei pede 100% (o dobro).
              </Sugestao>
            </div>

            <div>
              <Label className="text-xs font-bold text-muted-foreground">
                No domingo, o que vale 100%?
              </Label>
              <Select
                value={form.domingo}
                onValueChange={(v) =>
                  muda('domingo', v as RegraParaSalvar['domingo'])
                }
              >
                <SelectTrigger className="mt-1 h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXCEDENTE_100">
                    Só as horas além da jornada
                  </SelectItem>
                  <SelectItem value="DIA_TODO_100">O dia todo</SelectItem>
                  <SelectItem value="NORMAL">
                    Nada: domingo é dia comum (folga em outro dia)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-bold text-muted-foreground">
                No feriado, o que vale 100%?
              </Label>
              <Select
                value={form.feriado}
                onValueChange={(v) =>
                  muda('feriado', v as RegraParaSalvar['feriado'])
                }
              >
                <SelectTrigger className="mt-1 h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DIA_TODO_100">O dia todo</SelectItem>
                  <SelectItem value="EXCEDENTE_100">
                    Só as horas além da jornada
                  </SelectItem>
                </SelectContent>
              </Select>
              <Sugestao abaixo={form.feriado !== 'DIA_TODO_100'}>
                Feriado trabalhado sem folga compensatória: a lei pede o dia em
                dobro.
              </Sugestao>
            </div>

            <div>
              <Label className="text-xs font-bold text-muted-foreground">
                Jornada do dia
              </Label>
              <Input
                type="time"
                className="mt-1 h-10 rounded-xl"
                value={paraHoraMin(form.jornadaDiariaMin)}
                onChange={(e) =>
                  muda('jornadaDiariaMin', deHoraMin(e.target.value))
                }
              />
              <Sugestao abaixo={form.jornadaDiariaMin > 480}>
                A lei pede no máximo 8 horas por dia. Em escala 6x1 é comum
                7h20.
              </Sugestao>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="regra-contar-semana"
                  className="text-xs font-bold text-muted-foreground"
                >
                  Contar também pela semana
                </Label>
                <Switch
                  id="regra-contar-semana"
                  checked={form.contarSemana}
                  onCheckedChange={(v) => muda('contarSemana', v)}
                />
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm">
                <span>acima de</span>
                <Input
                  type="number"
                  min={1}
                  className="h-9 w-20 rounded-xl"
                  value={Math.round(form.jornadaSemanalMin / 6) / 10}
                  onChange={(e) =>
                    muda(
                      'jornadaSemanalMin',
                      Math.round(Number(e.target.value) * 60),
                    )
                  }
                  disabled={!form.contarSemana}
                />
                <span>horas na semana</span>
              </div>
              <Sugestao abaixo={form.jornadaSemanalMin > 2640}>
                A lei pede no máximo 44 horas por semana; a hora que já foi
                extra no dia não conta de novo.
              </Sugestao>
            </div>

            <div>
              <Label className="text-xs font-bold text-muted-foreground">
                Tolerância por dia (minutos)
              </Label>
              <Input
                type="number"
                min={0}
                className="mt-1 h-10 rounded-xl"
                value={form.toleranciaMin}
                onChange={(e) =>
                  muda('toleranciaMin', Math.max(0, Number(e.target.value)))
                }
              />
              <Sugestao abaixo={form.toleranciaMin > 10}>
                Até 10 minutos no dia não contam; passou disso, conta tudo.
              </Sugestao>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="regra-noturno"
                  className="text-xs font-bold text-muted-foreground"
                >
                  Adicional noturno (22h às 5h)
                </Label>
                <Switch
                  id="regra-noturno"
                  checked={form.noturnoLigado}
                  onCheckedChange={(v) => muda('noturnoLigado', v)}
                />
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm">
                <Input
                  type="number"
                  min={0}
                  className="h-9 w-20 rounded-xl"
                  value={Math.round(form.adicionalNoturno * 1000) / 10}
                  onChange={(e) =>
                    muda('adicionalNoturno', Number(e.target.value) / 100)
                  }
                  disabled={!form.noturnoLigado}
                />
                <span>%</span>
                <label
                  className={cn(
                    'ml-2 flex items-center gap-1.5 text-xs',
                    !form.noturnoLigado && 'opacity-50',
                  )}
                >
                  <Switch
                    checked={form.horaNoturnaReduzida}
                    onCheckedChange={(v) => muda('horaNoturnaReduzida', v)}
                    disabled={!form.noturnoLigado}
                  />
                  hora de 52min30s
                </label>
              </div>
              <Sugestao
                abaixo={
                  !form.noturnoLigado ||
                  form.adicionalNoturno < 0.2 ||
                  !form.horaNoturnaReduzida
                }
              >
                A lei pede pelo menos 20%, com a hora noturna de 52 minutos e 30
                segundos. Desligado, as horas noturnas continuam aparecendo no
                espelho.
              </Sugestao>
            </div>

            <div>
              <Label className="text-xs font-bold text-muted-foreground">
                Horas padrão da diária
              </Label>
              <Input
                type="time"
                className="mt-1 h-10 rounded-xl"
                value={paraHoraMin(form.diariaMin)}
                onChange={(e) => muda('diariaMin', deHoraMin(e.target.value))}
              />
              <label className="mt-2 flex items-center gap-2 text-sm">
                <Switch
                  checked={form.diaristaRecebeExtra}
                  onCheckedChange={(v) => muda('diaristaRecebeExtra', v)}
                />
                Diarista recebe hora extra
              </label>
              <Sugestao abaixo={!form.diaristaRecebeExtra}>
                O que passar dessas horas é hora extra do diarista (a hora vale
                a diária dividida por elas). Desligado, as horas continuam
                aparecendo.
              </Sugestao>
            </div>

            <div>
              <Label className="text-xs font-bold text-muted-foreground">
                Divisor do salário
              </Label>
              <Input
                type="number"
                min={1}
                className="mt-1 h-10 rounded-xl"
                value={form.divisor}
                onChange={(e) =>
                  muda('divisor', Math.max(1, Number(e.target.value)))
                }
              />
              <Sugestao abaixo={false}>
                220 para 44 horas por semana (a hora = salário ÷ 220).
              </Sugestao>
            </div>

            <div>
              <Label className="text-xs font-bold text-muted-foreground">
                Vale a partir de
              </Label>
              <Input
                type="date"
                className="mt-1 h-10 rounded-xl"
                value={form.vigenteDesde}
                onChange={(e) => muda('vigenteDesde', e.target.value)}
              />
              <Sugestao abaixo={false}>
                Os dias antes desta data continuam com a regra anterior.
              </Sugestao>
            </div>
          </div>

          <div>
            <Label className="text-xs font-bold text-muted-foreground">
              Observação (opcional)
            </Label>
            <Input
              className="mt-1 h-10 rounded-xl"
              placeholder="Ex.: convenção 2025/2027, cadastro no sindicato nº..."
              value={form.observacao ?? ''}
              onChange={(e) => muda('observacao', e.target.value || null)}
            />
          </div>

          <div className="flex justify-end">
            <Button
              className="rounded-xl px-6 font-bold"
              disabled={salvar.isPending}
              onClick={() => salvar.mutate(form)}
            >
              {salvar.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar regra
            </Button>
          </div>
        </div>

        {/* Histórico das versões */}
        {data.historico.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">Versões da regra</p>
            <div className="overflow-x-auto rounded-xl border border-slate-200/70 dark:border-slate-800">
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Vale a partir de</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead className="text-center">Extra</TableHead>
                    <TableHead className="text-center">
                      Domingo e feriado
                    </TableHead>
                    <TableHead className="text-center">Jornada</TableHead>
                    <TableHead className="text-center">Noturno</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.historico.map((r) => (
                    <TableRow key={r.id ?? r.vigenteDesde}>
                      <TableCell className="font-mono">
                        {r.modelo === 'LEGADO'
                          ? 'desde o início'
                          : format(
                              new Date(`${r.vigenteDesde}T12:00:00`),
                              'dd/MM/yyyy',
                            )}
                      </TableCell>
                      <TableCell>{NOMES_DOS_MODELOS[r.modelo]}</TableCell>
                      <TableCell className="text-center">
                        {percentual(r.multiplicadorExtra)}
                      </TableCell>
                      <TableCell className="text-center">
                        {percentual(r.multiplicadorEspecial)}
                      </TableCell>
                      <TableCell className="text-center">
                        {paraHoraMin(r.jornadaDiariaMin)}
                        {r.contarSemana
                          ? ` · ${Math.round(r.jornadaSemanalMin / 60)}h/sem`
                          : ''}
                      </TableCell>
                      <TableCell className="text-center">
                        {r.noturnoLigado
                          ? `${Math.round(r.adicionalNoturno * 100)}%`
                          : 'desligado'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
