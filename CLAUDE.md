# CLAUDE.md

Documentação interna do modelo Poisson do simulador.

## Modelo

Cada seleção tem dois parâmetros: **λ_atk** (força ofensiva) e **λ_def** (fragilidade
defensiva). Para um confronto A × B:

```
λ_A = λ_atk(A) × λ_def(B) / μ
λ_B = λ_atk(B) × λ_def(A) / μ
gols_A ~ Poisson(λ_A)
gols_B ~ Poisson(λ_B)
```

Os parâmetros são derivados da força Bradley-Terry de cada seleção pelo damping:

```
λ_atk(i) = μ × (F_i / F_ref)^α
λ_def(i) = μ × (F_ref / F_i)^α
```

Propriedade: λ_atk(i) × λ_def(i) = μ² para todo time, ou seja, um time jogando
contra si mesmo geraria média μ gols/time.

## Parâmetros calibrados

| Constante | Valor      | Significado                                                    |
|-----------|------------|----------------------------------------------------------------|
| α         | 0,45       | damping da assimetria atk/def (antes era 0,40)                 |
| μ         | 1,189834   | baseline de gols/time/partida (recalibrado de 1,232227)        |
| F_ref     | 27,20971   | média geométrica das 48 forças (inalterada)                    |

**Constraint de calibração**: média global de 2,8 gols/partida (1,4 por time).

## Onde está no código

- Constantes exportadas: `src/lib/poisson/sampling.ts` — `ALPHA`, `MU_BASELINE`, `F_REF`.
- Fórmula: `lambdasFor()` em `src/lib/poisson/sampling.ts`.
- Dados por time: `src/data/teams_poisson.json` (campos `lambda_atk` e `lambda_def`).
- Editor da UI: `src/components/poisson/LambdaEditor.tsx`.

## Histórico de calibração

| Versão | α    | μ        | F_ref     | Notas                                              |
|--------|------|----------|-----------|----------------------------------------------------|
| v1     | 0,40 | 1,232227 | 27,20971  | calibração inicial                                 |
| v2     | 0,45 | 1,189834 | 27,20971  | atual — damping mais forte, μ ajustado p/ 2,8 g/p  |

## Pareamentos de referência (com parâmetros v2)

| Confronto             | λ_A     | λ_B     |
|-----------------------|---------|---------|
| Inglaterra × França   | 1,1967  | 1,1828  |
| Brasil × Haiti        | 5,1864  | 0,2729  |
| Brasil × Argentina    | 1,2339  | 1,1473  |
