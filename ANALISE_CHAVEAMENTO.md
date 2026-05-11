# Por que o Brasil tem mais chances de ser campeão?

> Uma análise do modelo Bradley-Terry aplicado ao chaveamento da Copa 2026

---

## O paradoxo

No simulador, o **Brasil termina como favorito ao título** mesmo não tendo a maior Força Final entre todas as seleções:

| Seleção    | Força Final | P(Campeão) |
|------------|-------------|------------|
| Inglaterra | 82,75       | ~9,7%      |
| França     | 81,70       | ~9,6%      |
| Espanha    | 80,67       | ~10,0%     |
| **Brasil** | **76,87**   | **~11,0%** |
| Alemanha   | 76,04       | ~8,2%      |
| Argentina  | 70,90       | ~6,2%      |

Por que uma seleção com força **menor** ganha mais vezes?

---

## Causa 1 — Força bruta não é suficiente em torneios

A probabilidade de ser **campeão** não depende só de sua força isolada — ela é o **produto das probabilidades de vencer cada jogo** ao longo de até 6 partidas eliminatórias.

```
P(Campeão) = P(vencer R32) × P(vencer R16) × P(vencer QF) × P(vencer SF) × P(vencer Final)
```

O que importa não é quão forte você é em geral, mas quão forte você é **em relação a cada adversário que enfrenta na ordem do chaveamento**. E aí entra o fator decisivo:

---

## Causa 2 — O chaveamento favorece o Brasil

O sorteio colocou as seleções nos seguintes quartos do bracket:

| Quarto | Times principais | Nível |
|--------|-----------------|-------|
| **Quarter 1** | 🇧🇷 Brasil, 🇺🇸 EUA, 🇲🇽 México, 🇨🇦 Canadá | ⭐⭐ |
| **Quarter 2** | 🇩🇪 Alemanha, 🇳🇱 Holanda, 🇧🇪 Bélgica, 🇪🇸 Espanha | ⭐⭐⭐⭐ |
| **Quarter 3** | 🇫🇷 França, 🇦🇷 Argentina, 🇵🇹 Portugal, 🏴󠁧󠁢󠁥󠁮󠁧󠁿 Inglaterra | ⭐⭐⭐⭐⭐ |
| Quarter 4 | 8 melhores 3ºs colocados | ⭐ |

O problema central: **França e Inglaterra — os dois times mais fortes — caíram no mesmo quarto do bracket**. Isso significa que **uma delas é eliminada antes da semifinal**, sempre. Elas se eliminam mutuamente.

O **Brasil está no Quarter 1**, o quarto com os adversários mais fracos dos principais favoritos.

---

## Exemplo numérico

### Caminho do Brasil até a final

| Rodada | Adversário típico | Força do adversário | P(Brasil vencer) |
|--------|------------------|---------------------|-----------------|
| R32    | EUA              | 41,9                | ≈ 65%           |
| R16    | México           | 37,8                | ≈ 67%           |
| QF     | Canadá           | 29,7                | ≈ 72%           |
| SF     | Espanha          | 80,7                | ≈ 49%           |
| **P(chegar à Final)** | | | **≈ 16%** |

### Caminho da Inglaterra até a final

| Rodada | Adversário típico | Força do adversário | P(Inglaterra vencer) |
|--------|------------------|---------------------|---------------------|
| R32    | Colômbia         | 42,0                | ≈ 66%               |
| R16    | Portugal         | 59,7                | ≈ 58%               |
| QF     | Argentina        | 70,9                | ≈ 54%               |
| SF     | França           | 81,7                | ≈ 50%               |
| **P(chegar à Final)** | | | **≈ 10%** |

> **Brasil chega à final ≈ 60% mais vezes que a Inglaterra**, apesar de ser menos forte. O caminho importa tanto quanto a força.

---

## A lição matemática

Isso demonstra um princípio importante em **probabilidade em torneios eliminatórios**:

> _"A probabilidade de vencer um torneio não é monotônica em relação à força do time — o chaveamento pode reverter a ordem esperada."_

No futebol real, esse efeito é amplamente reconhecido: **o sorteio da Copa pode valer tanto quanto o ranking da seleção**. Times favoritos às vezes não chegam à final justamente porque caem no mesmo lado do chaveamento que outros favoritos.

---

## Como verificar no simulador

1. **Ajuste as forças**: abra o painel **"Editar Forças dos Times"** e iguale a força do Brasil à da França (ambas em ~81,7)
2. **Rode 10.000 simulações**
3. **Observe**: o Brasil ainda terá probabilidade de título maior que a França, pois o chaveamento não mudou

Isso prova que o efeito é **estrutural (chaveamento)**, não uma consequência das forças.

---

## Conclusão

| Fator | Impacto |
|-------|---------|
| Força Final (Bradley-Terry) | Determina quem vence **cada jogo** |
| Posição no chaveamento | Determina **quem você enfrenta** em cada rodada |
| **Combinação dos dois** | Determina quem é **favorito ao título** |

O modelo Bradley-Terry é matematicamente justo — cada jogo é calculado corretamente. Mas o sorteio que definiu os grupos e o chaveamento cria **caminhos assimétricos** ao título. Isso não é um erro do modelo: é exatamente o que acontece no futebol real, e é por isso que o sorteio da Copa do Mundo é tão aguardado.

---

*Análise gerada com base nos resultados do simulador Monte Carlo com 10.000 simulações. Os percentuais podem variar ligeiramente a cada rodada de simulações devido à aleatoriedade inerente ao método.*
