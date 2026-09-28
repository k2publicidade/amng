# AMNG · extrato completo da carteira

Implementação em 28/09/2026. Este módulo lê o histórico financeiro; não confirma pagamentos, liquida ciclos, gera rendimentos nem altera saldos. Os dados de demonstração permanecem privados e identificados.

## Registro das rotas

Em `server/app.ts`, depois da resolução da sessão e antes do fallback/handler de erro:

```ts
import { registerLedgerRoutes } from './ledger-routes.ts';
registerLedgerRoutes(app, { db, currentUser });
```

`currentUser(request)` deve devolver a conta autenticada e recusar sessão ausente, expirada ou conta bloqueada. Os relatórios derivam titular, escopo e flag de demonstração dessa conta; nenhum desses campos é aceito na query string.

## API

| Método / rota | Resultado |
|---|---|
| `GET /api/wallets/statement` | Página de lançamentos, totais de todos os registros filtrados, saldos das três carteiras e opções privadas de filtro |
| `GET /api/wallets/statement/export` | CSV completo dos mesmos filtros, sem restrição à página da interface |

Ambas as respostas usam `Cache-Control: no-store`. Falta de autenticação é tratada pela resolução de conta existente. Filtros inválidos retornam `422` com mensagem em português. Não há filtros por outra pessoa ou outro escopo.

### Filtros

| Campo | Valores / comportamento |
|---|---|
| `wallet` | `deposit`, `earnings`, `affiliate`; ausência inclui as três |
| `kind` | Código de movimento, por exemplo `MINING_INCOME`; os códigos existentes da conta vêm em `options.kinds` |
| `status` | `CONFIRMED`, `PENDING`, `RESERVED`, `REVERSED`; acompanha o estado atual de conciliação do saque |
| `product` | `cloud`, `market`, `affiliate`, `career`, `wallet` |
| `contractId` | Somente contrato da própria conta; identificador de outro titular não encontra registros nem revela o contrato |
| `coin` | Moeda registrada no snapshot de um contrato próprio; valores monetários continuam em USD |
| `from`, `to` | Datas reais `AAAA-MM-DD`, inclusivas em UTC; início não pode superar o fim |
| `search` | Até 120 caracteres; busca parametrizada em descrição, referência e chave de negócio; `%`, `_` e `\` são literais |
| `page` | Inteiro positivo; exclusivo da consulta JSON, página inexistente é limitada à última existente |
| `pageSize` | `12`, `20`, `50` ou `100`; padrão `12`; exclusivo da consulta JSON |

Produto é uma classificação do tipo registrado, sem alterar sua natureza financeira. Comissões ligadas a contratos de outras pessoas não expõem os snapshots dessas pessoas. Por isso os filtros de contrato e moeda próprios não incluem tais snapshots.

## Consulta e rastreabilidade

- O SQL percorre todo o `ledger_entries` autorizado, independente do limite de 500 itens do bootstrap.
- Totais e página são obtidos na mesma transação. `ORDER BY created_at DESC, id DESC` estabiliza a paginação.
- Valores e agregados precisam permanecer em inteiros seguros em centavos. Overflow interrompe o relatório; não há arredondamento silencioso.
- `creditsCents`, `debitsCents` e `netCents` refletem os movimentos do filtro. Eles não substituem os saldos atuais das carteiras.
- Reservas de saque continuam descontadas do saldo disponível. O saldo contábil mostrado é disponível + reservado, usando os estados `PENDING`, `PROCESSING`, `REVIEW_REQUIRED` das solicitações.
- O estado atual do movimento pode ser `CONFIRMED` após pagamento ou `REVERSED` após recusa. O estado original imutável também é retornado e exportado.
- A relação de contrato e pagamento é autorizada por titular, escopo e ambiente. O snapshot do contrato fornece nome, moeda, equipamento, base, taxa e versões; o catálogo atual não reescreve essa origem.
- Journal, chave de negócio, referência, valor bruto/tarifa/líquido e versões de origem são exportados para rastreabilidade. Nenhum segredo de sessão ou integração participa do DTO ou arquivo.

## Exportação privada e consistente

1. Cria uma pasta temporária exclusiva. Em sistemas POSIX, a pasta usa `0700` e o arquivo `0600`. No Windows, a pasta vazia recebe ACL explícita para o SID do processo antes de gravar dados; falha nessa etapa recusa a exportação.
2. Conta os registros filtrados dentro da transação. Mais de **100.000** retorna `422 / EXPORT_LIMIT`, com orientação para reduzir o período. Não há truncamento.
3. Grava o CSV UTF-8 com BOM, separador `;` e linhas CRLF em lotes de **1.000**, usando cursor por data + ID. O número gravado precisa corresponder ao total contado.
4. A transação só executa consultas. Ela é encerrada e o handle de escrita é fechado antes de iniciar o download HTTP; um cliente lento não mantém o banco em transação.
5. O download informa `X-Export-Row-Count`. A desconexão/cancelamento aborta preparação entre os lotes/escritas e libera recursos.
6. Sucesso, erro e cancelamento removem o arquivo específico e depois a pasta vazia criada pelo módulo. Locks transitórios recebem até três novas tentativas breves; falhas persistentes de limpeza são propagadas para a operação, em vez de serem silenciadas. Não há exclusão recursiva nem remoção de caminho informado pelo participante.

As células textuais removem NUL, tabs e quebras de linha, recebem escaping de aspas e proteção para prefixos de fórmula (`=`, `+`, `-`, `@`, inclusive após espaços/control characters). Colunas numéricas usam apenas inteiros seguros ou decimais derivados desses inteiros.

A rota permite cinco exportações por minuto por IP. O processamento depende da abstração transacional do projeto: SQLite serializa transações durante a preparação local; PostgreSQL usa snapshot serializável. O limite protege recursos, mas não equivale a ensaio de carga.

## Interface

`WalletStatement.tsx` substitui o extrato que filtrava apenas `data.ledger` dentro de `WalletsPage`. Os comandos de depósito, saque e conversão continuam no formulário existente.

- Os cartões de carteira e o seletor do relatório aplicam a mesma seleção.
- Busca, período e filtros avançados têm aplicação explícita; mudanças ainda não aplicadas são indicadas.
- Consulta tem loading, cancelamento, estado vazio, erro e retomada. Requisições superadas e desmontagem abortam a consulta, evitando publicação de resposta antiga.
- A lista mantém estado, carteira, horário UTC e valor legíveis no mobile. Detalhes expandem origem, referência, snapshot próprio e pagamento vinculado.
- Totais compreendem todas as páginas. A página, quantidade por página e contagem são fornecidas pelo servidor.
- Exportação acompanha os filtros aplicados, mostra preparação e pode ser cancelada. Mudar filtros aborta uma exportação em andamento. O CSV não usa a página da interface.
- Movimento reduzido desativa o giro do indicador; rótulos e feedback permanecem disponíveis.

## Evidência e limites

Foi feita revisão estática das consultas, validação, tratamento de erro/cancelamento e integração do componente. `npm run check` não apontou erros nos arquivos deste módulo durante a implementação; o comando global ainda encontrou alterações paralelas de RBAC em `queries.ts` e totais nullable em `AdminPage.tsx` naquele momento. `npm run build:server` também não apontou erro nos arquivos deste módulo, mas encontrou a migração de DTOs RBAC e um import de `permissions` em `shared/types.ts` ainda em andamento. A conclusão do build global fica a cargo da integração do projeto.

Não foram adicionados ou executados testes neste subtrabalho. Nenhum ensaio de produção PostgreSQL, comparação com o provedor 2PP, ensaio de volume ou observação completa de download/ACL por HTTP está sendo declarado. O root registra as rotas e documenta a evidência de execução após a integração.
