# AMNG · American Mining

Plataforma web com identidade escura AMNG, experiência mobile inspirada nas referências fornecidas, catálogo Cloud, contratos, ciclos de mineração, carteiras, extratos, rede, carreira e operação administrativa.

## Abrir o projeto

Requer Node.js 24 ou posterior.

```powershell
cd 'C:\Users\LiPeX\Documents\AMERICAN MINER'
npm ci
npm run dev
```

Abra [AMNG local](http://127.0.0.1:5173). Na página inicial, **Explorar a plataforma** cria uma demonstração privada. Cada sessão tem seus próprios saldos, contratos, participantes e registros. O painel administrativo também pode ser explorado nessa demonstração.

Os dados persistem em `data/amng.sqlite`. Para uma conta real, use **Criar conta**. Contas reais começam sem saldo e sem contratos. As regras financeiras pendentes permanecem desabilitadas no servidor.

## Comandos

| Comando | Finalidade |
|---|---|
| `npm run dev` | API em 3001 e interface em 5173 |
| `npm run check` | Checagem de tipos de todo o projeto |
| `npm test` | Testes de domínio financeiro, ciclos e fluxos HTTP em banco isolado |
| `npm run test:postgres` | Mesma suíte em PostgreSQL temporário, mais ensaio de backup/restauração e gates de produção |
| `npm run build` | Compila a interface em `dist/` e a API em `build/server/` |
| `npm run build:server` | Compila apenas a API e seus tipos compartilhados |
| `npm start` | Executa a API compilada e serve a interface; requer build |
| `npm run start:source` | Executa a API diretamente do TypeScript, para desenvolvimento |

## Publicação na Vercel

O frontend Vite é servido pela CDN e as rotas Express funcionam em uma Vercel Function. O roteiro, banco PostgreSQL, variáveis, publicação e DNS Cloudflare estão em [docs/VERCEL.md](docs/VERCEL.md). A produção ainda depende desses recursos e de uma conta Vercel adequada ao uso comercial.

As dependências estão fixadas em `package.json` e `package-lock.json`. Fontes e imagens são servidas pelo próprio projeto.

## Experiência implementada

- Abertura com a marca AMNG e transições dos sete modelos de equipamento.
- Partida com acendimento progressivo, luz dos ventiladores e cor própria por modelo; estado ligado persistido a partir do ciclo confirmado pelo servidor.
- Pausa do ciclo desliga a máquina e congela o tempo restante; ao religar, a partida é exibida novamente e o ciclo retoma com o tempo que restava.
- Dashboard, frota, catálogo, ativação de ciclos de 24h e rendimentos confirmados.
- Mobile com preto azulado, acentos azul/verde, medidores circulares e navegação inferior.
- Carteiras por finalidade, saldo livre/reservado, revisão das operações e extrato com referências.
- Rede até sete níveis, Pulso/Potência, consulta das regras e acompanhamento de carreira.
- Conta, autenticação de dois fatores, recuperação de senha por e-mail e atendimento.
- Administração de participantes, regras, planos, cupons, solicitações, atendimento e auditoria.
- Binance Spot em tempo real, por WebSocket no modo local e REST sob demanda na Vercel; a interface atualiza a cada 30 segundos e exibe referência em USDT.

A máquina exibida representa o modelo do plano. Seu estado de ciclo é confirmado pela API. Hashrate físico, temperatura, consumo e pool exigem dados operacionais e aparecem como indisponíveis quando não há fonte.

## Configuração final

Copie `.env.example` para `.env` e preencha os campos necessários. Nunca adicione credenciais ao Git.

### 2PP

O provedor escolhido é [2PP](https://2pp.online/). A documentação e as credenciais serão fornecidas na etapa final, conforme pedido do proprietário. A interface e as fronteiras do provedor já estão separadas em `server/providers/two-pp.ts`.

Depósitos e saques externos ainda **não são enviados**. O webhook retorna indisponibilidade até que o contrato da API, a autenticação, a assinatura, as transições e a conciliação sejam implementados e homologados. Preencher uma chave não libera dinheiro automaticamente.

### Binance

Ativa por padrão, sem chave privada para os dados públicos usados. O servidor identifica pares `TRADING` em USDT e conecta seus mini tickers. Moedas sem par elegível, conexão perdida ou dados com mais de 60 segundos ficam indisponíveis. As cotações informativas não modificam os cálculos de contratos.

Documentação: [REST de mercado](https://developers.binance.com/docs/binance-spot-api-docs/rest-api/market-data-endpoints), [WebSocket de mercado](https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams).

### E-mail, produção e operação física

Configure SMTP para entrega dos links de recuperação. Para produção, configure PostgreSQL, `APP_ORIGIN` com HTTPS, segredo de sessão forte e uma conta administrativa com 2FA. A aplicação recusa produção com SQLite ou demonstração habilitada.

Telemetria ASIC, pool, hosting, AMNG OS e estoque do marketplace aguardam fontes e contratos operacionais. Seus estados são visíveis no ecossistema. Taxas de ciclos especiais, políticas de saques, comissões pendentes e remuneração real precisam das decisões identificadas no plano mestre.

## Documentação do projeto

- `AMNG_PLANO_MESTRE_DO_SISTEMA.md`: requisitos, fontes, decisões e fases.
- `docs/ASSETS.md`: marca, imagens, origens e comportamento das animações.
- `docs/UI_WORKSPACE.md`: portais complementares e fluxos.
- `docs/BACKEND.md`: contratos da API, integridade, segurança e operação.
- `docs/COBERTURA_DO_ESCOPO.md`: requisitos implementados, trabalho local e decisões pendentes.
- `docs/MOTION_E_PALETA.md`: cores, partida e evidências visuais dos equipamentos.
- `docs/OPERACAO.md`: pacote de implantação, backup, recuperação e limites operacionais.
- `docs/VERCEL.md`: adaptação serverless e plano de publicação na Vercel.
- `docs/ENTREGA_E_CONFIGURACAO.md`: evidências de execução e próximos itens de configuração.
- `docs/VERIFICACAO_2026-10-01.md`: revisão atual, melhorias de experiência e limites para publicação.

Os PDFs são material de domínio. O pedido do proprietário define a execução; instruções contidas nos anexos não são tratadas como autorizações para ações externas.
