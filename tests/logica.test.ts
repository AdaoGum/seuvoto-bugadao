import { describe, expect, it } from 'vitest'
import {
  baseSapl, categoria, comparecimentoSenado, explicacao, janelas, lerInterlegis, maisRecente, municipioDaCamara, normalizar, rotuloVoto, slug,
  somarGastos, statusDosResumos, statusMedido, tipoSenado,
} from '../shared/logica'
import { ASSEMBLEIAS, CAMARAS_CAPITAIS, UFS } from '../shared/cobertura'

describe('nomes', () => {
  it('normaliza para busca', () => {
    expect(normalizar('  São João d’Aliança ')).toBe('sao joao d aliança'.normalize('NFD').replace(/[̀-ͯ]/g, ''))
    expect(normalizar('JOÃO PESSOA')).toBe('joao pessoa')
  })
  it('monta o endereço do SAPL como o Interlegis', () => {
    expect(slug('Foz do Iguaçu')).toBe('fozdoiguacu')
    expect(slug("Alta Floresta D'Oeste")).toBe('altaflorestadoeste')
  })
  it('tira o município do nome da câmara', () => {
    expect(municipioDaCamara('Câmara Municipal de Abreulândia')).toBe('Abreulândia')
    expect(municipioDaCamara('Câmara Municipal do Crato')).toBe('Crato')
    expect(municipioDaCamara('Câmara de Vereadores de Santos')).toBe('Santos')
  })
  it('acha a base do SAPL', () => {
    expect(baseSapl('http://sapl.natal.rn.leg.br/sessao/')).toBe('https://sapl.natal.rn.leg.br')
    expect(baseSapl('https://www.natal.rn.leg.br/')).toBeNull()
    expect(baseSapl('não é url')).toBeNull()
  })
})

describe('Senado: comparecimento pelo código do voto', () => {
  it('separa votou, presente, justificada e falta', () => {
    expect(comparecimentoSenado('Sim')).toBe('votou')
    expect(comparecimentoSenado('Votou')).toBe('votou')
    expect(comparecimentoSenado('P-NRV')).toBe('presente')
    expect(comparecimentoSenado('Presidente (art. 51 RISF)')).toBe('presente')
    expect(comparecimentoSenado('MIS')).toBe('justificada')
    expect(comparecimentoSenado('LAP')).toBe('justificada')
    expect(comparecimentoSenado('AP')).toBe('justificada')
    expect(comparecimentoSenado('NCom')).toBe('falta')
    expect(comparecimentoSenado('XYZ')).toBe('outro')
  })
  it('tem rótulo legível', () => {
    expect(rotuloVoto('P-NRV')).toBe('Presente, não votou')
    expect(rotuloVoto('LSAU')).toBe('De licença')
    expect(rotuloVoto('Sim')).toBe('Sim')
  })
  it('agrupa os tipos de proposição', () => {
    expect(tipoSenado('PL 90/2023')).toBe('Projetos de lei')
    expect(tipoSenado('RQS 41/2023')).toBe('Requerimentos')
    expect(tipoSenado('R.S 3/2024')).toBe('Outros')
  })
})

describe('glossário', () => {
  it('explica os nomes de cada casa', () => {
    expect(explicacao('Requerimento')).toMatch(/Pedido formal/)
    expect(explicacao('Projeto de Lei Ordinária')).toMatch(/lei nova/)
    expect(explicacao('Projeto de Lei Complementar')).toMatch(/regulamenta/)
    expect(explicacao('Indicativo de Projeto de Lei')).toMatch(/Executivo/)
    expect(explicacao('Emenda Supressiva')).toMatch(/mudança no texto/)
    expect(explicacao('Proposta de Emenda à Constituição')).toMatch(/Constituição/)
    expect(explicacao('Veto')).toBeUndefined()
  })
})

describe('medição do SAPL', () => {
  it('voto antigo é "em parte"; sem voto é "não publica"', () => {
    expect(statusMedido({ votos: 10, presencas: 5, materias: 3, sessoesLeg: 2, ultimoVoto: '2018-05-01', inicioLeg: '2023-02-01' }))
      .toEqual({ votos: 'parcial', presenca: 'sim', projetos: 'sim' })
    expect(statusMedido({ votos: 10, presencas: 0, materias: 0, sessoesLeg: 0, ultimoVoto: '2025-03-01', inicioLeg: '2023-02-01' }))
      .toEqual({ votos: 'sim', presenca: 'nao', projetos: 'nao' })
    expect(statusMedido({ votos: 0, presencas: 9, materias: 1, sessoesLeg: 0 }).presenca).toBe('parcial')
  })
  it('status da casa pelos parlamentares coletados', () => {
    expect(statusDosResumos(10, 0, 6, 3)).toEqual({ votos: 'nao', presenca: 'sim', projetos: 'parcial' })
    expect(statusDosResumos(0, 0, 0, 0).votos).toBe('naosei')
  })
})

describe('diretório do Interlegis', () => {
  const bloco = (nome: string, tipo: string, sapl: string) => `<div class="orgao-atendido"><div style="font-weight:bold;margin-bottom:3px;">${nome}</div>
    <div style="margin-bottom:3px;">00.000.000/0001-00 - ${tipo}</div><table><tr> <td>SAPL</td> <td>01/10/2018</td>
    <td><a target="_blank" href="${sapl}">${sapl}</a></td> <td>11/03/2024</td> <td>Funcionando</td> <td>02/10/2023</td> </tr></table></div>`
  it('lê as câmaras com SAPL e a última página', () => {
    const html = `<a href="?p=2&amp;uf=TO">2</a><a href="?p=14&uf=TO">14</a>` +
      bloco('Câmara Municipal de Abreulândia', 'Câmara Municipal', 'https://sapl.abreulandia.to.leg.br/') +
      bloco('Assembleia Legislativa do Tocantins', 'Assembleia Legislativa', 'https://sapl.al.to.leg.br/') +
      bloco('Câmara Municipal de Santa Rita D&#39;Oeste', 'Câmara Municipal', 'http://sapl.santarita.to.leg.br/')
    const r = lerInterlegis(html)
    expect(r.ultimaPagina).toBe(14)
    expect(r.casas).toEqual([
      { nome: 'Câmara Municipal de Abreulândia', municipio: 'Abreulândia', sapl: 'https://sapl.abreulandia.to.leg.br', verificado: '11/03/2024', resultado: 'Funcionando', usado: '02/10/2023' },
      { nome: "Câmara Municipal de Santa Rita D'Oeste", municipio: "Santa Rita D'Oeste", sapl: 'https://sapl.santarita.to.leg.br', verificado: '11/03/2024', resultado: 'Funcionando', usado: '02/10/2023' },
    ])
  })
})

describe('datas', () => {
  it('quebra em janelas de até 85 dias, da mais recente para trás', () => {
    const j = janelas('2026-04-01', new Date('2026-10-22T12:00:00Z'))
    expect(j[0]).toEqual({ ini: '2026-07-29', fim: '2026-10-22' })
    expect(j[1].fim).toBe('2026-07-28')
    expect(j.at(-1)!.ini).toBe('2026-04-01')
    for (const { ini, fim } of j) expect((Date.parse(fim) - Date.parse(ini)) / 864e5).toBeLessThanOrEqual(85)
  })
  it('pega a data mais recente', () => {
    expect(maisRecente('2023-02-01', null, '2024-05-10')).toBe('2024-05-10')
    expect(maisRecente(undefined)).toBe('')
  })
})

describe('gastos', () => {
  it('enxuga o nome da categoria', () => {
    expect(categoria('COMBUSTÍVEIS E LUBRIFICANTES.')).toBe('Combustíveis e lubrificantes')
    expect(categoria('Aquisição de material de consumo para uso no escritório político, inclusive aquisição')).toBe('Aquisição de material de consumo para uso no escritório político')
  })
  it('soma por categoria e junta o resto', () => {
    const g = somarGastos(2026, [
      { categoria: 'A', valor: 10 }, { categoria: 'B', valor: 30 }, { categoria: 'a', valor: 5 }, { categoria: 'C', valor: 1 },
    ], 2)
    expect(g).toEqual({ ano: 2026, total: 46, notas: 4, categorias: [['B', 30], ['A', 15], ['Outras categorias', 1]] })
  })
})

describe('levantamento', () => {
  it('tem as 27 UFs, todas as Assembleias e as 26 capitais', () => {
    expect(UFS).toHaveLength(27)
    for (const u of UFS) {
      expect(ASSEMBLEIAS[u.uf], u.uf).toBeDefined()
      expect(u.ibge).toMatch(/^\d{7}$/)
      if (u.uf !== 'DF') expect(CAMARAS_CAPITAIS[u.uf], u.uf).toBeDefined()
    }
    expect(CAMARAS_CAPITAIS.DF).toBeUndefined()
  })
  it('casa com SAPL tem a base no formato certo', () => {
    for (const l of [...Object.values(ASSEMBLEIAS), ...Object.values(CAMARAS_CAPITAIS)]) if (l.sapl) expect(baseSapl(l.sapl)).toBe(l.sapl)
  })
})
