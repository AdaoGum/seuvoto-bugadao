# Cobertura: o que cada lugar publica

Levantamento de 23/10/2026: sites e APIs abertos um a um, e as APIs principais testadas com `curl`.
É o retrato daquele dia. Casa que muda de sistema muda a tabela: o coletor da versão final
vai conferir isto sozinho e atualizar a ficha de cada lugar.

**Legenda**

| Marca | Quer dizer |
|---|---|
| ✅ | Tem em dado aberto (API, CSV, JSON) e foi testado |
| 🟡 | Tem em parte: só em página ou PDF, dado antigo ou incompleto |
| ❌ | Não achamos em dado aberto no site da casa |
| ❔ | Não deu para verificar (site fora do ar ou bloqueou a leitura) |
| — | Não se aplica |

"❌" é "não achamos", não "não existe". No site, a frase é: "A Assembleia X não publica isto em
formato aberto (conferido em 23/10/2026)".

## Por cargo

| Cargo | Ficha do candidato (TSE) | Mandato |
|---|---|---|
| Presidente | ✅ | Executivo, não vota. Agenda (e-Agendas, CGU), Diário Oficial da União, gastos do governo |
| Senador | ✅ | ✅ votos, presença (com o motivo da ausência), projetos, discursos, gastos (CEAPS), emendas |
| Deputado federal | ✅ | ✅ votos, presença por sessão, projetos, discursos, gastos (cota), emendas |
| Governador | ✅ | Executivo, não vota. Proposta de governo (PDF), contas do estado |
| Deputado estadual / distrital | ✅ | Depende da Assembleia (tabela abaixo) |
| Prefeito | ✅ | Executivo, não vota. Proposta de governo (PDF), Diário Oficial (Querido Diário, ~955 cidades) |
| Vereador | ✅ | Depende da câmara (capitais abaixo; interior pelo SAPL) |

A ficha do TSE vale para **todos os candidatos de todos os cargos**, em todo o país: número, partido,
bens, doações recebidas, gastos de campanha, votos por zona e, no executivo, a proposta de governo.

## Assembleias Legislativas (27)

| UF | Casa | Acesso | Votos | Presença | Projetos | Gastos | Observação |
|---|---|---|---|---|---|---|---|
| AC | ALEAC | SAPL (API) | ✅ | ✅ | ✅ | ❌ | `sapl.al.ac.leg.br`. Verba só com a regulamentação |
| AL | ALE-AL | SAPL (API) | 🟡 | ❌ | ✅ | ❌ | Votos só de 2015 a 2018; presença vazia |
| AP | ALAP | ❔ | ❔ | ❔ | ❔ | ❔ | Site fora do ar no dia |
| AM | ALEAM | SAPL (API) | 🟡 | ❔ | ✅ | 🟡 | 133 mil votos, amostra de 2018: falta ver se está em dia. Cota só em página |
| BA | ALBA | API (NoPaper, não testada) | ❌ | 🟡 | 🟡 | ✅ | Verba por deputado com exportação para Excel |
| CE | ALECE | API própria (20 por pedido) | 🟡 | ❌ | ❔ | ✅ | Votações nominais em PDF/XLSX por matéria; verba de desempenho em CSV |
| DF | CLDF | Portal CKAN (`dados.cl.df.gov.br`) | 🟡 | ❌ | 🟡 | ✅ | Painel de votação em página |
| ES | ALES | API + planilhas | ❌ | 🟡 | ❔ | ✅ | Presença: só a lista de ausentes por mês |
| GO | ALEGO | nada encontrado | ❌ | ❌ | ❌ | ❔ | Portal de transparência só mostrou o aviso de cookies |
| MA | ALEMA | página e PDF | 🟡 | 🟡 | ❔ | 🟡 | Diz que a API "ainda não é atendida"; SAPL em `:8080` não abriu |
| MT | ALMT | API bloqueada (403) | ❌ | ❌ | 🟡 | ❌ | Nominal só em PEC; projetos em página com filtro por autor |
| MS | ALEMS | CSV de gastos | ❌ | ❌ | ❔ | ✅ | CEAP em CSV desde 2012 |
| MG | ALMG | API v2 + CSV | ❔ | ❔ | ✅ | ✅ | Máx. 2 pedidos simultâneos, 1 por segundo. Swagger não aberto |
| PA | ALEPA | página e PDF | 🟡 | ❌ | ❌ | ❔ | Votações nominais em DOC/PDF |
| PB | ALPB | SAPL (API) | ✅ | ✅ | ✅ | 🟡 | Tem registros de teste de 2018 misturados |
| PR | ALEP | API própria | 🟡 | 🟡 | ✅ | ❔ | Projetos filtram por autor e tipo (inclui indicação) |
| PE | ALEPE | API (só cadastro) | ❌ | ❌ | ❔ | ❌ | |
| PI | ALEPI | SAPL (API) | ✅ | ✅ | ✅ | ✅ | A mais completa das estaduais. Verba em CSV |
| RJ | ALERJ | só página e PDF | ❌ | ❔ | ❌ | ❌ | Lista de presença em sistema externo, não aberto |
| RN | ALRN | página | ❔ | ❔ | ❔ | 🟡 | Sem SAPL |
| RS | ALRS | portal de dados fora do ar | 🟡 | ❔ | 🟡 | ❔ | Pela busca: arquivos de votação de 2010 a 2022 |
| RO | ALERO | SAPL (API) | ✅ | ✅ | ✅ | ❌ | |
| RR | ALE-RR | SAPL (API) | ❌ | 🟡 | ✅ | ❔ | Votos vazios; só 24 presenças |
| SC | ALESC | CSV + página | ❌ | 🟡 | ❔ | ✅ | Presença por sessão separa "ausência justificada"; gastos em CSV desde 2011 |
| SP | ALESP | API + XML | ❌ | ✅ | 🟡 | ✅ | Votos só de comissões. Vai migrar para CKAN |
| SE | ALESE | página antiga | ❌ | ❌ | 🟡 | ❌ | |
| TO | ALETO | SAPL (API) | ❌ | ❔ | ✅ | 🟡 | Votos vazios |

## Câmaras municipais das capitais

| UF | Cidade | Acesso | Votos | Presença | Projetos | Observação |
|---|---|---|---|---|---|---|
| AC | Rio Branco | SAPL | ✅ | ✅ | ✅ | 41 mil votos |
| AL | Maceió | página | ❔ | 🟡 | 🟡 | |
| AP | Macapá | ❔ | ❔ | ❔ | ❔ | Página vazia na leitura |
| AM | Manaus | SAPL (`sapl.cmm.am.gov.br`) | ❔ | ❔ | ❔ | Só a lista de vereadores foi testada |
| BA | Salvador | página | ❔ | 🟡 | 🟡 | |
| CE | Fortaleza | ❔ | ❔ | ❔ | ❔ | Página vazia na leitura |
| DF | — | — | — | — | — | O DF não tem prefeito nem vereador |
| ES | Vitória | ❔ | ❔ | ❔ | ❔ | Bloqueou (403) |
| GO | Goiânia | página | ❔ | ❔ | ❔ | SAPL respondeu 503 |
| MA | São Luís | ❔ | ❔ | ❔ | ❔ | DNS falhou |
| MT | Cuiabá | página (NoPaper) | ❔ | 🟡 | 🟡 | |
| MS | Campo Grande | ❔ | ❔ | ❔ | ❔ | Bloqueou (verificação de robô) |
| MG | Belo Horizonte | página | ❌ | 🟡 | ❔ | Presença mensal desde 2009 |
| PA | Belém | página | ❔ | ❔ | 🟡 | Formulário por proponente |
| PB | João Pessoa | SAPL | ✅ | ✅ | ✅ | 204 mil matérias |
| PR | Curitiba | ❔ | ❔ | ❔ | ❔ | Bloqueou (403) |
| PE | Recife | dados abertos (Plone) | ❌ | 🟡 | 🟡 | Vereadores, proposições e sessões listados |
| PI | Teresina | página | ❔ | ❔ | ❔ | |
| RJ | Rio de Janeiro | ❔ | ❔ | ❔ | ❔ | Erro de certificado |
| RN | Natal | SAPL | 🟡 | ✅ | ✅ | Só 617 votos registrados |
| RS | Porto Alegre | página | 🟡 | ❌ | ❔ | 9.925 votações em página, nominais marcadas |
| RO | Porto Velho | SAPL | ✅ | ✅ | ✅ | 79 mil votos |
| RR | Boa Vista | SAPL | ❌ | ✅ | ✅ | Votos vazios |
| SC | Florianópolis | ❔ | ❔ | ❔ | ❔ | Bloqueou (verificação de robô) |
| SP | São Paulo | webservice próprio | ❌ | ❌ | ✅ | Projetos com autores e subscritores |
| SE | Aracaju | JSON anunciado | 🟡 | 🟡 | 🟡 | Endpoints JSON não abertos |
| TO | Palmas | SAPL | ❔ | ❔ | ❔ | Endpoints existem; dados não conferidos |

## Interior: o SAPL

O SAPL é o sistema gratuito do Interlegis (Senado) para câmaras e assembleias. A API é a mesma em
todas, aberta e sem login, no endereço `sapl.<cidade>.<uf>.leg.br/api/`. O diretório do Interlegis
(`www12.senado.leg.br/interlegis/orgaosatendidos?uf=XX&servico=SAPL`) tinha estes cadastros por UF:

| UF | SAPL | UF | SAPL | UF | SAPL |
|---|---|---|---|---|---|
| MG | 697 | PE | 149 | AL | 54 |
| RS | 483 | RN | 105 | RO | 54 |
| PR | 389 | ES | 102 | MS | 33 |
| SP | 186 | BA | 91 | AC | 29 |
| GO | 172 | AM | 63 | SE | 22 |
| PI | 165 | SC | 64 | RR | 18 |
| MT | 160 | RJ | 60 | DF | 1 |
| TO | 133 | CE | 56 | PB | não respondeu |
| AP | 45 | MA | 42 | PA | 42 |

Soma: cerca de 3.400. Cadastro não é uso: há casas com o SAPL "nunca usado", e há instâncias com
zero votos ou dados velhos. O coletor precisa medir cada uma (último voto, última presença,
última matéria) antes de mostrar.

## Executivo (presidente, governador, prefeito)

- **Proposta de governo**: TSE, em PDF por UF (não é dado estruturado).
- **Diário Oficial municipal**: Querido Diário, API aberta. Das 5.570 cidades, 955 têm diários
  (510 no nível mais completo).
- **Agenda**: e-Agendas (CGU), só Executivo federal, API com token.
- **Contas de estados e municípios**: Tesouro (Siconfi). Não testado.
