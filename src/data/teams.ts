export interface Team {
  name: string;
  force: number;
  flag: string;
}

export const TEAMS: Team[] = [
  { name: "Inglaterra", force: 82.7457, flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "França", force: 81.7011, flag: "🇫🇷" },
  { name: "Espanha", force: 80.6668, flag: "🇪🇸" },
  { name: "Brasil", force: 76.8679, flag: "🇧🇷" },
  { name: "Alemanha", force: 76.0353, flag: "🇩🇪" },
  { name: "Argentina", force: 70.8988, flag: "🇦🇷" },
  { name: "Portugal", force: 59.6625, flag: "🇵🇹" },
  { name: "Holanda", force: 56.2879, flag: "🇳🇱" },
  { name: "Bélgica", force: 49.6224, flag: "🇧🇪" },
  { name: "Uruguai", force: 49.5308, flag: "🇺🇾" },
  { name: "Marrocos", force: 48.1632, flag: "🇲🇦" },
  { name: "Senegal", force: 45.7790, flag: "🇸🇳" },
  { name: "Croácia", force: 42.4853, flag: "🇭🇷" },
  { name: "Colômbia", force: 41.9671, flag: "🇨🇴" },
  { name: "Estados Unidos", force: 41.9403, flag: "🇺🇸" },
  { name: "Turquia", force: 41.1731, flag: "🇹🇷" },
  { name: "Suíça", force: 39.6718, flag: "🇨🇭" },
  { name: "Equador", force: 38.8879, flag: "🇪🇨" },
  { name: "Japão", force: 38.7138, flag: "🇯🇵" },
  { name: "Noruega", force: 38.5054, flag: "🇳🇴" },
  { name: "México", force: 37.7852, flag: "🇲🇽" },
  { name: "Áustria", force: 35.8654, flag: "🇦🇹" },
  { name: "Costa do Marfim", force: 35.1630, flag: "🇨🇮" },
  { name: "Argélia", force: 33.0996, flag: "🇩🇿" },
  { name: "Coreia do Sul", force: 32.2673, flag: "🇰🇷" },
  { name: "Suécia", force: 31.7486, flag: "🇸🇪" },
  { name: "Irã", force: 31.6849, flag: "🇮🇷" },
  { name: "Canadá", force: 29.7282, flag: "🇨🇦" },
  { name: "Egito", force: 29.6718, flag: "🇪🇬" },
  { name: "Austrália", force: 29.2131, flag: "🇦🇺" },
  { name: "Panamá", force: 25.9197, flag: "🇵🇦" },
  { name: "República Tcheca", force: 25.8119, flag: "🇨🇿" },
  { name: "Escócia", force: 25.2974, flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  { name: "Paraguai", force: 25.1452, flag: "🇵🇾" },
  { name: "RD do Congo", force: 22.7783, flag: "🇨🇩" },
  { name: "Tunísia", force: 21.2252, flag: "🇹🇳" },
  { name: "Uzbequistão", force: 18.6793, flag: "🇺🇿" },
  { name: "Catar", force: 15.2001, flag: "🇶🇦" },
  { name: "Iraque", force: 14.2790, flag: "🇮🇶" },
  { name: "África do Sul", force: 13.4071, flag: "🇿🇦" },
  { name: "Bósnia", force: 13.1719, flag: "🇧🇦" },
  { name: "Arábia Saudita", force: 12.6019, flag: "🇸🇦" },
  { name: "Jordânia", force: 11.3714, flag: "🇯🇴" },
  { name: "Gana", force: 10.7110, flag: "🇬🇭" },
  { name: "Cabo Verde", force: 9.2556, flag: "🇨🇻" },
  { name: "Haiti", force: 2.9161, flag: "🇭🇹" },
  { name: "Curaçau", force: 2.7204, flag: "🇨🇼" },
  { name: "Nova Zelândia", force: 1.1536, flag: "🇳🇿" },
];

export const TEAM_INDEX_MAP = new Map<string, number>(
  TEAMS.map((t, i) => [t.name, i])
);
