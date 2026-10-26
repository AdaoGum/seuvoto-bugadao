# Seu Voto — instruções para IAs

Sistema de fichas de políticos de todos os cargos e estados (Worker + D1 + coletor + site Vue).
Leia o `README.md` (arquitetura, como rodar, o que falta) e, conforme a tarefa, `docs/fontes.md`
(como cada API se comporta) ou `docs/cobertura.md` (o que cada casa publica). Regras gerais: `../CLAUDE.md`.

## Regras deste projeto

1. **pt-BR** em tudo. **Commit e push são do dono**: deixe staged e entregue a mensagem.
2. **Publicar e criar recurso (D1, DNS, segredo) só com autorização do dono.** Local é à vontade.
3. **Neutralidade**: só dado oficial, sempre com o link da fonte. Nada de nota, ranking, selo de
   "bom/ruim", cor de "bom/ruim" (o voto Sim/Não não é verde/vermelho) ou recomendação de candidato.
   A média da casa aparece só como contexto.
4. **Dizer o que não tem**: todo cargo de todo lugar aparece. "Não publica" (levantamento: não achamos em
   formato aberto), "não registra no sistema" (medido: a casa tem o SAPL mas não lança o dado) e "não
   deu para verificar" são coisas diferentes. Não troque uma pela outra.
5. **Nunca mostrar nem guardar**: CPF (vem na API da Câmara), `ip` e `user` dos votos do SAPL, telefone
   e endereço pessoais.
6. **Falta tem contexto**: no Senado o motivo vem no voto (`comparecimentoSenado`); na Câmara e no SAPL
   "não votou" não é sempre falta. Presença no SAPL só conta as sessões em que a casa lançou alguma lista.
7. **Coletor**: toda tarefa idempotente e retomável (pode parar por `SemOrcamento` no meio). Tarefa
   nova entra em `TAREFAS` (e, se for raiz, em `RAIZES`) no `worker/coletor/fila.ts`. Lista pela metade
   de uma fonte não pode desativar ninguém (veja o limite mínimo em `deputados` e `senadores`).
8. **Educação com as fontes**: Senado até 10 pedidos/s (`INTERVALO` em `worker/util.ts`); Câmara no
   máximo 3 meses por busca de votações; nada de rodar em hora cheia.
9. Mudou o esquema? Migração nova em `migrations/` (nunca edite uma já aplicada).
10. Antes de dizer pronto: `npm test` e `npm run build` (checa os tipos do site e do Worker). Mexeu em
    tela? Rode local e olhe no navegador, no claro e no escuro, e em 390 px de largura.
