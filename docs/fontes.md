# Fontes: como cada API funciona

Tudo testado em 23/10/2026. As cinco APIs abaixo liberam CORS (`Access-Control-Allow-Origin: *`),
então dá para chamar direto do navegador: é o que o protótipo faz.

## Câmara dos Deputados

- Base: `https://dadosabertos.camara.leg.br/api/v2` (sem chave). Mande `Accept: application/json`.
- Listas: 15 itens por padrão, no máximo 100 (`itens=100`). O total vem no cabeçalho
  `X-Total-Count`: com `itens=1` dá para contar sem baixar.
- Deputados: `/deputados?siglaUf=PI` (só os em exercício), `/deputados/{id}`.
- **Gastos (cota)**: `/deputados/{id}/despesas?idLegislatura=57&ano=2026`. Pegadinha: **só `ano`
  devolve vazio**; precisa de `idLegislatura` junto. Arquivo anual: `camara.leg.br/cotas/Ano-{ano}.csv.zip`.
- **Projetos**: `/proposicoes?idDeputadoAutor={id}&siglaTipo=PL&dataApresentacaoInicio=2023-02-01`.
  Inclui coautoria. Tipos úteis: PL, PEC, PLP, PDL, REQ, INC (indicação).
- **Votos**: `/votacoes?idOrgao=180` (180 = Plenário) com `dataInicio`/`dataFim`. **Máximo de 3 meses
  entre as datas** (senão 400). Depois `/votacoes/{id}/votos`: vem vazio quando a votação foi simbólica.
- **Presença**: arquivo `dadosabertos.camara.leg.br/arquivos/eventosPresencaDeputados/json/eventosPresencaDeputados-{ano}.json`
  (16 MB em 2026), ou `/eventos/{id}/deputados`. Falta justificada não vem.
- Arquivos em massa: `votacoesVotos-{ano}`, `proposicoesAutores-{ano}`, `eventos-{ano}` etc. (padrão
  `/arquivos/{nome}/{formato}/{nome}-{ano}.{formato}`).
- A legislatura 57 vai até 31/01/2027; os eleitos em 2026 entram na 58.

## Senado Federal

- Base: `https://legis.senado.leg.br/dadosabertos` (sem chave). Sufixo `.json` no caminho.
- Limite: mais de 10 pedidos por segundo dá 429. Evitar rodar em hora cheia.
- Senadores: `/senador/lista/atual.json?uf=PI` → `ListaParlamentarEmExercicio.Parlamentares.Parlamentar`.
- **Votos**: `/votacao.json?codigoParlamentar={c}&dataInicio=2026-01-01&dataFim=2026-10-22` → lista de
  votações com `votos[]` (só o do senador pedido). Até 1 ano por pedido.
  Códigos de `siglaVotoParlamentar` vistos: `Sim`, `Não`, `Abstenção`, `Votou` (votação secreta),
  `P-NRV` (presente, não registrou voto), `AP` (atividade parlamentar), `MIS` (missão oficial),
  `LS` (licença), `NCom` (não compareceu). **Dá para separar falta justificada da sem justificativa.**
- **Projetos**: `/processo.json?codigoParlamentarAutor={c}&dataInicioApresentacao=2023-02-01`
  (inclui coautoria; tipo no começo de `identificacao`, ex.: `PL 90/2023`).
- Discursos: `/senador/{c}/discursos` (até 1 ano). Gastos (CEAPS): API à parte em
  `adm.senado.gov.br/adm-dadosabertos` (não testada).
- Serviços antigos (`/senador/{c}/votacoes`, `/autorias`) estão depreciados.

## SAPL (assembleias e câmaras)

- Base: `https://sapl.<cidade>.<uf>.leg.br/api/` (assembleia: `sapl.al.<uf>.leg.br`). Sem login.
- Paginação DRF: `?page=N&page_size=100`, total em `pagination.total_entries`.
- Legislatura atual: `/parlamentares/legislatura/` (a de `data_inicio` ≤ hoje ≤ `data_fim`).
- Quem está no mandato: `/parlamentares/mandato/?legislatura={id}` (titulares e suplentes).
- Perfil: `/parlamentares/parlamentar/` (foto em `fotografia`, vem com `http://`: trocar por `https://`).
- **Presença**: `/sessao/sessaoplenariapresenca/?parlamentar={id}` (o registro existe = presente;
  `data_sessao` costuma vir nulo, cruzar com `/sessao/sessaoplenaria/?legislatura={id}&tipo=1`).
- **Votos**: `/sessao/votoparlamentar/?parlamentar={id}`. **Traz `ip` e `user` de quem lançou: nunca
  mostrar nem guardar esses campos.**
- **Projetos**: o autor é outra tabela. `/base/autor/?object_id={id parlamentar}` → id do autor →
  `/materia/materialegislativa/?autores={id autor}`. Tipos em `/materia/tipomaterialegislativa/`.

## Portal da Transparência (emendas)

- Base: `https://api.portaldatransparencia.gov.br/api-de-dados`, cabeçalho `chave-api-dados`.
  **Sem chave, 401.** A chave é gratuita, pedida em `portaldatransparencia.gov.br/api-de-dados/cadastrar-email`.
- `/emendas?nomeAutor=…&ano=…&pagina=1`: `valorEmpenhado`, `valorPago`, `localidadeDoGasto`, `funcao`.
  Só emendas federais (deputados federais, senadores, bancadas, comissões).
- Emendas Pix (transferências especiais): API do Transferegov em `api-publica.transferegov.gestao.gov.br`
  (não testada).
- A chave não pode ir para o navegador: na versão final, quem chama é o Worker.

## TSE

- Portal CKAN: `https://dadosabertos.tse.jus.br/api/3/action/package_show?id=candidatos-2026` (sem chave).
- Arquivos em `cdn.tse.jus.br/estatistica/sead/odsele/…`: `consulta_cand_{ano}.zip`, `bem_candidato`,
  `rede_social_candidato`, `motivo_cassacao`, fotos por UF, `proposta_governo_{ano}_{UF}.zip` (PDF),
  prestação de contas (receitas e despesas) e votação por município e zona.
- Eleições: 2026, 2024, 2022 e anteriores. O DivulgaCandContas (`/divulga/rest/v1`) respondeu 403.
- Prestação de contas final de 2026: até 03/11 (14/11 para quem foi ao segundo turno).

## Querido Diário

- Base: `https://api.queridodiario.org.br` (sem chave, CORS aberto).
- `/cities`: as 5.570 cidades, com `level` (0 = sem diário, 1, 3 = mais completo) e `availability_date`.
- `/gazettes?territory_ids={ibge}&size=1`: diários da cidade (com `total_gazettes`).
