import { FileText, Image as ImageIcon, Trash2, Upload, X } from 'lucide-react'
import React, { useCallback, useState } from 'react'

import { API_BASE_URL } from '@/lib/axios'

import { Button } from './ui/button'

interface FileUploadProps {
  onFileSelect: (file: File | null) => void
  accept?: string
  maxSizeMB?: number
  currentFileUrl?: string | null
  publicReceiptUrl?: string | null
  readOnly?: boolean
  onRemoveExistingFile?: () => void
}

export function FileUpload({
  onFileSelect,
  accept = 'image/jpeg,image/png,image/webp,application/pdf',
  maxSizeMB = 10,
  currentFileUrl,
  publicReceiptUrl,
  readOnly = false,
  onRemoveExistingFile,
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>('')

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const validateAndSetFile = (file: File) => {
    setErrorMsg('')
    if (file.size > maxSizeMB * 1024 * 1024) {
      setErrorMsg(`O arquivo deve ter no máximo ${maxSizeMB}MB`)
      return
    }

    // Check if type matches our 'accept' list (rough validation)
    const acceptedTypes = accept.split(',')
    const isAccepted = acceptedTypes.some((type) => {
      // e.g. "image/*"
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.replace('/*', ''))
      }
      return file.type === type.trim()
    })

    if (!isAccepted) {
      setErrorMsg('Formato de arquivo não suportado')
      return
    }

    setSelectedFile(file)
    onFileSelect(file)

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    } else {
      setPreviewUrl(null)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0])
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0])
    }
  }

  const clearFile = () => {
    setSelectedFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
    onFileSelect(null)
    setErrorMsg('')
  }

  return (
    <div className="w-full space-y-2">
      {/* Exibe o arquivo existente, se houver + URL pública */}
      {currentFileUrl && !selectedFile && (
        <div className="flex flex-col gap-2 rounded-lg border border-border/50 bg-muted/50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Arquivo existente anexado
            </span>
            {!readOnly && onRemoveExistingFile && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onRemoveExistingFile}
                className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                title="Remover anexo"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const finalUrl = currentFileUrl.startsWith('http')
                  ? currentFileUrl
                  : `${API_BASE_URL?.replace(/\/$/, '') || ''}${currentFileUrl.startsWith('/') ? '' : '/'}${currentFileUrl}`
                window.open(finalUrl, '_blank')
              }}
              className="w-full text-xs"
            >
              <FileText className="mr-2 h-4 w-4" />
              Abrir arquivo
            </Button>
            {publicReceiptUrl && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => window.open(publicReceiptUrl, '_blank')}
                className="w-full text-xs"
              >
                <span>🔗 Compartilhar Comprovante</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {selectedFile ? (
        <div className="relative flex items-center rounded-lg border bg-muted/30 p-3">
          <div className="mr-3 flex-shrink-0">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Preview"
                className="h-12 w-12 rounded-md border object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
            )}
          </div>
          <div className="flex-1 truncate">
            <p className="truncate text-sm font-medium">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          <button
            type="button"
            onClick={clearFile}
            className="flex-shrink-0 rounded-full p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      ) : !readOnly && !currentFileUrl ? (
        <div
          className={`relative flex min-h-[120px] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 py-6 transition-colors
            ${dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept={accept}
            onChange={handleChange}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
          <div className="mb-3 flex rounded-full bg-primary/10 p-3">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          <p className="text-center text-sm font-medium text-foreground">
            Clique ou arraste um arquivo
          </p>
          <p className="mt-1 text-center text-xs text-muted-foreground">
            Suporta imagens ou PDF (máx. {maxSizeMB}MB)
          </p>
        </div>
      ) : null}

      {errorMsg && (
        <p className="text-center text-xs font-medium text-destructive">
          {errorMsg}
        </p>
      )}
    </div>
  )
}
