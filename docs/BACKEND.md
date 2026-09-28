# AMNG · backend e operação

Revisão estática em 28/09/2026. Este documento descreve o código existente; não equivale a homologação do provedor, execução da suíte, ensaio de PostgreSQL ou aprovação das regras financeiras.

## Limites do ambiente

- Desenvolvimento: Node.js 24, Express, SQLite com WAL, foreign keys e serialização da transação inteira.
- Produção: PostgreSQL obrigatório, origem HTTPS, segredo exclusivo e demonstração desabilitada. As condições são verificadas em `server/config.ts` e `server/app.ts`.
- Demonstração: usuário, catálogo, contratos, rede, fundos e auditoria pertencem a um escopo privado. Valores têm `is_demo=1`; nenhum depósito ou saque externo é enviado.
- Contas reais: cadastro e segurança estão disponíveis. Compra, rendimento, conversão, market, depósitos, saques, comissões e folha aguardam políticas e integrações; `requireFinancialRule` recusa movimentação real mesmo quando um flag é alterado.
- Hardware: o ciclo Cloud é separado da telemetria física. Hashrate atribuído e métricas ASIC não têm integração e permanecem indisponíveis.

## Módulos e persistência

| Arquivo | Responsabilidade |
|---|---|
| `server/index.ts` | Configuração, processo HTTP e encerramento |
| `server/app.ts` | API, autorização, CSRF, validação, limites de tentativas e adaptadores |
| `server/database.ts` | Transações SQLite/PostgreSQL e locks |
| `server/schema.ts` | Tabelas, índices, restrições e triggers de imutabilidade |
| `server/domain.ts` | Centavos, basis points, ledger, auditoria, idempotência e Pulso |
| `server/finance.ts` | Compra, ciclos, participação, carteiras, market e conciliação demonstrativa |
| `server/affiliate.ts` | Comissões e compensações demonstrativas |
| `server/career.ts` | Medição, snapshots mensais, orçamento e folha demonstrativa |
| `server/career-preview.ts` | Consulta de orçamento/exposição mensal sem criar pagamento |
| `server/queries.ts` | DTOs do participante e da administração |
| `server/catalog.ts` | Sete planos, regras pendentes, ciclos propostos e tabela de carreira |
| `server/quotes.ts` | Binance público, cache com validade, reconexão e eventos |
| `server/providers/two-pp.ts` | Fronteira da 2PP; contrato ainda pendente |
| `server/fixtures.ts` | Histórico e rede explicitamente simulados |

O schema inclui identidades/sessões, resets, catálogo, regras, contratos, ativações, diários contábeis, ledger, comandos idempotentes, pagamentos/eventos, market, comissões/estornos, carreira/funding/fechamentos, cupons, suporte e auditoria. A abertura aplica o schema e registra versões 1 e 2. As alterações futuras de schema precisam de migração própria; os registros de versão existentes não comprovam um ensaio de atualização ou restauração.

## Integridade financeira

1. Valores monetários são inteiros; taxas usam bps. `applyBps` calcula com `BigInt` e truncamento ao centavo exclusivamente na política declarada de demonstração.
2. Cada lançamento cria um diário com duas linhas cuja soma é zero. Saldo livre vem da soma do ledger; o domínio recusa débito sem saldo.
3. `business_key` é única. Repetir a chave devolve o evento anterior; reutilizar com usuário/carteira/valor incompatível falha.
4. Comandos guardam hash canônico dos parâmetros. Compra, débito, contrato, comissão, funding e uso de cupom ocorrem na mesma transação.
5. Contratos capturam plano, versão, moeda, termos e política. Triggers impedem alterar snapshot, principal, datas e proprietário.
6. Extrato, accruals do market, diários, auditoria, eventos de pagamento, comissões, funding, fechamentos e premiações são append-only no banco. Correções exigem compensações.
7. SQLite usa `BEGIN IMMEDIATE` sob mutex; PostgreSQL usa `SERIALIZABLE` e `SELECT ... FOR UPDATE`. Conflitos retornam erro e orientam repetição com a mesma chave; não há repetição silenciosa da operação.

Saque demonstrativo debita a origem e cria reserva imediatamente. `PENDING`, `PROCESSING` e `REVIEW_REQUIRED` conservam a reserva. `PAID` finaliza sem segundo débito; `REJECTED` compensa uma única vez. Transições finais contraditórias são recusadas. Conta real não recebe confirmação manual de pagamento sem evidência do provedor.

## API existente

Todos os caminhos abaixo começam com `/api`. Mutações, exceto o webhook reservado, exigem sessão e `X-CSRF-Token`. A interface obtém esse token em `/bootstrap`. Campos de corpo desconhecidos são recusados pelos schemas `strict`.

| Método / caminho | Corpo ou efeito principal | Acesso |
|---|---|---|
| `GET /health` | Consulta simples ao banco | Público |
| `GET /bootstrap` | Conta, catálogo, saldos, contratos, extrato, rede, carreira e configuração segura | Própria sessão |
| `GET /market/quotes` | Snapshot público Binance | Público |
| `GET /market/stream` | SSE `quotes`, com keepalive e snapshot periódico | Público |
| `POST /auth/demo` | Cria ou reabre demonstração privada | Apenas ambiente que permite demo |
| `POST /auth/register` | `name`, `email`, `password`, `referralCode?`, `termsAccepted: true` | Público com sessão CSRF |
| `POST /auth/login` | `email`, `password`, `totp?` | Público com sessão CSRF |
| `POST /auth/logout` | Rotaciona para sessão anônima | Própria sessão |
| `POST /auth/reset-request` | `email`; resposta genérica e indicador de SMTP configurado | Público com sessão CSRF |
| `POST /auth/reset-confirm` | `token`, `newPassword`; consumo único e revogação de sessões | Token elegível |
| `PATCH /profile` | `name` | Própria conta |
| `POST /auth/password` | `currentPassword`, `newPassword`, `totp?` | Própria conta |
| `POST /auth/2fa/setup` | `password?`; chave/URI de provisionamento para o titular | Própria conta |
| `POST /auth/2fa/confirm` | `totp` | Própria conta |
| `POST /auth/2fa/disable` | `password?`, `totp` | Própria conta |
| `POST /orders` | `planId`, `couponCode?`, `idempotencyKey` | Participante; real bloqueado |
| `POST /miners/:id/activate` | Abre um ciclo elegível; repetição retorna o ciclo ativo | Contrato do titular; real bloqueado |
| `GET /miners/:id/statement?days=30&page=1` | Produção agregada do período e extrato de créditos confirmados, em páginas de 12 | Contrato do titular, mesmo escopo e natureza demo/real |
| `POST /wallets/deposits` | `amountCents`, `idempotencyKey?` | Demonstração |
| `POST /wallets/withdrawals` | `wallet`, `amountCents`, `idempotencyKey?` | Demonstração; depósitos não são origem sacável |
| `POST /wallets/conversions` | `from`, `amountCents`, `idempotencyKey?` | Demonstração; transferência interna 1:1 para depósitos |
| `POST /market/positions` | `amountCents`, `idempotencyKey?`; mínimo documentado US$ 25 | Demonstração |
| `POST /market/positions/:id/withdraw` | `idempotencyKey?`; libera principal e resultado uma vez | Posição do titular; demonstração |
| `POST /cycles/orders` | Recusa `CYCLE_RULE_PENDING` | Sem contratação |
| `POST /support/tickets` | `subject`, `message` | Própria conta |
| `GET /admin/overview` | Participantes, planos, regras, pagamentos, chamados, cupons e auditoria do escopo | `ADMIN` |
| `PATCH /admin/rules/:id` | `enabled?`, `status?`, `description?`, `totp?` | `ADMIN`; liberação real recusada |
| `PATCH /admin/plans/:id` | Nome, preço, duração, taxa, peso, estado; todos opcionais, mais `totp?` | `ADMIN`; alterações monetárias reais recusadas |
| `POST /admin/coupons` | `code`, `discountBps`, `maxUses`, `expiresAt`, `totp?` | `ADMIN`; demonstração |
| `PATCH /admin/tickets/:id` | `status`, `reply?`, `totp?` | `ADMIN`, mesmo escopo |
| `PATCH /admin/users/:id` | `name?`, `blocked?`, `role?`, `totp?` | `ADMIN`; protege contra remover o próprio acesso |
| `POST /admin/profit-sharing` | `date`, `rateBps` de 90 a 110, chave idempotente, `totp?` | `ADMIN`; demonstração |
| `PATCH /admin/payments/:id` | `status`, `reference?`, `totp?` | `ADMIN`; transição validada e auditada |
| `POST /admin/process` | `totp?`; apura períodos vencidos da demonstração | `ADMIN` |
| `GET /admin/career/preview?month=AAAA-MM` | Caixa por bucket, exposição salarial, déficit, pendências e próxima competência | `ADMIN`, mesmo escopo |
| `POST /admin/career/close` | `month: AAAA-MM`, `idempotencyKey`, `totp?` | `ADMIN`; competência encerrada e demonstração |
| `POST /payments/2pp/webhook` | Retorna `503 PROVIDER_CONTRACT_PENDING`; nenhum crédito | Contrato de assinatura ainda ausente |

Quando a chave é opcional no JSON de um comando financeiro, `Idempotency-Key` é obrigatório como alternativa. Erros retornam `{ error, code }`, com status HTTP. Respostas de mutações do participante normalmente devolvem o bootstrap atualizado; ações administrativas devolvem o overview ou `{ result, admin }`.

## Segurança existente

- Senhas com scrypt, salt aleatório e comparação em tempo constante.
- Cookie de sessão HttpOnly/SameSite=Lax e Secure em produção. O banco guarda hash do bearer, validade e CSRF. Login/logout rotacionam a sessão.
- Senha alterada/resetada revoga sessões e consome todos os links de recuperação pendentes do titular na mesma transação. Bloqueio e mudança de acesso também exigem revogação; repetir role idêntico não revoga a sessão. Consulta de recurso usa titular ou escopo administrativo.
- Login e recuperação têm respostas genéricas para conta não elegível. Rate limits cobrem API, autenticação e comandos financeiros.
- TOTP com segredo cifrado AES-256-GCM e prevenção de reutilização do passo. Admin real precisa de MFA nas mutações sensíveis; demo tem exceção explícita.
- Bootstrap, overview e auditoria não devolvem hash de senha, bearer ou segredo MFA. A configuração MFA entrega material de provisionamento ao próprio titular somente nesse fluxo.
- Helmet e validação server-side estão presentes. Não há evidência de auditoria externa, revisão de dependências, teste de penetração ou conformidade integral.

Há somente `MEMBER` e `ADMIN`. Suporte, financeiro, operação, aprovador e administrador de leitura são papéis propostos no plano e ainda não implementados.

## Extrato de uma máquina

`GET /miners/:id/statement` é uma leitura transacionada; não chama processamento financeiro nem altera o ledger. `days` aceita inteiros de 1 a 30 (padrão 30); `page` de 1 a 100000 (padrão 1). Query parameters desconhecidos são recusados. O contrato deve pertencer ao titular, escopo e natureza da conta; caso contrário retorna `404 MINER_NOT_FOUND`.

A consulta agrega todos os créditos `CONFIRMED` de `MINING_INCOME` e `PROFIT_SHARING` no período em UTC, independentemente do limite de 500 entradas do bootstrap. Retorna `minerId`, `isDemo`, `confirmedOnly`, `generatedAt`, `period { days, from, until, timezone }`, `productionHistory`, `totals { miningCents, sharingCents, totalCents }`, `ledger` da página e `pagination { page, pageSize: 12, totalPages, totalEntries }`. Não é extrato de toda a carteira nem de todos os eventos do contrato; histórico geral completo ainda precisa de consulta própria.

## Carreira e afiliados demonstrativos

Comissões percorrem até sete patrocinadores, sem compressão; usam preço líquido e contrato vigente como política explícita de simulação. Primeira compra preserva N7 sem taxa (`PENDING_RATE`). Snapshot registra versão, base, elegibilidade e natureza demo. Existe função de compensação, mas não existe fluxo público de cancelamento de contrato/estorno comercial homologado.

Carreira mede contratos próprios e rede até sete níveis, continuidade ponderada e retenção por identidade de contrato. Reserva até 5% em cinco competências a partir do mês seguinte: salários 4%, bônus 0,75% e residual de centavos para reserva. A política de distribuição de centavos é demonstrativa. Fechamentos guardam componentes, contratos, fórmula, etapa histórica, etapa remunerada, manutenção 100%/50%/0%, salário e maior bônus elegível. Créditos são condicionados ao orçamento da competência, sem financiamento real.

O calendário demonstrativo é UTC. Depois de um fechamento existente, a próxima competência deve ser imediatamente consecutiva; `CAREER_MONTH_SEQUENCE` recusa saltos, preservando etapa e sequência de manutenção. A prévia é uma consulta, sem crédito ou fechamento; não confirma financiamento de uma janela futura. Posição financiada por uma janela futura, prioridade quando faltar orçamento, política de estorno retroativo e reabertura histórica continuam pendentes. Consulte `COBERTURA_DO_ESCOPO.md` para distinguir o que está implementado das lacunas locais e decisões externas.

## Processamento e integrações

`processDemo` liquida ciclos já abertos, participação diária e accruals do market. É chamado no bootstrap demonstrativo e pelo comando administrativo; não há worker financeiro de produção ativo. Ele não abre automaticamente novos ciclos de mineração.

Binance usa `exchangeInfo` para localizar pares Spot `TRADING` em USDT, REST para o primeiro preço e streams `miniTicker` para atualização. Quotes com mais de 60 segundos ficam nulas; há reconexão com espera de 5–60 segundos. A cotação é informativa e não move carteira. Não existe conversão de moeda minerada pela cotação até aprovação da política.

2PP: manter para a configuração final, conforme pedido direto do proprietário. O adaptador não presume URL, autenticação ou assinatura. Para concluir, implementar a partir da documentação: criação, envio, referência local, moeda/valor exato, assinatura sobre corpo original, replay, eventos idempotentes, resposta ambígua e conciliação.

## Operação antes de lançamento

Configure `.env` conforme `.env.example`: PostgreSQL, origem, segredo, administrador, SMTP e parâmetros aprovados. Nunca copie arquivos de dados/segredos para assets públicos.

Ainda faltam evidências de migração PostgreSQL, backup/restauração, monitoramento de jobs e alertas, reconciliação do provedor, rollback sem apagar ledger e lançamento controlado. Produção financeira também depende de termos, jurisdição, regras de origem/liquidação, taxas de saque, funding, identidade e fontes operacionais. Alterar um flag ou preencher uma chave da 2PP não conclui essas etapas.

## Verificação registrada nesta revisão

Foram lidos código, schema, contratos de DTO, plano mestre e os arquivos de testes existentes. Nenhum teste foi adicionado ou executado por esta auditoria. Os testes preparados exercitam SQLite demonstrativo; sua existência não comprova resultado nem cobertura de HTTP, autorização, PostgreSQL, SMTP, 2PP, hardware, acessibilidade ou carga. Evidências de execução local observadas pelo responsável estão em `ENTREGA_E_CONFIGURACAO.md`.
