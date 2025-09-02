
import React, { useMemo } from 'react';
import { ClearIcon, ChartBarIcon } from './Icons';

interface ViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const generateMonthlyData = () => {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  let lastMonthVisitors = 500 + Math.random() * 200; // Start with a random base
  
  return months.map(month => {
    const growth = Math.random() * 0.2 + 1.05; // 5% to 25% growth
    lastMonthVisitors *= growth;
    return {
      name: month,
      visitors: Math.floor(lastMonthVisitors),
    };
  });
};

const ViewerModal: React.FC<ViewerModalProps> = ({ isOpen, onClose }) => {
  const monthlyData = useMemo(() => generateMonthlyData(), []);
  
  if (!isOpen) return null;

  const maxVisitors = Math.max(...monthlyData.map(d => d.visitors));

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 transition-opacity duration-300 animate-fadeIn"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl m-4 flex flex-col border border-gray-700 transform transition-transform duration-300 animate-scaleIn"
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 p-6 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="flex items-center gap-3 text-2xl font-bold text-white">
              <ChartBarIcon className="h-7 w-7 text-blue-400" />
              Previsão de Acessos Mensais
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
              aria-label="Fechar modal"
            >
              <ClearIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto p-6 space-y-6">
          <p className="text-gray-400 text-center">
            Esta é uma estimativa de crescimento de usuários no site, baseada em projeções.
          </p>
          <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700">
            <div className="flex justify-between items-end h-64 space-x-2">
              {monthlyData.map((data) => {
                const barHeight = `${(data.visitors / maxVisitors) * 100}%`;
                return (
                  <div key={data.name} className="flex-1 flex flex-col items-center justify-end group">
                     <div className="text-sm font-semibold text-white mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      {data.visitors.toLocaleString('pt-BR')}
                    </div>
                    <div
                      className="w-full bg-gradient-to-t from-blue-600 to-teal-400 rounded-t-md hover:opacity-100 opacity-80 transition-opacity duration-200"
                      style={{ height: barHeight, minHeight: '2px' }}
                      title={`${data.name}: ${data.visitors.toLocaleString('pt-BR')} acessos`}
                    ></div>
                    <div className="mt-2 text-xs font-medium text-gray-400">{data.name}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 mt-auto p-4 border-t border-gray-700 bg-gray-800/50">
          <p className="text-xs text-center text-gray-500">
            * Dados meramente ilustrativos para fins de demonstração.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ViewerModal;
