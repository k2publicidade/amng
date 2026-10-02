# AMNG na Vercel

## Estado

O projeto Vercel `amng` já existe e está conectado ao repositório `k2publicidade/amng`. Este checkout prepara a adaptação serverless, mas a produção ainda depende do banco PostgreSQL, das variáveis privadas e de uma conta Vercel adequada ao uso comercial. `americanmining.site` ainda não foi associado ao projeto nem apontado para a Vercel.

## Arquitetura

- Vite gera os arquivos estáticos em `dist/`; a Vercel os entrega pela CDN.
- `api/[...path].ts` cria uma instância Express reutilizável durante a vida da Function e encaminha todas as rotas `/api/*`.
- PostgreSQL é a única opção de banco em produção. Um advisory lock serializa migrations, seed de catálogo e criação do administrador entre inicializações concorrentes.
- O pool reduzido é reaproveitado entre requisições e registrado em `attachDatabasePool`, para liberar conexões ociosas quando uma Function for suspensa.
- Limites de API, autenticação e comandos usam contadores no PostgreSQL em modo serverless; os endereços de cliente são armazenados como HMAC, não em texto puro.
- A Vercel não mantém o WebSocket/SSE contínuo desta aplicação. A Function consulta os endpoints públicos REST da Binance com cache compartilhado de 15 segundos; o navegador atualiza a tela a cada 30 segundos. Cotações vencidas ou pares ausentes continuam indisponíveis.
- Sessões, ledger e operações permanecem no PostgreSQL. Operações financeiras pendentes continuam desabilitadas para contas reais; este deploy não homologa integrações nem políticas financeiras.

## Recursos e variáveis

O projeto atual da conta está no plano Hobby. A [política de uso justo da Vercel](https://vercel.com/docs/limits/fair-use-guidelines) reserva esse plano a projetos pessoais sem finalidade comercial; confirme o enquadramento do AMNG e use um plano compatível antes de publicar produção. A plataforma também lista mineração de criptomoedas entre usos que não aceita. O AMNG nesta arquitetura apenas oferece interface/API de gestão e não executa hashing ou mineração na Vercel; se esse enquadramento operacional mudar, valide com o suporte da Vercel antes de publicar.

Crie um PostgreSQL pelo Marketplace, próximo da região da Function. A aplicação aceita PostgreSQL padrão por `DATABASE_URL`; configure a URL pooled do provedor e confirme que a integração não exige parâmetros incompatíveis com `pg`. Mantenha credenciais e segredos somente em **Project Settings → Environment Variables → Production**:

| Variável | Uso |
| --- | --- |
| `DATABASE_URL` | Conexão PostgreSQL do provedor |
| `APP_ORIGIN` | `https://americanmining.site` |
| `SESSION_SECRET` | Segredo aleatório exclusivo, mínimo 32 caracteres |
| `ADMIN_EMAIL` | E-mail da conta administrativa inicial |
| `ADMIN_PASSWORD` | Senha forte da conta inicial, mínimo 12 caracteres |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Opcionais; necessários para recuperação de senha por e-mail |

Não configure `DEMO_ENABLED=true` em produção, não copie `.env` para o Git e não imprima valores de variáveis em logs. A senha inicial é usada somente se esse e-mail ainda não existir; alterar a variável depois não troca uma senha já provisionada. Ative MFA nessa conta antes de ações administrativas sensíveis.

## Build e publicação

O projeto usa Node.js 24, disponível no [runtime Node da Vercel](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions). O build local de pré-publicação é `npm run build`; ele valida TypeScript, gera `dist/` e compila o servidor usado no modo tradicional. A Vercel usa `vercel.json`, `api/[...path].ts` e o mesmo comando de build para gerar os arquivos e a Function.

O projeto `amng` já usa integração GitHub. Uma publicação manual depois de configurar banco e variáveis pode usar `vercel deploy --prod`; para o fluxo Git, integrar/mesclar no branch de produção configurado na Vercel. Depois da publicação, verificar `/api/health`, cadastro/login e cotação pública. Um build bem-sucedido não substitui esses ensaios, backup/restauração do banco ou homologação externa.

## `americanmining.site` e Cloudflare

1. Adicione `americanmining.site` e `www.americanmining.site` ao projeto Vercel `amng`. Consulte `vercel domains inspect` para obter os valores exatos recomendados para aquele projeto; apex e `www` precisam estar associados. Defina o domínio raiz como canônico e redirecione `www` para ele. A [documentação da Vercel](https://vercel.com/docs/domains/set-up-custom-domain) explica o fluxo com DNS externo.
2. Na zona Cloudflare, remova/substitua os registros antigos de origem VPS pelos valores retornados pela Vercel. Para continuar usando Cloudflare apenas como DNS, configure os registros como **DNS only** (nuvem cinza), sem proxy laranja.
3. Antes de trocar nameservers na Hostinger, confirme que a zona Cloudflare contém os registros Vercel e qualquer registro de e-mail/validação que precise permanecer. A delegação atual ainda usa nameservers da Hostinger; só mude para os nameservers Cloudflare exibidos na zona depois dessa conferência.
4. Aguarde a delegação e a validação Vercel, confirme certificado TLS e teste o domínio canônico e o redirecionamento `www` antes de anunciar produção.

## Operação

Verifique uso e custo no painel da Vercel e no provedor PostgreSQL. Proteger a conta Vercel e o banco com MFA, permissões mínimas e backups fora da aplicação. Recuperações devem ser ensaiadas em outro banco antes de qualquer troca. O pacote Docker permanece documentado em `docs/OPERACAO.md` para auto-hospedagem; ele não é o destino escolhido neste plano.
