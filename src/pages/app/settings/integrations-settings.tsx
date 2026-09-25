import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Copy, ExternalLink, Loader2, Receipt, Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { api } from '@/lib/axios'

// Configurações > Integrações (25/09/2026): serviços de fora que conversam com o Metrics.
// Saiu do "Meu Cardápio (White Label)". Cada cartão salva só o que é dele.

type UltimoTeste = {
  em: string
  uf: string
  ncm: string
  federal: number
  estadual: number
  municipal: number
  versao: string
  vigenciaFim: string | null
}

type Integracoes = {
  tabelaPronta: boolean
  empresa: { cnpj: string; uf: string }
  ibpt: {
    configurado: boolean
    ativo: boolean
    cnpj: string
    tokenMascarado: string
    ultimoTeste: UltimoTeste | null
  }
  ifood: { merchantId: string; conectado: boolean; tokenExpiraEm: string | null }
  food99: { shopId: string }
}

const WEBHOOK_99FOOD = 'https://api.metrics.dev.br/webhooks/99food'

function mensagemDoErro(error: any, padrao: string) {
  return error?.response?.data?.message || error?.response?.data?.details || error?.response?.data?.error || padrao
}

function formatarCnpj(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

const porcentagem = (n: number) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`
const dataBr = (iso: string | null) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR') : '')

function StatusBadge({ ok, textoOk, textoNao }: { ok: boolean; textoOk: string; textoNao: string }) {
  return ok ? (
    <Badge className="gap-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300">
      <CheckCircle2 className="h-3.5 w-3.5" /> {textoOk}
    </Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground">
      {textoNao}
    </Badge>
  )
}

function CartaoIbpt({ dados }: { dados: Integracoes }) {
  const queryClient = useQueryClient()
  const [cnpj, setCnpj] = useState(formatarCnpj(dados.ibpt.cnpj || dados.empresa.cnpj))
  const [token, setToken] = useState('')
  const [ativo, setAtivo] = useState(dados.ibpt.configurado ? dados.ibpt.ativo : true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    setCnpj(formatarCnpj(dados.ibpt.cnpj || dados.empresa.cnpj))
    setAtivo(dados.ibpt.configurado ? dados.ibpt.ativo : true)
  }, [dados.ibpt.cnpj, dados.ibpt.ativo, dados.ibpt.configurado, dados.empresa.cnpj])

  const { mutate: salvar, isPending } = useMutation({
    mutationFn: async () => {
      const corpo: Record<string, unknown> = { ativo, cnpj: cnpj.replace(/\D/g, '') }
      if (token.trim()) corpo.token = token.trim()
      const { data } = await api.put('/settings/integrations/ibpt', corpo)
      return data as { message: string; aviso: boolean }
    },
    onSuccess: (data) => {
      setErro(null)
      setToken('')
      if (data.aviso) toast.warning(data.message)
      else toast.success(data.message)
      queryClient.invalidateQueries({ queryKey: ['external-integrations'] })
    },
    onError: (error: any) => {
      const msg = mensagemDoErro(error, 'Não foi possível salvar o De Olho no Imposto.')
      setErro(msg)
      toast.error(msg)
    },
  })

  const teste = dados.ibpt.ultimoTeste
  const ligado = dados.ibpt.configurado && dados.ibpt.ativo

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Receipt className="h-5 w-5 text-primary" /> De Olho no Imposto (IBPT)
          </CardTitle>
          <StatusBadge ok={ligado} textoOk="Ativo" textoNao={dados.ibpt.configurado ? 'Desligado' : 'Não configurado'} />
        </div>
        <CardDescription>
          Mostra no cupom fiscal o valor aproximado dos impostos de cada venda, como pede a Lei 12.741/2012. Com o token
          salvo, o PDV atualiza a tabela de impostos sozinho pela internet: ninguém precisa mais baixar arquivo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <ol className="list-decimal space-y-1 rounded-lg bg-muted/50 p-4 pl-8 text-sm text-muted-foreground">
          <li>
            Entre em{' '}
            <a
              href="https://deolhonoimposto.ibpt.org.br"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-primary underline underline-offset-2"
            >
              deolhonoimposto.ibpt.org.br
            </a>{' '}
            e cadastre a empresa, com o CNPJ dela. É gratuito.
          </li>
          <li>Copie o token que o site mostra no fim do cadastro.</li>
          <li>Cole abaixo e clique em "Salvar e testar".</li>
        </ol>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ibpt-cnpj">CNPJ cadastrado no De Olho no Imposto</Label>
            <Input
              id="ibpt-cnpj"
              inputMode="numeric"
              value={cnpj}
              onChange={(e) => setCnpj(formatarCnpj(e.target.value))}
              placeholder="00.000.000/0000-00"
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">O token só funciona com o CNPJ usado no cadastro.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ibpt-token">Token</Label>
            <Input
              id="ibpt-token"
              type="password"
              autoComplete="off"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={dados.ibpt.configurado ? `Token salvo (${dados.ibpt.tokenMascarado}). Cole outro para trocar.` : 'Cole aqui o token'}
              className="h-11"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
          <div>
            <Label htmlFor="ibpt-ativo" className="text-sm font-semibold">
              Usar no cupom fiscal
            </Label>
            <p className="text-xs text-muted-foreground">Desligado, o PDV continua com a tabela importada por arquivo, se houver.</p>
          </div>
          <Switch id="ibpt-ativo" checked={ativo} onCheckedChange={setAtivo} />
        </div>

        {teste && (
          <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
            Último teste em {new Date(teste.em).toLocaleString('pt-BR')}: {teste.uf}, NCM {teste.ncm} (preparações
            alimentícias) com {porcentagem(teste.federal)} federal, {porcentagem(teste.estadual)} estadual e{' '}
            {porcentagem(teste.municipal)} municipal. Tabela {teste.versao}
            {teste.vigenciaFim ? `, vale até ${dataBr(teste.vigenciaFim)}` : ''}.
          </p>
        )}

        {erro && (
          <p role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {erro}
          </p>
        )}

        <div className="flex justify-end">
          <Button type="button" onClick={() => salvar()} disabled={isPending || !dados.tabelaPronta} className="h-11 w-full font-bold sm:w-auto">
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar e testar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function CartaoIfood({ dados }: { dados: Integracoes }) {
  const queryClient = useQueryClient()
  const [merchantId, setMerchantId] = useState(dados.ifood.merchantId)
  const [autorizacao, setAutorizacao] = useState<{ userCode: string; verificationUrlComplete: string } | null>(null)
  const [codigo, setCodigo] = useState('')
  const [gerandoCodigo, setGerandoCodigo] = useState(false)
  const [concluindo, setConcluindo] = useState(false)

  useEffect(() => setMerchantId(dados.ifood.merchantId), [dados.ifood.merchantId])

  const { mutate: salvarMerchant, isPending } = useMutation({
    mutationFn: async () => (await api.put('/settings/integrations/ifood', { merchantId: merchantId.trim() || null })).data,
    onSuccess: (data: any) => {
      toast.success(data?.message || 'ID da loja no iFood salvo.')
      queryClient.invalidateQueries({ queryKey: ['external-integrations'] })
    },
    onError: (error: any) => toast.error(mensagemDoErro(error, 'Não foi possível salvar o ID da loja no iFood.')),
  })

  async function autorizarLoja() {
    setGerandoCodigo(true)
    try {
      const response = await api.get('/delivery/ifood/usercode')
      if (response.data?.userCode) {
        setAutorizacao({
          userCode: response.data.userCode,
          verificationUrlComplete:
            response.data.verificationUrlComplete || response.data.verificationUrl || 'https://portal.ifood.com.br',
        })
        toast.success('Código de autorização do iFood gerado.')
      } else {
        toast.error('Não foi possível obter o código de autorização.')
      }
    } catch (error: any) {
      toast.error(mensagemDoErro(error, 'Erro ao obter o código de autorização do iFood.'))
    } finally {
      setGerandoCodigo(false)
    }
  }

  async function concluirAutorizacao() {
    if (!autorizacao || !codigo.trim()) {
      toast.error('Cole o código recebido depois de autorizar a loja no iFood.')
      return
    }
    setConcluindo(true)
    try {
      await api.post('/delivery/ifood/token', { authorizationCode: codigo.trim() })
      toast.success('Loja do iFood autorizada.')
      setCodigo('')
      setAutorizacao(null)
      queryClient.invalidateQueries({ queryKey: ['external-integrations'] })
      queryClient.invalidateQueries({ queryKey: ['company-profile'] })
    } catch (error: any) {
      toast.error(mensagemDoErro(error, 'Não foi possível concluir a autorização da loja no iFood.'))
    } finally {
      setConcluindo(false)
    }
  }

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600 text-xs font-black text-white">iF</span>
            iFood
          </CardTitle>
          <StatusBadge ok={dados.ifood.conectado} textoOk="Loja autorizada" textoNao="Não autorizada" />
        </div>
        <CardDescription>Os pedidos do iFood entram sozinhos no PDV e na tela de Delivery.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="ifood-merchant">ID da loja no iFood (Merchant ID)</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="ifood-merchant"
              value={merchantId}
              onChange={(e) => setMerchantId(e.target.value)}
              placeholder="Ex.: 0157299d-4790-4389-9703-47d56b5fe140"
              className="h-11"
            />
            <Button type="button" variant="outline" onClick={() => salvarMerchant()} disabled={isPending} className="h-11 shrink-0">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar ID
            </Button>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Para o Metrics receber os pedidos, autorize a loja no Portal do Parceiro do iFood.
          </p>
          <Button type="button" onClick={autorizarLoja} disabled={gerandoCodigo} className="h-11 bg-red-600 font-bold text-white hover:bg-red-700">
            {gerandoCodigo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {dados.ifood.conectado ? 'Autorizar de novo' : 'Autorizar loja'}
          </Button>

          {autorizacao && (
            <div className="space-y-3 rounded-lg border border-red-200 p-4 dark:border-red-900/50">
              <p className="text-sm font-semibold">1. Copie este código e confirme no portal do iFood:</p>
              <div className="flex items-center justify-between gap-2 rounded-md bg-muted p-3">
                <code className="text-lg font-black tracking-wider text-red-600">{autorizacao.userCode}</code>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="gap-1"
                  onClick={() => {
                    navigator.clipboard.writeText(autorizacao.userCode)
                    toast.success('Código copiado.')
                  }}
                >
                  <Copy className="h-4 w-4" /> Copiar
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full gap-2"
                onClick={() => window.open(autorizacao.verificationUrlComplete, '_blank')}
              >
                <ExternalLink className="h-4 w-4" /> Abrir o portal do iFood
              </Button>
              <div className="space-y-2">
                <Label htmlFor="ifood-codigo">2. Cole o código de autorização que o iFood devolver:</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="ifood-codigo"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    placeholder="Código de autorização"
                    className="h-11"
                  />
                  <Button
                    type="button"
                    onClick={concluirAutorizacao}
                    disabled={concluindo || !codigo.trim()}
                    className="h-11 shrink-0 bg-red-600 font-bold text-white hover:bg-red-700"
                  >
                    {concluindo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Concluir
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function CartaoFood99({ dados }: { dados: Integracoes }) {
  const queryClient = useQueryClient()
  const [shopId, setShopId] = useState(dados.food99.shopId)
  useEffect(() => setShopId(dados.food99.shopId), [dados.food99.shopId])

  const { mutate: salvar, isPending } = useMutation({
    mutationFn: async () => (await api.put('/settings/integrations/food99', { shopId: shopId.trim() || null })).data,
    onSuccess: (data: any) => {
      toast.success(data?.message || 'ID da loja na 99Food salvo.')
      queryClient.invalidateQueries({ queryKey: ['external-integrations'] })
    },
    onError: (error: any) => toast.error(mensagemDoErro(error, 'Não foi possível salvar o ID da loja na 99Food.')),
  })

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-xs font-black text-white">99</span>
            99Food
          </CardTitle>
          <StatusBadge ok={Boolean(dados.food99.shopId)} textoOk="ID salvo" textoNao="Sem ID da loja" />
        </div>
        <CardDescription>Os pedidos da 99Food chegam pelo endereço de aviso (webhook) abaixo.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="food99-shop">ID da loja na 99Food (App Shop ID)</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input id="food99-shop" value={shopId} onChange={(e) => setShopId(e.target.value)} placeholder="Ex.: 342343227" className="h-11" />
            <Button type="button" variant="outline" onClick={() => salvar()} disabled={isPending || !dados.tabelaPronta} className="h-11 shrink-0">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar ID
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Endereço de aviso (webhook) para cadastrar na 99Food</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input readOnly value={WEBHOOK_99FOOD} className="h-11 font-mono text-xs" />
            <Button
              type="button"
              variant="outline"
              className="h-11 shrink-0 gap-2"
              onClick={() => {
                navigator.clipboard.writeText(WEBHOOK_99FOOD)
                toast.success('Endereço copiado.')
              }}
            >
              <Copy className="h-4 w-4" /> Copiar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function CartaoCatalogo() {
  const [enviando, setEnviando] = useState(false)

  async function enviar() {
    setEnviando(true)
    try {
      const response = await api.post('/delivery/catalog/sync')
      toast.success(response.data?.message || 'Cardápio enviado.')
    } catch (error: any) {
      toast.error(mensagemDoErro(error, 'Erro ao enviar o cardápio para os marketplaces.'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Send className="h-5 w-5 text-primary" /> Cardápio nos marketplaces
        </CardTitle>
        <CardDescription>
          Envia os produtos e preços do Metrics para a 99Food. O iFood ainda não recebe o cardápio por aqui.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button type="button" onClick={enviar} disabled={enviando} className="h-11 w-full font-bold sm:w-auto">
          {enviando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Enviar cardápio agora
        </Button>
      </CardContent>
    </Card>
  )
}

export function IntegrationsSettings() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['external-integrations'],
    queryFn: async () => (await api.get('/settings/integrations/external')).data as Integracoes,
  })

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Integrações</h2>
        <p className="text-sm text-muted-foreground">Serviços de fora que conversam com o Metrics. Cada cartão salva sozinho.</p>
      </div>
      <Separator />

      {isLoading && (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {isError && (
        <div role="alert" className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          <p>Não foi possível carregar as integrações.</p>
          <Button type="button" variant="outline" onClick={() => refetch()}>
            Tentar de novo
          </Button>
        </div>
      )}

      {data && (
        <>
          {!data.tabelaPronta && (
            <p role="status" className="flex items-start gap-2 rounded-lg bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              O banco desta loja ainda não tem o espaço das integrações. Rode o Sincronizar no SaaS Admin para poder salvar
              o De Olho no Imposto e a 99Food.
            </p>
          )}
          <CartaoIbpt dados={data} />
          <CartaoIfood dados={data} />
          <CartaoFood99 dados={data} />
          <CartaoCatalogo />
        </>
      )}
    </div>
  )
}
