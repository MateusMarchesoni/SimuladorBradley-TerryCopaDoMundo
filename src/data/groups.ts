export const GROUPS: Record<string, string[]> = {
  A: ["México", "Coreia do Sul", "República Tcheca", "África do Sul"],
  B: ["Canadá", "Suíça", "Catar", "Bósnia"],
  C: ["Brasil", "Marrocos", "Escócia", "Haiti"],
  D: ["Estados Unidos", "Paraguai", "Turquia", "Austrália"],
  E: ["Alemanha", "Equador", "Costa do Marfim", "Curaçau"],
  F: ["Holanda", "Japão", "Suécia", "Tunísia"],
  G: ["Bélgica", "Egito", "Irã", "Nova Zelândia"],
  H: ["Espanha", "Cabo Verde", "Arábia Saudita", "Uruguai"],
  I: ["França", "Senegal", "Iraque", "Noruega"],
  J: ["Argentina", "Áustria", "Argélia", "Jordânia"],
  K: ["Portugal", "Colômbia", "Uzbequistão", "RD do Congo"],
  L: ["Inglaterra", "Croácia", "Gana", "Panamá"],
};

export const GROUP_NAMES = Object.keys(GROUPS) as (keyof typeof GROUPS)[];
