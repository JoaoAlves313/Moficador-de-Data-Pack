import React, { useState, useEffect } from 'react';
import { ClearIcon, YouTubeIcon } from './Icons';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string) => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave }) => {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Reset state when modal is opened/closed
  useEffect(() => {
    if (!isOpen) {
      setApiKey('');
      setIsLoading(false);
      setValidationError('');
    }
  }, [isOpen]);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value);
    if (validationError) {
      setValidationError(''); // Clear validation error when user types
    }
  };

  const handleSave = async () => {
    const trimmedApiKey = apiKey.trim();
    if (!trimmedApiKey) return;

    setIsLoading(true);
    setValidationError('');

    try {
      const response = await fetch("https://api.remove.bg/v1.0/account", {
        method: "GET",
        headers: { "X-Api-Key": trimmedApiKey },
      });

      if (response.ok) {
        // Key is valid, call onSave which will also close the modal
        onSave(trimmedApiKey);
      } else {
        // Key is invalid
        let errorMessage = "Chave da API inválida. Por favor, verifique e tente novamente.";
        try {
            const errorData = await response.json();
            if (errorData.errors && errorData.errors[0] && errorData.errors[0].title) {
                errorMessage = `Erro: ${errorData.errors[0].title}. Por favor, verifique sua chave.`;
            }
        } catch (e) {
            // Ignore if response is not json
        }
        setValidationError(errorMessage);
      }
    } catch (err) {
      console.error("API key validation error:", err);
      setValidationError("Falha ao validar a chave. Verifique sua conexão com a internet.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSave();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 transition-opacity duration-300 animate-fadeIn"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-gray-800 rounded-2xl shadow-xl w-full max-w-md m-4 flex flex-col border border-gray-700 transform transition-transform duration-300 animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 p-6 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">Insira sua Chave da API remove.bg</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
              aria-label="Fechar modal"
            >
              <ClearIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
        <div className="flex-grow p-6 space-y-4">
          <a
            href="https://www.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 hover:underline"
          >
            <YouTubeIcon className="h-5 w-5 text-red-600" />
            como conseguir sua API
          </a>
          <input
            type="text"
            placeholder="Cole sua chave da API aqui"
            value={apiKey}
            onChange={handleApiKeyChange}
            onKeyPress={handleKeyPress}
            className={`w-full px-4 py-2 bg-gray-700 border rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${validationError ? 'border-red-500' : 'border-gray-600'}`}
            aria-label="Chave da API"
            aria-invalid={!!validationError}
            aria-describedby="api-key-error"
          />
          {validationError && (
            <p id="api-key-error" className="text-sm text-red-400" role="alert">
              {validationError}
            </p>
          )}
           <p className="text-xs text-gray-500">
            Sua chave de API será salva no armazenamento local do seu navegador e não será compartilhada.
          </p>
        </div>
        <div className="flex-shrink-0 p-6 border-t border-gray-700">
          <button
            onClick={handleSave}
            disabled={!apiKey.trim() || isLoading}
            className="w-full px-4 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-500 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Validando...
              </>
            ) : (
                'Salvar e Continuar'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
