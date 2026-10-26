// Levantamento de 23/10/2026 (docs/cobertura.md): o que cada casa publica em formato aberto.
// O coletor semeia a tabela casas com isto; as casas com SAPL depois são medidas de verdade.

export type Status = 'sim' | 'parcial' | 'nao' | 'naosei' | 'na'
export const DATA_LEVANTAMENTO = '2026-10-23'

export const ROTULO: Record<Status, string> = {
  sim: 'Tem', parcial: 'Em parte', nao: 'Não publica', naosei: 'Não deu para verificar', na: 'Não se aplica',
}

export interface Uf { uf: string; nome: string; capital: string; ibge: string }
export const UFS: Uf[] = [
  ['AC', 'Acre', 'Rio Branco', '1200401'], ['AL', 'Alagoas', 'Maceió', '2704302'], ['AP', 'Amapá', 'Macapá', '1600303'],
  ['AM', 'Amazonas', 'Manaus', '1302603'], ['BA', 'Bahia', 'Salvador', '2927408'], ['CE', 'Ceará', 'Fortaleza', '2304400'],
  ['DF', 'Distrito Federal', 'Brasília', '5300108'], ['ES', 'Espírito Santo', 'Vitória', '3205309'], ['GO', 'Goiás', 'Goiânia', '5208707'],
  ['MA', 'Maranhão', 'São Luís', '2111300'], ['MT', 'Mato Grosso', 'Cuiabá', '5103403'], ['MS', 'Mato Grosso do Sul', 'Campo Grande', '5002704'],
  ['MG', 'Minas Gerais', 'Belo Horizonte', '3106200'], ['PA', 'Pará', 'Belém', '1501402'], ['PB', 'Paraíba', 'João Pessoa', '2507507'],
  ['PR', 'Paraná', 'Curitiba', '4106902'], ['PE', 'Pernambuco', 'Recife', '2611606'], ['PI', 'Piauí', 'Teresina', '2211001'],
  ['RJ', 'Rio de Janeiro', 'Rio de Janeiro', '3304557'], ['RN', 'Rio Grande do Norte', 'Natal', '2408102'], ['RS', 'Rio Grande do Sul', 'Porto Alegre', '4314902'],
  ['RO', 'Rondônia', 'Porto Velho', '1100205'], ['RR', 'Roraima', 'Boa Vista', '1400100'], ['SC', 'Santa Catarina', 'Florianópolis', '4205407'],
  ['SP', 'São Paulo', 'São Paulo', '3550308'], ['SE', 'Sergipe', 'Aracaju', '2800308'], ['TO', 'Tocantins', 'Palmas', '1721000'],
].map(([uf, nome, capital, ibge]) => ({ uf, nome, capital, ibge }))
export const ufDe = (uf: string) => UFS.find((u) => u.uf === uf)

export interface Levantada {
  sigla?: string
  acesso: string
  votos: Status; presenca: Status; projetos: Status; gastos?: Status
  nota: string
  url: string
  sapl?: string
}
const L = (sigla: string | undefined, acesso: string, votos: Status, presenca: Status, projetos: Status, gastos: Status | undefined, nota: string, url: string, sapl?: string): Levantada =>
  ({ sigla, acesso, votos, presenca, projetos, gastos, nota, url, sapl })

export const FEDERAL: Record<'camara' | 'senado', Levantada & { nome: string }> = {
  camara: { nome: 'Câmara dos Deputados', ...L('Câmara', 'API aberta', 'sim', 'sim', 'sim', 'sim', 'Presença por sessão deliberativa do Plenário; a falta justificada não vem separada.', 'https://dadosabertos.camara.leg.br/') },
  senado: { nome: 'Senado Federal', ...L('Senado', 'API aberta', 'sim', 'sim', 'sim', 'sim', 'Cada ausência vem com o motivo: licença, missão oficial, atividade parlamentar ou falta.', 'https://legis.senado.leg.br/dadosabertos/docs/') },
}

export const ASSEMBLEIAS: Record<string, Levantada> = {
  AC: L('ALEAC', 'SAPL (API aberta)', 'sim', 'sim', 'sim', 'nao', 'Verba indenizatória só com a regulamentação, sem os valores por deputado.', 'https://sapl.al.ac.leg.br/', 'https://sapl.al.ac.leg.br'),
  AL: L('ALE-AL', 'SAPL (API aberta)', 'parcial', 'nao', 'sim', 'nao', 'Os votos no sistema são de 2015 a 2018; a presença está vazia.', 'https://sapl.al.al.leg.br/', 'https://sapl.al.al.leg.br'),
  AP: L('ALAP', 'site fora do ar', 'naosei', 'naosei', 'naosei', 'naosei', 'O site da Assembleia não respondeu no dia da verificação.', 'https://www.al.ap.leg.br'),
  AM: L('ALEAM', 'SAPL (API aberta)', 'parcial', 'naosei', 'sim', 'parcial', 'Há 133 mil votos no sistema, mas a amostra era de 2018. A cota só aparece em página.', 'https://sapl.al.am.leg.br/', 'https://sapl.al.am.leg.br'),
  BA: L('ALBA', 'API (NoPaper, não testada)', 'nao', 'parcial', 'parcial', 'sim', 'Verba indenizatória por deputado, com exportação para Excel. Frequência só por link externo.', 'https://www.al.ba.gov.br/transparencia/verbas-idenizatorias'),
  CE: L('ALECE', 'API própria', 'parcial', 'nao', 'naosei', 'sim', 'Votações nominais em PDF/XLSX por matéria. Verba de desempenho parlamentar em CSV.', 'https://transparencia.al.ce.gov.br/api'),
  DF: L('CLDF', 'portal de dados (CKAN)', 'parcial', 'nao', 'parcial', 'sim', 'Painel de votação e resultados legislativos só em página.', 'https://dados.cl.df.gov.br/'),
  ES: L('ALES', 'API e planilhas', 'nao', 'parcial', 'naosei', 'sim', 'A frequência publicada é só a lista de ausentes por mês.', 'https://www.al.es.gov.br/Transparencia/DadosAbertos'),
  GO: L('ALEGO', 'nada encontrado', 'nao', 'nao', 'nao', 'naosei', 'O portal não tem área de dados abertos nem API.', 'https://portal.al.go.leg.br/'),
  MA: L('ALEMA', 'página e PDF', 'parcial', 'parcial', 'naosei', 'parcial', 'A própria página diz que a API "ainda não é atendida". O SAPL da casa não abriu.', 'https://sistemas.al.ma.leg.br/transparencia/index.html'),
  MT: L('ALMT', 'API bloqueada', 'nao', 'nao', 'parcial', 'nao', 'Votação nominal só em PEC. Projetos em página, com filtro por autor.', 'https://www.al.mt.gov.br/proposicao'),
  MS: L('ALEMS', 'CSV de gastos', 'nao', 'nao', 'naosei', 'sim', 'Cota parlamentar (CEAP) em CSV desde 2012.', 'https://transparencia2.al.ms.gov.br/ceap'),
  MG: L('ALMG', 'API e CSV', 'naosei', 'naosei', 'sim', 'sim', 'Projetos com autores e verbas indenizatórias em CSV. Votos e presença: falta conferir.', 'https://dadosabertos.almg.gov.br/'),
  PA: L('ALEPA', 'página e PDF', 'parcial', 'nao', 'nao', 'naosei', 'Votações nominais em DOC/PDF. A página de proposições deu erro.', 'https://www.alepa.pa.gov.br/Home/Page/VotacoesNominais'),
  PB: L('ALPB', 'SAPL (API aberta)', 'sim', 'sim', 'sim', 'parcial', 'Há registros de teste de 2018 misturados aos reais.', 'https://sapl.al.pb.leg.br/', 'https://sapl.al.pb.leg.br'),
  PR: L('ALEP', 'API própria', 'parcial', 'parcial', 'sim', 'naosei', 'Projetos por autor e tipo na API; votos e presença só em página.', 'https://transparencia.assembleia.pr.leg.br/servicos/dados-abertos'),
  PE: L('ALEPE', 'API (só cadastro)', 'nao', 'nao', 'naosei', 'nao', 'A API tem só o cadastro dos parlamentares.', 'https://dadosabertos.alepe.pe.gov.br/'),
  PI: L('ALEPI', 'SAPL (API aberta)', 'sim', 'sim', 'sim', 'sim', 'A mais completa das Assembleias. Verba indenizatória em CSV.', 'https://sapl.al.pi.leg.br/', 'https://sapl.al.pi.leg.br'),
  RJ: L('ALERJ', 'só página e PDF', 'nao', 'naosei', 'nao', 'nao', 'A lista de presença fica num sistema externo, que não abriu.', 'https://transparencia.alerj.rj.gov.br'),
  RN: L('ALRN', 'página', 'naosei', 'naosei', 'naosei', 'parcial', 'Sem SAPL e sem API.', 'https://transparencia.al.rn.leg.br/'),
  RS: L('ALRS', 'portal de dados fora do ar', 'parcial', 'naosei', 'parcial', 'naosei', 'Pela busca, há arquivos de votação de 2010 a 2022, mas o portal de dados não abriu.', 'https://ww4.al.rs.gov.br'),
  RO: L('ALERO', 'SAPL (API aberta)', 'sim', 'sim', 'sim', 'nao', 'Gastos por deputado não aparecem na transparência.', 'https://sapl.al.ro.leg.br/', 'https://sapl.al.ro.leg.br'),
  RR: L('ALE-RR', 'SAPL (API aberta)', 'nao', 'parcial', 'sim', 'naosei', 'O sistema não tem votos registrados e quase nenhuma presença.', 'https://sapl.al.rr.leg.br/', 'https://sapl.al.rr.leg.br'),
  SC: L('ALESC', 'CSV e página', 'nao', 'parcial', 'naosei', 'sim', 'Presença por sessão em página, separando ausência justificada. Gastos em CSV desde 2011.', 'https://transparencia.alesc.sc.gov.br/legislativo'),
  SP: L('ALESP', 'API e XML', 'nao', 'sim', 'parcial', 'sim', 'Votos só das comissões, não do plenário.', 'https://www.al.sp.gov.br/dados-abertos/'),
  SE: L('ALESE', 'página antiga', 'nao', 'nao', 'parcial', 'nao', 'Proposições por autor só em página.', 'https://aleselegis.al.se.leg.br/spl/parlamentares.aspx'),
  TO: L('ALETO', 'SAPL (API aberta)', 'nao', 'naosei', 'sim', 'parcial', 'O sistema não tem votos registrados.', 'https://sapl.al.to.leg.br/', 'https://sapl.al.to.leg.br'),
}

// Câmaras das capitais, pela UF (o DF não tem). Gastos de câmara municipal não foram levantados.
export const CAMARAS_CAPITAIS: Record<string, Levantada> = {
  AC: L(undefined, 'SAPL (API aberta)', 'sim', 'sim', 'sim', undefined, '41 mil votos registrados.', 'https://sapl.riobranco.ac.leg.br/', 'https://sapl.riobranco.ac.leg.br'),
  AL: L(undefined, 'página', 'naosei', 'parcial', 'parcial', undefined, 'Frequência e tramitação só em página.', 'https://www.maceio.al.leg.br'),
  AP: L(undefined, 'não abriu', 'naosei', 'naosei', 'naosei', undefined, 'A página veio vazia na verificação.', 'https://www.macapa.ap.leg.br'),
  AM: L(undefined, 'SAPL (API aberta)', 'naosei', 'naosei', 'naosei', undefined, 'Só a lista de vereadores tinha sido conferida.', 'https://sapl.cmm.am.gov.br/', 'https://sapl.cmm.am.gov.br'),
  BA: L(undefined, 'página', 'naosei', 'parcial', 'parcial', undefined, 'Frequência e produção legislativa em sistema próprio, só em página.', 'https://www.cms.ba.gov.br'),
  CE: L(undefined, 'não abriu', 'naosei', 'naosei', 'naosei', undefined, 'A página veio vazia na verificação.', 'https://www.cmfor.ce.gov.br'),
  ES: L(undefined, 'bloqueou a leitura', 'naosei', 'naosei', 'naosei', undefined, 'O site recusou o acesso automático.', 'https://www.cmv.es.gov.br'),
  GO: L(undefined, 'página', 'naosei', 'naosei', 'naosei', undefined, 'O SAPL da câmara respondeu com erro.', 'https://www.goiania.go.leg.br'),
  MA: L(undefined, 'não abriu', 'naosei', 'naosei', 'naosei', undefined, 'O endereço não respondeu.', 'https://www.saoluis.ma.leg.br'),
  MT: L(undefined, 'página (NoPaper)', 'naosei', 'parcial', 'parcial', undefined, 'Ficha de presença e proposições em sistema próprio, só em página.', 'https://legislativo.camaracuiaba.mt.gov.br'),
  MS: L(undefined, 'bloqueou a leitura', 'naosei', 'naosei', 'naosei', undefined, 'O site pede verificação de robô.', 'https://www.camara.ms.gov.br'),
  MG: L(undefined, 'página', 'nao', 'parcial', 'naosei', undefined, 'Presença mensal por vereador desde 2009, só em página.', 'https://www.cmbh.mg.gov.br/transparencia/vereadores/presenca-mensal-consolidada'),
  PA: L(undefined, 'página', 'naosei', 'naosei', 'parcial', undefined, 'Busca de proposições por proponente, só em página.', 'https://www.cmb.pa.gov.br'),
  PB: L(undefined, 'SAPL (API aberta)', 'sim', 'sim', 'sim', undefined, '204 mil matérias no sistema.', 'https://sapl.joaopessoa.pb.leg.br/', 'https://sapl.joaopessoa.pb.leg.br'),
  PR: L(undefined, 'bloqueou a leitura', 'naosei', 'naosei', 'naosei', undefined, 'O site recusou o acesso automático.', 'https://www.cmc.pr.gov.br'),
  PE: L(undefined, 'dados abertos (Plone)', 'nao', 'parcial', 'parcial', undefined, 'Vereadores, proposições e sessões nos dados abertos; frequência só em página.', 'https://transparencia.recife.pe.leg.br/institucional/dados-abertos'),
  PI: L(undefined, 'página', 'naosei', 'naosei', 'naosei', undefined, 'Produção legislativa em sistema de terceiros.', 'https://www.teresina.pi.leg.br'),
  RJ: L(undefined, 'não abriu', 'naosei', 'naosei', 'naosei', undefined, 'O site deu erro de certificado.', 'https://www.camara.rio'),
  RN: L(undefined, 'SAPL (API aberta)', 'parcial', 'sim', 'sim', undefined, 'Poucos votos registrados no sistema.', 'https://sapl.natal.rn.leg.br/', 'https://sapl.natal.rn.leg.br'),
  RS: L(undefined, 'página', 'parcial', 'nao', 'naosei', undefined, 'Cerca de 9.900 votações em página, com as nominais marcadas.', 'https://votacoes.camarapoa.rs.gov.br'),
  RO: L(undefined, 'SAPL (API aberta)', 'sim', 'sim', 'sim', undefined, '79 mil votos registrados.', 'https://sapl.portovelho.ro.leg.br/', 'https://sapl.portovelho.ro.leg.br'),
  RR: L(undefined, 'SAPL (API aberta)', 'nao', 'sim', 'sim', undefined, 'O sistema não tem votos registrados.', 'https://sapl.boavista.rr.leg.br/', 'https://sapl.boavista.rr.leg.br'),
  SC: L(undefined, 'bloqueou a leitura', 'naosei', 'naosei', 'naosei', undefined, 'O site pede verificação de robô.', 'https://www.cmf.sc.gov.br'),
  SP: L(undefined, 'webservice próprio', 'nao', 'nao', 'sim', undefined, 'Projetos com autores; votos e presença não estão no webservice.', 'https://www.saopaulo.sp.leg.br/transparencia/dados-abertos/'),
  SE: L(undefined, 'JSON anunciado', 'parcial', 'parcial', 'parcial', undefined, 'Votação nominal e presença em página; o JSON anunciado não foi conferido.', 'https://www.aracaju.se.leg.br/transparencia/dados-abertos'),
  TO: L(undefined, 'SAPL (API aberta)', 'naosei', 'naosei', 'naosei', undefined, 'Os endereços existem; os dados não tinham sido conferidos.', 'https://sapl.palmas.to.leg.br/', 'https://sapl.palmas.to.leg.br'),
}
