
import React, { useState, useMemo, useEffect } from 'react';
import { ClearIcon, SearchIcon, ChevronLeftIcon } from './Icons';

interface TeamInfo {
  key: string;
  name: string;
}

interface LeagueDataForPlayers {
  key: string;
  name: string;
  teams: TeamInfo[];
}

interface TeamFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTeam: (teamKey: string) => void;
  onClearFilter: () => void;
  activeFilter: string | null;
  leaguesData: LeagueDataForPlayers[];
}

const TeamFilterModal: React.FC<TeamFilterModalProps> = ({ isOpen, onClose, onSelectTeam, onClearFilter, activeFilter, leaguesData }) => {
  const [view, setView] = useState<'leagues' | 'teams'>('leagues');
  const [selectedLeague, setSelectedLeague] = useState<LeagueDataForPlayers | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Reset view and search when modal opens
    if (isOpen) {
      setView('leagues');
      setSearchTerm('');
      setSelectedLeague(null);
    }
  }, [isOpen]);

  const handleLeagueSelect = (league: LeagueDataForPlayers) => {
    setSelectedLeague(league);
    setView('teams');
    setSearchTerm('');
  };

  const filteredTeams = useMemo(() => {
    if (!selectedLeague) return [];
    if (!searchTerm) return selectedLeague.teams;

    const lowercasedSearchTerm = searchTerm.toLowerCase();
    return selectedLeague.teams.filter(team =>
      team.name.toLowerCase().includes(lowercasedSearchTerm)
    );
  }, [selectedLeague, searchTerm]);

  if (!isOpen) return null;

  const renderLeaguesView = () => (
    <>
      <div className="flex-shrink-0 p-6 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">Filtrar por Liga</h2>
          <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors" aria-label="Fechar modal">
            <ClearIcon className="h-6 w-6" />
          </button>
        </div>
      </div>
      <div className="flex-grow overflow-y-auto p-6 space-y-3">
        {leaguesData.map(league => (
          <button
            key={league.key}
            onClick={() => handleLeagueSelect(league)}
            className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition-colors duration-200 bg-gray-700 text-gray-200 hover:bg-gray-600`}
          >
            {league.name}
          </button>
        ))}
      </div>
    </>
  );

  const renderTeamsView = () => {
    if (!selectedLeague) return null;
    return (
        <>
            <div className="flex-shrink-0 p-6 border-b border-gray-700">
                <div className="flex justify-between items-center mb-4">
                <button onClick={() => setView('leagues')} className="flex items-center gap-1 p-2 -ml-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors" aria-label="Voltar">
                    <ChevronLeftIcon className="h-6 w-6" />
                </button>
                <h2 className="text-xl font-bold text-white">{selectedLeague.name}</h2>
                <button onClick={onClose} className="p-2 -mr-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors" aria-label="Fechar modal">
                    <ClearIcon className="h-6 w-6" />
                </button>
                </div>
                <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <SearchIcon className="h-5 w-5 text-gray-400" />
                </span>
                <input
                    type="text"
                    placeholder="Pesquisar time..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    aria-label="Pesquisar time"
                    autoFocus
                />
                </div>
            </div>
            <div className="flex-grow overflow-y-auto p-6 space-y-3">
                <button
                onClick={() => onSelectTeam(selectedLeague.key)}
                className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition-colors duration-200 ${
                    activeFilter === selectedLeague.key 
                    ? 'bg-blue-600 text-white ring-2 ring-blue-400' 
                    : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                }`}
                >
                Filtrar por Todos os Times
                </button>
                <hr className="border-gray-600 my-3" />
                {filteredTeams.length > 0 ? (
                filteredTeams.map(team => (
                    <button
                    key={team.key}
                    onClick={() => onSelectTeam(team.key)}
                    className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition-colors duration-200 ${
                        activeFilter === team.key 
                        ? 'bg-blue-600 text-white ring-2 ring-blue-400' 
                        : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                    }`}
                    >
                    {team.name}
                    </button>
                ))
                ) : (
                <p className="text-center text-gray-400 py-4">Nenhum time encontrado.</p>
                )}
            </div>
        </>
    );
  }

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
        {view === 'leagues' ? renderLeaguesView() : renderTeamsView()}
        
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

export default TeamFilterModal;
