import { useState } from 'react';
import { TrendingUp, BarChart3 } from 'lucide-react';
import { Header } from './components/Header';
import { BradleyTerryTab } from './tabs/BradleyTerryTab';
import { PoissonTab } from './tabs/PoissonTab';

type TabId = 'bt' | 'poisson';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('bt');

  return (
    <div className="min-h-screen bg-copa-bg font-sans text-copa-dark">
      <Header />

      <nav className="max-w-5xl mx-auto px-4 pt-4">
        <div
          role="tablist"
          className="flex gap-1 p-1 bg-white rounded-2xl shadow-sm border border-gray-200 w-fit"
        >
          <TabButton
            active={activeTab === 'bt'}
            onClick={() => setActiveTab('bt')}
            icon={<TrendingUp className="w-4 h-4" />}
            label="Bradley-Terry"
          />
          <TabButton
            active={activeTab === 'poisson'}
            onClick={() => setActiveTab('poisson')}
            icon={<BarChart3 className="w-4 h-4" />}
            label="Poisson"
          />
        </div>
      </nav>

      <div className={activeTab === 'bt' ? '' : 'hidden'}>
        <BradleyTerryTab />
      </div>
      <div className={activeTab === 'poisson' ? '' : 'hidden'}>
        <PoissonTab />
      </div>
    </div>
  );
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
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
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
