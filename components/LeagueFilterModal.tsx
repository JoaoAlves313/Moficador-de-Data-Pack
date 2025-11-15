import React, { useState, useMemo, useEffect } from 'react';
import { ClearIcon, SearchIcon } from './Icons';

interface LeagueFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLeague: (league: string) => void;
  onClearFilter: () => void;
  activeFilter: string | null;
  leagues: Record<string, string>;
}

const LeagueFilterModal: React.FC<LeagueFilterModalProps> = ({ isOpen, onClose, onSelectLeague, onClearFilter, activeFilter, leagues }) => {
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  const filteredLeagues = useMemo(() => {
    if (!searchTerm) {
      return Object.entries(leagues);
    }
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    return Object.entries(leagues).filter(([key, name]) =>
      // Fix: Cast `name` to a string to prevent `toLowerCase` on `unknown` type error.
      String(name).toLowerCase().includes(lowercasedSearchTerm)
    );
  }, [leagues, searchTerm]);

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
        style={{maxHeight: '90vh'}}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 p-6 border-b border-gray-700">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">Filtrar por Liga</h2>
                <button 
                    onClick={onClose} 
                    className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                    aria-label="Fechar modal"
                >
                    <ClearIcon className="h-6 w-6" />
                </button>
            </div>
            <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <SearchIcon className="h-5 w-5 text-gray-400" />
                </span>
                <input
                    type="text"
                    placeholder="Pesquisar liga..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    aria-label="Pesquisar liga"
                />
            </div>
        </div>

        <div className="flex-grow overflow-y-auto p-6 space-y-3">
            {filteredLeagues.length > 0 ? (
                filteredLeagues.map(([key, name]) => (
                    <button
                        key={key}
                        onClick={() => onSelectLeague(key)}
                        className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition-colors duration-200 ${
                            activeFilter === key 
                            ? 'bg-blue-600 text-white ring-2 ring-blue-400' 
                            : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                        }`}
                    >
                        {String(name)}
                    </button>
                ))
            ) : (
                <p className="text-center text-gray-400 py-4">Nenhuma liga encontrada.</p>
            )}
        </div>
        
        <div className="flex-shrink-0 mt-auto p-6 border-t border-gray-700">
             <button
                onClick={onClearFilter}
                disabled={!activeFilter}
                className="w-full px-4 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Limpar Filtro
            </button>
        </div>
      </div>
    </div>
  );
};

export default LeagueFilterModal;