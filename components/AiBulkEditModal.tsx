import React, { useState, useCallback, useEffect } from 'react';
import { ClearIcon, SparklesIcon } from './Icons';
import { GoogleGenAI } from '@google/genai';
import { CsvRow } from '../types';

interface AiBulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: CsvRow[];
  headers: string[];
  fileName: string;
  onApplyBulkEdit: (changes: { key: string; column: string; newValue: string }[]) => void;
  currentFilterName: string;
}

type SuggestedChange = { key: string, newValue: string, oldValue: string };

const AiBulkEditModal: React.FC<AiBulkEditModalProps> = ({ isOpen, onClose, data, headers, fileName, onApplyBulkEdit, currentFilterName }) => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [targetColumn, setTargetColumn] = useState<string>('');
  const [suggestedChanges, setSuggestedChanges] = useState<SuggestedChange[] | null>(null);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      setPrompt('');
      setResponse(null);
      setIsLoading(false);
      setError('');
      setSuggestedChanges(null);
      if (headers.length > 1) {
        setTargetColumn(headers[1]);
      }
    }
  }, [isOpen, headers]);

  const handleAiEdit = useCallback(async () => {
    if (!prompt.trim() || !targetColumn || isLoading) return;
    setIsLoading(true);
    setError('');
    setResponse(null);
    setSuggestedChanges(null);

    const keyColumn = headers[0];
    const dataForPrompt = data.slice(0, 20).map(row => ({ [keyColumn]: row[keyColumn], [targetColumn]: row[targetColumn] }));

    try {
      if (!process.env.API_KEY) throw new Error("A chave da API não está configurada.");
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const result = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: `Você é um assistente de IA encarregado de editar em massa uma coluna em um arquivo CSV.
        O usuário está visualizando um conjunto de dados filtrado por: "${currentFilterName}". As edições devem ser aplicadas a este subconjunto de dados.
        A coluna que o usuário deseja editar é: "${targetColumn}".
        A coluna de chave primária é "${keyColumn}".
        Aqui estão até 20 linhas dos dados para contexto (apenas a chave e a coluna de destino):
        ${JSON.stringify(dataForPrompt)}

        Instrução do usuário: "${prompt}"

        Com base na instrução do usuário, gere novos valores para a coluna "${targetColumn}" para todas as linhas relevantes nos dados fornecidos. Se necessário, use seu conhecimento e pesquise na internet por informações precisas (por exemplo, nomes de jogadores de um ano específico, capitais corretas, etc.).

        Sua saída DEVE ser um objeto JSON com uma única chave "edits". O valor dessa chave deve ser um array de objetos. Cada objeto deve conter a 'key' (da coluna "${keyColumn}") e o 'newValue' para a coluna "${targetColumn}".
        Exemplo de formato: { "edits": [{ "key": "algum_id_1", "newValue": "novo valor" }, { "key": "algum_id_2", "newValue": "outro novo valor" }] }
        
        Inclua apenas as linhas que precisam ser alteradas. Se nenhuma alteração for necessária, retorne um objeto com um array "edits" vazio: { "edits": [] }`,
        config: {
          tools: [{googleSearch: {}}],
        },
      });

      const extractJsonFromText = (text: string) => {
        const match = text.match(/```json\s*([\s\S]*?)\s*```/);
        if (match && match[1]) {
            return JSON.parse(match[1]);
        }
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
            const jsonString = text.substring(jsonStart, jsonEnd + 1);
            try {
                return JSON.parse(jsonString);
            } catch(e) { /* Fall through */ }
        }
        throw new Error("Não foi possível extrair o JSON da resposta da IA.");
      };

      const responseJson = extractJsonFromText(result.text);
      const edits: { key: string, newValue: string }[] = responseJson.edits || [];
      
      if (edits.length === 0) {
        setResponse("A IA não encontrou nenhuma alteração a ser feita com base na sua solicitação.");
      } else {
        const dataMap = new Map(data.map(row => [row[keyColumn], row[targetColumn]]));
        const changesWithOldValues = edits.map(edit => ({
          ...edit,
          oldValue: dataMap.get(edit.key) || '[não encontrado]'
        }));
        setSuggestedChanges(changesWithOldValues);
      }
    } catch (e: any) {
      console.error("Gemini API error:", e);
      setError(`Erro da IA: ${e.message || 'Falha ao obter uma resposta.'}`);
    } finally {
      setIsLoading(false);
    }
  }, [prompt, isLoading, data, headers, targetColumn, currentFilterName]);
  
  const handleApplyChanges = () => {
    if (!suggestedChanges) return;

    const formattedChanges = suggestedChanges.map(change => ({
        key: change.key,
        column: targetColumn,
        newValue: change.newValue,
    }));

    onApplyBulkEdit(formattedChanges);
    handleClose();
  };

  const handleAskQuestion = useCallback(async () => {
    if (isLoading || !prompt.trim()) return;
    setIsLoading(true);
    setError('');
    setResponse(null);
    setSuggestedChanges(null);
    try {
      if (!process.env.API_KEY) throw new Error("A chave da API não está configurada.");
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const dataForPrompt = data.slice(0, 20).map(row => JSON.stringify(row));

      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Você é um assistente de análise de dados. Com base no contexto do arquivo CSV e nos dados, responda à pergunta do usuário.
        Nome do arquivo: "${fileName}"
        Cabeçalhos: ${headers.join(', ')}
        Filtro ativo: "${currentFilterName}"
        Primeiras 20 linhas de dados (formato JSON):
        ${dataForPrompt.join('\n')}

        Pergunta do usuário: "${prompt}"

        Forneça uma resposta concisa e direta.`,
      });
      setResponse(result.text);
    } catch (e: any) {
      console.error("Gemini API error:", e);
      setError(`Erro da IA: ${e.message || 'Falha ao obter uma resposta.'}`);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, prompt, data, headers, fileName, currentFilterName]);

  if (!isOpen) return null;

  const renderResponse = () => {
    if (suggestedChanges) {
        return (
            <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">Revisar Mudanças ({suggestedChanges.length})</h3>
                <div className="max-h-60 overflow-y-auto pr-2 space-y-2 rounded-lg bg-gray-900/50 p-2 border border-gray-700">
                    {suggestedChanges.map((change, index) => (
                        <div key={index} className="p-2 bg-gray-800 rounded-md text-sm">
                            <p className="font-mono text-xs text-gray-500 truncate" title={change.key}>Chave: {change.key}</p>
                            <p className="text-red-400 line-through">De: {change.oldValue}</p>
                            <p className="text-green-400">Para: {change.newValue}</p>
                        </div>
                    ))}
                </div>
                <div className="flex gap-2 pt-3 border-t border-gray-700">
                    <button onClick={handleApplyChanges} className="w-full px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors">Aplicar Mudanças</button>
                    <button onClick={() => setSuggestedChanges(null)} className="w-full px-4 py-2 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-500 transition-colors">Cancelar</button>
                </div>
            </div>
        )
    }
    if (typeof response === 'string') {
        return <p className="text-gray-300 whitespace-pre-wrap">{response}</p>;
    }
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 transition-opacity duration-300 animate-fadeIn"
      onClick={handleClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl m-4 flex flex-col border border-gray-700 transform transition-transform duration-300 animate-scaleIn"
        style={{maxHeight: '90vh'}}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 p-6 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="flex items-center gap-3 text-2xl font-bold text-white">
              <SparklesIcon className="h-7 w-7 text-yellow-400" />
              Assistente de IA
            </h2>
            <button onClick={handleClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors" aria-label="Fechar modal">
              <ClearIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
        
        <div className="flex-grow p-6 space-y-4 overflow-y-auto">
          <div className="p-3 bg-gray-900/50 rounded-lg border border-gray-700 mb-4">
              <label className="block text-sm font-medium text-gray-400">Escopo da Edição</label>
              <p className="text-lg font-semibold text-white truncate" title={currentFilterName}>{currentFilterName}</p>
          </div>
          <div className="space-y-3">
              <div>
                  <label htmlFor="target-column-bulk" className="block text-sm font-medium text-gray-400 mb-1">1. Selecione a coluna para editar (opcional para perguntas)</label>
                  <select
                      id="target-column-bulk"
                      value={targetColumn}
                      onChange={(e) => setTargetColumn(e.target.value)}
                      disabled={isLoading}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                      {headers.slice(1).map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
              </div>
              <div>
                  <label htmlFor="ai-prompt-bulk" className="block text-sm font-medium text-gray-400 mb-1">2. Descreva a alteração ou faça uma pergunta</label>
                  <textarea
                      id="ai-prompt-bulk"
                      placeholder="Para editar: 'traduza para o inglês'. Para perguntar: 'qual o total de...?'"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={3}
                      disabled={isLoading}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-y disabled:opacity-50"
                      aria-label="Instrução para a IA"
                  />
              </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <button 
              onClick={handleAiEdit} 
              disabled={isLoading || !prompt.trim() || !targetColumn}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-500 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <SparklesIcon className="h-5 w-5"/> Executar Edição
            </button>
            <button 
              onClick={handleAskQuestion} 
              disabled={isLoading || !prompt.trim()}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500 transition-colors disabled:bg-gray-500 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              Fazer Pergunta
            </button>
          </div>

          {(isLoading || error || response || suggestedChanges) && (
             <div className="mt-4 p-4 bg-gray-900/50 rounded-lg border border-gray-700 animate-fadeIn">
                {isLoading && (
                  <div className="flex justify-center items-center py-4">
                    <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                )}
                {error && <p className="text-red-400 text-center text-sm p-2">{error}</p>}
                {!isLoading && !error && renderResponse()}
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AiBulkEditModal;