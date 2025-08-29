
import React from 'react';
import { ClubsIcon, PlayersIcon, ImageIcon } from './Icons';

type AppMode = 'clubs' | 'players';

interface ModeSelectionProps {
  onSelectMode: (mode: AppMode) => void;
  onSelectView: (view: 'image') => void;
}

const ModeSelection: React.FC<ModeSelectionProps> = ({ onSelectMode, onSelectView }) => {
  const selectionOptions = [
    {
      key: 'clubs',
      action: () => onSelectMode('clubs'),
      title: 'Arquivo de Clubes',
      description: 'Filtre por ligas e edite dados de clubes.',
      icon: <ClubsIcon className="h-14 w-14 text-blue-400" />,
      colorClasses: "border-blue-500/50 hover:border-blue-500 hover:bg-blue-900/40",
    },
    {
      key: 'players',
      action: () => onSelectMode('players'),
      title: 'Arquivo de Jogadores',
      description: 'Filtre por times e adicione lendas.',
      icon: <PlayersIcon className="h-14 w-14 text-green-400" />,
      colorClasses: "border-green-500/50 hover:border-green-500 hover:bg-green-900/40",
    },
    {
      key: 'image',
      action: () => onSelectView('image'),
      title: 'Conversor de Imagens',
      description: 'Converta imagens para WebP e remova o fundo.',
      icon: <ImageIcon className="h-14 w-14 text-purple-400" />,
      colorClasses: "border-purple-500/50 hover:border-purple-500 hover:bg-purple-900/40",
    },
  ];

  return (
    <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4 animate-fadeIn">
        <div className="text-center mb-10">
            <h2 className="text-4xl font-bold text-white tracking-tight">Selecione o Modo</h2>
            <p className="mt-3 text-lg text-gray-400">Escolha o que você deseja fazer.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-6">
            {selectionOptions.map((option, index) => (
              <button
                key={option.key}
                onClick={option.action}
                className={`group animate-scaleIn w-full md:w-64 h-64 flex flex-col items-center justify-center p-6 bg-gray-800/80 border-2 rounded-2xl shadow-2xl transition-all duration-300 transform hover:-translate-y-2 ${option.colorClasses}`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="mb-4 transition-transform duration-300 group-hover:scale-110">
                  {option.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-100">{option.title}</h3>
                <p className="mt-2 text-center text-gray-400 text-sm">{option.description}</p>
              </button>
            ))}
        </div>
    </div>
  );
};

export default ModeSelection;
