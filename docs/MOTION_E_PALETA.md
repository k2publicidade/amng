# AMNG · partida e paleta dos equipamentos

Decisão direta do proprietário: cada modelo mantém a cor da referência durante a ativação e enquanto seu ciclo estiver ativo.

| Modelo do catálogo | Cor ligada | Token |
|---|---|---|
| Goldshell SC Box | Turquesa | `#39D8B8` |
| Jasminer X16 | Verde limão | `#7DE52F` |
| Antminer K7 | Laranja | `#FF9D23` |
| Antminer KA3 | Azul | `#248CFF` |
| IceRiver AL3 | Ciano | `#14D8DD` |
| VolcMiner D1 | Dourado | `#FFD24A` |
| Avalon A1566 | Branco azulado | `#CFE9FF` |

Fonte única: `shared/miner-theme.ts`. Catálogo, DTO, imagens, luzes, partículas, anéis, medidor de progresso e botão usam o modelo selecionado. As cores dos estados financeiros e da navegação continuam sendo tokens semânticos próprios.

## Sequência

1. `READY`: foto desligada, botão para ativar; nenhum hashrate físico é presumido.
2. Solicitação: botão bloqueado enquanto a API confirma. Falha mantém a máquina desligada e apresenta a mensagem retornada.
3. Resposta confirmada `MINING`: inicia a partida de 3,6 segundos. Primeiro acendem os hubs; a luz cresce gradualmente e revela a camada ligada, seguida pelo pulso de energia.
4. Estado ativo: imagem ligada persiste após a partida e após reabrir a página, a partir do ciclo retornado pelo servidor.
5. Encerramento: contrato expirado/cancelado aparece encerrado. Ciclo concluído permite nova ativação apenas quando houver 24 horas elegíveis no contrato.
6. `PAUSED`: a máquina aparece desligada sobre uma base dessaturada, com o aviso "Máquina desligada · tempo congelado" e o anel de progresso parado no ponto da pausa. O botão passa a oferecer **Religar máquina**.

O comando **Pausar ciclo** desliga a máquina e congela o tempo restante do ciclo confirmado; não há apresentação de partida nem crédito enquanto ela estiver desligada. **Religar máquina** retoma o mesmo ciclo e reproduz a partida completa de 3,6 segundos, sempre a partir da confirmação do servidor — a mesma sequência da primeira ativação, sem botão separado de revisão. Em `prefers-reduced-motion`, a retomada aplica a imagem ligada imediatamente.

## Continuidade visual e desempenho

- As fotos originais desligadas foram preservadas. Derivações ligadas têm pose/proporções equivalentes e alpha transparente.
- A caixa das camadas é compartilhada. A Jasminer recebe ajuste uniforme de enquadramento, aplicado às duas camadas, e correção de alinhamento inferior a 1% na camada ligada, baseada nos limites opacos das imagens.
- Se a foto ligada não carregar, a foto original permanece; a máquina não desaparece.
- Os ativos ligados do catálogo desligado só são carregados ao precisar deles. A área de controle é carregada por rota; o motor 3D não entra na abertura inicial do dashboard.
- WebGL usa densidade limitada e pausa quando a página está oculta ou a área sai da tela. Sem WebGL, as fotos e a partida CSS continuam disponíveis.
- `prefers-reduced-motion` usa estado estático e transição breve; interrompe partículas, ventiladores ornamentais e pulsos contínuos.

## Observações locais em 28/09/2026

- SC ligada observada no mobile em turquesa: `docs/previews/miner-sc-turquoise-mobile.png`.
- Avalon ligada observada no mobile em branco azulado: `docs/previews/miner-btc-ice-mobile.png`.
- Jasminer comprada e ativada pela interface, exclusivamente na demonstração privada. Servidor retornou ciclo de 24 horas; a máquina permaneceu verde: `docs/previews/miner-etc-green-mobile.png`.
- As sete imagens ligadas foram inspecionadas. Essas observações específicas não comprovam todos os dispositivos, estados de falha ou telemetria operacional.

## Autoridade do estado

POST de ativação valida uma chave idempotente e vincula seu resultado ao ciclo original. Reutilizar a chave após encerrar esse ciclo não inicia outro. Ciclos e créditos continuam transacionados no backend.

Luzes e movimento são uma representação do contrato Cloud. Temperatura, watts, hashrate físico e estado do hardware permanecem indisponíveis sem fonte operacional.
