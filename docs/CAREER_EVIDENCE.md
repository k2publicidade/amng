# Evidências da carreira

Implementação local em 28/09/2026. As regras de carreira continuam demonstrativas e versionadas; esta consulta não aprova remuneração real nem envia valores externos.

## Integração

- Backend integrado em `server/app.ts`: `registerCareerEvidenceRoutes(app, db, currentUser)` depois da autenticação e antes do fallback da API.
- Interface integrada em `src/pages/WorkspacePages.tsx`, na página de carreira. Assinatura: `<CareerEvidence userId={data.user.id} isDemo={data.mode === 'demo'} initialMonth={data.career.lastClosedMonth ?? undefined} />`.
- Contrato compartilhado: `shared/career-evidence-types.ts`.

## Consulta

`GET /api/career/evidence?month=AAAA-MM&page=1&source=all&eligibility=eligible`

| Parâmetro | Valores |
|---|---|
| `month` | Competência atual ou anterior, UTC; padrão é o mês atual |
| `page` | Inteiro de 1 a 100000; página além do fim retorna a última página |
| `pageSize` | 12 ou 20; padrão 12 |
| `source` | `all`, `own`, `network` |
| `eligibility` | `eligible`, `excluded`, `all`; padrão `eligible` |

Não aceita `userId` ou escopo escolhido pelo cliente. A conta vem da sessão e é revalidada na consulta. A resposta usa `Cache-Control: no-store`.

## Evidência e limites

1. **Competência fechada:** Pulso, Potência, componentes, contratos incluídos, etapa, manutenção e valores apurados são lidos do snapshot imutável de `career_periods`. A lista de inclusão usa IDs/pesos capturados no fechamento. Não é reapurada com o catálogo atual.
2. **Competência em andamento ou sem fechamento:** a consulta chama somente `measureCareer`; mostra a apuração no corte UTC e identifica a remuneração como não processada. Etapa e manutenção são uma prévia baseada no período anterior, sem criar prêmio ou crédito.
3. **Contratos:** próprio titular e descendentes até N7, no mesmo escopo e natureza demo/real. A lista é paginada no servidor e inclui contratos com vigência sobreposta à competência. Exibe plano/máquina/peso, titular permitido, nível, datas e motivo de exclusão da Potência. `eligible` significa vigente no corte da apuração; um contrato expirado no meio do mês pode participar da continuidade ponderada sem compor a Potência ao final.
4. **Privacidade:** não seleciona e-mails, hashes, sessões, MFA ou credenciais. Nomes reais seguem a mesma abreviação já usada na tela da rede. As referências exibidas do contrato e titular usam apenas os últimos oito caracteres. IDs de navegação retornados são opacos e permanecem limitados à própria rede. Vínculos de patrocinador são imutáveis no schema.
5. **Histórico de remuneração:** salário e bônus ficam separados. `career_awards` contém o valor/estado/motivo/versionamento do prêmio; o crédito exibido vem exclusivamente de `ledger_entries` confirmado e vinculado ao prêmio do mesmo titular/escopo/competência. Ausência de prêmio não é convertida em valor fictício. Uma divergência entre valor pago e crédito encontrado recebe explicação de revisão.
6. **Caixa coletivo:** buckets de salário, bônus e reserva são consultados para a competência, com `observedAt` explícito. Representam a posição coletiva observada agora. O fechamento atual não armazena uma fotografia histórica completa desse caixa; a interface informa essa ausência e não apresenta a posição atual como snapshot do fechamento ou saldo individual.
7. **Registros antigos:** se o snapshot não contém `powerContracts`, totais existentes continuam disponíveis e a composição fica indisponível. A lista histórica não é reconstruída silenciosamente a partir dos dados atuais.
8. **Sem movimentação:** o GET não chama fechamento, funding, settlement, `postLedger`, auditoria financeira ou comandos de compra. A transação apenas produz uma leitura consistente.

## Interface

- Português, datas em UTC, competência selecionável e distinção entre apuração registrada, aberta e sem fechamento.
- Potência total/própria/rede, Pulso e seus quatro componentes, continuidade/retenção numérica e contratos por filtro/página.
- Seleção de filtros mantém o resumo do mesmo período visível, enquanto consulta somente a lista correspondente. Resultados antigos nunca aparecem como contratos do filtro novo.
- AbortController cancela no unmount/troca de consulta; botão permite cancelamento explícito. Erro e cancelamento têm nova tentativa.
- Grid adapta para mobile, status textual, filtros com nomes acessíveis, controles por teclado, progressos nomeados, estados anunciados e spinner estático em movimento reduzido.
- As pequenas marcas de moeda usam a paleta oficial das sete máquinas.

## Verificação realizada

Revisão estática dos módulos de carreira/schema, DTO, consulta parametrizada e estados da interface. `npm run check` não apontou falha nos arquivos desta tarefa; naquele momento houve falhas concorrentes de RBAC em `queries.ts` e valores anuláveis em `AdminPage.tsx`. A compilação global deve ser repetida após essas integrações. Nenhum teste automatizado foi criado ou executado nesta tarefa; a observação no navegador cabe à integração final.
