import { ArrowRight, FileText, Loader2, UploadCloud } from 'lucide-react'
import React, { useEffect, useRef } from 'react'

interface Step1OriginProps {
  onSelectOrigin: (mode: 'XML' | 'MANUAL', file?: File) => void
  isParsingXml: boolean
}

export const Step1Origin: React.FC<Step1OriginProps> = ({
  onSelectOrigin,
  isParsingXml,
}) => {
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
    <div className="mx-auto flex max-w-5xl flex-col items-center justify-center px-4 py-8 duration-300 animate-in fade-in">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xml,text/xml,application/xml"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Subheader Badge */}
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
        CAPÍTULO 1 DE 4 • Origem da Carga
      </div>

      {/* Pergunta Principal */}
      <h1 className="mb-4 max-w-2xl text-center text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl lg:text-5xl">
        Como você deseja registrar a entrada hoje?
      </h1>
      <p className="mb-12 text-center text-base text-slate-600 dark:text-slate-400 sm:text-lg">
        Escolha uma das opções para iniciar a conferência.
      </p>

      {/* Grid de Cards */}
      <div className="mb-12 grid w-full max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
        {/* Card 1: XML */}
        <div
          onClick={() => !isParsingXml && fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className={`group relative flex cursor-pointer select-none flex-col justify-between rounded-2xl border-2 p-8 transition-all
            ${
              isParsingXml
                ? 'cursor-wait border-emerald-500 bg-emerald-500/5 dark:bg-emerald-950/20'
                : 'border-slate-200 bg-white hover:border-emerald-500/60 hover:shadow-xl dark:border-slate-800/80 dark:bg-[#131B2A] dark:hover:border-emerald-500/60 dark:hover:shadow-emerald-950/20'
            }`}
        >
          {/* Badge Tecla 1 */}
          <div className="absolute right-6 top-6 rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
            1
          </div>

          <div>
            {/* Ícone */}
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 transition-transform group-hover:scale-110 dark:bg-emerald-500/20 dark:text-emerald-400">
              {isParsingXml ? (
                <Loader2 className="h-7 w-7 animate-spin" />
              ) : (
                <UploadCloud className="h-7 w-7" />
              )}
            </div>

            <h3 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">
              Arrastar ou selecionar XML (NF-e)
            </h3>
            <p className="mb-6 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {isParsingXml
                ? 'Lendo arquivo XML e conciliando fornecedor e insumos com inteligência...'
                : 'A IA decodifica fornecedor, quantidades e itens instantaneamente.'}
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800/60">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 transition-transform group-hover:translate-x-1 dark:text-emerald-400">
              {isParsingXml ? 'Processando nota...' : 'Importar documento'}{' '}
              <ArrowRight className="h-4 w-4" />
            </span>
            <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
              .xml, .sefaz
            </span>
          </div>
        </div>

        {/* Card 2: Manual */}
        <div
          onClick={() => !isParsingXml && onSelectOrigin('MANUAL')}
          className="group relative flex cursor-pointer select-none flex-col justify-between rounded-2xl border-2 border-slate-200 bg-white p-8 transition-all hover:border-emerald-500/60 hover:shadow-xl dark:border-slate-800/80 dark:bg-[#131B2A] dark:hover:border-emerald-500/60 dark:hover:shadow-emerald-950/20"
        >
          {/* Badge Tecla 2 */}
          <div className="absolute right-6 top-6 rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
            2
          </div>

          <div>
            {/* Ícone */}
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 transition-transform group-hover:scale-110 dark:bg-blue-500/20 dark:text-blue-400">
              <FileText className="h-7 w-7" />
            </div>

            <h3 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">
              Digitar avulso
            </h3>
            <p className="mb-6 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Ideal para compras de feira, pequenos produtores rurais ou
              contagem direta no almoxarifado.
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800/60">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 transition-transform group-hover:translate-x-1 dark:text-blue-400">
              Iniciar checklist manual <ArrowRight className="h-4 w-4" />
            </span>
            <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
              Entrada Direta
            </span>
          </div>
        </div>
      </div>

      {/* Dica de Teclado */}
      <div className="mb-10 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
        <span>⌨</span> Ou pressione{' '}
        <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
          1
        </kbd>{' '}
        ou{' '}
        <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
          2
        </kbd>{' '}
        no teclado para escolher rapidamente.
      </div>
    </div>
  )
}
