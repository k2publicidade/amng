# Portais complementares AMNG

Implementação em `src/pages/WorkspacePages.tsx` e `src/pages/workspace.css`. Todas as páginas usam o contrato `WorkspacePageProps`, recebem o bootstrap do servidor e compartilham o mecanismo de atualização e notificação da aplicação.

| Rota | Página | Interações implementadas |
|---|---|---|
| `/app/wallets` | `WalletsPage` | Seleção da finalidade, filtros de carteira/estado/tipo/período/texto, detalhes de referência e data UTC, CSV, depósito/saque/conversão com revisão e chave idempotente |
| `/app/network` | `NetworkPage` | Link de indicação copiável, busca, filtro de ativos, expansão das linhas, percentuais documentados e últimos lançamentos de comissão |
| `/app/career` | `CareerPage` | Pulso da competência em apuração, etapa persistida, Potência própria/rede, qualificação pelos fechamentos do servidor, remuneração e manutenção do último fechamento, orçamento coletivo, históricos de competências e créditos |
| `/app/profile` | `ProfilePage` | Atualização de nome, alteração de senha, configuração TOTP por chave/URI, confirmação e desativação |
| `/app/support` | `SupportPage` | Abertura de chamado, filtros, histórico, expansão das respostas e perguntas frequentes |
| `/app/integrations` | `IntegrationsPage` | Estado real das integrações, data de atualização, alocações presentes no bootstrap e consulta de disponibilidade via suporte |
| `/app/market` | `MarketPage` | Principal e resultado separados, entrada mínima documentada, revisão da posição, retirada confirmada por diálogo e chaves idempotentes |
| `/app/cycles` | `CyclesPage` | Durações, valores e taxas fornecidos pelo servidor, janelas propostas e consulta operacional |

## Integração

As operações usam `post`/`patch` de `src/lib/api.ts`. Após a resposta, chamam `refresh()`; o shell atualiza o bootstrap e o token CSRF. Erros preservam os dados do formulário. Chaves idempotentes persistem durante uma revisão e suas novas tentativas.

As carteiras possuem resumo compacto de três finalidades no mobile, formulário antes do extrato e paginação de 12 ou 20 registros. Links `?tab=deposit`, `?tab=withdraw`, `?tab=convert` e `?wallet=earnings`/`affiliate` selecionam o contexto e focam o trecho solicitado. Uma resposta incerta mantém a mesma referência e bloqueia mudanças da operação até a consulta.

IDs de regras usados: `deposits`, `withdrawals`, `conversions`, `market`, `affiliate`, `career`, `cycles`. Regras reais desabilitadas mostram o motivo vindo do servidor. O modo de demonstração permite os fluxos simulados de carteira e Market, com indicação próxima da ação.

A configuração de integrações é administrativa. O participante consulta disponibilidade pelo suporte, com assunto preenchido. A UI não calcula telemetria nem altera saldo. Taxas e salários do material de origem permanecem documentados/propostos até confirmação.

Binance é apresentada como fonte de cotações públicas em USDT; sua conexão não é descrita como vínculo de equipamento. As atualizações das integrações incluem hora em UTC. O formulário de suporte separa uma falha de atualização do histórico de uma falha no envio já registrado.

## Carreira

O Pulso e a Potência atuais são medidas em apuração. A etapa vem do último snapshot persistido; a UI não promove participantes a partir da pontuação atual. `qualificationMonths` é consumido do servidor, sem acrescentar um fechamento pelo estado corrente.

`lastClosedMonth`, `salaryStatus`, `maintenanceBps`, `bonusCents` e `bonusStatus` apresentam o resultado do último fechamento. `confirmedSalaryCents` representa o crédito registrado naquele fechamento; a referência proposta da etapa aparece separadamente. No modo demo, a tela identifica os fechamentos e créditos como simulados.

`funding` mostra a competência corrente do fundo coletivo, com financiado, creditado e disponível por finalidade. O orçamento coletivo não é saldo pessoal. A reserva exibe apenas o disponível informado pelo DTO. A proposta de 5% das compras em cinco competências continua identificada como proposta para contas reais.

Os lançamentos `CAREER_SALARY` e `CAREER_BONUS` têm nomes próprios no extrato e na remuneração. Comissões e estornos de rede usam `AFFILIATE_COMMISSION` e `AFFILIATE_REVERSAL`. Campos ausentes não são reconstruídos como se fossem dados operacionais.

## Identidade e acessibilidade

Desktop: superfícies industriais opacas, divisórias precisas e números em hierarquia editorial. Mobile: superfícies azul preto, contornos discretos e detalhes azul elétrico/verde. A disposição muda por tarefa; extrato, rede, carreira e integrações não compartilham uma malha genérica de cards.

Animações de entrada e Pulso respeitam movimento reduzido. Formulários têm rótulos, feedback de erro e proteção contra envios simultâneos. Linhas expansíveis usam `aria-expanded`; detalhes nativos e o diálogo de retirada são acessíveis por teclado. Tabelas financeiras mantêm rolagem dentro do painel em telas pequenas.

## Validação realizada

`npm run check` passou após estas alterações na configuração TypeScript integrada do projeto. A validação de navegação e renderização permanece a cargo do fluxo de inspeção visual da aplicação. Não foram adicionados nem executados testes nesta etapa.
