# AMNG · cobertura do escopo e pendências

Auditoria estática de 28/09/2026 contra `AMNG_PLANO_MESTRE_DO_SISTEMA.md` e código atual. Os PDFs são fontes do domínio; o pedido direto autoriza a implementação. Taxas/limites documentados e propostas não são aprovações para movimentação real. A 2PP ficou para a etapa final por decisão do proprietário.

## Legenda

- **Implementado no código:** há caminho concreto no projeto. Não significa que o comportamento inteiro foi homologado.
- **Demonstração:** caminho executável sob política e escopo explicitamente simulados; conta real continua bloqueada.
- **Parcial / trabalho local:** parte existe, mas falta implementação, integração entre telas ou evidência correspondente.
- **Decisão / configuração externa:** faltam regras, dados operacionais, documentação, credenciais ou aprovação responsável.
- **Verificação pendente:** fonte lida é insuficiente para comprovar o critério de aceite.
- **Futuro:** o próprio plano deixa o programa fora do lançamento atual.

As referências `arquivo:linha` apontam o ponto inspecionado nesta revisão. Alterações posteriores podem deslocar linhas. Para operação, usar também `BACKEND.md`.

## 1. Produto e telas do plano (§3–7)

| Requisito do plano | Estado atual | Evidência concreta / falta |
|---|---|---|
| Nome AMERICAN MINERS / MINING e marca final (§1/§6) | Decisão externa; arte local existente | `Brand.tsx` contém marca vetorial; a divergência de nome continua no plano:18/404. Não há aprovação final registrada |
| UI preta, técnica, premium; desktop e mobile (§6) | Implementado no código; avaliação de qualidade pendente | `src/styles.css`, `src/App.tsx`, referências em `docs/design/`. Observação mobile específica registrada na entrega; não comprova todos os dispositivos |
| Preloader com logo e transições de equipamento | Implementado no código; avaliação visual pendente | `src/components/Preloader.tsx`, `MinerVisual.tsx`, `visuals.css` e sete ativos locais |
| Máquina ligada na cor própria e sequência após resposta (§6/§7D) | Implementação em evolução; verificação pendente | `src/lib/useMinerActivation.ts`, `MinerVisual.tsx`, `IgnitionStatus.tsx`. Confirmar as sete cores, persistência do estado, recusa e movimento reduzido em runtime |
| Paleta por modelo da referência mais recente | Centralizada no código; renderização pendente | `shared/miner-theme.ts:2–10`: SC verde ciano, ETC verde limão, CKB laranja, KDA azul, ALPH ciano, DOGE dourado, BTC branco azulado. Catálogo e DTO usam essa fonte; snapshots financeiros não foram reescritos |
| Visitante, conta nova/ativa, líder e cliente de hosting (§4) | Parcial | Visitante, participante e administrador existem. Hosting não tem contrato/inventário/API; classificação de identidade/território ainda pendente |
| Suporte, mineração, financeiro, produtos, aprovador, mestre (§4) | Decisão externa e trabalho local | `users.role` aceita apenas MEMBER/ADMIN (`server/schema.ts:7`); não há segregação recomendada nem administrador de leitura |
| Página pública do ecossistema (§7A) | Implementado como apresentação / estados | `LandingPage.tsx`; APIs de Host/Pool/OS/Equipment não existem e não devem ser apresentadas como serviços operacionais |
| Cadastro com consentimento e patrocinador identificado (§7A) | Parcial / decisão externa | Registro valida aceite preview e código real (`server/app.ts:160–171`). Não há verificação de identidade, política final de consentimento ou prévia do nome do patrocinador |
| Login, recuperação e autenticação forte (§7A) | Implementado no código; SMTP pendente | `server/app.ts:173–240`, `security.ts`; reset aponta `/recover?token=`. Entrega de e-mail e fluxo completo não comprovados nesta auditoria |
| Dashboard: três carteiras, contratos, ciclos e origens (§7B) | Implementado no código | `queries.ts:44–72`, `DashboardPage.tsx`. Saldos persistidos e Mining Income/Profit Sharing distintos |
| Saldo contábil/livre, pendente, bloqueado, reservado, sacável (§7B/E) | Parcial / política externa | DTO tem `balanceCents`, `reservedCents`, `availableCents` (`shared/types.ts:13–15`); não há todas as subclasses. Sacabilidade real depende da política de saque |
| Sete planos e 130 dias (§7C) | Implementado, taxas documentadas | `catalog.ts:4–12`; SC 25/70bps, ETC 80/74, CKB 160/77, KDA 350/82, ALPH 600/86, DOGE 1.400/89, BTC 3.000/92; duração 130 |
| Capacidade fracionada e hashrate atribuído (§7C/D) | Estado indisponível correto; fonte externa | DTO coloca hashrate nulo/hardware indisponível (`queries.ts:52`); falta atribuição e telemetria operacional |
| Compra revisada, moeda, saldo, cupom, termos e recibo (§7C) | Demonstração | `PlansPage.tsx`; compra cria débito, contrato e benefícios atômicos (`finance.ts:9–37`). Termos e limites reais não aprovados |
| Snapshot imutável e mudanças só para novos contratos (§7C/J) | Implementado no código | Snapshot de compra (`finance.ts:22–26`); triggers (`schema.ts:166–182`); edição de plano cria versão/auditoria (`app.ts:258–261`) |
| Ativação manual de 24h, elegibilidade e duplicidade (§7D) | Demonstração | `finance.ts:79–92` verifica titular, período completo e ciclo existente; UI usa confirmação oficial |
| Produção, acumulado, sessão, últimas 24h, próxima ativação (§7D) | Parcial / demonstração | Ciclo e total estão no DTO; histórico diário em UTC (`queries.ts:65–72`). Isso não substitui produção física nem métrica móvel de últimas 24 horas |
| Cotação com referência, timestamp e estados (§7D) | Implementado no código; observação local registrada | `quotes.ts:22–29`, `39–72`; USDT público, pares ausentes nulos. Não há obrigação de inventar ALPH/KDA se inexistentes |
| Conversão da moeda minerada em saldo (§7E) | Decisão externa; trabalho local dependente | Existe transferência interna demonstrativa 1:1 (`finance.ts:120–128`), não conversão cripto por quote com taxa/base/arredondamento |
| Extrato filtrável e rastreável (§7E) | Parcial | Ledger preserva origem e referência. GET statement agrega/pagina todos os créditos do período por contrato (`queries.ts:17–42`), sem limite do bootstrap. Carteiras e administração ainda dependem de 500/300 entradas; falta histórico geral completo e filtros produto/contrato/moeda |
| Depósitos/saques por 2PP (§7E) | Configuração externa final + implementação do contrato | Fronteira existe; métodos rejeitam (`providers/two-pp.ts:19–21`); webhook 503 (`app.ts:82`). Não há chamada externa implementada |
| Reserva, bruto/taxa/líquido, conciliação (§7E) | Demonstração; política real pendente | Reserva e transições (`finance.ts:107–117`, `158–176`); demo tarifa zero explícita. Moeda/rede, limites, KYC, janelas e taxa reais ainda ausentes |
| Hashrate Market mínimo 25 / 40bps / principal separado (§7F) | Demonstração | `finance.ts:131–154`, `market_positions`/`market_accruals`; políticas/funding/liquidação reais pendentes |
| Cinco ciclos especiais / segundas e quartas (§7F) | Informação e bloqueio implementados | `catalog.ts:27–32`; taxas nulas e `app.ts:250` recusa compra. Calendarização operacional, moeda, capacidade e taxas pendentes |
| Rede em linhas expansíveis / sete níveis (§7G) | Implementado no código | `queries.ts:15–37`, NetworkPage. DTO mascara nomes reais e não envia e-mails/carteiras dos downlines |
| Patrocinador imutável / sem ciclos / sem reatribuição (§7G) | Implementado no código para vínculo existente | Triggers `schema.ts:164–178`; traversal com conjunto seen; cadastro só liga novo usuário a código real. Identidade única por pessoa e política final pendentes |
| Comissões primeira compra/recompra (§7G) | Demonstração, sem compressão | `affiliate.ts:8–32`, snapshot com base/versão; N7 primeira compra nulo, recompra 7 níveis; política real pendente |
| Extrato de comissão por evento, nível, condição, período (§7G) | Parcial | Eventos detalhados existem na tabela, mas NetworkData devolve taxa/total; UI usa entradas gerais. Falta DTO/tela de evento com taxa/base/elegibilidade/snapshot |
| Estorno de comissão / contrato e financiamento (§7G/H) | Parcial / política externa | `reverseDemoCommissions` existe (`affiliate.ts:34–45`), sem rota/fluxo de cancelamento comercial. `career_funding_reversals` tem schema, sem escritor no domínio atual |
| Pulso, Potência, pesos e etapas (§7H) | Demonstração / proposta | `domain.ts:80–88`, `career.ts:58–82`, `catalog.ts:43–48`; retenção segue identidade, não mínimo entre potências |
| Dois fechamentos consecutivos / salário no mês seguinte (§7H) | Demonstração; sequência protegida no código | `career.ts:94–114` usa mês anterior e recusa mês diferente do próximo após último fechamento (`CAREER_MONTH_SEQUENCE`). Recuperação ocorre por fechamentos sequenciais; não há worker de carreira real |
| Manutenção integral / metade / suspenso (§7H) | Domínio e UI demonstrativos; runtime pendente | `careerSalaryProposal`, snapshots/DTO e `WorkspacePages.tsx:315–322/377–382` mostram competência, crédito, estado e manutenção |
| Orçamento 5%, cinco parcelas, salários/bônus/reserva (§7H) | Demonstração | `career.ts:25–49`; parcelas inteiras conservam total. A regra de arredondamento e início de competência reais continuam pendentes |
| Maior bônus do mês / promoção uma vez por etapa (§7H) | Demonstração | `career.ts:120–132`; crédito depende de saldo do bucket. Aprovação e reconciliação de prêmio aguardando funding não estão completas |
| Simulação de caixa, compromissos e janela futura (§7H/J) | Parcial | `career-preview.ts:6–28` e GET admin preview retornam buckets, exposição salarial, déficit e pendências. Falta comprovar UI em runtime e definir financiamento/compromissos de toda janela futura |
| Composição da Potência com rede/expiração (§7H) | Resumo próprio/rede implementado; detalhes parciais | `WorkspacePages.tsx:308–311/359–362` mostra parcela própria/rede e nomeia lista de contratos próprios. Falta DTO de evidências da rede com contratos/expirações e versão do fechamento |
| Histórico separado salário/bônus/comissão (§7H) | Implementado parcialmente | Ledger diferencia kinds; tela de carreira separa folha de comissões. Snapshot mensal não é apresentado integralmente com período/estado/funding |
| Missões informativas (§7H) | Não implementado; recomendação | Não há missão ou crédito adicional. Se incluídas, devem apenas explicar os componentes |
| AMNG Host (§7I) | Decisão/configuração externa | Estado de integração documentado, sem inventário, contrato, SLA, cobrança, manutenção ou API |
| AMNG Pool (§7I) | Decisão/configuração externa | Estado de integração documentado, sem shares/workers/fees/pagamentos/reconciliação reais |
| AMNG OS (§7I) | Decisão/configuração externa | Sem comandos sobre hardware nem autorização/trilha desses comandos |
| Equipment Market (§7I) | Decisão/configuração externa | Sem catálogo comercial/estoque/venda/entrega/garantia; catálogo Cloud não substitui marketplace |
| Creators / Ambassadors (§7I) | Futuro | Sem regra nos anexos; plano:298/485 deixa fora até definição |
| Admin criar/revisar/programar/publicar plano e ciclo (§7J) | Parcial | Edição/versionamento/pausa de planos existente; não há criação, agenda, fluxo de aprovação ou editor de ciclos |
| Profit Sharing por dia, fonte, autor, aprovador e impacto (§7J) | Parcial / demonstração | Registro único de taxa por data e auditoria (`app.ts:276–280`); fonte fixa demo, sem dupla aprovação/preview de impacto/funding real |
| Atualizar telemetria/capacidade com evidência (§7J) | Configuração externa e trabalho local dependente | Nenhuma API de coleta/inventário ou painel de importação de evidência |
| Cupons percentual/fixo, produtos, datas, elegibilidade (§7J) | Parcial | Código/percentual/max usos/expiração existem (`schema.ts:107–114`); falta desconto fixo, seleção de produtos, início, elegibilidade e gestão de estados |
| Black Friday semanal de sexta-feira (§7J) | Trabalho local e decisão de regra | Não há scheduler, campanha, fuso, preview de público ou auditoria de campanha |
| Editar tabela versionada de afiliados/carreira (§7J) | Parcial | Constantes/snapshots de fórmula existem; não há editor, proposta, aprovação e publicação versionada |
| Gerenciar pagamentos, filas e exportação (§7J) | Parcial | Estados/conciliação demonstrativa existem; overview limita pagamentos a 300 (`queries.ts:80`); falta exportação completa/paginação/relatórios operacionais |
| Conteúdo/ativos e revisão de alegações (§7J) | Trabalho local / aprovação externa | Assets no projeto; não há CMS, versionamento/publicação e revisão de conteúdo administrativo |
| MFA/RBAC/auditoria/dupla aprovação (§7J) | Parcial | MFA admin real, autorização MEMBER/ADMIN e audit existem. Fluxo de duas aprovações, justificativa obrigatória e papéis segregados não existem |
| Pausar venda/cálculo/conversão/saque/comissão/campanha (§7J) | Parcial | Plano PAUSED impede compra. Gates reais recusam finanças. Demo contorna flags pendentes; cálculo/affiliate/career não têm interruptores de pausa operacional completos |

## 2. Integridade e arquitetura (§8–9)

| Invariante / artefato | Estado e evidência |
|---|---|
| Centavos e bps | Código: `domain.ts:13–21`; valores inválidos/fração recusados; truncamento é política demo |
| Ledger e origem/destino | Código: `domain.ts:38–57`; diário balanceado, referência e chave de negócio. Sem ensaio externo contábil |
| Append-only e compensação | Triggers `schema.ts:159–182`, agora incluindo market_accruals; estorno de saque/comissão é novo evento. Fluxo comercial/funding de cancelamento continua pendente |
| Carteira não negativa | `postLedger` verifica saldo (`domain.ts:45`) sob transação/lock nos comandos |
| Idempotência de compra/callback/job/folha | Compra/comandos/chaves em `domain.ts:59–70`; ciclos únicos; funding/fechamentos/awards únicos no schema. Callback real não implementado |
| Contratação atômica | `purchase` executado por `db.transaction` (`app.ts:243`); comissão/funding/cupom incluídos no mesmo domínio |
| Snapshot preservado | Compra guarda versão/termos/cálculo; triggers impedem alterações. Catálogo atual não define crédito antigo |
| Concorrência | SQLite mutex inteiro/BEGIN IMMEDIATE (`database.ts:21–67`); PostgreSQL SERIALIZABLE/FOR UPDATE (`96–115`). Execução PostgreSQL não comprovada |
| Recuperar períodos atrasados | `finance.ts:47–73` percorre ciclos já abertos/participação/accruals. Carreira recusa saltos (`career.ts:102–103`) e permite executar competências em sequência; não há worker real |
| Fonte de tempo / timezone | ISO UTC no domínio demonstrativo. Fuso e tolerância financeiros reais pendentes |
| Banco SQL como autoridade | Bootstrap consulta tabelas em transação; front não envia saldo calculado. SQLite é desenvolvimento |
| Workers observáveis/recuperáveis | Comando admin e processamento em bootstrap demo; sem worker de produção, métricas/alertas ou painel de execuções |
| Adaptadores separados | Binance e fronteira 2PP existem. Hardware/pool/telemetria ainda não têm contratos |
| Relatório reproduz regra original | Snapshots e referências persistidos; DTOs/exportações não incluem toda a evidência histórica e são limitados |
| Monólito modular | Domínios separados em server/** e shared/**; não há necessidade demonstrada de dividir serviços |

## 3. Segurança, operação e decisões (§10–11)

| Requisito | Estado / evidência ou responsável |
|---|---|
| Sessões hash/expiração/revogação e password hash | Código em `app.ts:84–124/199–228`, `security.ts:13–23`; mudança/reset consome todos os resets pendentes. Fluxo completo ainda não comprovado nesta auditoria |
| Login sem enumeração / limites | Resposta genérica e comparação de fallback (`app.ts:173–196`), limites (`110–112`). Revisão de timing distribuído não realizada |
| MFA admin / TOTP sem replay / proteção de segredo | Código `app.ts:136–141`, `security.ts:25–49`; MFA de ações demo dispensada; não comprova política integral de produção |
| CSRF, origem, validação, SQL parametrizado, Helmet | Código `app.ts:78–108`, schemas strict, `database.ts` parametrizado. Teste de penetração não realizado |
| Participante não lê outra conta | Consultas por titular e escopo; falta evidência HTTP de todos os recursos/roles |
| Auditoria anterior/novo/motivo/aprovador | Autor/horário/ação e parte do anterior/novo presentes; motivos/aprovações obrigatórios e todos os campos históricos não estão completos |
| KYC/KYB/AML/sanções/fraude | Decisão e fornecedores por jurisdição pendentes; sem implementação |
| Privacidade, consentimentos, retenção, exportação/exclusão | Preview de aceite existe; política final e fluxos de dados pessoais pendentes |
| Logs/monitoramento/alertas/incident response | Logs mínimos estruturados e health check; runbook, métricas de jobs/callbacks/divergências e alertas não implementados |
| Backup/restauração/rollback | Falta automação, procedimentos e ensaio com evidência; não derivar de WAL ou build |
| Termos, custos, riscos e revisão de alegações | Conteúdo diferencia documento/proposta/demo; aprovação jurídica/contábil por mercado não consta |
| Nome/legal/jurisdição/idioma/moeda/fuso | Proprietário e responsáveis de marca/jurídico/financeiro precisam concluir decisões do plano:424–435 |
| Cloud: base/cálculo/ativação/conversão/custos/principal/cancelamento | Decisão externa; demo declara política simples/net price/sem principal definido |
| Profit Sharing: base/distribuição/fonte/funding | Decisão externa; simulação não prova resultado do ecossistema |
| Market: base/composição/funding/retirada | Decisão externa; simulação separa principal e accrual |
| Ciclos: taxa/calendário/estoque/liquidação | Decisão externa; contratação desabilitada |
| 2PP: API, credenciais, confirmação, assinatura e conciliação | Configuração final solicitada; engenharia depende do contrato que será fornecido |
| Affiliate: N7/base/elegibilidade/crédito/compressão/estornos/teto | Decisão externa; regras conhecidas simuladas e desconhecidas não inventadas |
| Carreira: aprovação de pesos/limites/folha/funding/retorno | Decisão externa; fórmula e competência demonstrativas versionadas |
| ALPH 0,86% vs exemplo 0,90% | Catálogo usa 86bps; divergência segue registrada (`catalog.ts:9/16`, plano:439) |
| On-chain/token/conectar carteira | Não se aplica ao escopo atual (plano:417); inspiração Web3 não cria requisito blockchain |

## 4. Critérios de aceite (§12–14)

| Critério / fase | Evidência atual e conclusão |
|---|---|
| Fase 0: decisões, prova física, linguagem e protótipo | Plano e UI existem; aprovações e prova operacional incompletas |
| Fase 1: identidade, infraestrutura, ledger, flags/admin/conteúdo | Base implementada; RBAC, conteúdo, observabilidade, conciliação real e infraestrutura não completos |
| Fase 2: sete planos, contrato, ciclo, quotes, cálculo homologado | Fluxos demonstrativos e quotes existem; cálculo real e telemetria não homologados |
| Fase 3: rede/comissão/carreira e relatórios | Domínio demonstrativo parcial; decisões, UI de evidências, funding e relatórios completos pendentes |
| Fase 4: market/ciclos aprovados e entrada controlada | Market demo; ciclos informação/bloqueio; nenhuma operação real aprovada |
| Fase 5: Host/Pool/OS/Equipment | Descoberta e contratos de API/serviço pendentes; não implementados integralmente |
| Fase 6: motor/fluxos/autorização/mobile/backup/lançamento | Arquivos de testes presentes e observações locais na entrega; cobertura/execução/homologações amplas incompletas |
| Três saldos e próxima ação entendidos na primeira tela | UI existe; compreensão por usuário não medida |
| Taxa com moeda/base/período/status/condições | Tela descreve documento/demo; política real incompleta; revisar cada tela em runtime |
| Todos os estados com texto e acessibilidade | Enums/rótulos existem; teclado/leitor de tela/200%/contraste ainda não comprovados em todas as tarefas |
| START só fica ativo após servidor, repetição sem duplicar | Código server/hook e observação de ativação na entrega; falta evidência de recusa, concorrência de HTTP e dois dispositivos |
| Visual não altera ledger em refresh/outra aba/aparelho | Front não calcula crédito; domínio idempotente; aceitação multidispositivo ainda não demonstrada |
| Toda movimentação rastreia origem/regra | Tabelas preservam origem; telas não expõem todo snapshot e histórico é limitado |
| Mobile, teclado, leitor de tela e movimento reduzido | Recursos no código e observação 390×844; avaliação completa pendente |
| Mesma chave produz no máximo um lançamento | Código/chaves/testes preparados; não tratado como resultado executado por esta auditoria |
| Worker atrasado recupera sem duplicar | Finance demo tem catchup e carreira tem sequência protegida; execução ampla e worker real ausentes |
| Estorno preserva história/contrato original | Código de compensação e triggers; política comercial e todos os eventos derivados não concluídos |
| Resposta externa ambígua preserva reserva | Conciliação demo conserva reserva; 2PP real não implementada/homologada |
| Admin exige versão, motivo e aprovador | Versão/auditoria parciais; dupla aprovação e justificativa obrigatória ausentes |
| Cliente manipulado não ativa finanças pendentes | Gates explícitos no backend; verificação HTTP ampla pendente |
| Telemetria ausente/vencida não parece online | DTO físico indisponível; UI deve ser revisada com animação Cloud para manter distinção |
| Métricas de confiança, erros, jobs, divergências, desempenho (§14) | Baseline e metas não definidos; instrumentação de produto/operacional não implementada |

### Artefatos de continuidade (§15–16)

| Artefato nomeado | Evidência atual / limite |
|---|---|
| PRD rastreável e matriz de decisões | Plano mestre descreve produto/decisões; esta matriz acrescenta rastreabilidade para o código. Não há registro de aprovação completa das decisões nem PRD aprovado separado |
| Decisões de domínio | `catalog.ts`, snapshots e plano §11 registram documento/proposta/pendências; política demo está explícita. Decisões financeiras reais não concluídas |
| Mapa de navegação e fluxos | Plano §5/§7 e rotas em `src/App.tsx`; implementação das telas. Não há evidência de pesquisa de tarefas ou aprovação de todos os fluxos |
| Estados de tela e protótipo | Componentes/telas e materiais de `docs/design/`; vazios/erros/pending existem. Falta avaliação sistemática de todos os estados e plataformas |
| Arquitetura proposta e modelo de dados | Plano §8–9; `server/schema.ts`, módulos do backend e `BACKEND.md`. Inventário/telemetria/serviços futuros ainda precisam de modelo operacional |
| APIs | Rotas reais e contratos em `app.ts`/`shared/types.ts`; inventário em `BACKEND.md`. APIs de provedor/hardware/conteúdo/papéis futuros não implementadas |
| Backlog por fase | Plano §12 contém fases; seção 6 deste documento aponta prioridades. Não há backlog completo com dependências, responsáveis, critérios e estimativas por item |
| Critérios de aceite | Plano §13 e tabela acima; evidências insuficientes para marcar todos como atendidos |
| Plano de homologação e evidências por fase | Passos da 2PP e observações locais em `ENTREGA_E_CONFIGURACAO.md`; falta roteiro completo de ambientes, cenários, dados, responsáveis e evidências de cada gate |
| Instruções de configuração, migração e operação | README, `.env.example`, BACKEND e documento de entrega; ensaio de migração/restauração/rollback ainda não registrado |
| Identidade distinta e pendências finais | Marca/ativos AMNG e documentação de fontes; nome público/aplicação final precisam de confirmação. Creators/Ambassadors e on-chain seguem fora do escopo atual |

## 5. Suíte existente, sem execução nesta auditoria

| Arquivo / teste preparado | Evidência e limites |
|---|---|
| `financial.test.ts:9` catálogo e taxas de ciclos | Compara sete números do catálogo; não comprova fonte física/disponibilidade |
| `financial.test.ts:13` cálculo inteiro/fronteiras | Bps/frações; não homologa a política de arredondamento real |
| `financial.test.ts:17` compra repetida | Contrato/débito/funding e conflito de parâmetros |
| `financial.test.ts:27` compras concorrentes | SQLite privado; não exercita PostgreSQL nem requisições HTTP |
| `financial.test.ts:33` rollback e ledger imutável | Exercita lançamento/transação e UPDATE/DELETE do ledger |
| `financial.test.ts:39` snapshot/ativação/catchup | Chamada direta ao domínio; não testa erro de frontend, aba/dispositivo ou todas as fronteiras de datas |
| `financial.test.ts:48` saque/reserva/incerteza/estorno | Domínio demo; nenhum provider callback ou envio externo |
| `financial.test.ts:59` conversão e market | Conservação interna/saída única; não é conversão de moeda pela Binance |
| `financial.test.ts:68` depósito simulado | Idempotência local; não testa depósito real |
| `career-affiliate.test.ts:9` N7 e recompra | Regras conhecidas/snapshot/no compression; não homologa elegibilidade real |
| `career-affiliate.test.ts:21` estorno comissão | Compensação com saldo não consumido; não cobre insuficiência após saque/consumo |
| `career-affiliate.test.ts:29` teto e cinco competências | Total de centavos e imutabilidade de funding |
| `career-affiliate.test.ts:37` fechamento/manutenção | Fecha manualmente meses consecutivos; título menciona recuperação, mas não exercita salto de competência |
| `career-affiliate.test.ts:53` retenção por identidade | Troca de contratos com mesmo peso; não cobre todos os cancelamentos retroativos |

Não há resultado de execução anexado nesta revisão. Não foram adicionados ou rodados testes. Falta cobertura de autenticação HTTP, autorização, CSRF, reset/MFA, migração PostgreSQL, 2PP, dados obsoletos Binance, acessibilidade, carga, backup/restauração e rollback operacional.

## 6. Correções locais prioritárias e dependências finais

1. **P2 — recuperação e evidência de carreira:** guard de sequência já acrescentado no código; comprovar recusa de saltos/repetição e processamento sequencial em runtime. Orçamento de janela futura e apuração completa de compromissos ainda precisam de regra/API.
2. **P2 — evidências de carreira na tela:** a UI agora mostra competência, estado, manutenção, bônus/funding e própria/rede. Comprovar renderização/fluxos; detalhe de contratos da rede ainda precisa de DTO e apresentação.
3. **P2 — extrato completo:** API de máquina agora calcula/pagina corretamente o período sobre o ledger completo. Integrar/revalidar a tela e exportação; carteira geral/admin ainda precisam de paginação/filtros no servidor. LIMIT 500 do bootstrap não comprova acesso a todo histórico.
4. **P2 — administração do escopo:** implementar ou manter explicitamente como pendentes agenda de campanhas, gestão ampliada de cupons, conteúdo, publicação por aprovação, editor versionado de tabelas e relatórios operacionais.
5. **P2 — estornos derivados:** proteção imutável a accruals foi acrescentada. Concluir fluxo de cancelamento comercial/funding/recuperação de premiações somente após política. Tabelas de reversão vazias não comprovam comportamento.
6. **P2 — cache de par removido:** `quotes.ts:25` ainda valida preço somente pela idade. Se o reconnect remove um par de `pairs`, o cache anterior pode aparecer por até 60 segundos com símbolo nulo. Exigir que cache/símbolo corresponda ao par atualmente elegível, ou remover o cache junto com o par. Correção reportada ao responsável.

Correções de paleta, sequência de competência, revogação de sessão ao enviar role idêntico, consumo de todos os links de reset pendentes, extrato agregado e imutabilidade dos accruals foram revalidadas no código durante a revisão: `shared/miner-theme.ts`, `career.ts:102–103`, `app.ts`, `queries.ts:17–42` e `schema.ts:160/171`. A evidência é estática; os fluxos ainda precisam de observação em runtime.

Finalizar 2PP e SMTP com documentação/credenciais. Operação física, policies financeiras, jurisdição/identidade e aprovação de carreira são dependências externas distintas; mesmo com a 2PP conectada, nenhuma delas fica implicitamente concluída.

**Conclusão desta auditoria:** há uma base fullstack concreta e uma experiência demonstrativa ampla. O sistema completo do plano ainda não está comprovado: permanecem trabalho local, decisões, integrações e critérios de verificação. Build, presença de teste ou estado visual ativo não são evidência de homologação financeira.
