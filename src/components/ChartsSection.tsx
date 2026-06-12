import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { TEAMS } from '../data/teams';
import type { UnifiedStats } from '../lib/models/types';
import type { TeamView } from '../lib/custom/types';

interface Props {
  stats: UnifiedStats;
  // Default = TEAMS global (Copa 2026). Custom passa lista do torneio.
  teamsByIndex?: TeamView[];
}

type Tab = 'top10' | 'fases' | 'pizza';

const PHASE_COLORS: Record<string, string> = {
  'Classificado': '#00B874',
  'Oitavas':      '#2D7DFF',
  'Quartas':      '#8B5CF6',
  'Semifinal':    '#F59E0B',
  'Final':        '#FF2E63',
  'Campeão':      '#FFB703',
};

const PIE_COLORS = [
  '#FFB703', '#FF2E63', '#00B874', '#2D7DFF',
  '#8B5CF6', '#F59E0B', '#FF6B35', '#10B981', '#9CA3AF',
];

function fmt(v: number): string {
  return v >= 1 ? v.toFixed(1) + '%' : v.toFixed(2) + '%';
}

// Gráfico 1: barras horizontais top 10 campeões
function Top10Chart({ stats, teams }: { stats: UnifiedStats; teams: TeamView[] }) {
  const data = teams
    .map((t, i) => ({ name: `${t.flag} ${t.name}`, value: stats.champion[i] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
    .reverse(); // recharts vertical layout renderiza de baixo para cima

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Probabilidade de ser campeão — top 10 favoritos
      </p>
      <ResponsiveContainer width="100%" height={340}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 40, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={v => v.toFixed(1) + '%'}
            tick={{ fontSize: 11 }}
            domain={[0, 'dataMax + 2']}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={160}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={(v: number) => [fmt(v), 'P(Campeão)']}
            contentStyle={{ borderRadius: 8, fontSize: 13 }}
          />
          <Bar dataKey="value" radius={[0, 6, 6, 0]}>
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={i === data.length - 1 ? '#FFB703' : i >= data.length - 3 ? '#FF2E63' : '#00B874'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Gráfico 2: barras agrupadas por fase para os top 8 times
function PhasesChart({ stats, teams }: { stats: UnifiedStats; teams: TeamView[] }) {
  const top8 = teams
    .map((t, i) => ({ ...t, idx: i }))
    .sort((a, b) => stats.champion[b.idx] - stats.champion[a.idx])
    .slice(0, 8);

  const data = top8.map(t => ({
    name: `${t.flag} ${t.name.split(' ')[0]}`,
    'Classificado': parseFloat(stats.qualified[t.idx].toFixed(1)),
    'Oitavas':      parseFloat(stats.r16[t.idx].toFixed(1)),
    'Quartas':      parseFloat(stats.qf[t.idx].toFixed(1)),
    'Semifinal':    parseFloat(stats.sf[t.idx].toFixed(1)),
    'Final':        parseFloat(stats.final[t.idx].toFixed(1)),
    'Campeão':      parseFloat(stats.champion[t.idx].toFixed(1)),
  }));

  const phases = ['Classificado', 'Oitavas', 'Quartas', 'Semifinal', 'Final', 'Campeão'] as const;

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Probabilidade por fase — top 8 favoritos ao título
      </p>
      <ResponsiveContainer width="100%" height={360}>
        <BarChart data={data} margin={{ left: 4, right: 8, top: 4, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11 }}
            angle={-35}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            tickFormatter={v => v + '%'}
            tick={{ fontSize: 11 }}
            domain={[0, 100]}
          />
          <Tooltip
            formatter={(v: number, name: string) => [fmt(v), name]}
            contentStyle={{ borderRadius: 8, fontSize: 12 }}
          />
          <Legend wrapperStyle={{ paddingTop: 12, fontSize: 12 }} />
          {phases.map(p => (
            <Bar key={p} dataKey={p} fill={PHASE_COLORS[p]} radius={[3, 3, 0, 0]} maxBarSize={14} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Gráfico 3: pizza divisão do título
function PizzaChart({ stats, teams }: { stats: UnifiedStats; teams: TeamView[] }) {
  const sorted = teams
    .map((t, i) => ({ name: `${t.flag} ${t.name}`, value: stats.champion[i] }))
    .sort((a, b) => b.value - a.value);

  const top8 = sorted.slice(0, 8);
  const others = sorted.slice(8).reduce((s, t) => s + t.value, 0);

  const data = [...top8, { name: '🌍 Outros', value: parseFloat(others.toFixed(2)) }];

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Divisão das chances de título — top 8 favoritos + outros
      </p>
      <ResponsiveContainer width="100%" height={380}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="46%"
            outerRadius={130}
            label={({ name, value }) => `${name.split(' ').slice(-1)[0]} ${fmt(value)}`}
            labelLine={{ strokeWidth: 1.5 }}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v: number, name: string) => [fmt(v), name]}
            contentStyle={{ borderRadius: 8, fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ChartsSection({ stats, teamsByIndex }: Props) {
  const [tab, setTab] = useState<Tab>('top10');
  const teams: TeamView[] = teamsByIndex ?? TEAMS;

  const TABS: { id: Tab; label: string }[] = [
    { id: 'top10', label: 'Top 10 Campeões' },
    { id: 'fases', label: 'Por Fase' },
    { id: 'pizza', label: 'Pizza do Título' },
  ];

  return (
    <div className="card-fest overflow-hidden animate-pop-in">
      <div className="p-4 border-b-2 border-copa-gold/30">
        <h2 className="font-display text-xl tracking-wide text-copa-dark mb-3">📈 Visualizações</h2>
        <div className="flex gap-2 flex-wrap">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 ${
                tab === t.id
                  ? 'bg-gradient-to-r from-copa-blue to-copa-purple text-white shadow-md scale-[1.04]'
                  : 'bg-white/80 text-copa-dark border border-copa-dark/10 hover:border-copa-blue hover:scale-[1.02]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="p-4">
        {tab === 'top10' && <Top10Chart stats={stats} teams={teams} />}
        {tab === 'fases' && <PhasesChart stats={stats} teams={teams} />}
        {tab === 'pizza' && <PizzaChart stats={stats} teams={teams} />}
      </div>
    </div>
  );
}
