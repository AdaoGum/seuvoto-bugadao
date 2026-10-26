-- Seu Voto · esquema inicial.
-- Ids de casa: 'camara', 'senado', 'al:PI' (Assembleia) e 'cm:2408102' (câmara municipal, pelo IBGE).
-- Ids de político: 'camara:123086', 'senado:739' e '<casa>:<id no SAPL>' (ex.: 'al:PI:42').

-- Cada casa legislativa: o que publica (levantamento ou medição) e a saúde dos dados.
CREATE TABLE casas (
  id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL,              -- 'federal' | 'assembleia' | 'camara'
  nome TEXT NOT NULL,
  sigla TEXT,
  uf TEXT,
  ibge TEXT,                       -- município (só câmara municipal)
  acesso TEXT,                     -- como publica, em poucas palavras
  sapl TEXT,                       -- base do SAPL (https://sapl.x.uf.leg.br), se tiver
  url TEXT,                        -- onde ver na fonte
  votos TEXT, presenca TEXT, projetos TEXT, gastos TEXT, -- 'sim' | 'parcial' | 'nao' | 'naosei'
  nota TEXT,
  verificado_em TEXT,              -- quando o levantamento ou a medição foi feito
  origem TEXT NOT NULL,            -- 'levantamento' | 'interlegis' | 'medido'
  saude TEXT,                      -- JSON da última medição
  procurada_em TEXT,               -- última vez que alguém abriu (coleta sob demanda)
  coletada_em TEXT
);
CREATE INDEX casas_uf ON casas(uf, tipo);
CREATE INDEX casas_ibge ON casas(ibge);

-- As 5.570 cidades (do Querido Diário, com a cobertura do Diário Oficial).
CREATE TABLE municipios (
  ibge TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  uf TEXT NOT NULL,
  busca TEXT NOT NULL,             -- nome sem acento e em minúsculas, para a busca
  diario_nivel TEXT,
  diario_desde TEXT
);
CREATE INDEX municipios_uf ON municipios(uf, busca);
CREATE INDEX municipios_busca ON municipios(busca);

CREATE TABLE politicos (
  id TEXT PRIMARY KEY,
  casa_id TEXT NOT NULL,
  cargo TEXT NOT NULL,             -- 'senador' | 'depfed' | 'depest' | 'vereador'
  nome TEXT NOT NULL,
  busca TEXT NOT NULL,
  partido TEXT,
  uf TEXT,
  foto TEXT,
  pagina TEXT,                     -- página oficial
  situacao TEXT,                   -- 'titular' | 'suplente'
  desde TEXT,                      -- início do mandato atual (AAAA-MM-DD)
  ativo INTEGER NOT NULL DEFAULT 1,
  resumo TEXT,                     -- JSON: projetos, gastos e, no SAPL, presença e votos
  resumo_em TEXT,
  atualizado_em TEXT NOT NULL
);
CREATE INDEX politicos_casa ON politicos(casa_id, ativo);
CREATE INDEX politicos_uf ON politicos(uf, cargo, ativo);
CREATE INDEX politicos_busca ON politicos(busca);

-- Sessões de plenário (Câmara: deliberativas; SAPL: ordinárias da legislatura) e quem esteve.
CREATE TABLE sessoes (
  id TEXT PRIMARY KEY,             -- '<casa>:<id na fonte>'
  casa_id TEXT NOT NULL,
  data TEXT NOT NULL,
  tipo TEXT
);
CREATE INDEX sessoes_casa_data ON sessoes(casa_id, data);
CREATE TABLE presencas (
  sessao_id TEXT NOT NULL,
  politico_id TEXT NOT NULL,
  PRIMARY KEY (sessao_id, politico_id)
) WITHOUT ROWID;
CREATE INDEX presencas_politico ON presencas(politico_id);

-- Votações federais e o voto de cada um. nominal = 0 marca votação simbólica (já conferida).
CREATE TABLE votacoes (
  id TEXT PRIMARY KEY,             -- 'camara:2236186-60', 'senado:7431'
  casa_id TEXT NOT NULL,
  data TEXT NOT NULL,
  titulo TEXT,
  descricao TEXT,
  nominal INTEGER NOT NULL DEFAULT 1,
  url TEXT
);
CREATE INDEX votacoes_casa_data ON votacoes(casa_id, data);
CREATE TABLE votos (
  votacao_id TEXT NOT NULL,
  politico_id TEXT NOT NULL,
  voto TEXT NOT NULL,
  PRIMARY KEY (votacao_id, politico_id)
) WITHOUT ROWID;
CREATE INDEX votos_politico ON votos(politico_id);

-- Fila do coletor: cada tarefa é idempotente e volta para a fila com a próxima data.
CREATE TABLE tarefas (
  id TEXT PRIMARY KEY,             -- 'camara:deputados', 'sapl:casa:al:PI', 'interlegis:TO:3'…
  prioridade INTEGER NOT NULL DEFAULT 5, -- menor = antes
  proxima_em TEXT NOT NULL,
  tentativas INTEGER NOT NULL DEFAULT 0,
  ultimo_erro TEXT,
  feita_em TEXT
);
CREATE INDEX tarefas_fila ON tarefas(proxima_em, prioridade);

CREATE TABLE execucoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inicio TEXT NOT NULL,
  fim TEXT,
  feitas INTEGER,
  erros INTEGER,
  pedidos INTEGER
);
