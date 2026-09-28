# AMNG · compilação, implantação e recuperação

## Pacote de execução

`npm run build` compila a interface em `dist/` e a API em `build/server/`. A compilação de servidor reescreve imports `.ts` para `.js`; `npm start` usa Node sem transpilar em produção. Desenvolvimento continua com `npm run dev`.

O `Dockerfile` usa duas etapas, dependências fixadas no lockfile e usuário de sistema sem privilégios na execução. `.dockerignore` inclui somente arquivos necessários à compilação, excluindo dados, anexos, documentos e credenciais do contexto.

`compose.production.yaml` fornece uma base para implantação controlada: PostgreSQL com volume persistente, rede de banco interna, health checks e aplicação acessível apenas na interface local do host. Proxy HTTPS, domínio e ambiente de homologação devem ser definidos antes de expor a aplicação.

As imagens escolhidas são as oficiais [Node](https://hub.docker.com/_/node) e [PostgreSQL](https://hub.docker.com/_/postgres). O volume usa o caminho da série PostgreSQL 17. Não trocar a versão principal de um volume existente sem migração planejada.

## Configuração

Em um arquivo de ambiente exclusivo do destino, definir `POSTGRES_PASSWORD`, `DATABASE_URL`, `APP_ORIGIN` HTTPS e `SESSION_SECRET`. A URL deve usar o host `postgres`, banco `amng` e a senha codificada corretamente para uma URL. Definir SMTP e, na etapa final solicitada, os campos da 2PP.

```powershell
docker compose --env-file .env.production -f compose.production.yaml build
docker compose --env-file .env.production -f compose.production.yaml up -d
docker compose --env-file .env.production -f compose.production.yaml ps
```

Esses comandos são instruções de operação; a imagem e o ambiente PostgreSQL não foram executados como parte da conferência da UI. A aplicação migra o esquema no início. Não inicia produção com SQLite, demonstração habilitada ou origem sem HTTPS. A conta administrativa inicial usa os campos de ambiente; operações administrativas reais continuam exigindo MFA e as políticas financeiras completas.

O exemplo inicializa um usuário proprietário do banco. Antes do lançamento, separar a identidade que executa DDL da identidade usada pelo processo da aplicação, com privilégios definidos sobre as tabelas necessárias. A separação ainda precisa ser implantada no destino escolhido.

## Backup e restauração

Guardar backups criptografados em destino privado; registrar data, versão da aplicação/esquema e política de retenção. Recuperação deve ocorrer primeiro em banco separado, sem sobrescrever a operação.

Para evitar redirecionamento de arquivo binário pelo PowerShell, gerar o dump dentro do container e copiá-lo:

```powershell
docker compose --env-file .env.production -f compose.production.yaml exec -T postgres pg_dump -U amng -d amng --format=custom --file=/tmp/amng-backup.dump
docker compose --env-file .env.production -f compose.production.yaml cp postgres:/tmp/amng-backup.dump ./backups/amng-backup.dump
```

Criar previamente a pasta privada `backups`. O nome do arquivo deve identificar a competência/data e evitar sobrescrever o único backup disponível. O dump contém dados privados.

Em um ambiente isolado, copiar o dump ao container, criar um banco vazio distinto e restaurar com `pg_restore --exit-on-error`. Comparar versão do esquema, saldos, reservas, referências, journals balanceados e contagem de eventos imutáveis antes de trocar qualquer destino de aplicação. Documentar duração e recuperação observada. Não existe evidência de ensaio de restauração neste pacote.

## Recuperação de uma interrupção

1. Consultar health check e estado dos processos antes de iniciar outra instância.
2. Preservar banco e volume existentes. Falha de abertura é fatal; a aplicação não recria saldos para ocultar corrupção.
3. Inspecionar logs de erro sem imprimir segredos, payloads privados ou tokens.
4. Verificar ciclo, pagamento e chave original antes de repetir um comando.
5. Em resposta externa incerta, manter a reserva e encaminhar para conciliação. Uma tela de sucesso não substitui a confirmação do provedor.
6. Comparar lançamentos e referências antes de publicar saldo recuperado. Correções financeiras usam compensação; não editar eventos anteriores.

O motor demonstrativo recupera ciclos que já foram abertos. Fechamento de carreira exige competências consecutivas. O worker de produção, sua fila, métricas e alertas ainda precisam de implementação vinculada às políticas e fontes operacionais.

## Limites de lançamento

A construção do pacote não conclui a integração 2PP, telemetria ASIC/pool, política de créditos/saques/cancelamentos ou homologação PostgreSQL. A matriz `COBERTURA_DO_ESCOPO.md` mantém esses itens separados dos módulos locais implementados. Ensaiar migração, restauração, rollback e reconciliação no ambiente do destino antes de ativar a operação real.
