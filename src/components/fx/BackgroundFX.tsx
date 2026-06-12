// Camada decorativa fixa atrás de todo o app: bolhas coloridas desfocadas e
// ícones de futebol flutuando. Puramente visual (aria-hidden, sem pointer events).

const FLOATERS: { icon: string; top: string; left: string; size: string; delay: string; slow?: boolean; spin?: boolean }[] = [
  { icon: '⚽', top: '14%', left: '3%',  size: 'text-5xl', delay: '0s',    spin: true },
  { icon: '🏆', top: '68%', left: '6%',  size: 'text-4xl', delay: '1.2s', slow: true },
  { icon: '⭐', top: '30%', left: '92%', size: 'text-3xl', delay: '0.6s' },
  { icon: '⚽', top: '78%', left: '90%', size: 'text-4xl', delay: '2s',   spin: true },
  { icon: '🎉', top: '8%',  left: '78%', size: 'text-4xl', delay: '1.6s', slow: true },
  { icon: '🥅', top: '50%', left: '95%', size: 'text-4xl', delay: '0.9s', slow: true },
  { icon: '🎊', top: '88%', left: '40%', size: 'text-3xl', delay: '2.4s' },
  { icon: '⭐', top: '60%', left: '2%',  size: 'text-2xl', delay: '3s',   slow: true },
];

export function BackgroundFX() {
  return (
    <div aria-hidden className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {/* Bolhas coloridas desfocadas */}
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-copa-green/25 blur-3xl animate-float-slow" />
      <div className="absolute top-1/3 -right-32 w-[28rem] h-[28rem] rounded-full bg-copa-blue/20 blur-3xl animate-float" />
      <div className="absolute -bottom-20 left-1/4 w-80 h-80 rounded-full bg-copa-gold/25 blur-3xl animate-float-slow" />
      <div className="absolute bottom-1/4 right-1/3 w-72 h-72 rounded-full bg-copa-red/15 blur-3xl animate-float" />
      <div className="absolute top-10 left-1/2 w-64 h-64 rounded-full bg-copa-purple/15 blur-3xl animate-float-slow" />

      {/* Ícones flutuantes */}
      {FLOATERS.map((f, i) => (
        <span
          key={i}
          className={`absolute select-none opacity-[0.14] ${f.size} ${
            f.spin ? 'animate-spin-slow' : f.slow ? 'animate-float-slow' : 'animate-float'
          }`}
          style={{ top: f.top, left: f.left, animationDelay: f.delay }}
        >
          {f.icon}
        </span>
      ))}
    </div>
  );
}
