// Chuva de confete em CSS puro, para usar dentro de containers com
// position: relative + overflow-hidden. Decorativo (aria-hidden).

const CONFETTI_COLORS = ['#FFB703', '#FF2E63', '#2D7DFF', '#00B874', '#8B5CF6', '#FFFFFF'];

interface Props {
  count?: number;
  // Distância da queda (deve cobrir a altura do container).
  distance?: string;
}

export function Confetti({ count = 22, distance = '220px' }: Props) {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${(i * 47 + 13) % 100}%`,
            backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            animationDelay: `${((i * 7) % 32) / 10}s`,
            animationDuration: `${2.8 + ((i * 3) % 14) / 10}s`,
            ['--confetti-distance' as never]: distance,
          }}
        />
      ))}
    </div>
  );
}
