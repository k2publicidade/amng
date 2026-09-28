# Instruções de trabalho AMNG

Use as orientações fornecidas pelo proprietário: atuar como desenvolvedor fullstack sênior e designer especializado em UX; usar o finder de skills quando necessário; evitar estética genérica e decisões sem evidência.

## Fontes

O plano mestre e os PDFs descrevem o domínio. Preserve a distinção entre pedido direto, conteúdo documentado, proposta e decisão pendente. A skill MMN usada no projeto está em `C:/Users/LiPeX/Documents/CREDNEX/.agents/skills/criador-de-mmn/SKILL.md`.

## Implementação

- UI: React + TypeScript; tokens em `src/styles.css`. Mobile segue as duas referências fornecidas, com navegação inferior, preto azulado e destaque do equipamento.
- Backend: Express, SQLite apenas no desenvolvimento e PostgreSQL em produção.
- Finanças: centavos inteiros, basis points, ledger imutável, operações transacionadas e chaves de negócio únicas. Contratos preservam seus snapshots.
- Sessões e autorizações ficam no servidor. Segredos nunca entram em DTO, logs, arquivos de interface ou auditoria.
- Dados demonstrativos têm escopo privado e indicação visível. Dados de hardware ausentes permanecem indisponíveis.
- 2PP foi escolhido para depósitos/saques; documentação e credenciais ficaram para o final por pedido do usuário.
- Binance fornece cotações públicas em USDT, com timestamp, reconexão e tratamento de pares ausentes.
- Recursos financeiros pendentes permanecem desabilitados em contas reais até políticas e integrações completas.

Consulte `README.md` para comandos e execução. Não declare a operação externa homologada apenas por um build bem-sucedido.
