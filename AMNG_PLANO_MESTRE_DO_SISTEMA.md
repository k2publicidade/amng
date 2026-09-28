# AMNG — plano mestre do sistema

**Projeto:** AMERICAN MINERS / AMERICAN MINING (AMNG)  
**Versão:** 1.0 — planejamento inicial  
**Data:** 27 de setembro de 2026  
**Estado:** base consolidada para planejamento detalhado no Luna; não é autorização para ativar movimentações financeiras

## 1. Como ler este documento

Este plano separa três fontes para evitar que proposta, referência visual e decisão aprovada sejam confundidas:

1. **Pedido direto do usuário:** criar o planejamento completo de uma plataforma com UI/UX premium, fundo preto, tecnologia, referências visuais Web3, animações de alta qualidade e interações marcantes. A intenção é detalhar o projeto com Luna e, depois, implementar com GPT‑6 Sol.
2. **Escopo funcional da plataforma AMNG:** requisitos e parâmetros documentados no PDF American_Mining_AMNG_Escopo_Plataforma.pdf. O PDF é a fonte do escopo de produto abaixo; seus números ainda precisam ser verificados contra a operação real.
3. **Proposta de carreira:** regras calculáveis em AMNG_Carreira_Pulso_Potencia_Salarios_Bonus.pdf. O próprio documento chama valores e limites de proposta para aprovação; este plano não os trata como aprovados.

As três imagens anexadas mostram variações raster do símbolo de barras azul e vermelho e dos logotipos AMNG / AMERICAN MINING sobre fundo claro. São referências de marca, não telas do produto nem uma obrigação de reproduzir um layout. Os PDFs também dizem que as imagens de máquinas devem servir como direção visual, não como layout final.

**Divergência de nome a resolver:** o pedido chama o projeto de **AMERICAN MINERS**; os PDFs e os logotipos dizem **AMERICAN MINING**, sigla **AMNG**. Este plano usa AMNG como identificador provisório e mantém o nome público como pendência de marca antes de escrever textos finais, domínio ou contratos.

### Legenda de decisão

- **CONFIRMADO NO PEDIDO:** preferência explicitamente dada pelo usuário.
- **DOCUMENTADO NO ESCOPO:** aparece no PDF funcional, mas ainda precisa ser validado pela empresa e pelos responsáveis legais/financeiros.
- **PROPOSTA A VALIDAR:** aparece no PDF de carreira como proposta.
- **PENDENTE:** não há regra suficiente para implementar ou comunicar sem inventar.
- **RECOMENDAÇÃO DE PRODUTO:** decisão de UX/engenharia sugerida neste planejamento, sujeita a validação no planejamento detalhado.

## 2. Resumo executivo

AMNG deve ser uma plataforma responsiva para contratar capacidade de mineração em nuvem, acompanhar ciclos e produção, comprar ou hospedar equipamentos, consultar operações associadas a hashrate e administrar rede, carteiras e conteúdo. O participante precisa distinguir resultado de mineração, participação nos resultados do ecossistema e remuneração de afiliados. A operação precisa conseguir explicar cada movimento, pausar uma regra, conciliar um evento externo e auditar quem alterou parâmetros.

A experiência combina a precisão de um painel de operação industrial com uma identidade escura, proprietária e de alto padrão. A sensação Web3 vem de dados em tempo real, profundidade, visualização de rede e feedback de estado; não implica criar token, conectar carteiras on-chain, NFTs ou transações blockchain. Nada disso consta nos anexos.

O sistema só deve exibir produção de mineração, hashrate, cotações e status de hardware que venham de fonte operacional registrada. A animação acompanha o dado autorizado pelo servidor; ela nunca cria, calcula ou libera saldo. Valores do documento de carreira ficam em estado de proposta até aprovação expressa.

## 3. Objetivos e princípios

### Problema que o produto resolve

O escopo reúne produtos de mineração, carteiras, ciclos, conversões e remuneração de rede. Sem separar origem, regra, estado e disponibilidade, a pessoa pode interpretar produção estimada como saldo liquidado, comissão pendente como dinheiro sacável ou representação visual como máquina própria. A plataforma precisa tornar esses limites compreensíveis em cada decisão e permitir que a operação prove de onde veio cada número.

### Histórias centrais

- Como participante, quero comparar planos e condições antes da compra para saber o que estou contratando, por quanto tempo e quais regras ainda precisam ser confirmadas.
- Como participante, quero ativar um ciclo e ver sua evolução sem que a animação seja confundida com crédito já lançado.
- Como participante, quero abrir qualquer saldo e localizar a origem, o estado e a possibilidade de uso ou saque.
- Como líder, quero entender como Pulso, Potência, comissão e carreira são calculados sem ver dados privados de outras pessoas nem receber promessa de salário não confirmado.
- Como operador, quero distinguir ciclo de usuário, telemetria de equipamento e atividade do pool para não comunicar operação física sem evidência.
- Como responsável financeiro, quero recalcular períodos, conciliar pagamentos e auditar mudanças sem duplicar ou apagar lançamentos.
- Como administrador, quero pausar uma regra ou produto sem reescrever contratos existentes.

### Objetivos de produto

- Explicar claramente o que é cada produto, sua duração, taxa documentada, moeda, algoritmo, capacidade contratada, regras de ativação e pendências aplicáveis.
- Tornar fáceis de entender os saldos de compra, rendimentos, rede, valores reservados e valores efetivamente sacáveis.
- Mostrar a origem e o estado de cada crédito, débito, ativação, conversão, comissão, saque e ajuste.
- Dar à operação ferramentas para configurar produtos sem reescrever contratos existentes, interromper vendas e conciliar eventos.
- Fazer a experiência de máquinas ter presença visual e feedback marcante sem sugerir atividade inexistente.
- Preparar uma plataforma acessível, responsiva e instrumentada para crescer em módulos.

### Princípios que não podem ser quebrados

1. **O servidor é a fonte de verdade.** Saldos, taxas aplicadas, ciclos concluídos, carreira, elegibilidade e pagamentos são calculados no backend. A interface só representa o resultado.
2. **Cada valor tem origem e destino.** Extrato imutável por evento; correções entram como lançamentos compensatórios, nunca pela edição do histórico.
3. **Configuração nova não reescreve contrato antigo.** Cada contrato guarda snapshot de plano, taxa, duração, regra de cálculo, moeda, máquina e versão dos termos da contratação.
4. **Pendente significa indisponível.** Nenhuma taxa, base de cálculo, comissão, saque ou salário pendente deve receber valor temporário escondido ou ser habilitado por padrão.
5. **Ciclo e telemetria são estados distintos.** A representação da máquina pode mudar para ONLINE • MINING depois que o backend confirmar a ativação diária do usuário. O estado físico do ASIC, do worker ou do pool só aparece como online quando uma integração operacional real confirmar isso.
6. **Taxa não é garantia.** Taxas e projeções devem trazer base, período, moeda, condições, origem dos dados e ressalvas próximas do número.
7. **Web3 sem clichês.** Não usar brilho em toda superfície, gradientes sem relação com a marca, gráficos decorativos ou “números de blockchain” inventados.
8. **Acessibilidade para todas as interações.** Movimento reduzido, teclado, leitor de tela, contraste e mensagens de estado fazem parte do design premium.

## 4. Pessoas, papéis e permissões

### Participantes

- **Visitante:** entende os serviços, custos, condições, evidências operacionais e termos antes de criar conta.
- **Participante novo:** conclui cadastro, segurança e identificação exigida para sua jurisdição; vê onboarding com próximos passos sem ser pressionado a contratar.
- **Participante ativo:** acompanha contratos, máquinas, ciclos, produção, carteiras, rede e carreira, de acordo com as regras liberadas.
- **Líder de rede:** consulta estrutura atribuída, volumes elegíveis, comissões e Pulso/Potência. Não acessa dados pessoais ou financeiros de outros participantes além do necessário e autorizado.
- **Cliente de hosting / equipamento:** consulta propriedade, identificação do equipamento, hospedagem, uptime, manutenção, pool associado e cobranças quando esses serviços tiverem especificação aprovada.

### Equipe interna — proposta de papéis

- **Suporte:** leitura limitada de conta, contratos e chamados; sem criar saldo ou alterar taxas.
- **Operação de mineração:** status de equipamentos, pools, manutenção e incidentes; sem acesso a segredos de pagamento.
- **Financeiro / conciliação:** depósitos, saques, reservas, lançamentos, divergências e relatórios; mutações sempre justificadas e auditadas.
- **Gestor de produtos:** catálogo, cupons, campanhas, conteúdo e regras em rascunho.
- **Aprovador financeiro:** aprova publicação de taxas, orçamento de carreira, novos compromissos e ações sensíveis.
- **Administrador mestre:** configuração de papéis e funções críticas com autenticação forte.

Os papéis acima são recomendação; responsáveis, segregação de função e política de dupla aprovação ainda precisam ser definidos. Validar autorização no servidor para cada recurso e ação; esconder um botão não é controle de acesso.

## 5. Arquitetura de informação

### Portal do participante

1. **Visão geral**
2. **Minhas máquinas**
3. **Contratar capacidade**
4. **Hashrate Market**
5. **Ciclos**
6. **Carteiras e extrato**
7. **Minha rede**
8. **Carreira Pulso + Potência** — somente após aprovação
9. **Hosting / Equipamentos / Pool** — conforme módulos liberados
10. **Segurança, perfil e suporte**

O menu mostra apenas módulos disponíveis para aquela conta e território. Recursos pendentes não aparecem como produtos contratáveis; quando houver valor explicativo para o participante, aparecem como “em preparação” sem preços ou promessa de retorno.

### Portal administrativo

1. **Central de operação:** filas de pendências, conciliação, estado de serviços e alertas.
2. **Participantes e rede:** pesquisa, situação de conta, vínculos, verificações e chamados.
3. **Produtos e contratos:** planos, ciclos, máquinas, versão e estado de cada regra.
4. **Financeiro:** extrato, depósitos, saques, reservas, ajustes e reconciliação.
5. **Mineração:** inventário real, telemetria, pools, hashrate contratado e discrepâncias.
6. **Afiliados e carreira:** comissões, fechamentos, elegibilidade, orçamento e folha proposta.
7. **Promoções:** cupons, campanhas e limites.
8. **Conteúdo e ativos:** banners, textos revisados, máquinas, moeda e ativos da marca.
9. **Auditoria e segurança:** ações administrativas, sessões, permissões e políticas.

## 6. Direção de UI/UX premium

### Conceito visual: sala de controle de mineração

**CONFIRMADO NO PEDIDO:** base preta, tecnologia, inspiração Web3, acabamento premium e animações de alta qualidade.  
**RECOMENDAÇÃO DE PRODUTO:** uma estética de equipamento industrial de precisão, com ritmo editorial e hierarquia de painel operacional. O produto deve parecer um sistema confiável de infraestrutura, não um cassino cripto.

#### Paleta e forma

- Fundo principal: carvão quase preto, com variações de superfície em grafite. Evitar preto absoluto em todo componente para manter separação e legibilidade.
- Texto: branco suave para conteúdo principal; cinza frio para dados auxiliares. Estados de erro e bloqueio precisam de contraste e rótulo, não apenas cor.
- Marca: vermelho e azul do símbolo AMNG em poucos pontos de alto valor — ação primária, marca, foco ou linha de destaque. Não transformar as barras da logo em enfeite repetido em todos os cards.
- Identidade de máquina: SC verde, ETC esmeralda, CKB laranja, KDA azul, ALPH ciano, DOGE dourado e BTC laranja/branco conforme o escopo. As cores identificam famílias; não substituem rótulos.
- Superfícies: linhas finas, divisórias precisas, materiais opacos e planos de fundo com textura técnica muito discreta. Glassmorphism não deve dominar.
- Tipografia candidata: uma família condensada e legível para títulos/índices técnicos, uma sans humanista para texto e uma monoespaçada apenas para cotações, hashes ou telemetria. Validar licença, leitura em mobile e amostra da marca; não usar tipografia monoespaçada em parágrafos.
- Ícones: conjunto consistente com traço técnico; ícone sempre acompanhado por rótulo em ação ou estado importante.

Os arquivos de logo recebidos estão em raster com fundo branco. Antes da UI final, criar versões vetoriais e versões para fundo escuro/claro, com área de respiro, tamanhos mínimos e uso do símbolo. Preservar vermelho/azul como ativos de marca; confirmar se a palavra final é MINING ou MINERS.

### Composição e densidade

- Dashboard desktop com navegação lateral persistente e área principal ampla; no mobile, navegação curta e foco em saldos, alertas e ação imediata.
- Uma informação principal por bloco. Não construir a tela inteira a partir de cartões idênticos.
- Misturar blocos editoriais de resumo, tabelas operacionais, cronologias e visualizações de máquina quando cada forma serve ao conteúdo.
- Saldo sempre acompanhado de finalidade, moeda, estado e link para extrato.
- Gráficos com intervalo, unidade, fonte e estado “última atualização”; vazio e indisponibilidade não podem parecer zero.
- Tabelas longas devem ter cabeçalho fixo ou alternativa mobile; apresentar filtros e exportação com permissões apropriadas.
- A ação primária da tela deve ser clara e não competir com animações ou efeitos decorativos.

### Motion design

O movimento será desenhado como parte da resposta do produto:

| Evento | Resposta visual |
|---|---|
| Entrada no dashboard | Pequena sequência de surgimento de conteúdo por hierarquia; sem atrasar controles ou esconder saldos. |
| START MINING aceito | Confirmação semântica, transição da máquina OFFLINE para ONLINE, ativação controlada de ventoinhas/luz da família, início do cronômetro e registro do horário enviado pelo servidor. |
| Ativação recusada | A máquina não muda de estado; apresentar motivo e próximo horário possível. |
| Atualização da produção | Interpolação visual entre snapshots oficiais, com indicação “estimado durante o ciclo” se o valor não for liquidado ainda. Atualizar a tela ou trocar de dispositivo não altera o ledger. |
| Conversão de moeda | Mostrar quantidade, preço usado, horário da cotação, valor de origem, taxa e arredondamento após confirmação da regra. |
| Bônus / novo nível | Revelação curta e sóbria, com valores, período, condição atendida e status financeiro. Confete ou celebração não deve aparecer em crédito pendente. |
| Erro, bloqueio ou conciliação | Movimento discreto, foco mantido e mensagem de estado persistente; nada de alertas que desaparecem antes de poderem ser lidos. |

**Regras de qualidade:** toda animação respeita a preferência por movimento reduzido; controles continuam usáveis durante transições; feedback não depende de som; não animar números de carteira como se fossem juros em tempo real sem crédito correspondente; nenhuma luz pulsante decorativa em todos os equipamentos; não bloquear navegação por animações. O orçamento de duração, curva e técnica será definido no protótipo e medido em aparelhos móveis reais. Evitar WebGL em loops contínuos sem necessidade funcional.

### Acessibilidade e responsividade

- Meta de planejamento: WCAG 2.2 AA, validada por combinação de avaliação automatizada e revisão manual.
- Foco visível e não encoberto; navegação por teclado e leitores de tela; cabeçalhos semânticos; controles com nome acessível; mensagens anunciadas sem roubar foco.
- Estado nunca comunicado somente por cor, animação ou som.
- Respeitar movimento reduzido e manter alternativa estática para máquina e gráficos.
- Áreas de toque confortáveis; zoom de 200% sem perda de tarefas; formulários preservam dados após erro.
- Números e datas usam locale definido pela conta ou pelo território; horário financeiro deixa fuso explícito quando mudar elegibilidade.

## 7. Mapa de telas e requisitos funcionais

### A. Site público e cadastro

- Página institucional explica Cloud, Host, Pool, Hashrate, AMNG OS, equipamentos e afiliados apenas na profundidade que a operação consegue comprovar.
- Página de plano exibe preço, período, moeda/algoritmo, equipamento representativo, capacidade associada, taxa documentada, condições, custos, riscos e estado de aprovação.
- Não publicar projeção de rendimentos, depoimento ou gráfico de “crescimento” sem revisão jurídica e evidência representativa aprovada.
- Cadastro mostra patrocinador atribuído, dados necessários, consentimentos e requisitos de verificação. A política de patrocinador e os dados exigidos ainda estão pendentes.
- Login, recuperação e segurança com limites de tentativa, feedback de erro sem revelar se um email existe e opção de autenticação forte.

### B. Dashboard

Exibir, cada um como valor separado: Deposit Wallet, Earnings Wallet, Affiliate Wallet; contratos ativos; ciclos em andamento; equipamentos online na infraestrutura somente se a telemetria confirmar; produção do dia e acumulada; Profit Sharing lançado; capacidade/Hashrate contratado; próximos ciclos; alertas de saque e equipe. Todo número abre a origem detalhada.

Separar explicitamente saldo contábil, saldo pendente, saldo bloqueado, saldo reservado e valor sacável. Não chamar um total consolidado de “disponível” se parte dele não puder ser usada. Componentes sem dados reais entram em estado vazio ou indisponível, não com números ilustrativos.

O escopo descreve Mining Income associado ao ciclo ativado e Profit Sharing automático, independente dessa ativação. O dashboard deve identificá-los como origens distintas. A participação automática só aparece como lançada após o backend registrar o evento; sua taxa-base e funding permanecem pendentes.

### C. Catálogo e compra de Cloud Mining

- Comparar os sete planos, sua duração de 130 dias, preço, equipamento visual, moeda, algoritmo e taxa de Mining Income registrada.
- O participante compra capacidade computacional fracionada; a imagem do ASIC representa o produto, não a compra do equipamento inteiro.
- Mostrar que o hashrate exibido corresponde à capacidade efetivamente contratada. Se a medição/atribuição ainda não existir, não publicar um número.
- Carrinho/compra exibe moeda de pagamento, fonte do saldo, valor exato, cupom, termos vigentes e resumo de condições antes da confirmação.
- Criar contrato com snapshot e só confirmar após transação financeira atômica; bloquear clique repetido e mostrar recibo.
- A regra de devolução do principal, cancelamento, reembolso, taxas externas, arredondamento, pagamento da contratação e limite por usuário não está definida.

Planos documentados no escopo, sujeitos a validação de disponibilidade e taxa antes da publicação:

| Plano | Preço | Máquina de referência | Moeda | Algoritmo | Mining Income diário documentado |
|---|---:|---|---|---|---:|
| SC Miner | US$ 25 | Goldshell SC Box | SC | Blake2B-Sia | 0,70% |
| ETC Miner | US$ 80 | Jasminer X16 | ETC | Etchash | 0,74% |
| CKB Miner | US$ 160 | Antminer K7 | CKB | Eaglesong | 0,77% |
| KDA Miner | US$ 350 | Antminer KA3 | KDA | Blake2S | 0,82% |
| ALPH Miner | US$ 600 | IceRiver AL3 | ALPH | Blake3 | 0,86% |
| DOGE Miner | US$ 1.400 | VolcMiner D1 | DOGE | Scrypt | 0,89% |
| BTC Miner | US$ 3.000 | Avalon A1566 | BTC | SHA-256 | 0,92% |

As taxas são os valores escritos no escopo, não uma validação de retorno, margem ou garantia. A taxa efetiva do contrato, sua base, periodicidade, composição, arredondamento e liquidação precisam de aprovação.

### D. Minhas máquinas e ciclos de ativação

Cada unidade mostra modelo, plano, estado do ciclo, estado físico/pool em campo separado quando houver telemetria, moeda, algoritmo, capacidade atribuída, taxa aplicável, ciclo atual, produção da sessão, produção das últimas 24 horas, cotação e seu horário, equivalente em USD e próxima ativação. Equipamentos não contratados podem ficar bloqueados como biblioteca visual, mas devem ser rotulados claramente para não sugerir propriedade.

Fluxo de ativação:

1. O backend verifica contrato vigente, ciclo elegível, horário e idempotência.
2. A confirmação informa que o ciclo de 24h será aberto e apresenta a condição aprovada.
3. O backend registra a ativação única com data/hora e máquina/contrato.
4. A UI anima ONLINE • MINING só depois da resposta confirmada.
5. O backend calcula os períodos devidos e grava cada evento uma única vez; o frontend interpola o progresso entre retornos oficiais.
6. Na conclusão, a interface distingue produção acumulada de crédito liberado/conversão, conforme a regra final.

O PDF propõe acionamento manual a cada 24 horas para liberar Mining Income, mas não define se a janela é exatamente 24 horas corridas, qual tolerância existe, como fusos/atrasos funcionam, se há período de carência, nem o que ocorre no fim dos 130 dias. Essas decisões bloqueiam o processamento financeiro.

### E. Carteiras, extrato, depósito e saque

- Extrato filtrável por data, tipo, produto, contrato, moeda e estado; linha detalha evento-base, regra e identificador externo quando aplicável.
- Modelo de carteira proposto preserva pelo menos três finalidades do escopo e sub-ledgers para Mining Income, Profit Sharing, moeda minerada, Hashrate Market, ciclos, comissões, salários e bônus.
- Conversão entre moeda minerada e saldo principal é uma operação explícita; a regra e o destino final ainda precisam de aprovação.
- Depósito e saque precisam de provedor, moeda, rede, mínimos/máximos, tarifa, identidade, aprovação, janela operacional, estado de callback e conciliação definidos.
- Na solicitação de saque, mostrar bruto, taxa, líquido, carteiras de origem, estado e prazo validado. Reservar fundos no servidor; não liberar valor em timeout ambíguo.
- Até que a regra de saque seja formalizada, desabilitar o comando e apresentar um estado informativo; não sugerir que o saldo pode ser retirado.

### F. Hashrate Market e ciclos

**Hashrate Market documentado:** entrada mínima de US$ 25, taxa atualmente indicada de 0,40% ao dia e sem prazo fixo de bloqueio. Ledger separado com principal, resultado acumulado, entrada e saída. A taxa-base, composição, início do cálculo, risco, disponibilidade e prazo de processamento de retirada permanecem pendentes.

**Planos de ciclo documentados:** 7 dias / US$ 30; 15 dias / US$ 60; 30 dias / US$ 120; 60 dias / US$ 250; 90 dias / US$ 750. As taxas estão “a definir”; lançamentos indicados para segundas e quartas. Dash e Kaspa são citadas como moedas/máquinas especiais possíveis. Não implementar retorno ou compra até aprovar taxa, calendário/fuso, estoque, elegibilidade e liquidação.

### G. Afiliados e equipe

- Visão de rede em árvore ou linhas expansíveis; profundidade exibida e profundidade remunerada precisam ser escolhidas.
- Cada linha identifica o evento-base, nível, taxa, valor, condição, período e estado da comissão.
- Primeira compra: N1 8%, N2 4%, N3 3%, N4 2%, N5 2%, N6 1%; N7 pendente.
- Recompras: N1 4%, N2 2%, N3–N7 1% cada.
- As taxas vêm do escopo, mas base de cálculo, momento de crédito, elegibilidade, compressão, tratamento de compra parcialmente paga, devolução/estorno, teto e bloqueio ainda precisam ser definidos. Comissão pendente permanece desabilitada.
- O patrocinador deve ser imutável por padrão e vinculado a uma identidade única; impedir ciclos na rede e não reatribuir descendentes silenciosamente após bloqueio ou exclusão. Movimentar contas da mesma pessoa não deve criar linha independente.
- Relatório não revela dados pessoais ou carteiras de downlines.

### H. Carreira Pulso + Potência

Tudo nesta seção é **PROPOSTA A VALIDAR**, derivada do PDF de 27/09/2026.

| Etapa proposta | Pulso mínimo | Potência mínima | Salário mensal proposto |
|---|---:|---:|---:|
| IGNITION | 45 | 20 | US$ 20 |
| RIG | 55 | 50 | US$ 40 |
| CLUSTER | 65 | 100 | US$ 60 |
| GRID | 75 | 180 | US$ 100 |
| GENESIS | 85 | 300 | US$ 220 |

Pesos propostos por contrato principal vigente: SC 1; ETC 2; CKB 4; KDA 7; ALPH 11; DOGE 20; BTC 36. Potência mensal soma os pesos elegíveis no fechamento. Contrato expirado, cancelado ou estornado não conta.

O Pulso é composto de quatro blocos mensais:

- **Continuidade, até 35:** 35 × ciclos concluídos ponderados por peso ÷ ciclos elegíveis ponderados por peso.
- **Permanência, até 25:** 25 × Potência anterior ainda vigente ÷ Potência anterior. Primeiro período com potência positiva recebe 12,5.
- **Distribuição, até 20:** 20 × (1 − participação da maior linha) ÷ 0,75, limitado a 0–20. Linhas diretas são atribuídas por identidade/vínculo único.
- **Evolução, até 20:** 10 + 50 × (Potência atual ÷ Potência anterior − 1), limitado a 0–20. Sem comparação histórica, recebe 10; Potência atual zero zera o Pulso.

Os cálculos mantêm precisão interna; a pontuação exibida não deve arredondar antes da decisão. A promoção exige atingir Pulso e Potência por dois fechamentos mensais consecutivos. O fechamento deve registrar fórmula, versão e evidências. Contratos que começam ou terminam no meio do mês entram na Continuidade pelos dias elegíveis; Potência do fechamento conta somente contratos ainda vigentes na data de corte. Fuso do fechamento ainda pendente.

**Manutenção proposta:** primeiro mês consecutivo abaixo de um ou ambos os limites da etapa: 100%; segundo: 50%; terceiro e seguintes: 0% até recuperação. Retorno aos dois limites restaura 100% e zera a sequência. Etapa histórica e posição remunerada não são a mesma coisa: após dois fechamentos que confirmam promoção, o salário do novo nível começa no mês seguinte se a posição remunerada estiver confirmada e financiada para a janela comprometida.

**Caixa proposta:** até 5% de cada compra válida dos sete planos principais, repartida em cinco parcelas de competência: 4,00% para salários, 0,75% para bônus e 0,25% para reserva. Comissão de afiliado permanece separada. A proposta de bônus paga no máximo o maior elegível no mês: US$ 5 por melhora de pelo menos 10 pontos de Pulso mantida no fechamento seguinte; US$ 15 por promoção confirmada, uma vez por etapa. Bônus só pode ser creditado dentro do caixa reservado.

Na simulação do documento, cinco redes somam US$ 58.260 em compras. A reserva total de 5% é US$ 2.913 em cinco parcelas, ou US$ 582,60 por mês; os salários simulados usam US$ 460 mensais e deixam apenas US$ 6,08 na parcela de 4% destinada a salários. O documento apresenta isso como cenário de teste, não como projeção de operação real.

O documento reconhece que o teto de 5% não comprova solvência. A tela administrativa precisa simular caixa, compromissos confirmados, novos compromissos, bônus e reserva antes de habilitar uma posição. A tela do participante diferencia etapa alcançada, posição aguardando financiamento, posição confirmada, pagamento integral, reduzido e suspenso. Não mostrar salário futuro como garantido antes da confirmação.

Telas da carreira a especificar após aprovação: resumo da etapa e salário confirmado/aguardando; detalhamento dos quatro componentes do Pulso; contratos e pesos da Potência com expiração; progresso dos dois fechamentos de promoção; bônus com condição e estado; histórico separado de salários, bônus e comissões. Missões podem explicar formas de melhorar Continuidade, Permanência ou Distribuição; no lançamento descrito pela proposta, são informativas e não criam crédito adicional.

### I. Hosting, pool, AMNG OS e marketplace

O escopo enumera AMNG Host, AMNG Pool, AMNG OS, Hashrate Market e Equipment Market, mas não fornece contratos, integrações, preço, SLA, métricas ou procedimentos operacionais suficientes para implementar esses módulos integralmente.

- **AMNG Host:** inventário e propriedade do equipamento, localização física, contrato de hosting, consumo/serviços, uptime, manutenção, pool, produção e incidentes, conforme definições comerciais e dados reais.
- **AMNG Pool:** estatísticas reais do pool, hashrate, shares, workers, pagamentos, fees, integração com pools externos e reconciliação.
- **AMNG OS:** gerenciamento e otimização com permissões e trilhas para comandos em hardware.
- **Equipment Market:** catálogo, estoque, disponibilidade, venda, entrega, garantia e suporte.
- **Creators e Ambassadors:** programas citados, mas explicitamente sem regras detalhadas.

Planejar estes produtos em descoberta separada; não representar máquinas físicas, operação própria, integração ou marketplace ativo antes de comprovar disponibilidade e integrar as fontes.

### J. Painel administrativo

- Criar, revisar, programar, publicar, pausar e desativar plano/ciclo; mudanças só afetam novos contratos.
- Configurar a taxa de Profit Sharing por dia com base, fonte, vigência, autor, aprovador, valor anterior/novo e impacto estimado.
- Atualizar capacidade exibida e telemetria ligada a evidência da infraestrutura real.
- Gerenciar cupons com código, valor percentual/fixo, produtos, início/fim, usos, elegibilidade e estados.
- Programar a campanha de Black Friday semanal indicada para sextas-feiras, com timezone explícito, prévia de público e auditoria de alterações.
- Administrar tabela de afiliados e carreira por versão, com simulação antes da publicação e estorno explícito.
- Gerenciar depósitos/saques em estados, conciliar eventos sem confirmação e exportar relatório com permissão.
- Gerenciar conteúdo e ativos com revisão de alegações de renda.
- Segurança: MFA para ações sensíveis, RBAC, sessão revogável, rate limiting, confirmação semântica, logs de auditoria e aprovação em duas etapas para alterações financeiras.
- Interruptores para pausar contratação, cálculo, conversão, saque, comissões ou campanhas sem apagar histórico.

## 8. Regras monetárias e integridade de dados

### Unidade, precisão e ledger

- Guardar dinheiro em centavos inteiros; percentuais em pontos-base; nada de float binário para saldo.
- A regra exata de arredondamento por período precisa ser aprovada antes do cálculo. O valor total e as parcelas devem reconciliar sem perder frações silenciosamente.
- Identificar valor, moeda, carteira, evento de origem, contrato, cotação e instante do evento.
- Ledger append-only com chave idempotente derivada do evento econômico. Clique duplicado, callback, job ou retry não pode lançar duas vezes.
- Débito não pode deixar carteira negativa. Estorno deve gerar evento compensatório ligado ao evento original.
- Processamento em transação do banco com controle de concorrência.
- Tarefas periódicas processam do último período liquidado até o vencido; reexecutar cron recupera atraso sem duplicidade.
- Operação externa ambígua entra em conciliação; não presumir falha, estornar automaticamente nem reenviar dinheiro.

### Dados de domínio a planejar

- Identidade, sessões, verificações e papéis administrativos.
- Vínculo de patrocinador/linha com histórico e regra de imutabilidade.
- Catálogo de produtos e versões aprovadas.
- Contrato e snapshot de termos, moedas, taxas, duração, condição de ativação e capacidade.
- Ativações, ciclos de 24 horas, execuções de cálculo e liquidações.
- Cotações externas com fonte, moeda de referência, valor e timestamp.
- Carteiras por finalidade, lançamentos, reservas e eventos compensatórios.
- Depósitos, saques, callbacks, referências externas e conciliações.
- Comissões, regra/versão, linha, elegibilidade e evento base.
- Fechamentos da carreira, componentes, versão da fórmula, orçamento, posição, folha e bônus.
- Coupons, campanhas, conteúdo aprovado, auditoria e trilha de alterações.
- Inventário e telemetria de mineração com origem, timestamp, freshness e estado de falha.

## 9. Arquitetura técnica inicial

**RECOMENDAÇÃO DE PRODUTO:** começar por um monólito modular com limites claros e banco transacional; separar serviços só quando escala, disponibilidade ou equipe exigirem. A tecnologia final depende de repositório, hospedagem, equipe, provedor de pagamento e integrações disponíveis; os PDFs não escolhem stack.

### Domínios separados

1. Identidade e acesso.
2. Catálogo, cupons e contratos.
3. Ledger e carteiras.
4. Mining Income, ciclos e produção.
5. Profit Sharing.
6. Hashrate Market.
7. Rede e afiliados.
8. Carreira e orçamento.
9. Pagamentos e conciliação.
10. Telemetria, pool e equipamento.
11. Admin, auditoria, suporte e conteúdo.

### Fronteiras de confiança

- Backend aplica autorização, regras, cálculos e consistência; front-end não envia saldo calculado pelo cliente.
- Banco SQL transacional é a fonte do ledger e snapshots. Cache e filas podem acelerar tela/trabalho, nunca ser autoridade de saldo.
- Workers idempotentes cuidam de ciclos, fechamentos e atualizações; cada execução é observável e recuperável.
- Adaptadores isolam gateway, cotações, pool e telemetria. Registrar versão, timestamp, último estado válido e obsolescência do dado.
- API separa público, participante, administrador de leitura, operador e mutação administrativa.
- Armazenar segredos fora do código e do log. MFA e confirmação reforçada para operações de risco.
- Relatórios reproduzem a regra e a versão usada no evento original.

## 10. Segurança, privacidade e conformidade

Definir jurisdições, estrutura contratual, custodiante, gateway e fluxo real de dinheiro antes de colocar compra, saque ou comissão em produção. As fontes anexadas descrevem taxas diárias, participação em resultados e remuneração multinível; isso torna a revisão jurídica, contábil, fiscal e de proteção ao consumidor uma dependência de produto, não uma etapa cosmética.

Para distribuição nos Estados Unidos, a SEC explica que a análise de investimento em ativos digitais depende dos fatos e circunstâncias e pode considerar investimento de valor, empreendimento comum, expectativa de lucro e esforços gerenciais de terceiros. A FTC orienta que alegações de renda em MMNs sejam verdadeiras, substanciadas e representativas, considerando despesas e experiência típica; depoimentos atípicos e cenários hipotéticos podem transmitir expectativas enganosas. A FinCEN avalia atividades de transmissão de moeda virtual conversível conforme o fluxo e os papéis da empresa. Estas referências não classificam o AMNG; counsel deve avaliar o modelo e cada mercado antes da publicação e habilitação financeira:

A página da FTC identifica o material citado como orientação não vinculante da equipe da Comissão.

- [SEC — Transactions Involving Crypto Assets](https://www.sec.gov/resources-small-businesses/capital-raising-building-blocks/transactions-involving-crypto-assets)
- [FTC — Business Guidance Concerning Multi-Level Marketing](https://www.ftc.gov/business-guidance/resources/business-guidance-concerning-multi-level-marketing)
- [FinCEN — Application of FinCEN’s Regulations to Persons Administering, Exchanging, or Using Virtual Currencies](https://www.fincen.gov/resources/statutes-regulations/guidance/application-fincens-regulations-persons-administering)

### Controles de segurança propostos

- MFA para administradores e ações financeiras sensíveis; gestão de sessão, revogação e autenticação resistente a enumeração.
- KYC/KYB, sanções, monitoramento de fraude e AML definidos com fornecedores e regras por jurisdição, quando aplicáveis.
- Rate limiting, prevenção de CSRF/XSS/SQL injection, validação server-side, proteção de segredos e rotação.
- Autorização por recurso e papel; um participante nunca lê conta ou extrato de outra pessoa.
- Auditoria com autor, instante, ação, valor anterior/novo, motivo e aprovação, sem gravar senha, token ou segredo.
- Logs estruturados sem dados sensíveis; políticas de retenção, acesso, exportação e exclusão.
- Backup, restauração ensaiada, monitoramento dos jobs, callbacks, estoque/telemetria e divergências.
- Resposta a incidentes, indisponibilidade, rollback e pausa segura de novos fluxos.
- Termos, política de privacidade, consentimentos, divulgação de riscos, custos, funcionamento e renda revisados por profissionais responsáveis.

## 11. Decisões abertas e bloqueios

Priorizar estas definições no planejamento detalhado. Enquanto uma decisão de dinheiro estiver pendente, o módulo correspondente deve ficar desligado.

### Matriz inicial de decisões

| Tema | Estado | Base / decisão atual | Fonte | Responsável por fechar |
|---|---|---|---|---|
| Direção visual escura, tecnológica e premium, com movimento de qualidade | CONFIRMADO | Pedido explícito; animações devem permanecer acessíveis e fiéis ao estado do servidor. | Pedido direto | Produto e Design |
| Nome público e uso de AMNG | PENDENTE | Pedido diz AMERICAN MINERS; PDFs e logo dizem AMERICAN MINING. | Pedido, PDFs e imagens | Responsável pela marca |
| Logo final para fundo escuro | PENDENTE | Há referências raster em fundo branco; falta arte final vetorial e regra de aplicação. | Imagens 1–3 | Marca / Design |
| Módulos do ecossistema | PENDENTE | Escopo enumera Cloud, Host, Pool, Hashrate, OS, Equipment Market e afiliados; ordem e lançamento ainda não aprovados. | Escopo, p. 2 e 6 | Produto e Operações |
| Sete planos Cloud e preços/taxas | PENDENTE | Valores estão documentados, mas exigem confirmação operacional e comercial antes da publicação. | Escopo, p. 2 | Produto, Financeiro e Operações |
| Base, arredondamento, liquidação e conversão do Mining Income | PENDENTE | Regras não estão fechadas; exemplo de 0,90% não coincide com taxa ALPH de 0,86%. | Escopo, p. 2–5 | Financeiro, Contabilidade e Engenharia |
| Base e funding do Profit Sharing | PENDENTE | Faixa 0,90%–1,10% está documentada; fórmula de participação e origem verificável não estão definidas. | Escopo, p. 2 e 6 | Financeiro, Operações e Jurídico |
| Hashrate Market e saques | PENDENTE | Mínimo e taxa diária estão documentados; base, funding e processamento de retirada não. | Escopo, p. 5 | Financeiro, Operações e Jurídico |
| Taxas e calendário dos ciclos | PENDENTE | Preços/durações estão listados; taxas, fuso e regras de liquidação não. | Escopo, p. 5 | Produto e Financeiro |
| Comissão de primeira compra e recompras | PENDENTE | Taxas estão listadas; N7 da primeira compra, base, elegibilidade e estorno não. | Escopo, p. 5 | Produto, Financeiro e Jurídico |
| Pulso, Potência, salários, bônus e caixa de 5% | PENDENTE | Documento classifica números como proposta para aprovação, não como regra autorizada. | Proposta de carreira, p. 1–10 | Diretoria, Financeiro, Contabilidade e Jurídico |
| Jurisdições, identidade, pagamentos e requisitos de privacidade | PENDENTE | Países, provedor, dados exigidos, fuso e obrigações não foram definidos. | Não especificado; requer pesquisa e decisão | Diretoria, Jurídico e Operações |
| Fontes reais de hashrate, produção, pool e cotação | PENDENTE | A interface não pode usar números fictícios; fontes e integrações ainda não foram indicadas. | Escopo, p. 2, 4–6 | Operações de Mineração e Engenharia |
| Ativação visual versus estado físico da máquina | PENDENTE | Recomendação deste plano: ciclo do usuário e telemetria do ASIC aparecem em estados separados. | Escopo, p. 3–4; recomendação | Produto e Operações |
| Funções on-chain / token / conexão de wallet | NÃO SE APLICA AO ESCOPO ATUAL | O pedido solicita inspiração visual Web3; nenhuma função blockchain foi especificada. Reabrir somente com novo requisito explícito. | Pedido direto e PDFs | Produto |
| Creators e Ambassadors | NÃO SE APLICA AO MVP | O escopo menciona programas futuros sem regras. | Escopo, p. 2 e 6 | Produto |
| Stack, provedor, ambiente e hospedagem | PENDENTE | O diretório contém os PDFs e assets de marca, sem aplicação existente ou escolha técnica. | Inspeção do workspace em 27/09/2026 | Liderança técnica |
| WCAG 2.2 AA como meta formal | PENDENTE | Recomendação deste plano; confirmar como critério contratual de produto. | Recomendação / W3C | Produto e Design |

### Bloqueios de lançamento financeiro

1. Nome legal e comercial final, jurisdições, países aceitos, idioma, moeda de conta e fuso financeiro.
2. Evidência da infraestrutura real, equipamentos, contratos, hashrate disponível, pools, fonte de produção e cotação.
3. Classificação jurídica por produto e público; licenças/registro, custódia, AML/KYC/KYB, impostos, proteção ao consumidor, termos e privacidade.
4. Para cada plano Cloud: base do percentual, cálculo simples/composto, período de apuração, ativação e tolerância, regra de conversão, moeda de crédito, custos, devolução de principal, encerramento, cancelamento, reembolso e perda por indisponibilidade.
5. Taxa de Profit Sharing: base de cálculo, origem operacional verificável, critérios de distribuição, limite, vigência, funding e como exibir variação.
6. Hashrate Market: base/compounding, funding, risco, disponibilidade real, solicitação e janela de retirada, eventuais limitações e liquidação.
7. Ciclos: taxas, produtos/moedas elegíveis, calendário/fuso, ciclo de contratação, capacidade e encerramento.
8. Depósitos/saques: provedor, moeda/rede, mínimos/máximos, taxas, confirmação, prazo, fuso, KYC, carteira de origem, reserva, recusa, timeout e reembolso.
9. Afiliados: N7 da primeira compra; evento e base; momento de crédito; elegibilidade; níveis; compressão; estornos, cancelamento, teto e impostos.
10. Carteiras: saque e compra permitidos por finalidade, sub-ledger, bloqueio, validade e tratamento de saldos no encerramento.
11. Carreira: aprovar ou rejeitar cada peso/limite/salário/bônus; definição de período e fuso; contratos elegíveis; retenção; devoluções; data da folha e duração da janela financiada da posição; regra para estorno retroativo.
12. Produto e interface: palavra MINING ou MINERS, uso final do logo, serviços no lançamento, tom de voz, telas públicas, canais de suporte e idiomas.

### Pontos do escopo que exigem reconciliação

- A tabela ALPH registra taxa de 0,86%, mas o PDF usa um exemplo isolado de US$ 600 × 0,90% = US$ 5,40. Não usar o exemplo como promessa nem como taxa do plano ALPH até confirmação.
- A taxa de cada plano e as taxas de Profit Sharing/Hashrate Market não explicam por si só a base, o arredondamento, a origem de caixa ou a liquidação. Não calcular projeções publicáveis a partir apenas desses números.
- Na primeira compra, N7 está pendente; não reduzir/repartir automaticamente comissões nem comprimir níveis.
- O documento de carreira chama números de proposta; confirmação de estágio pode existir sem posição paga. Preservar essa separação na interface e na folha.
- O orçamento de carreira de 5% não comprova capacidade de pagamento; caixa, compromisso e aprovação precisam ser validados com dados reais antes de liberar salários/bônus.

## 12. Entrega por fases

### Fase 0 — decisões, prova operacional e design

- Validar nome, mercado, operação física, equipamento, contrato, classes de renda e políticas.
- Fechar matriz de requisitos e estados CONFIRMADO / PENDENTE / NÃO SE APLICA com responsável e evidência.
- Mapear experiência, wireframes, protótipo de dashboard, catálogo e máquina OFFLINE/ONLINE.
- Aprovar linguagem e dados que podem ser publicados; definir a fonte de cada número.
- Resultado de saída: nenhum fluxo monetário com regra pendente e nenhum número promocional sem comprovação.

### Fase 1 — plataforma e administração de base

- Identidade, acesso, papéis e infraestrutura.
- Ledger por finalidade, auditoria, catálogo versionado, contratos com snapshot e extrato.
- Painel administrativo inicial, feature flags, observabilidade, conciliação e conteúdo.
- Fluxo de depósito/saque só entra depois de provedor e regras aprovados.

### Fase 2 — Cloud Mining

- Catálogo dos sete planos com informações verificadas.
- Gestão de contratação e contrato 130 dias.
- Minhas máquinas, ativação 24h, ciclo, telemetria e cálculo idempotente.
- Quotes com timestamp, conversão e extratos separados.
- Só liberar o cálculo financeiro após regra aprovada e homologação operacional.

### Fase 3 — rede e carreira

- Patrocinador, rede, comissão e estornos após resolver todas as pendências de níveis/base/eligibilidade.
- Pulso/Potência em modo de simulação e histórico reproduzível; folha real somente após aprovação dos valores, orçamento e obrigações.
- Relatórios e telas de suporte/auditoria.

### Fase 4 — Hashrate Market e ciclos

- Modelar ledger próprio, taxas e retiradas aprovadas; datas e regras de ciclos com fonte de dados e capacidade.
- Entrada em produção separada e controlada por feature flag.

### Fase 5 — Hosting, Pool, AMNG OS e marketplace

- Discovery de contrato, telemetria, integração de hardware/pool, inventário, serviço, SLA, cobrança, estoque e suporte.
- Construir cada módulo conforme evidências e APIs reais.
- Creators e Ambassadors ficam fora até haver regras.

### Fase 6 — qualidade e lançamento gradual

- Testes do motor financeiro para centavos/fronteiras, duplicidade, concorrência, estorno e histórico.
- Testes de fluxo e autorização por papel; navegação por teclado; preferências de movimento; dispositivos móveis; estados vazios e falhas.
- Homologar pagamentos, cotações e fontes de mineração; ensaiar reconciliação, backup/restauração e rollback.
- Ativar para pequeno grupo em modo controlado, acompanhar discrepâncias e só então ampliar disponibilidade.

## 13. Critérios de aceite do sistema

### Produto e UI

- Participante entende em até uma tela inicial os três saldos, contrato ativo, próxima ação e alertas.
- Taxa tem moeda, base, periodicidade, duração, status e condição ao lado; projeção não é apresentada como garantia.
- Contratado, pendente, bloqueado, expirado, cancelado, ONLINE e OFFLINE têm rótulo textual e estado acessível.
- START MINING não fica visualmente ONLINE até resposta oficial; repetir clique não cria ciclo duplicado.
- Produção visual se sincroniza com resposta do servidor e não altera saldo em refresh, aba duplicada ou outro aparelho.
- Movimentações permitem rastrear origem e regra pelo extrato.
- Todas as tarefas essenciais funcionam no mobile, com teclado, leitor de tela e movimento reduzido.

### Operação e financeiro

- Duas chamadas com mesma chave de negócio produzem no máximo um lançamento.
- Worker atrasado consegue processar períodos vencidos sem crédito duplicado.
- Estorno conserva referência e história; contrato usa sua versão inicial do produto.
- Falha externa incerta preserva reserva e exige conciliação, sem falso sucesso.
- Admin não publica taxa/regra sem versão, justificativa, trilha e aprovador exigido.
- Features financeiras pendentes ficam desligadas no backend, mesmo que alguém manipule o cliente.
- Telemetria obsoleta ou ausente é mostrada como indisponível/desatualizada, não como operação online.

## 14. Métricas de sucesso

Medir confiança e execução da tarefa, sem incentivar compra ou recrutamento por meio de promessas:

- conclusão de onboarding, login seguro e recuperação de conta;
- taxa de sucesso de ativação válida e incidência de ciclos duplicados;
- tempo para localizar origem, estado e disponibilidade de uma movimentação;
- discrepâncias entre produção/quote exibidos e fontes confirmadas;
- erros de compra, depósito, saque e conciliação por estado;
- divergências de ledger e reprocessamentos idempotentes;
- disponibilidade de páginas e jobs financeiros;
- acessibilidade e desempenho real em aparelhos representativos;
- volume e resolução de dúvidas sobre taxas, bloqueios e prazos.

Definir baseline e metas numéricas após pesquisa com usuários, protótipo e capacidade operacional. Não adotar “valor investido”, “convites” ou “taxa de conversão” isoladamente como medida de boa experiência.

## 15. Instrução de continuidade para Luna

Usar este arquivo como base de planejamento do AMNG. Primeiro inspecionar o repositório e os ativos atuais; não presumir stack, jurisdição, operação de mineração ou API disponível. Converter este plano em PRD rastreável, decisões de domínio, mapa de navegação, fluxos, estados de tela, arquitetura proposta, modelo de dados, APIs, backlog por fase, critérios de aceite e plano de homologação. Manter a distinção entre pedido direto, requisito documentado e proposta. Produzir uma matriz CONFIRMADO / PENDENTE / NÃO SE APLICA com fonte e responsável. Não inventar regras monetárias nem publicar retorno, hashrate, preço ou saldo sem base real e aprovação. Preparar protótipo premium escuro com linguagem industrial própria AMNG, usando vermelho/azul como acentos disciplinados e movimento acessível. Encerrar apontando decisões humanas e jurídicas que bloqueiam cada fluxo financeiro.

## 16. Instrução de continuidade para GPT‑6 Sol

Implementar somente após o planejamento Luna e as decisões pendentes serem aprovadas. Ler as instruções locais do repositório. Construir primeiro domínio financeiro, contratos versionados, ledger, autorização e processamento idempotente; depois ligar portais e animações à API real. Não alterar parâmetros aprovados sem nova versão nem substituir integração real por dados fictícios. Desenvolver UI premium alinhada a este documento, com animações de máquina disparadas por estado servidor e alternativa de movimento reduzido. Concluir cada fase com evidências de funcionamento, segurança, acessibilidade e reconciliação financeira; documentar qualquer integração ou validação que ainda não possa ser homologada.

## 17. Fontes usadas

- American_Mining_AMNG_Escopo_Plataforma.pdf: escopo funcional, produtos, planos, carteiras, telas, percentuais e pendências. Referências principais: páginas 2–6.
- AMNG_Carreira_Pulso_Potencia_Salarios_Bonus.pdf: proposta de Pulso + Potência, fórmulas, etapas, orçamento, bônus, simulações e pendências. Referências principais: páginas 1–10.
- Imagens anexadas 1–3: símbolo de barras e logotipos raster AMNG / AMERICAN MINING em fundo claro.
- [W3C — WCAG 2.2](https://www.w3.org/TR/WCAG22/): referência para a meta de acessibilidade.
- [SEC — Transactions Involving Crypto Assets](https://www.sec.gov/resources-small-businesses/capital-raising-building-blocks/transactions-involving-crypto-assets), [FTC — Business Guidance Concerning Multi-Level Marketing](https://www.ftc.gov/business-guidance/resources/business-guidance-concerning-multi-level-marketing) e [FinCEN — Virtual Currency Guidance](https://www.fincen.gov/resources/statutes-regulations/guidance/application-fincens-regulations-persons-administering): referências oficiais para revisão por jurisdição; não são parecer sobre a classificação do AMNG.
