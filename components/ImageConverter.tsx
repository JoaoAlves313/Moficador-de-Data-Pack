import React, { useState, useCallback, useRef, useEffect } from 'react';
import { UploadIcon, DownloadIcon, ClearIcon, SparklesIcon } from './Icons';
import ApiKeyModal from './ApiKeyModal';

// Helper function to convert a data URL to a Blob
const dataURLtoBlob = (dataurl: string): Blob => {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) {
        throw new Error('Invalid data URL');
    }
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

// Helper function to convert an ArrayBuffer to a data URL
const arrayBufferToDataURL = (buffer: ArrayBuffer, mimeType: string): Promise<string> => {
    return new Promise((resolve) => {
        const blob = new Blob([buffer], { type: mimeType });
        const reader = new FileReader();
        reader.onload = () => {
            resolve(reader.result as string);
        };
        reader.readAsDataURL(blob);
    });
};

const ImageConverter: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [convertedImage, setConvertedImage] = useState<string | null>(null);
  const [originalFileName, setOriginalFileName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRemovingBackground, setIsRemovingBackground] = useState(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const storedApiKey = localStorage.getItem('removebg_api_key');
    if (storedApiKey) {
      setApiKey(storedApiKey);
    }
  }, []);

  const processImage = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Tipo de arquivo inválido. Por favor, envie um arquivo de imagem.');
      return;
    }
    setError('');
    setIsProcessing(true);
    setOriginalImage(null);
    setConvertedImage(null);
    setOriginalFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 120;
        canvas.height = 120;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, 120, 120);
          const webpDataUrl = canvas.toDataURL('image/webp', 0.9);
          setConvertedImage(webpDataUrl);
        } else {
          setError('Não foi possível processar a imagem.');
        }
        setOriginalImage(e.target?.result as string);
        setIsProcessing(false);
      };
      img.onerror = () => {
        setError('Não foi possível carregar a imagem.');
        setIsProcessing(false);
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      setError('Falha ao ler o arquivo.');
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processImage(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processImage(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleReset = () => {
    setOriginalImage(null);
    setConvertedImage(null);
    setOriginalFileName('');
    setError('');
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleDownload = () => {
      if (!convertedImage) return;
      const link = document.createElement('a');
      link.href = convertedImage;
      
      const baseName = originalFileName.split('.').slice(0, -1).join('.') || 'image';
      let newFileName;

      if (convertedImage.startsWith('data:image/png')) {
          newFileName = `${baseName}_120x120_no-bg.png`;
      } else { // Assumes webp otherwise
          newFileName = `${baseName}_120x120.webp`;
      }

      link.download = newFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleRemoveBackground = async () => {
    if (!convertedImage) {
        setError("Nenhuma imagem convertida para processar.");
        return;
    }

    if (!apiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }

    setIsRemovingBackground(true);
    setError('');

    try {
        const imageBlob = dataURLtoBlob(convertedImage);
        const imageName = originalFileName || 'image.webp';
        
        const formData = new FormData();
        formData.append("size", "auto");
        formData.append("image_file", imageBlob, imageName);

        const response = await fetch("https://api.remove.bg/v1.0/removebg", {
            method: "POST",
            headers: { "X-Api-Key": apiKey },
            body: formData,
        });
        
        if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            const newDataUrl = await arrayBufferToDataURL(arrayBuffer, 'image/png');
            setConvertedImage(newDataUrl);
        } else {
            const errorText = await response.text();
            console.error("remove.bg error:", errorText);
             if (response.status === 403) {
                 setError(`Chave da API inválida. Por favor, verifique sua chave e tente novamente.`);
                 localStorage.removeItem('removebg_api_key');
                 setApiKey('');
            } else {
                setError(`Falha ao remover o fundo: ${response.status} ${response.statusText}. Verifique a chave da API e os créditos.`);
            }
        }
    } catch (err) {
        console.error(err);
        const message = err instanceof Error ? err.message : String(err);
        setError(`Ocorreu um erro: ${message}`);
    } finally {
        setIsRemovingBackground(false);
    }
  };

  const handleSaveApiKey = (newApiKey: string) => {
    localStorage.setItem('removebg_api_key', newApiKey);
    setApiKey(newApiKey);
    setIsApiKeyModalOpen(false);
  };

  const borderColor = isDragging ? 'border-blue-500' : 'border-gray-600';
  const bgColor = isDragging ? 'bg-gray-700/50' : 'bg-gray-800/50';

  return (
    <>
      <ApiKeyModal 
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onSave={handleSaveApiKey}
      />
      <div className="w-full max-w-4xl mx-auto bg-gray-800 rounded-xl shadow-2xl border border-gray-700 p-6 sm:p-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-white mb-6">
              Conversor de Imagens
          </h2>
          <p className="text-center text-gray-400 mb-8">
              Converta suas imagens para o formato WebP (120x120 pixels) e remova o fundo.
          </p>
          
          {!originalImage && !isProcessing && (
              <div 
                  className={`relative flex flex-col items-center justify-center w-full h-64 p-8 border-2 ${borderColor} border-dashed rounded-xl transition-colors duration-200 ${bgColor}`}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <div className="text-center">
                    <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-4 text-lg font-semibold text-gray-300">
                      Arraste e solte uma imagem aqui
                    </p>
                    <p className="mt-1 text-sm text-gray-500">ou</p>
                    <label htmlFor="image-upload" className="mt-2 inline-block cursor-pointer rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
                      Procurar Arquivo
                    </label>
                  </div>
                  <input ref={fileInputRef} id="image-upload" name="image-upload" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
                </div>
          )}

          {isProcessing && (
              <div className="flex flex-col items-center justify-center h-64">
                  <svg className="animate-spin h-10 w-10 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="mt-4 text-lg text-gray-300">Processando imagem...</p>
              </div>
          )}

          {error && (
              <div className="mt-4 p-4 bg-red-900/50 border border-red-500/50 text-red-300 rounded-lg text-center">
                {error}
              </div>
          )}
          
          {originalImage && convertedImage && (
              <div className="animate-fadeIn">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                      <div className="text-center">
                          <h3 className="text-lg font-semibold text-white mb-2">Original</h3>
                          <img src={originalImage} alt="Original" className="mx-auto rounded-lg shadow-lg border-2 border-gray-600 max-w-full h-auto" style={{maxWidth: '200px'}} />
                      </div>
                      <div className="text-center">
                          <h3 className="text-lg font-semibold text-white mb-2">Processada</h3>
                          <img src={convertedImage} alt="Convertida" className="mx-auto rounded-lg shadow-lg border-2 border-green-500" width="120" height="120"/>
                      </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                      <button 
                          onClick={handleDownload}
                          disabled={isRemovingBackground}
                          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-wait">
                          <DownloadIcon />
                          Baixar Imagem
                      </button>
                      <button
                          onClick={handleRemoveBackground}
                          disabled={isRemovingBackground}
                          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-wait"
                          >
                          {isRemovingBackground ? (
                              <>
                              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Removendo...
                              </>
                          ) : (
                              <>
                              <SparklesIcon className="h-5 w-5" />
                              Remover Fundo
                              </>
                          )}
                      </button>
                      <button 
                          onClick={handleReset} 
                          disabled={isRemovingBackground}
                          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-wait">
                        <ClearIcon className="h-5 w-5" />
                        Nova Imagem
                      </button>
                  </div>
              </div>
          )}
      </div>
    </>
  );
};

export default ImageConverter;
