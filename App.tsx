
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
import { DownloadIcon, SearchIcon, ClearIcon, FilterIcon, StarIcon } from './components/Icons';
import { TEAMS } from './data/teams';
import { LEAGUES } from './data/leagues';

// PapaParse is loaded from a CDN in index.html, we need to declare it for TypeScript
declare const Papa: any;

const DEFAULT_ROWS_PER_PAGE = 50;
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
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);

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
        filterNames[leagueKey] = leagueName;
      }
      leaguesData[leagueKey].teams.push({ key: team.key, name: team.name });
      leaguesData[leagueKey].allTeamIds.push(...team.ids);
      filterNames[team.key] = team.name;
      filterIds[team.key] = team.ids;
    });

    Object.values(leaguesData).forEach(league => {
      filterIds[league.key] = league.allTeamIds;
    });

    return {
      LEAGUES_DATA_FOR_PLAYERS: Object.values(leaguesData),
      PLAYER_FILTER_NAMES: filterNames,
      PLAYER_FILTER_IDS: filterIds,
    };
  }, []);

  // Derive data structures for clubs
  const LEAGUE_NAMES = useMemo(() => Object.fromEntries(LEAGUES.map(league => [league.key, league.name])), []);
  const LEAGUE_IDS = useMemo(() => Object.fromEntries(LEAGUES.map(league => [league.key, league.ids])), []);

  const runFilters = useCallback((sourceData: CsvRow[], termToApply: string, teamToApply: string | null, leagueToApply: string | null) => {
    let results = sourceData;
    const keyColumn = headers[0];

    if (keyColumn) {
        if (appMode === 'clubs' && leagueToApply && LEAGUE_IDS[leagueToApply]) {
            const leagueIds = new Set(LEAGUE_IDS[leagueToApply].map(String));
            results = results.filter(row => leagueIds.has(String(row[keyColumn]).trim()));
        } else if (appMode === 'players' && teamToApply && PLAYER_FILTER_IDS[teamToApply]) {
            const teamIds = new Set(PLAYER_FILTER_IDS[teamToApply].map(String));
            results = results.filter(row => teamIds.has(String(row[keyColumn]).trim()));
        }
    }
    
    const lowercasedSearchTerm = termToApply.trim().toLowerCase();
    if (lowercasedSearchTerm) {
        results = results.filter(row => 
            Object.values(row).some(value => 
                String(value).toLowerCase().includes(lowercasedSearchTerm)
            )
        );
    }
    
    setFilteredData(results);
    setCurrentPage(1);
  }, [appMode, headers, PLAYER_FILTER_IDS, LEAGUE_IDS]);

  const handleFileLoaded = useCallback((results: any, file: File) => {
    if (results.errors.length > 0) {
      console.error("Parsing errors:", results.errors);
      setError(`Erro ao analisar o CSV: ${results.errors[0].message}. Por favor, verifique o formato do arquivo.`);
      return;
    }

    const nonEmptyData = results.data.filter((row: CsvRow) => 
      results.meta.fields.some((field: string) => row[field] && String(row[field]).trim() !== '')
    );

    if (nonEmptyData.length === 0) {
      setError("O arquivo CSV está vazio ou não pôde ser analisado corretamente.");
      return;
    }

    setError('');
    setFileName(file.name);
    setHeaders(results.meta.fields || []);
    setData(nonEmptyData as CsvRow[]);
    runFilters(nonEmptyData as CsvRow[], activeSearchTerm, activeTeamFilter, activeLeagueFilter);
  }, [runFilters, activeSearchTerm, activeTeamFilter, activeLeagueFilter]);

  const handleReset = useCallback(() => {
    setAppMode(null);
    setData([]);
    setFilteredData([]);
    setHeaders([]);
    setFileName('');
    setError('');
    setCurrentPage(1);
    setRowsPerPage(DEFAULT_ROWS_PER_PAGE);
    setSearchTerm('');
    setActiveSearchTerm('');
    setActiveTeamFilter(null);
    setActiveLeagueFilter(null);
    setIsTeamFilterModalOpen(false);
    setIsLeagueFilterModalOpen(false);
  }, []);

  const handleDataChange = useCallback((rowToUpdate: CsvRow, columnId: string, value: string) => {
    const keyColumn = headers[0];
    if (!keyColumn) return;
    
    const updateRow = (row: CsvRow): CsvRow => {
        if (row[keyColumn] === rowToUpdate[keyColumn]) {
            return { ...row, [columnId]: value };
        }
        return row;
    };

    setData(prevData => prevData.map(updateRow));
    setFilteredData(prevFilteredData => prevFilteredData.map(updateRow));
  }, [headers]);

  const handleDownload = useCallback(() => {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const downloadFileName = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`;
    link.setAttribute('download', downloadFileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [data, fileName]);

  const handleAddLegends = useCallback(() => {
    if (headers.length < 2) {
        setError("Para adicionar lendas, o CSV carregado deve ter pelo menos duas colunas (chave e nome).");
        return;
    }

    const legendsCsv = `890400020,Adam Kamiński...`; // (content abbreviated for brevity)
    const lines = legendsCsv.split('\n').filter(line => line.trim() !== '');
    const keyColumn = headers[0];
    const nameColumn = headers[1];

    const newRows: CsvRow[] = lines.map(line => {
        const parts = line.split(',');
        const newRow: CsvRow = { [keyColumn]: parts[0], [nameColumn]: parts.slice(1).join(',') };
        headers.slice(2).forEach(h => newRow[h] = '');
        return newRow;
    });

    const existingKeys = new Set(data.map(row => row[keyColumn]));
    const uniqueNewRows = newRows.filter(row => !existingKeys.has(row[keyColumn]));

    if (uniqueNewRows.length > 0) {
      const newData = [...data, ...uniqueNewRows];
      setData(newData);
      runFilters(newData, activeSearchTerm, activeTeamFilter, activeLeagueFilter);
    }
  }, [data, headers, runFilters, activeSearchTerm, activeTeamFilter, activeLeagueFilter]);
  
  const triggerSearch = useCallback(() => {
    const termToApply = searchTerm.trim();
    setActiveSearchTerm(termToApply);
    runFilters(data, termToApply, activeTeamFilter, activeLeagueFilter);
  }, [searchTerm, data, activeTeamFilter, activeLeagueFilter, runFilters]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && triggerSearch();
  const handleClearSearch = () => {
    setSearchTerm('');
    setActiveSearchTerm('');
    runFilters(data, '', activeTeamFilter, activeLeagueFilter);
  };
  
  const totalRows = filteredData.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedData = useMemo(() => filteredData.slice(startIndex, startIndex + rowsPerPage), [filteredData, startIndex, rowsPerPage]);
  
  useEffect(() => { currentPage > totalPages && setCurrentPage(totalPages); }, [currentPage, totalPages]);

  // Team Filter Handlers
  const handleSelectTeam = (teamKey: string) => {
    setActiveTeamFilter(teamKey);
    setIsTeamFilterModalOpen(false);
    runFilters(data, activeSearchTerm, teamKey, null);
  };
  const handleClearTeamFilter = () => {
    setActiveTeamFilter(null);
    setIsTeamFilterModalOpen(false);
    runFilters(data, activeSearchTerm, null, null);
  };
  const handleClearTeamFilterFromBadge = () => {
    setActiveTeamFilter(null);
    runFilters(data, activeSearchTerm, null, null);
  };

  // League Filter Handlers
  const handleSelectLeague = (leagueKey: string) => {
    setActiveLeagueFilter(leagueKey);
    setIsLeagueFilterModalOpen(false);
    runFilters(data, activeSearchTerm, null, leagueKey);
  };
  const handleClearLeagueFilter = () => {
    setActiveLeagueFilter(null);
    setIsLeagueFilterModalOpen(false);
    runFilters(data, activeSearchTerm, null, null);
  };
  const handleClearLeagueFilterFromBadge = () => {
    setActiveLeagueFilter(null);
    runFilters(data, activeSearchTerm, null, null);
  };

  const renderCsvContent = () => {
    if (!appMode) {
      return <ModeSelection onSelectMode={setAppMode} onSelectView={setCurrentView} />;
    }
    if (data.length === 0) {
      return (
        <FileUpload onFileLoaded={handleFileLoaded} error={error} setError={setError} mode={appMode} />
      );
    }
    return (
      <div className="flex-grow flex flex-col bg-gray-800 rounded-xl overflow-hidden shadow-2xl border border-gray-700">
        <div className="p-4 sm:p-6 border-b border-gray-700">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex-grow w-full sm:w-auto">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3"><SearchIcon className="h-5 w-5 text-gray-400" /></span>
                <input type="text" placeholder="Pesquisar em todos os campos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={handleSearchKeyDown} className="w-full pl-10 pr-10 py-2 bg-gray-900/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" />
                {searchTerm && <button onClick={handleClearSearch} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-white" title="Limpar pesquisa"><ClearIcon className="h-5 w-5" /></button>}
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              <button onClick={triggerSearch} className="flex-grow sm:flex-grow-0 w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors" title="Pesquisar"><SearchIcon className="h-5 w-5" />Pesquisar</button>
              {appMode === 'players' && <button onClick={() => setIsTeamFilterModalOpen(true)} className="flex-grow sm:flex-grow-0 w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors"><FilterIcon className="h-5 w-5" />Filtrar por Time</button>}
              {appMode === 'clubs' && <button onClick={() => setIsLeagueFilterModalOpen(true)} className="flex-grow sm:flex-grow-0 w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors"><FilterIcon className="h-5 w-5" />Filtrar por Liga</button>}
              {appMode === 'players' && <button onClick={handleAddLegends} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"><StarIcon className="h-5 w-5" />Adicionar Lendas</button>}
              <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"><DownloadIcon />Salvar CSV</button>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {appMode === 'players' && activeTeamFilter && <span className="inline-flex items-center gap-x-2 bg-blue-900/50 text-blue-300 text-sm font-medium px-3 py-1 rounded-full">Filtro: {PLAYER_FILTER_NAMES[activeTeamFilter]}<button onClick={handleClearTeamFilterFromBadge} className="ml-1 text-blue-300 hover:text-white" title="Limpar filtro"><ClearIcon className="h-4 w-4" /></button></span>}
            {appMode === 'clubs' && activeLeagueFilter && <span className="inline-flex items-center gap-x-2 bg-blue-900/50 text-blue-300 text-sm font-medium px-3 py-1 rounded-full">Filtro de liga: {LEAGUE_NAMES[activeLeagueFilter]}<button onClick={handleClearLeagueFilterFromBadge} className="ml-1 text-blue-300 hover:text-white" title="Limpar filtro"><ClearIcon className="h-4 w-4" /></button></span>}
          </div>
        </div>
        <div className="flex-grow overflow-y-auto">
          <DataTable headers={headers} data={paginatedData} onDataChange={handleDataChange} noResultsMessage={activeSearchTerm || activeTeamFilter || activeLeagueFilter ? 'Nenhum resultado corresponde aos seus filtros.' : 'Nenhum dado para exibir.'} />
        </div>
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} rowsPerPage={rowsPerPage} onRowsPerPageChange={(size) => { setRowsPerPage(size); setCurrentPage(1); }} totalRows={totalRows} startIndex={startIndex} />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 antialiased flex flex-col">
      <Header currentView={currentView} onNavigate={setCurrentView} />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col">
        {currentView === 'csv' ? renderCsvContent() : <ImageConverter />}
      </main>
      {currentView === 'csv' && appMode === 'players' && <TeamFilterModal isOpen={isTeamFilterModalOpen} onClose={() => setIsTeamFilterModalOpen(false)} onSelectTeam={handleSelectTeam} onClearFilter={handleClearTeamFilter} activeFilter={activeTeamFilter} leaguesData={LEAGUES_DATA_FOR_PLAYERS} />}
      {currentView === 'csv' && appMode === 'clubs' && <LeagueFilterModal isOpen={isLeagueFilterModalOpen} onClose={() => setIsLeagueFilterModalOpen(false)} onSelectLeague={handleSelectLeague} onClearFilter={handleClearLeagueFilter} activeFilter={activeLeagueFilter} leagues={LEAGUE_NAMES} />}
    </div>
  );
};

export default App;
