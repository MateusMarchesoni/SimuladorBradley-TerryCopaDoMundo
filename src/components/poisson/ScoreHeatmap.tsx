interface Props {
  // matrix[goalsA][goalsB] = contagem absoluta
  matrix: number[][];
  totalSamples: number;
  teamAName: string;
  teamBName: string;
  // dimensão (default 6 → 0..5)
  size?: number;
}

// Interpola tons do branco até o vermelho da Copa em função da frequência.
function cellColor(freq: number, maxFreq: number): string {
  if (maxFreq === 0) return 'rgb(248, 250, 252)';
  const t = Math.min(freq / maxFreq, 1);
  // branco-pálido → rosa → vermelho copa (#FF2E63)
  const r = 255;
  const g = Math.round(255 - (255 - 46) * t);
  const b = Math.round(255 - (255 - 99) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function textColor(freq: number, maxFreq: number): string {
  if (maxFreq === 0) return '#9CA3AF';
  return freq / maxFreq > 0.55 ? '#FFFFFF' : '#12275A';
}

export function ScoreHeatmap({
  matrix,
  totalSamples,
  teamAName,
  teamBName,
  size = 6,
}: Props) {
  let maxFreq = 0;
  for (let a = 0; a < size; a++) {
    for (let b = 0; b < size; b++) {
      const v = matrix[a]?.[b] ?? 0;
      if (v > maxFreq) maxFreq = v;
    }
  }

  return (
    <div className="card-fest p-5 animate-pop-in">
      <div className="mb-3">
        <h3 className="font-display text-lg tracking-wide text-copa-dark">🔥 Mapa de calor de placares</h3>
        <p className="text-xs text-copa-dark/60 mt-0.5">
          Frequência relativa de cada placar nas {totalSamples.toLocaleString('pt-BR')} simulações.
          Linhas: gols de {teamAName}. Colunas: gols de {teamBName}.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-1 text-xs mx-auto">
          <thead>
            <tr>
              <th className="px-1 py-1 text-gray-400 font-medium"></th>
              {Array.from({ length: size }, (_, b) => (
                <th
                  key={b}
                  className="px-1 py-1 text-gray-500 font-semibold text-center w-12"
                  title={`${b} gol(s) de ${teamBName}`}
                >
                  {b === size - 1 ? `${b}+` : b}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: size }, (_, a) => (
              <tr key={a}>
                <th
                  className="px-1 py-1 text-gray-500 font-semibold text-right pr-2"
                  title={`${a} gol(s) de ${teamAName}`}
                >
                  {a === size - 1 ? `${a}+` : a}
                </th>
                {Array.from({ length: size }, (_, b) => {
                  const count = matrix[a]?.[b] ?? 0;
                  const pct = totalSamples > 0 ? (count / totalSamples) * 100 : 0;
                  return (
                    <td
                      key={b}
                      className="w-12 h-12 rounded-md text-center font-mono text-[11px] align-middle border border-gray-100"
                      style={{
                        backgroundColor: cellColor(count, maxFreq),
                        color: textColor(count, maxFreq),
                      }}
                      title={`${teamAName} ${a} × ${b} ${teamBName} — ${pct.toFixed(2)}%`}
                    >
                      {pct >= 0.1 ? pct.toFixed(1) : ''}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-gray-400 mt-2 text-center">
        Valores em %. Última linha/coluna agrupa placares com gols iguais ou superiores ao limite.
      </p>
    </div>
  );
}
