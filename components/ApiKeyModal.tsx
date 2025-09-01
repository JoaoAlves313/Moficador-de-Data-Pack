import React, { useState, useEffect } from 'react';
import { ClearIcon, YouTubeIcon, ChevronLeftIcon } from './Icons';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string) => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave }) => {
  const [view, setView] = useState<'main' | 'community'>('main');
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);
  const communityApiKey = 'rHqTVDj3ntmQoMLpbRY17mHF';

  // Reset state when modal is opened/closed
  useEffect(() => {
    if (isOpen) {
      setView('main'); // Reset to main view when opened
    } else {
      setApiKey('');
      setIsLoading(false);
      setValidationError('');
      setShowInstructions(false);
    }
  }, [isOpen]);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value);
    if (validationError) {
      setValidationError(''); // Clear validation error when user types
    }
  };

  const handleSelectCommunityKey = (key: string) => {
    setApiKey(key);
    setView('main');
    if (validationError) {
      setValidationError('');
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
        onSave(trimmedApiKey);
      } else {
        let errorMessage = "Chave da API inválida. Por favor, verifique e tente novamente.";
        try {
            const errorData = await response.json();
            if (errorData.errors && errorData.errors[0] && errorData.errors[0].title) {
                errorMessage = `Erro: ${errorData.errors[0].title}. Por favor, verifique sua chave.`;
            }
        } catch (e) { /* Ignore if response is not json */ }
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

  const renderMainView = () => (
    <>
      <div className="flex-shrink-0 p-6 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">Insira sua Chave da API</h2>
          <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors" aria-label="Fechar modal"><ClearIcon className="h-6 w-6" /></button>
        </div>
      </div>
      <div className="flex-grow p-6 space-y-4 overflow-y-auto">
        <button onClick={() => setShowInstructions(!showInstructions)} className="text-sm text-blue-400 hover:text-blue-300 hover:underline" aria-expanded={showInstructions}>Como conseguir sua API?</button>
        {showInstructions && (
            <div className="text-sm text-gray-300 bg-gray-900/50 p-4 rounded-lg space-y-3 animate-fadeIn">
              <p>Para obter a chave da API do remove.bg, você precisa primeiro criar uma conta no site remove.bg. Em seguida, acesse o painel de controle da sua conta e procure pela seção da chave de API para gerar uma nova, que você poderá então copiar e usar no site.</p>
              <h4 className="font-semibold text-gray-200">Passos para obter sua chave da API</h4>
              <ol className="list-decimal list-inside space-y-1">
                <li><strong>Crie uma conta:</strong> Acesse o site do remove.bg e crie uma conta, se ainda não tiver uma.</li>
                <li><strong>Faça login:</strong> Faça login na sua conta no painel do remove.bg.</li>
                <li><strong>Crie uma nova chave API:</strong> No painel, localize a opção para criar uma nova chave de API. Pode ser necessário clicar em "Get API key" ou em um botão semelhante.</li>
                <li><strong>Copie sua chave:</strong> Uma vez que a chave seja gerada, ela será exibida para você. Copie-a para a sua área de transferência.</li>
              </ol>
              <h4 className="font-semibold text-gray-200">Como usar sua chave da API:</h4>
              <p>Cole sua API no site, a cada mês você tem direito a 50 imagens com fundos removidos automaticamente. Depois disso, você poderá usar aquela API de novo, só mês que vem.</p>
              <a href="https://www.youtube.com/watch?v=8fyUOvlehXk" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mt-3 text-sm text-red-400 hover:text-red-300 transition-colors font-semibold">
                  <YouTubeIcon className="h-6 w-6 text-red-500" />
                  <span>Tutorial em inglês de como adquirir sua API.</span>
              </a>
            </div>
        )}
        
        <div className="pt-2">
            <button
              onClick={() => setView('community')}
              className="w-full text-center px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm font-semibold"
            >
              Usar uma API da comunidade
            </button>
          </div>

        <input type="text" placeholder="Cole sua chave da API aqui" value={apiKey} onChange={handleApiKeyChange} onKeyPress={handleKeyPress} className={`w-full px-4 py-2 bg-gray-700 border rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${validationError ? 'border-red-500' : 'border-gray-600'}`} aria-label="Chave da API" aria-invalid={!!validationError} aria-describedby="api-key-error" />
        {validationError && <p id="api-key-error" className="text-sm text-red-400" role="alert">{validationError}</p>}
         <p className="text-xs text-gray-500">Sua chave de API será salva no armazenamento local do seu navegador e não será compartilhada.</p>
      </div>
      <div className="flex-shrink-0 p-6 border-t border-gray-700">
        <button onClick={handleSave} disabled={!apiKey.trim() || isLoading} className="w-full px-4 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-500 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center">
          {isLoading ? (<><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Validando...</>) : ('Salvar e Continuar')}
        </button>
      </div>
    </>
  );

  const renderCommunityView = () => (
    <>
      <div className="flex-shrink-0 p-6 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <button onClick={() => setView('main')} className="p-2 -ml-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors" aria-label="Voltar"><ChevronLeftIcon className="h-6 w-6" /></button>
          <h2 className="text-2xl font-bold text-white">APIs da Comunidade</h2>
          <button onClick={onClose} className="p-2 -mr-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors" aria-label="Fechar modal"><ClearIcon className="h-6 w-6" /></button>
        </div>
      </div>
      <div className="flex-grow p-6 space-y-4 overflow-y-auto">
        <p className="text-sm text-gray-400 mb-3">Selecione uma chave para usar. Estas chaves são compartilhadas e podem parar de funcionar a qualquer momento.</p>
        <button onClick={() => handleSelectCommunityKey(communityApiKey)} className="w-full text-left px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm font-mono">{communityApiKey}</button>
      </div>
    </>
  );

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 transition-opacity duration-300 animate-fadeIn" onClick={onClose} aria-modal="true" role="dialog">
      <div className="bg-gray-800 rounded-2xl shadow-xl w-full max-w-md m-4 flex flex-col border border-gray-700 transform transition-transform duration-300 animate-scaleIn" onClick={(e) => e.stopPropagation()} style={{maxHeight: '90vh'}}>
        {view === 'main' ? renderMainView() : renderCommunityView()}
      </div>
    </div>
  );
};

export default ApiKeyModal;
