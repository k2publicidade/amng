# Verificação local AMNG — 01/10/2026

## Pedido e resultado

Pedido direto do proprietário: verificar o funcionamento, melhorar a partida das máquinas e profissionalizar UX/UI dentro da proposta de mineração crypto. A configuração 2PP, o domínio e a hospedagem ficaram para o final, conforme resposta nesta revisão.

A base local funciona nos cenários verificados. A operação financeira real ainda depende de integração, políticas e homologação. Não houve publicação nem envio de dinheiro. As alterações locais que já existiam em ciclos, extratos e backend foram preservadas.

## Melhorias executadas

- Dashboard com resumo operacional, contagem de ciclos e próxima ação conforme máquinas prontas, pausadas ou ausência de contratos.
- Fundo preto azulado, navegação com acento azul, maior legibilidade de indicadores e valores tabulares; preservadas marca e cores por modelo.
- Partida confirmada pelo servidor: acendimento, anéis dos ventiladores com defasagem por posição, plataforma iluminada e uma varredura discreta. Removidos clarão e variação brusca de brilho do cockpit.
- Movimento reduzido sem animações contínuas de equipamento e com confirmação direta do estado do ciclo.
- Texto de seleção da frota descreve ciclos e contratos; removida promessa de telemetria sem fonte e acrescentado acesso direto à primeira máquina pronta.
- Cenário Three.js carregado apenas ao abrir detalhes, com fallback visual enquanto carrega. O módulo da frota ficou em aproximadamente 16,4 kB; o cenário 3D ainda tem aproximadamente 535,6 kB antes de gzip.
- Falha de atualização agora tem aviso e tentativa de recuperação. Falha na primeira carga preserva a rota em uma tela de conexão, sem redirecionar indevidamente ao login.
- Requisições da interface têm limite de 20 segundos; respostas incertas de comandos não são apresentadas como sucesso.
- Cotações não permanecem ao vivo sem conexão; valores por par expiram após 60 segundos e exigem símbolo elegível e estado conectado.
- Atalho de depósito do cabeçalho aponta diretamente para a operação correspondente.
- Requisito Node alinhado a 24+, como README e imagem de implantação.
- Configuração em memória usa segredo efêmero, sem gravar credencial na raiz; arquivos `.env.*` e `.session-secret` ignorados pelo Git, preservado o exemplo sem credenciais.
- PostgreSQL mantém isolamento serializable e repete a transação completa somente após rollback de falha `40001` ou deadlock `40P01`, com limite de cinco tentativas. Respostas incertas de conexão/commit não são repetidas. Contadores de processamento e resultados de fechamento ficam dentro da tentativa, para não acumular efeitos de um rollback.

## Evidências executadas

| Verificação | Resultado e limite |
|---|---|
| `npm test` | 28 testes passaram: 21 de domínio, um de segredo efêmero e seis registros da suíte HTTP, incluindo o agrupador e cinco cenários |
| `npm run test:postgres` | Mesmos 28 testes passaram em PostgreSQL 17.10, com schemas isolados. O teste de compras concorrentes também exige que a recusa tenha motivo financeiro, e quatro compras com a mesma chave devolvem o mesmo contrato |
| `npm run build` | TypeScript, Vite e compilação do servidor passaram; aviso de tamanho do cenário 3D permanece |
| `npm audit --omit=dev --json` | Zero vulnerabilidades conhecidas reportadas nas dependências de produção nesta consulta |
| Servidor compilado | Processo isolado em 3002 respondeu health check, página inicial e rota interna; demonstração desativada rejeitada com 404. Execução local, não homologação de produção |
| HTTP: sessão e autorização | CSRF ausente, origem externa, acesso administrativo por MEMBER e tentativa de elevar role recusados |
| HTTP: isolamento | Duas demonstrações não compartilham contratos; ativar e consultar extrato de outra sessão são recusados |
| HTTP: ciclos | Ativação concorrente com a mesma chave preserva um ciclo; pausa/retomada e persistência de prazo/estado confirmadas |
| HTTP: conta real | Cadastro começa sem contratos/saldo; depósitos, saques e compra ficam bloqueados; webhook 2PP falso não é aceito |
| HTTP: recuperação | Entrega injetada em memória; redefinição revoga sessões e links anteriores; login e logout confirmados. SMTP externo não testado |
| UI desktop | Dashboard, frota, sete planos, rendimentos, carteiras, rede, carreira, ciclos, market, conta, ecossistema, suporte e administração carregaram. Sem alertas de erro nos módulos inspecionados; sem erros de console antes da simulação de rede |
| UI mobile 390×844 | Partida, pausa, máquina desligada, congelamento persistido após reload e retomada observados em demonstração privada |
| UI mobile 320 px | Planos, carteiras e carreira sem overflow horizontal da página |
| Movimento reduzido | Retomada confirmada; inspeção do equipamento mostrou zero animações CSS ativas |
| Falha de conexão | Bootstrap bloqueado pelo navegador durante teste; tela de recuperação preservou `/app/career` e voltou ao conteúdo após liberar a rede. Bloqueio removido ao final |
| Binance | Cotações públicas recebidas; KDA e ALPH indisponíveis na observação local |
| Backup/restauração PostgreSQL | Dump custom restaurado em banco separado: 29 tabelas com contagem e digest de conteúdo idênticos; migrações reaplicadas sem reescrita; journals balanceados e UPDATE/DELETE do ledger/journal recusados |
| Gates de produção em PostgreSQL | Aplicação inicializada no modo produção contra o banco temporário restaurado: health, bootstrap anônimo, cookie HttpOnly/Secure/SameSite=Lax, demonstração recusada, SPA e CSP verificados |
| Isolamento da execução | Cluster próprio em loopback e porta temporária, autenticação SCRAM e credencial efêmera. O banco PostgreSQL já existente não foi usado ou alterado. O último cluster foi parado e removido pelo runner |
| Docker e interrupção anterior | Docker Desktop foi iniciado para diagnóstico e os processos iniciados foram encerrados; os testes usaram executáveis PostgreSQL instalados. Um diretório de tentativa interrompida permaneceu privado em `.amng-runtime`, com banco comprovadamente parado; a exclusão recursiva foi rejeitada pela revisão automática |

Essas evidências não comprovam todos os cenários de acessibilidade, carga, operação externa ou o plano mestre integral. As operações financeiras dos testes usam SQLite em memória ou PostgreSQL descartável e não tocam saldos existentes. Gates locais de produção não comprovam domínio HTTPS, SMTP, armazenamento de backups ou integração externa no futuro destino.

Capturas em `docs/previews/dashboard-refined-desktop.jpg`, `dashboard-refined-mobile.jpg` e `miner-refined-mobile.jpg` documentam a apresentação final. Os valores são da demonstração privada.

## O que falta para operação real

1. **2PP:** documentação oficial do contrato, sandbox e segredos no servidor; implementar endpoints, autenticação, assinatura, eventos únicos, conciliação e homologação. `server/providers/two-pp.ts` continua uma fronteira pendente, não um gateway operacional.
2. **Políticas financeiras:** confirmar base e origem de créditos Cloud/Profit Sharing, taxas/limites de saque, conversão e demais regras que forem liberadas. Um flag administrativo não substitui essa aprovação; gates do backend continuam ativos.
3. **Destino de produção:** domínio HTTPS, PostgreSQL, SMTP, sessão exclusiva e administrador com MFA; executar migração, backup/restauração e rollback no ambiente escolhido.
4. **Fontes físicas:** hashrate, temperatura, consumo e pool permanecem indisponíveis sem integração. A animação é representação do estado do ciclo Cloud.
5. **Produtos adicionais:** ciclos especiais, decisões de carreira/comissão e serviços Host/Pool/OS/Equipment conservam as pendências documentadas; não foram liberados por esta revisão visual.

O pacote local está compilado e verificável. A publicação com movimentação real precisa dos itens acima; concluir somente a configuração de uma chave 2PP não habilita essa operação.
