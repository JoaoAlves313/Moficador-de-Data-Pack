
import React from 'react';
import { CsvFileIcon, ImageIcon } from './Icons';

interface HeaderProps {
  currentView: 'csv' | 'image';
  onNavigate: (view: 'csv' | 'image') => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, onNavigate }) => {
  const navButtonClasses = "flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors duration-200";
  const activeClasses = "bg-blue-600 text-white";
  const inactiveClasses = "bg-gray-700 hover:bg-gray-600 text-gray-300";

  return (
    <header className="py-6">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">
          Modificador de Data Pack
        </h1>
        <p className="text-center text-gray-400 mt-2">
          Criado com auxilio de IA por Sussy Boy
        </p>
        <nav className="flex justify-center gap-4 mt-6">
            <button 
              onClick={() => onNavigate('csv')} 
              className={`${navButtonClasses} ${currentView === 'csv' ? activeClasses : inactiveClasses}`}
              aria-current={currentView === 'csv' ? 'page' : undefined}
            >
                <CsvFileIcon /> Editor CSV
            </button>
            <button 
              onClick={() => onNavigate('image')} 
              className={`${navButtonClasses} ${currentView === 'image' ? activeClasses : inactiveClasses}`}
              aria-current={currentView === 'image' ? 'page' : undefined}
            >
                <ImageIcon className="h-6 w-6" /> Conversor de Imagens
            </button>
        </nav>
      </div>
    </header>
  );
};

export default Header;
