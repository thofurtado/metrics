import { FolderSync, HardDrive, Shield, CheckCircle2, ArrowRightLeft, Sparkles } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function SyncthingTab() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FolderSync className="h-5 w-5 text-teal-400" />
            Sincronização P2P & Backup Distribuído (Syncthing)
          </h2>
          <p className="text-sm text-muted-foreground">
            Sincronização contínua de backups de banco de dados, XMLs fiscais e fotos de produtos entre lojas através do túnel da VPN.
          </p>
        </div>
        <Badge variant="outline" className="bg-teal-500/10 text-teal-400 border-teal-500/30 self-start">
          <Sparkles className="h-3 w-3 mr-1" /> Em Preparação
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="border-border/60 bg-card/60 backdrop-blur-xl">
          <CardHeader>
            <div className="h-10 w-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400 mb-2">
              <HardDrive className="h-5 w-5" />
            </div>
            <CardTitle className="text-base font-bold">Backups de Banco do PDV</CardTitle>
            <CardDescription className="text-xs">
              Sincronização automática e redundante dos arquivos .FDB / .SQL do Metrics.PDV para o servidor de retaguarda.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-xl">
          <CardHeader>
            <div className="h-10 w-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400 mb-2">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
            <CardTitle className="text-base font-bold">Arquivos Fiscais & XMLs</CardTitle>
            <CardDescription className="text-xs">
              Envio instantâneo de notas emitidas em todas as filiais para centralização da contabilidade da empresa.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-xl">
          <CardHeader>
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-2">
              <Shield className="h-5 w-5" />
            </div>
            <CardTitle className="text-base font-bold">Velocidade Máxima P2P</CardTitle>
            <CardDescription className="text-xs">
              Tráfego direto entre as máquinas sem consumir banda de servidores externos, protegido por criptografia TLS ponta a ponta.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}
