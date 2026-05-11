# Simulador Bradley-Terry — Copa do Mundo 2026

> Projeto de Feira de Ciências — Ensino Médio (Maple Bear Valinhos)  
> Disciplina: Matemática | Tema: Probabilidade e Simulação

---

## O que é este projeto?

Um **site interativo** que simula a Copa do Mundo 2026 milhares de vezes para calcular a probabilidade de cada seleção chegar em cada fase — usando dois conceitos matemáticos:

1. **Modelo Bradley-Terry** (probabilidade de cada jogo)  
2. **Método Monte Carlo** (estimativa por simulação massiva)

---

## O Modelo Bradley-Terry

### Ideia central

Cada seleção tem uma **Força Final** (um número calculado a partir de dados históricos de resultados, diferenças de gol e qualidade dos adversários).

A probabilidade de o time **A** vencer o time **B** em qualquer partida é:

```
P(A vence) = F_A / (F_A + F_B)
```

onde `F_A` e `F_B` são as Forças Finais dos times.

### Exemplo prático

| Seleção    | Força Final |
|------------|-------------|
| Inglaterra | 82,75       |
| Brasil     | 76,87       |

```
P(Inglaterra vence Brasil) = 82,75 / (82,75 + 76,87) ≈ 51,8%
```

### Por que não tem empate?

Para simplificar o modelo, cada jogo tem **obrigatoriamente um vencedor**. Na prática, geramos um número aleatório r ∈ [0, 1) e:
- Se r < P(A) → vitória do time A
- Caso contrário → vitória do time B

---

## O Método Monte Carlo

### O que é?

Monte Carlo é uma técnica de **estimativa por repetição aleatória**. Em vez de calcular a probabilidade de forma analítica (o que seria impossível para um torneio com 48 times e 6 rodadas), **simulamos o torneio inteiro milhares de vezes** e contamos quantas vezes cada resultado acontece.

### Como funciona aqui?

1. Simulamos **10.000 Copas do Mundo** completas (fase de grupos + mata-mata)
2. Em cada Copa, cada jogo é decidido pelo modelo Bradley-Terry
3. Ao final calculamos: `P(Brasil campeão) = Copas ganhas pelo Brasil ÷ 10.000`

### Por que 10.000 simulações?

Com 10.000 simulações, o **erro estatístico** (intervalo de confiança 95%) para uma probabilidade de 10% é de aproximadamente ±0,6 pontos percentuais — preciso o suficiente para fins didáticos.

Com 50.000 simulações, o erro cai para ±0,3 pontos percentuais.

---

## Formato da Copa 2026

A FIFA alterou o formato para **48 seleções** divididas em **12 grupos de 4 times**:

- **Fase de grupos**: todos jogam contra todos no grupo (6 jogos por grupo)
- **Classificação**: top 2 de cada grupo (24 times) + 8 melhores terceiros colocados = **32 times**
- **Mata-mata**: rodada de 32 → oitavas → quartas → semifinais → final

### Critério de seleção dos 8 melhores terceiros

Os 12 terceiros colocados são ordenados por:
1. Pontos no grupo
2. Força Final (critério de desempate)

Os 8 melhores avançam.

### Chaveamento simplificado

Para a simulação, usamos um chaveamento determinístico que evita times do mesmo grupo se encontrarem na rodada de 32:

- Grupos emparelhados: (A,B), (C,D), (E,F), (G,H), (I,J), (K,L)
- 1º do Grupo A enfrenta o 2º do Grupo B, e vice-versa
- Os 8 wildcards (melhores terceiros) disputam entre si na parte inferior do chaveamento

**Limitação**: o chaveamento real da FIFA ainda não foi divulgado para 2026. Esta é uma aproximação razoável para fins educativos.

---

## Funcionalidades do Simulador

| Funcionalidade | Descrição |
|---|---|
| **Simular N Copas** | Monte Carlo com 1k / 10k / 50k simulações |
| **Ver 1 Copa** | Exibe o chaveamento completo de uma única simulação |
| **Tabela de probabilidades** | Todas as 48 seleções, ordenável por qualquer coluna |
| **Gráfico Top 10** | Barras horizontais com os 10 maiores favoritos ao título |
| **Gráfico por Fase** | Barras agrupadas mostrando como cada time evolui no torneio |
| **Gráfico Pizza** | Divisão visual das chances de título |
| **Editar Forças** | Sliders para ajustar a força de qualquer time em tempo real |
| **Exportar CSV** | Baixar as forças atuais em planilha |
| **Importar CSV** | Carregar forças personalizadas de uma planilha |

---

## Como rodar localmente

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar servidor de desenvolvimento
npm run dev
# Acesse http://localhost:5173
```

## Como fazer o build de produção

```bash
npm run build
# Gera a pasta /dist pronta para deploy
```

## Como fazer deploy no Vercel

```bash
# Instalar Vercel CLI (uma vez)
npm install -g vercel

# Deploy
vercel --prod
```

O Vercel detecta automaticamente o Vite e configura tudo. A URL gerada pode ser usada para criar o QR Code da feira.

---

## Stack tecnológica

| Tecnologia | Uso |
|---|---|
| React 18 + TypeScript | Interface e lógica de componentes |
| Vite | Bundler e servidor de dev |
| Tailwind CSS | Estilização responsiva mobile-first |
| Recharts | Gráficos interativos |
| Lucide React | Ícones |
| Web Workers | Simulação em thread separada (não trava a UI) |

---

## Grupos da Copa 2026 (sorteio oficial, 5/dez/2025)

| Grupo | Times |
|-------|-------|
| A | México, Coreia do Sul, República Tcheca, África do Sul |
| B | Canadá, Suíça, Catar, Bósnia |
| C | Brasil, Marrocos, Escócia, Haiti |
| D | Estados Unidos, Paraguai, Turquia, Austrália |
| E | Alemanha, Equador, Costa do Marfim, Curaçau |
| F | Holanda, Japão, Suécia, Tunísia |
| G | Bélgica, Egito, Irã, Nova Zelândia |
| H | Espanha, Cabo Verde, Arábia Saudita, Uruguai |
| I | França, Senegal, Iraque, Noruega |
| J | Argentina, Áustria, Argélia, Jordânia |
| K | Portugal, Colômbia, Uzbequistão, RD do Congo |
| L | Inglaterra, Croácia, Gana, Panamá |

---

## Referências

- Bradley, R.A. & Terry, M.E. (1952). *Rank Analysis of Incomplete Block Designs*. Biometrika, 39(3/4), 324–345.
- Metropolis, N. & Ulam, S. (1949). *The Monte Carlo Method*. Journal of the American Statistical Association, 44(247), 335–341.
- FIFA Copa do Mundo 2026 — formato oficial: fifa.com
