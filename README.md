# Seu Voto

O que cada político fez (presença, votos, projetos e gastos), com a fonte oficial do lado, para
**todos os cargos e todos os estados**. Quando um lugar não publica algum dado, o site diz que não
publica. Inclui a cola (o "cartãozinho") com os números dos seus candidatos, para imprimir.

| | |
| :-- | :-- |
| Endereço | `https://seuvoto.bugadao.com` (no ar desde 24/10/2026) |
| Hospedagem | um Worker `seuvoto-bugadao`: site (dist/) + API (/api/*) + coletor (cron de 10 em 10 min) + D1 `seuvoto` (região ENAM) |
| Estado da coleta | `https://seuvoto.bugadao.com/api/saude` (fila, erros, últimas rodadas) |
| Cor da marca | índigo provisório (`#818CF8` / `#4F46E5` / `#4338CA`): falta entrar na tabela do kit de marca |

## Como funciona

```
fontes oficiais ──(coletor, no cron do Worker)──▶ D1 ──(/api/*)──▶ site (Vue)
Câmara · Senado · SAPL · Querido Diário · Interlegis
```

- **Coletor** (`worker/coletor/`): uma fila na tabela `tarefas`. Cada rodada pega as tarefas vencidas
  por prioridade até gastar 800 pedidos ou 280 s, e para no meio sem perder nada (toda tarefa é
  idempotente). Recentes de 6 em 6 horas, fichas por semana, diretório do Interlegis por mês.
- **Câmara do interior sob demanda**: quando alguém abre uma cidade que ninguém coletou, a API agenda a
  câmara na frente da fila e já roda uma rodada curta; a página avisa "estamos buscando" e se atualiza.
  Câmara fora do diretório: tenta `sapl.<cidade>.<uf>.leg.br`.
- **API** (`worker/api.ts`): `/api/lugar/:ibge`, `/api/pessoas`, `/api/p/:id` (+ `/votos`), `/api/busca`,
  `/api/cobertura` e `/api/saude` (estado da coleta).
- **Site** (`src/`): início com busca única (cidade ou político), página do lugar por esfera
  (federal, estadual, municipal), ficha com resumo em números e média da casa, cola para imprimir ou
  salvar como imagem, página "o que cada lugar publica" e "como funciona". Barra de navegação de
  polegar no celular.

## Rodar local

```bash
npm install
npx wrangler d1 migrations apply DB --local   # cria o banco local
npm run build                                  # gera dist/ (o Worker serve o site daí)
npm run dev:api                                # Worker local em http://127.0.0.1:8787 (site + API + cron)
npm run coletar:local                          # em outro terminal: roda o coletor até a fila esvaziar
npm run dev                                    # opcional: Vite com recarga em http://localhost:5173 (API via proxy)
npm test                                       # testes da lógica (Vitest)
```

`.dev.vars` (copie de `.dev.vars.exemplo`) encurta a primeira coleta local: `COLETA_DESDE=2026-04-01`
e `COLETA_UFS=PI,RN,PR`. Sem ele, o local coleta tudo desde 2023 (horas).

**Windows sem Visual C++:** o `workerd` (o runtime local da Cloudflare) precisa das DLLs do Visual C++
2015+. Sem elas, o `wrangler dev` e o D1 local falham com "write EOF" (código C0000135). Duas saídas:
instalar o "Microsoft Visual C++ Redistributable x64", ou copiar `msvcp140.dll`, `vcruntime140.dll`,
`vcruntime140_1.dll` e `concrt140.dll` (o Edge traz, em `C:\Program Files (x86)\Microsoft\Edge\Application\<versão>\`)
para `node_modules/@cloudflare/workerd-windows-64/bin/`. Neste PC foi feita a cópia (some a cada `npm install` limpo).

## Publicar

`npm run deploy` (testa, gera, aplica as migrações no D1 remoto e publica), ou o `Publicar.cmd` da
pasta de cima (alvo "Seu Voto", só depois do primeiro commit). O banco `seuvoto` foi criado em
24/10/2026; a primeira carga completa (desde 02/2023, todos os estados) leva algumas horas de cron.

Falta entrar no resto do ecossistema: rodapé do hub (`packages/casca/src/projetos.ts`), site
`bugadao.com` e a tabela de produtos do kit de marca (com a cor definida).

Custo: cabe nas franquias do Workers Paid. São cerca de 6 rodadas por hora com até 800 pedidos cada;
o D1 deve ficar abaixo de 1 GB.

## Estrutura

```
shared/cobertura.ts    levantamento manual de 23/10/2026 (27 Assembleias, 26 capitais, Câmara e Senado)
shared/logica.ts       regras puras: comparecimento no Senado, medição do SAPL, Interlegis, glossário, gastos
shared/tipos.ts        formato das respostas da API
worker/index.ts        fetch (API + site) e scheduled (coletor)
worker/api.ts          as rotas /api/*
worker/coletor/        fila.ts (a fila), camara.ts, senado.ts, sapl.ts, base.ts (casas, cidades, Interlegis)
migrations/            esquema do D1
src/                   o site (Vue 3 + vue-router): paginas/, components/, lib/
tests/                 testes da lógica
scripts/coletar-local.mjs   roda o coletor no Worker local até esvaziar a fila
prototipo/index.html   o protótipo de 23/10/2026 (HTML puro, chama as APIs direto do navegador)
docs/                  cobertura.md (o levantamento) e fontes.md (como cada API funciona)
```

## Ainda não está

- **Emendas** (Portal da Transparência): precisa da chave gratuita (fica num segredo do Worker).
- **TSE**: ficha de candidato (número, bens, doações), quem ocupa os cargos executivos e propostas de
  governo. São arquivos grandes por eleição; o plano é um script que baixa e grava no D1.
- **Gastos das Assembleias** que publicam fora do SAPL (PI, BA, CE, ES, MS, SC, SP, MG, DF).
- **Assembleias com API própria** (SP, MG, PR, CE, ES, DF) e raspagem das que só têm página.
- **Imagem de compartilhamento** (og.png) e ícones PNG.
