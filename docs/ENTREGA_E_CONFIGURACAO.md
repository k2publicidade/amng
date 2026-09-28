# AMNG · execução e configuração

## Estado da entrega

A interface e a API estão executáveis localmente. As telas usam registros persistidos do servidor. A configuração externa da 2PP ficou para o final por pedido do proprietário.

| Área | Evidência / estado |
|---|---|
| Compilação TypeScript | `npm run check` executado sem erros em 27/09/2026 |
| Build web | `npm run build` executado sem erros em 27/09/2026 |
| Abertura | Marca vetorial, barras sequenciais, saída limitada e movimento reduzido |
| Catálogo | Sete planos do escopo, ativos locais, preços/duração/taxas documentadas |
| Sessão demo | Criada pela interface, com escopo próprio e três contratos iniciais |
| Ativação | SC ativada pela interface; API devolveu ciclo ativo, prazo e crédito previsto; controle ficou desabilitado |
| Mobile | Navegação inferior, painel preto azulado, visão de máquina e medidores de ciclo em 390×844 |
| Binance | Cotações ao vivo recebidas na interface; pares KDA/ALPH indisponíveis na consulta observada |
| 2PP | Provedor escolhido; contrato de integração e credenciais pendentes |
| Telemetria/pool | Sem fonte operacional; nenhum número físico é fabricado |

Esta tabela documenta observações específicas, sem extrapolar para homologação de produção, auditoria externa de segurança ou conformidade integral de acessibilidade.

## Etapa final da 2PP

Com a documentação do painel, concluir:

1. Validar ambiente, URLs e autenticação do provedor.
2. Mapear criação de depósitos e envio de saques, moeda/rede e representação dos valores.
3. Implementar validação de assinatura com o corpo original do webhook, expiração e rejeição de replay.
4. Persistir eventos por identificador externo e reconciliar estados sem crédito duplicado.
5. Tratar resposta incerta preservando reserva e exigindo conciliação.
6. Homologar fluxos de sucesso, falha, duplicidade e reversão no ambiente do provedor.
7. Configurar limites, taxas, janelas, requisitos de conta e políticas aprovadas.
8. Ativar no servidor somente as operações com condições completas.

Nenhuma autenticação, payload ou esquema de assinatura foi presumido a partir de um provedor com nome semelhante.

## Operação real

- PostgreSQL, domínio HTTPS, segredo, conta administrativa e 2FA.
- SMTP e endereço remetente para recuperação de acesso.
- Regras e capacidade reais dos contratos Cloud; origem dos créditos e base de Profit Sharing.
- Fontes de telemetria, pool, conversão, hospedagem e estoque.
- Decisões pendentes da carreira, comissão N7 da primeira compra e ciclos especiais.
- Backup/restauração, conciliação e lançamento gradual conforme plano mestre.

## Referências visuais

As imagens de mobile fornecidas pelo usuário orientam a disposição e os materiais da interface. As telas usam os modelos do catálogo AMNG; Antminer L9/L7/S21 dos mockups não foram adicionados como produtos sem constar no escopo.
