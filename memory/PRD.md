# Lotofácil Analytics – PRD

## Problem statement (original, pt-BR)
Programa no browser que lê TXT de jogos da Lotofácil e exibe: dezenas 1–5 mais repetidas; quantidade de dezenas da 1ª linha sorteadas juntas; 3/4 números que tendem a sair juntos; intervalo de soma mais frequente + mín/máx/média/desvio; pares x ímpares; repetidos do concurso anterior e pares x ímpares dos repetidos. Exibir com opção de salvar TXT/XLS; perguntar se deseja gerar jogos (máx 100); a cada novo upload perguntar se gera baseado nos últimos 10/20/30/50; TXT de jogos somente números separados por vírgula.

## User choices
- TXT: uma linha por concurso, 15 números (vírgula/espaço/;), nº do concurso opcional no início
- Primeira linha = dezenas 1–5 do volante
- Histórico no MongoDB (acumula), sem login

## Architecture
- Backend FastAPI (`server.py`): /api/contests/upload, /api/contests (GET/DELETE), /api/stats?window=, /api/generate
- Frontend React: dashboard dark, tabs de análise, recharts, gerador modal, export client-side (xlsx lib)

## Implemented (2026-06)
- Parsing + dedupe (by concurso number, or by number set when no number)
- All statistics, window selector (Todos/10/20/30/50)
- Generator: frequency-weighted random with filters (sum mean±std, common parity, first-line qty, repeats vs last draw)
- Exports: stats TXT/XLSX, games TXT (n,n,n...) / XLSX
- Tested: 100% backend + frontend (iteration_1)
- Histórico de jogos (lotes salvos no MongoDB, exportar TXT/XLS, excluir) e Conferir jogos (auto contra concurso seguinte ou qualquer concurso salvo; acertos 11–15) – iteration_2 100%
- Aba Atraso: atraso atual/máximo/médio e último concurso por dezena, top 5 em destaque, incluído nos exports
- Gerador: dezenas fixas/excluídas (picker 5x5) e opção de incluir exatamente 1 ou 2 das 5 mais atrasadas por jogo; opções salvas no lote – iteration_3 100%
- Fechamento: 16–20 dezenas, completo (até 18) ou reduzido com garantia 14/13 (cobertura gulosa, verificada por força bruta); salvo no histórico – iteration_4 100%

## Backlog
- P1: conferir jogos gerados contra resultado novo; histórico de jogos gerados
- P2: frequência de atraso por dezena; fixar/excluir dezenas no gerador
