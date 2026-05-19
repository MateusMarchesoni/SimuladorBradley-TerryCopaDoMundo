import { useState } from 'react';
import { Trophy, Scale, Timer } from 'lucide-react';
import { Header } from './components/Header';
import { SimulateTab } from './tabs/SimulateTab';
import { CompareTab } from './tabs/CompareTab';
import { MinuteByMinuteTab } from './tabs/MinuteByMinuteTab';
import type { ModelId } from './lib/models/types';

type TabId = 'simulate' | 'compare' | 'minute';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('simulate');
  // Modelo "global" para coordenar a aba Minuto-a-minuto com o toggle da aba
  // Simular. Aqui guardamos só o último escolhido pelo usuário (default BT).
  const [activeModelId, setActiveModelId] = useState<ModelId>('bt');

  return (
    <div className="min-h-screen bg-copa-bg font-sans text-copa-dark">
      <Header />

      <nav className="max-w-5xl mx-auto px-4 pt-4">
        <div
          role="tablist"
          className="flex gap-1 p-1 bg-white rounded-2xl shadow-sm border border-gray-200 w-fit max-w-full overflow-x-auto"
        >
          <TabButton
            active={activeTab === 'simulate'}
            onClick={() => setActiveTab('simulate')}
            icon={<Trophy className="w-4 h-4" />}
            label="Simular"
          />
          <TabButton
            active={activeTab === 'compare'}
            onClick={() => setActiveTab('compare')}
            icon={<Scale className="w-4 h-4" />}
            label="Comparar Modelos"
          />
          <TabButton
            active={activeTab === 'minute'}
            onClick={() => setActiveTab('minute')}
            icon={<Timer className="w-4 h-4" />}
            label="Minuto a Minuto"
          />
        </div>
      </nav>

      {/* Cada tab fica em um wrapper escondido por CSS para preservar estado
          interno (worker em andamento, edits de parâmetro) ao trocar de aba. */}
      <div className={activeTab === 'simulate' ? '' : 'hidden'}>
        <SimulateTabWrapper onModelIdChange={setActiveModelId} />
      </div>
      <div className={activeTab === 'compare' ? '' : 'hidden'}>
        <CompareTab />
      </div>
      <div className={activeTab === 'minute' ? '' : 'hidden'}>
        <MinuteByMinuteTab activeModelId={activeModelId} />
      </div>
    </div>
  );
}

// Wrapper fininho que repassa mudanças de modelo do SimulateTab para o App.
// Implementado via prop callback para evitar context só por isso.
function SimulateTabWrapper({ onModelIdChange }: { onModelIdChange: (id: ModelId) => void }) {
  return <SimulateTab key="simulate" onModelChange={onModelIdChange} />;
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-bold transition-colors whitespace-nowrap ${
        active
          ? 'bg-copa-dark text-white shadow'
          : 'text-copa-dark hover:bg-gray-50'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
