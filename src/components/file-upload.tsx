import React, { useCallback, useState } from 'react';
import { Upload, X, FileText, Image as ImageIcon } from 'lucide-react';
import { API_BASE_URL } from '@/lib/axios';
import { Button } from './ui/button';

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  accept?: string;
  maxSizeMB?: number;
  currentFileUrl?: string | null;
  publicReceiptUrl?: string | null;
  readOnly?: boolean;
}

export function FileUpload({ 
  onFileSelect, 
  accept = "image/jpeg,image/png,image/webp,application/pdf", 
  maxSizeMB = 10,
  currentFileUrl,
  publicReceiptUrl,
  readOnly = false,
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const validateAndSetFile = (file: File) => {
    setErrorMsg('');
    if (file.size > maxSizeMB * 1024 * 1024) {
      setErrorMsg(`O arquivo deve ter no máximo ${maxSizeMB}MB`);
      return;
    }
    
    // Check if type matches our 'accept' list (rough validation)
    const acceptedTypes = accept.split(',');
    const isAccepted = acceptedTypes.some(type => {
      // e.g. "image/*"
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.replace('/*', ''));
      }
      return file.type === type.trim();
    });

    if (!isAccepted) {
      setErrorMsg('Formato de arquivo não suportado');
      return;
    }

    setSelectedFile(file);
    onFileSelect(file);

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    onFileSelect(null);
    setErrorMsg('');
  };

  return (
    <div className="w-full space-y-2">
      {/* Exibe o arquivo existente, se houver + URL pública */}
      {currentFileUrl && !selectedFile && (
         <div className="flex flex-col gap-2 p-3 bg-muted/50 rounded-lg border border-border/50">
            <span className="text-sm font-medium text-muted-foreground">Arquivo existente anexado</span>
            <div className="flex gap-2">
                <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      const finalUrl = currentFileUrl.startsWith('http') ? currentFileUrl : `${API_BASE_URL?.replace(/\/$/, '') || ''}${currentFileUrl.startsWith('/') ? '' : '/'}${currentFileUrl}`;
                      window.open(finalUrl, '_blank')
                    }}
                    className="w-full text-xs"
                >
                    <FileText className="w-4 h-4 mr-2" />
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
        <div className="relative flex items-center p-3 border rounded-lg bg-muted/30">
          <div className="flex-shrink-0 mr-3">
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="w-12 h-12 object-cover rounded-md border" />
            ) : (
              <div className="w-12 h-12 flex items-center justify-center bg-primary/10 rounded-md border">
                <FileText className="w-6 h-6 text-primary" />
              </div>
            )}
          </div>
          <div className="flex-1 truncate">
            <p className="text-sm font-medium truncate">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          <button 
            type="button" 
            onClick={clearFile}
            className="p-1 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ) : !readOnly ? (
        <div 
          className={`relative flex flex-col items-center justify-center w-full min-h-[120px] p-4 py-6 border-2 border-dashed rounded-xl transition-colors
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
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex p-3 rounded-full bg-primary/10 mb-3">
             <Upload className="w-6 h-6 text-primary" />
          </div>
          <p className="text-sm font-medium text-foreground text-center">
            Clique ou arraste um arquivo
          </p>
          <p className="text-xs text-muted-foreground mt-1 text-center">
            Suporta imagens ou PDF (máx. {maxSizeMB}MB)
          </p>
        </div>
      ) : null}
      
      {errorMsg && (
        <p className="text-xs text-destructive font-medium text-center">{errorMsg}</p>
      )}
    </div>
  );
}
