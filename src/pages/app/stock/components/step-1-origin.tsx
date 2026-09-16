import React, { useRef, useEffect } from 'react'
import { UploadCloud, FileText, CheckCircle2, ShieldCheck, TrendingUp, ClipboardCheck, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Step1OriginProps {
  onSelectOrigin: (mode: 'XML' | 'MANUAL', file?: File) => void
  isParsingXml: boolean
}

export const Step1Origin: React.FC<Step1OriginProps> = ({ onSelectOrigin, isParsingXml }) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onSelectOrigin('XML', file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && (file.name.endsWith('.xml') || file.type.includes('xml'))) {
      onSelectOrigin('XML', file)
    }
  }

  // Atalhos de teclado 1 e 2
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isParsingXml) return
      if (e.key === '1') {
        fileInputRef.current?.click()
      } else if (e.key === '2') {
        onSelectOrigin('MANUAL')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isParsingXml, onSelectOrigin])

  return (
    <div className="flex flex-col items-center justify-center max-w-5xl mx-auto px-4 py-8 animate-in fade-in duration-300">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xml,text/xml,application/xml"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Subheader Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mb-6">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        CAPÍTULO 1 DE 4 • Origem da Carga
      </div>

      {/* Pergunta Principal */}
      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-center text-slate-900 dark:text-white max-w-2xl mb-4">
        Como você deseja registrar a entrada hoje?
      </h1>
      <p className="text-slate-600 dark:text-slate-400 text-center text-base sm:text-lg mb-12">
        Escolha uma das opções para iniciar a conferência.
      </p>

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mb-12">
        {/* Card 1: XML */}
        <div
          onClick={() => !isParsingXml && fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className={`group relative flex flex-col justify-between p-8 rounded-2xl border-2 transition-all cursor-pointer select-none
            ${isParsingXml
              ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-950/20 cursor-wait'
              : 'border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#131B2A] hover:border-emerald-500/60 dark:hover:border-emerald-500/60 hover:shadow-xl dark:hover:shadow-emerald-950/20'
            }`}
        >
          {/* Badge Tecla 1 */}
          <div className="absolute top-6 right-6 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            1
          </div>

          <div>
            {/* Ícone */}
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
              {isParsingXml ? <Loader2 className="w-7 h-7 animate-spin" /> : <UploadCloud className="w-7 h-7" />}
            </div>

            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Arrastar ou selecionar XML (NF-e)
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
              {isParsingXml
                ? 'Lendo arquivo XML e conciliando fornecedor e insumos com inteligência...'
                : 'A IA decodifica fornecedor, quantidades e itens instantaneamente.'}
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/60">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform">
              {isParsingXml ? 'Processando nota...' : 'Importar documento'} <ArrowRight className="w-4 h-4" />
            </span>
            <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">
              .xml, .sefaz
            </span>
          </div>
        </div>

        {/* Card 2: Manual */}
        <div
          onClick={() => !isParsingXml && onSelectOrigin('MANUAL')}
          className="group relative flex flex-col justify-between p-8 rounded-2xl border-2 border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#131B2A] hover:border-emerald-500/60 dark:hover:border-emerald-500/60 hover:shadow-xl dark:hover:shadow-emerald-950/20 transition-all cursor-pointer select-none"
        >
          {/* Badge Tecla 2 */}
          <div className="absolute top-6 right-6 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            2
          </div>

          <div>
            {/* Ícone */}
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6 group-hover:scale-110 transition-transform">
              <FileText className="w-7 h-7" />
            </div>

            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Digitar avulso
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
              Ideal para compras de feira, pequenos produtores rurais ou contagem direta no almoxarifado.
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/60">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">
              Iniciar checklist manual <ArrowRight className="w-4 h-4" />
            </span>
            <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">
              Entrada Direta
            </span>
          </div>
        </div>
      </div>

      {/* Dica de Teclado */}
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-400 mb-10">
        <span>⌨</span> Ou pressione <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700">1</kbd> ou <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700">2</kbd> no teclado para escolher rapidamente.
      </div>

      {/* Selos de Rigor Técnico */}
      <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-600 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-500" /> Auditoria automática
        </span>
        <span className="inline-flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-emerald-500" /> Reconciliação em tempo real
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ClipboardCheck className="w-4 h-4 text-emerald-500" /> Padrão HACCP / ANVISA
        </span>
      </div>
    </div>
  )
}
