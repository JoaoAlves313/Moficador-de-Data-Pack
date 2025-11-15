import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { CsvRow } from './types';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import DataTable from './components/DataTable';
import Pagination from './components/Pagination';
import TeamFilterModal from './components/TeamFilterModal';
import LeagueFilterModal from './components/LeagueFilterModal';
import ModeSelection from './components/ModeSelection';
import ImageConverter from './components/ImageConverter';
import ViewerModal from './components/ViewerModal';
import AiBulkEditModal from './components/AiBulkEditModal';
import { DownloadIcon, SearchIcon, ClearIcon, FilterIcon, StarIcon, SparklesIcon, ExpandIcon, CollapseIcon } from './components/Icons';
import { TEAMS } from './data/teams';
import { LEAGUES } from './data/leagues';

// PapaParse is loaded from a CDN in index.html, we need to declare it for TypeScript
declare const Papa: any;

const ROWS_PER_PAGE = 50;
type AppMode = 'clubs' | 'players';

interface LeagueDataForPlayers {
  key: string;
  name: string;
  teams: { key: string; name: string }[];
  allTeamIds: string[];
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'csv' | 'image'>('csv');
  const [appMode, setAppMode] = useState<AppMode | null>(null);
  const [data, setData] = useState<CsvRow[]>([]);
  const [filteredData, setFilteredData] = useState<CsvRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Search, Filter, and Pagination state
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const [activeTeamFilter, setActiveTeamFilter] = useState<string | null>(null);
  const [activeLeagueFilter, setActiveLeagueFilter] = useState<string | null>(null);
  const [isTeamFilterModalOpen, setIsTeamFilterModalOpen] = useState(false);
  const [isLeagueFilterModalOpen, setIsLeagueFilterModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Easter egg state
  const [titleClickCount, setTitleClickCount] = useState(0);
  const [isViewerModalOpen, setIsViewerModalOpen] = useState(false);
  const [isAiAssistantModalOpen, setIsAiAssistantModalOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(true);

  // Derive data structures for players
  const { LEAGUES_DATA_FOR_PLAYERS, PLAYER_FILTER_NAMES, PLAYER_FILTER_IDS } = useMemo(() => {
    const leaguesData: Record<string, LeagueDataForPlayers> = {};
    const filterNames: Record<string, string> = {};
    const filterIds: Record<string, string[]> = {};

    TEAMS.forEach(team => {
      const leagueKey = team.league;
      if (!leaguesData[leagueKey]) {
        const leagueInfo = LEAGUES.find(l => l.key === leagueKey);
        const leagueName = leagueInfo ? leagueInfo.name : leagueKey;
        leaguesData[leagueKey] = { key: leagueKey, name: leagueName, teams: [], allTeamIds: [] };
      }
      leaguesData[leagueKey].teams.push({ key: team.key, name: team.name });
      leaguesData[leagueKey].allTeamIds.push(...team.ids);
      filterNames[team.key] = team.name;
      filterIds[team.key] = team.ids;
    });

    // Add an "All Teams" filter option for each league
    Object.values(leaguesData).forEach(league => {
      filterNames[league.key] = `Todos os times de ${league.name}`;
      filterIds[league.key] = league.allTeamIds;
    });

    return { LEAGUES_DATA_FOR_PLAYERS: Object.values(leaguesData), PLAYER_FILTER_NAMES: filterNames, PLAYER_FILTER_IDS: filterIds };
  }, []);

  // Filter and Search Logic
  useEffect(() => {
    let newFilteredData = [...data];
    const keyColumn = headers[0];

    // Apply team/league filter first
    if (appMode === 'players' && activeTeamFilter && PLAYER_FILTER_IDS[activeTeamFilter] && keyColumn) {
      const targetIds = new Set(PLAYER_FILTER_IDS[activeTeamFilter]);
      newFilteredData = newFilteredData.filter(row => targetIds.has(row[keyColumn]));
    } else if (appMode === 'clubs' && activeLeagueFilter && keyColumn) {
      const league = LEAGUES.find(l => l.key === activeLeagueFilter);
      if (league) {
        const targetIds = new Set(league.ids);
        newFilteredData = newFilteredData.filter(row => targetIds.has(row[keyColumn]));
      }
    }
    
    // Then apply search term
    if (activeSearchTerm) {
      const lowercasedFilter = activeSearchTerm.toLowerCase();
      newFilteredData = newFilteredData.filter(row => 
        headers.some(header => 
          String(row[header]).toLowerCase().includes(lowercasedFilter)
        )
      );
    }
    setFilteredData(newFilteredData);
    setCurrentPage(1); // Reset to first page on filter/search change
  }, [data, headers, activeSearchTerm, activeTeamFilter, activeLeagueFilter, appMode, PLAYER_FILTER_IDS]);

  // Pagination Logic
  const { paginatedData, totalPages, startIndex } = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    const end = start + ROWS_PER_PAGE;
    const paginated = filteredData.slice(start, end);
    const total = Math.ceil(filteredData.length / ROWS_PER_PAGE);
    return { paginatedData: paginated, totalPages: total, startIndex: start };
  }, [filteredData, currentPage]);

  const currentFilterName = useMemo(() => {
    if (appMode === 'clubs' && activeLeagueFilter) {
      return LEAGUES.find(l => l.key === activeLeagueFilter)?.name;
    }
    if (appMode === 'players' && activeTeamFilter) {
      return PLAYER_FILTER_NAMES[activeTeamFilter];
    }
    return null;
  }, [appMode, activeLeagueFilter, activeTeamFilter, PLAYER_FILTER_NAMES]);

  const handleFileLoaded = useCallback((results: any, file: File) => {
    if (results.data && results.data.length > 0) {
      const firstRow = results.data[0];
      const loadedHeaders = Object.keys(firstRow);
      
      setData(results.data);
      setHeaders(loadedHeaders);
      setFileName(file.name);
      setError('');
    } else {
      setError("O arquivo CSV está vazio ou é inválido.");
    }
  }, []);

  const handleDataChange = useCallback((rowToUpdate: CsvRow, columnId: string, value: string) => {
    setData(currentData => {
      const keyColumn = headers[0];
      if (!keyColumn) return currentData;

      const rowIndex = currentData.findIndex(row => row[keyColumn] === rowToUpdate[keyColumn]);
      if (rowIndex === -1) return currentData;
      
      const newData = [...currentData];
      newData[rowIndex] = { ...newData[rowIndex], [columnId]: value };
      return newData;
    });
  }, [headers]);
  
  const handleApplyBulkEdit = useCallback((changes: {key: string, column: string, newValue: string}[]) => {
    setData(currentData => {
      const keyColumn = headers[0];
      if (!keyColumn) return currentData;

      const changesMap = new Map<string, { column: string, newValue: string }>();
      changes.forEach(change => {
          changesMap.set(change.key, { column: change.column, newValue: change.newValue });
      });

      const newData = currentData.map(row => {
        const rowKey = row[keyColumn];
        if (changesMap.has(rowKey)) {
          const change = changesMap.get(rowKey)!;
          return {
            ...row,
            [change.column]: change.newValue,
          };
        }
        return row;
      });
      return newData;
    });
  }, [headers]);

  const handleDownload = useCallback(() => {
    if (data.length > 0) {
      const csv = Papa.unparse(data);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      const newFileName = fileName.replace(/\.csv$/, '_modified.csv');
      link.setAttribute('download', newFileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [data, fileName]);

  const handleSearch = () => {
    setActiveSearchTerm(searchTerm);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setActiveSearchTerm('');
  };

  const handleSelectTeamFilter = (teamKey: string) => {
    setActiveTeamFilter(teamKey);
    setIsTeamFilterModalOpen(false);
  };

  const handleClearTeamFilter = () => {
    setActiveTeamFilter(null);
    setIsTeamFilterModalOpen(false);
  };

  const handleSelectLeagueFilter = (leagueKey: string) => {
    setActiveLeagueFilter(leagueKey);
    setIsLeagueFilterModalOpen(false);
  };

  const handleClearLeagueFilter = () => {
    setActiveLeagueFilter(null);
    setIsLeagueFilterModalOpen(false);
  };

  const handleTitleClick = () => {
      setTitleClickCount(prev => prev + 1);
  };

  const resetState = useCallback(() => {
    setData([]);
    setFilteredData([]);
    setHeaders([]);
    setFileName('');
    setError('');
    setSearchTerm('');
    setActiveSearchTerm('');
    setActiveTeamFilter(null);
    setActiveLeagueFilter(null);
    setCurrentPage(1);
  }, []);

  const handleModeSelection = (mode: AppMode) => {
    setAppMode(mode);
    resetState();
  };

  const handleViewSelection = (view: 'csv' | 'image') => {
    setCurrentView(view);
    if(view === 'csv' && appMode === null) {
      // If switching back to CSV and no mode is selected, show mode selection
    } else if (view === 'image') {
      // Potentially reset csv state if needed
    }
  };
  
  if (currentView === 'csv' && appMode === null) {
    return <ModeSelection onSelectMode={handleModeSelection} onSelectView={handleViewSelection} />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {!isFullScreen && <Header currentView={currentView} onNavigate={handleViewSelection} onTitleClick={handleTitleClick} />}

      <main className={isFullScreen ? "w-full" : "max-w-screen-2xl mx-auto px-4 sm:px-6 lg:p-8 flex-grow w-full"}>
        {currentView === 'csv' && appMode && (
          <>
            {data.length === 0 ? (
              <FileUpload onFileLoaded={handleFileLoaded} error={error} setError={setError} mode={appMode} />
            ) : (
              <div 
                className={isFullScreen 
                    ? "fixed inset-0 bg-gray-800 z-50 flex flex-col" 
                    : "bg-gray-800 rounded-xl shadow-2xl border border-gray-700 overflow-hidden flex flex-col"}
                style={{ height: isFullScreen ? '100vh' : 'calc(100vh - 220px)' }}
              >
                {/* Header */}
                <div className="flex-shrink-0 p-4 sm:p-6 lg:p-8 border-b border-gray-700">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-white truncate">{fileName}</h2>
                      <p className="text-sm text-gray-400">{filteredData.length} de {data.length} linhas visíveis.</p>
                    </div>
                    <button 
                      onClick={() => {
                        resetState();
                        setAppMode(null);
                      }}
                      className="text-sm font-semibold text-blue-400 hover:text-blue-300"
                    >
                      Carregar outro arquivo
                    </button>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex-shrink-0 p-4 border-b border-gray-700">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    {/* Search */}
                    <div className="w-full sm:max-w-xs relative">
                      <input
                        type="text"
                        placeholder="Pesquisar em todas as colunas..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        className="w-full pl-10 pr-8 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <SearchIcon className="h-5 w-5 text-gray-400" />
                      </span>
                      {searchTerm && (
                        <button onClick={handleClearSearch} className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <ClearIcon className="h-5 w-5 text-gray-400 hover:text-white" />
                        </button>
                      )}
                    </div>
                    
                    {/* Buttons */}
                    <div className="flex items-center gap-2 flex-wrap justify-center">
                      <button 
                        onClick={appMode === 'clubs' ? () => setIsLeagueFilterModalOpen(true) : () => setIsTeamFilterModalOpen(true)} 
                        className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors"
                        title={currentFilterName || (appMode === 'clubs' ? 'Filtrar por Liga' : 'Filtrar por Time')}
                      >
                          <FilterIcon className="h-5 w-5" />
                          <span>{currentFilterName || 'Filtrar'}</span>
                      </button>

                      <button 
                        onClick={() => setIsFullScreen(!isFullScreen)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors"
                        title={isFullScreen ? "Minimizar" : "Expandir para tela cheia"}
                      >
                          {isFullScreen ? <CollapseIcon className="h-5 w-5" /> : <ExpandIcon className="h-5 w-5" />}
                          <span>{isFullScreen ? "Minimizar" : "Expandir"}</span>
                      </button>

                      <button 
                        onClick={() => setIsAiAssistantModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white font-semibold rounded-lg hover:bg-yellow-700 transition-colors"
                      >
                        <SparklesIcon className="h-5 w-5" /> Assistente de IA
                      </button>

                       <button 
                        onClick={handleDownload} 
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <DownloadIcon /> Baixar CSV
                      </button>
                       {titleClickCount >= 10 && (
                          <button 
                            onClick={() => setIsViewerModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
                          >
                           <StarIcon className="h-5 w-5" /> Visualizador
                          </button>
                       )}
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="flex-grow overflow-auto">
                   <DataTable startIndex={startIndex} headers={headers} data={paginatedData} onDataChange={handleDataChange} noResultsMessage="Nenhum resultado para sua busca ou filtro atual." />
                </div>
                
                {/* Pagination */}
                <div className="flex-shrink-0">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    rowsPerPage={ROWS_PER_PAGE}
                    totalRows={filteredData.length}
                    startIndex={startIndex}
                  />
                </div>
              </div>
            )}
          </>
        )}
        {currentView === 'image' && <ImageConverter />}
      </main>

      {!isFullScreen && (
        <footer className="py-4">
            <div className="text-center text-sm text-gray-500">
            Versão 1.1.0
            </div>
        </footer>
      )}
      
      {appMode === 'clubs' ? (
        <LeagueFilterModal
          isOpen={isLeagueFilterModalOpen}
          onClose={() => setIsLeagueFilterModalOpen(false)}
          onSelectLeague={handleSelectLeagueFilter}
          onClearFilter={handleClearLeagueFilter}
          activeFilter={activeLeagueFilter}
          leagues={Object.fromEntries(LEAGUES.map(l => [l.key, l.name]))}
        />
      ) : (
        appMode === 'players' &&
        <TeamFilterModal 
          isOpen={isTeamFilterModalOpen}
          onClose={() => setIsTeamFilterModalOpen(false)}
          onSelectTeam={handleSelectTeamFilter}
          onClearFilter={handleClearTeamFilter}
          activeFilter={activeTeamFilter}
          leaguesData={LEAGUES_DATA_FOR_PLAYERS}
        />
      )}

      <ViewerModal isOpen={isViewerModalOpen} onClose={() => setIsViewerModalOpen(false)} />
      
      <AiBulkEditModal
        isOpen={isAiAssistantModalOpen}
        onClose={() => setIsAiAssistantModalOpen(false)}
        data={filteredData}
        headers={headers}
        fileName={fileName}
        onApplyBulkEdit={handleApplyBulkEdit}
        currentFilterName={currentFilterName || 'Todas as linhas'}
      />
    </div>
  );
};

export default App;