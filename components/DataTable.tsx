import React, { useState, useCallback, useEffect, useRef } from 'react';
import { CsvRow } from '../types';
import { SparklesIcon, ClearIcon } from './Icons';

interface AiPopoverState {
  anchorEl: HTMLElement | null;
  row: CsvRow | null;
  header: string | null;
  suggestions: string[];
  isLoading: boolean;
  error: string | null;
}

const INITIAL_AI_POPOVER_STATE: AiPopoverState = {
  anchorEl: null,
  row: null,
  header: null,
  suggestions: [],
  isLoading: false,
  error: null,
};

interface DataTableProps {
  headers: string[];
  data: CsvRow[];
  onDataChange: (row: CsvRow, columnId: string, value: string) => void;
  noResultsMessage?: string;
  startIndex: number;
}

const DataTable: React.FC<DataTableProps> = ({ headers, data, onDataChange, noResultsMessage, startIndex }) => {
  const [aiPopoverState, setAiPopoverState] = useState<AiPopoverState>(INITIAL_AI_POPOVER_STATE);
  const popoverRef = useRef<HTMLDivElement>(null);
  
  const closeAiPopover = useCallback(() => {
    setAiPopoverState(INITIAL_AI_POPOVER_STATE);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node) && aiPopoverState.anchorEl && !aiPopoverState.anchorEl.contains(event.target as Node)) {
        closeAiPopover();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [closeAiPopover, aiPopoverState.anchorEl]);


  const handleAiAssistClick = useCallback(async (row: CsvRow, header: string, targetEl: HTMLElement) => {
    if (aiPopoverState.isLoading) return;

    setAiPopoverState({
      ...INITIAL_AI_POPOVER_STATE,
      anchorEl: targetEl,
      row,
      header,
      isLoading: true,
    });

    try {
      const currentValue = row[header] || '';
      
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'suggestions',
          context: {
            currentValue,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha na comunicação com a API.');
      }
      
      const result = await response.json();

      setAiPopoverState(prevState => ({
        ...prevState,
        suggestions: result.suggestions || [],
        isLoading: false,
        error: (result.suggestions || []).length === 0 ? "Nenhuma sugestão encontrada." : null
      }));

    } catch (error: any) {
      console.error("API proxy error:", error);
      setAiPopoverState(prevState => ({
        ...prevState,
        isLoading: false,
        error: `Erro da IA: ${error.message || 'Falha ao buscar sugestões.'}`
      }));
    }
  }, [aiPopoverState.isLoading]);

  const handleSuggestionSelect = (suggestion: string) => {
    if (aiPopoverState.row && aiPopoverState.header) {
      onDataChange(aiPopoverState.row, aiPopoverState.header, suggestion);
    }
    closeAiPopover();
  };

  if (headers.length === 0) {
    return <p className="text-center text-gray-400 p-8">Nenhum dado para exibir.</p>;
  }
  
  if (data.length === 0) {
    return <p className="text-center text-gray-400 p-8">{noResultsMessage || 'Nenhum resultado encontrado.'}</p>;
  }

  const keyColumn = headers[0];
  
  const popoverStyle: React.CSSProperties = aiPopoverState.anchorEl ? {
      position: 'absolute',
      top: `${aiPopoverState.anchorEl.getBoundingClientRect().bottom + window.scrollY + 8}px`,
      left: `${aiPopoverState.anchorEl.getBoundingClientRect().left + window.scrollX}px`,
      zIndex: 50,
  } : {};

  return (
    // The parent container in App.tsx handles scrolling, this div just ensures full height.
    <div className="h-full">
      <table className="min-w-full w-auto divide-y divide-gray-700">
        <thead className="bg-gray-700/50 select-none sticky top-0 z-10">
          <tr>
            <th
              scope="col"
              className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider"
            >
              #
            </th>
            {headers.map((header) => (
              <th
                key={header}
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700 bg-gray-800">
          {data.map((row, index) => (
            <tr key={row[keyColumn] || index} className="hover:bg-gray-700/50 transition-colors duration-150">
              <td className="px-4 py-4 align-top text-sm text-center font-mono text-gray-500 select-none">
                {startIndex + index + 1}
              </td>
              {headers.map((header, colIndex) => (
                <td key={header} className={`px-6 py-4 align-top ${colIndex === 0 ? 'whitespace-nowrap' : ''}`}>
                  {colIndex === 0 ? (
                    <span className="text-sm font-medium text-gray-300" title={row[header]}>
                      {row[header]}
                    </span>
                  ) : (
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={row[header] || ''}
                        onChange={(e) => onDataChange(row, header, e.target.value)}
                        className="w-full bg-gray-900/50 text-gray-200 text-sm border border-gray-600 rounded-md px-2 py-1 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-200 min-w-[350px]"
                      />
                      <button 
                        onClick={(e) => handleAiAssistClick(row, header, e.currentTarget)}
                        className="absolute right-1 p-1 text-gray-400 hover:text-blue-400 rounded-full hover:bg-gray-700 transition-colors"
                        title="Obter sugestões da IA"
                      >
                         {aiPopoverState.isLoading && aiPopoverState.row?.[keyColumn] === row[keyColumn] && aiPopoverState.header === header ? (
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                         ) : (
                            <SparklesIcon className="h-5 w-5" />
                         )}
                      </button>
                    </div>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {aiPopoverState.anchorEl && (
        <div 
          ref={popoverRef}
          style={popoverStyle} 
          className="w-64 bg-gray-700 border border-gray-600 rounded-lg shadow-2xl animate-fadeIn"
        >
          <div className="flex justify-between items-center p-2 border-b border-gray-600">
            <h4 className="text-sm font-semibold text-white">Sugestões da IA</h4>
            <button onClick={closeAiPopover} className="p-1 rounded-full hover:bg-gray-600">
              <ClearIcon className="h-4 w-4 text-gray-400" />
            </button>
          </div>
          <div className="p-2 max-h-48 overflow-y-auto">
            {aiPopoverState.isLoading && <p className="text-sm text-gray-400 text-center py-2">Gerando...</p>}
            {aiPopoverState.error && <p className="text-sm text-red-400 text-center py-2 px-1">{aiPopoverState.error}</p>}
            {!aiPopoverState.isLoading && !aiPopoverState.error && (
              <ul className="space-y-1">
                {aiPopoverState.suggestions.map((s, i) => (
                  <li key={i}>
                    <button 
                      onClick={() => handleSuggestionSelect(s)}
                      className="w-full text-left text-sm text-gray-200 px-2 py-1.5 rounded hover:bg-blue-600 transition-colors"
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
