import { useState } from 'react';
import { Trophy, Scale, Timer, Sliders } from 'lucide-react';
import { Header } from './components/Header';
import { BackgroundFX } from './components/fx/BackgroundFX';
import { SimulateTab } from './tabs/SimulateTab';
import { CompareTab } from './tabs/CompareTab';
import { MinuteByMinuteTab } from './tabs/MinuteByMinuteTab';
import { CustomTournamentTab } from './tabs/CustomTournamentTab';
import type { ModelId } from './lib/models/types';

type TabId = 'simulate' | 'compare' | 'minute' | 'custom';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('simulate');
  // Modelo "global" para coordenar a aba Minuto-a-minuto com o toggle da aba
  // Simular. Aqui guardamos só o último escolhido pelo usuário (default BT).
  const [activeModelId, setActiveModelId] = useState<ModelId>('bt');

  return (
    <div className="relative min-h-screen overflow-x-clip font-sans text-copa-dark">
      <BackgroundFX />

      <div className="relative z-10">
        <Header />

        <nav className="max-w-5xl mx-auto px-4 pt-5">
          <div
            role="tablist"
            className="flex gap-1.5 p-1.5 bg-white/75 backdrop-blur-md rounded-full shadow-lg border-2 border-white w-fit max-w-full overflow-x-auto"
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
            <TabButton
              active={activeTab === 'custom'}
              onClick={() => setActiveTab('custom')}
              icon={<Sliders className="w-4 h-4" />}
              label="Torneio Customizado"
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
        <div className={activeTab === 'custom' ? '' : 'hidden'}>
          <CustomTournamentTab />
        </div>
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
      className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-200 whitespace-nowrap ${
        active
          ? 'bg-gradient-to-r from-copa-red to-orange-500 text-white shadow-lg scale-[1.03]'
          : 'text-copa-dark hover:bg-white hover:scale-[1.02]'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
