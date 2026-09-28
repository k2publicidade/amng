# AMNG — marca, produtos e movimento

## Marca

`logo.jpeg`, `logo2.jpeg` e `icon.jpeg` são as referências fornecidas pelo projeto. Os arquivos originais permanecem intactos.

`src/components/Brand.tsx` contém uma interpretação vetorial para aplicação em fundo preto: símbolo de quatro barras vermelhas com segmentos azuis, palavra AMNG em branco quente e assinatura Cloud Mining Service. As letras são paths SVG para manter forma e espaçamento durante o carregamento das fontes. `compact` exibe apenas o símbolo. `public/assets/amng-symbol.svg` é a adaptação autoral para favicon.

## Equipamentos usados pela interface

Os ativos são imagens de referência para identificação de família/modelo. A interface não extrai capacidade, consumo, temperatura, produção ou condição física dessas imagens. Os valores do produto e os ciclos vêm da aplicação e de suas regras documentadas.

| ID | Referência visual | Arquivo servido | Origem do ativo |
| --- | --- | --- | --- |
| `sc` | Goldshell SC BOX | `/assets/miners/sc.png` | [Mining Now — SC BOX](https://miningnow.com/asic-miner/goldshell-sc-box-900gh-s/) · [PNG original](https://mining-now.s3.us-east-2.amazonaws.com/prod/asic-miner/goldshell-sc-box-900gh-s/goldshell-sc-box-ok-1719489652550.png) |
| `etc` | JASMINER X16, variante de referência X16-Q | `/assets/miners/etc.png` | [Jasminer Europe — família X16](https://www.jasminer.eu/products/jasminer-x16) · [PNG original](https://www.jasminer.eu/cdn/shop/files/jasminer-product-x16q-front.png?v=1711017420&width=1200) |
| `ckb` | ANTMINER K7 | `/assets/miners/ckb.png` | [Mining Now — K7](https://miningnow.com/asic-miner/bitmain-antminer-k7-58th-s/) · [PNG original](https://mining-now.s3.us-east-2.amazonaws.com/prod/asic-miner/bitmain-antminer-k7-58th-s/antminer-k7-ok-1707994878768.png) |
| `kda` | ANTMINER KA3 | `/assets/miners/kda.png` | [Mining Now — KA3](https://miningnow.com/asic-miner/bitmain-antminer-ka3-166th-s/) · [PNG original](https://mining-now.s3.us-east-2.amazonaws.com/prod/asic-miner/bitmain-antminer-ka3-166th-s/antminer-ka3-ok-1708023665598.png) |
| `alph` | ICERIVER AL3 | `/assets/miners/alph.png` | [Mining Now — AL3](https://miningnow.com/asic-miner/iceriver-al3-15th-s/) · [PNG original](https://mining-now.s3.us-east-2.amazonaws.com/prod/asic-miner/iceriver-al3-15th-s/iceriver-al3-1739275617310.png) |
| `doge` | VOLCMINER D1 | `/assets/miners/doge.png` | [Mining Now — D1](https://miningnow.com/asic-miner/volcminer-d1-18-5gh-s/) · [PNG original](https://mining-now.s3.us-east-2.amazonaws.com/prod/asic-miner/volcminer-d1-18-5gh-s/volcminer-d1-1741082852514.png) |
| `btc` | Avalon A1566 | `/assets/miners/btc.png` | Recorte derivado do [banner oficial Canaan](https://static.canaan.io/prod/u_file/2408/01/20240801-145316-f162.jpg), identificado na [loja oficial Canaan](https://shop.canaan.io/) |

As seis primeiras imagens mantêm os arquivos originais com transparência. O A1566 foi preparado com a ferramenta integrada `image_gen`: extração do equipamento em primeiro plano, remoção do segundo equipamento, do reflexo, do texto promocional e dos anéis luminosos da publicidade. É uma imagem de referência derivada, não uma fotografia operacional nem evidência de equipamento instalado.

Os direitos das imagens e das marcas dos fabricantes permanecem com seus titulares. As fontes ficam registradas para manutenção e atribuição. Fotos primárias, referências baixadas e derivações alternativas estão em `docs/assets/references/`, fora dos ativos servidos pela aplicação. `public/assets/` contém somente as versões apagadas e ligadas dos sete produtos consumidos pela interface e o favicon.

## Fontes primárias consultadas

- [Goldshell — especificações da série BOX](https://goldshellhelp.zendesk.com/hc/en-us/articles/17466093334809-BOX-Series-Miner-Specifications) e [tutorial oficial BOX](https://goldshellhelp.zendesk.com/hc/en-us/articles/17608608063513-BOX-Series-Tutorial).
- [BITMAIN — ANTMINER K7](https://support.bitmain.com/hc/en-us/articles/15630000134169-ANTMINER-K7) e [apresentação oficial KA3](https://www.bitmain.com/activity/ka3). O [poster KA3 original](https://www-static.bitmain.com/_nuxt/img/fd26e56.jpg) está preservado nas referências.
- [ICERIVER — AL3](https://www.iceriver.io/product/iceriver-alph-al3/) e [foto oficial AL3](https://www.iceriver.io/wp-content/uploads/2018/08/al302.png).
- [VOLCMINER — catálogo oficial](https://www.volcminer.com/Product/).
- [Canaan — anúncio A1566](https://investor.canaan-creative.com/node/7956/pdf) e [loja oficial](https://shop.canaan.io/).

## Componentes

```tsx
import Brand from './components/Brand';
import Preloader from './components/Preloader';
import MinerVisual from './components/MinerVisual';

<Brand />
<Brand compact />
<Preloader ready={bootstrapReady} onComplete={finishOpening} />
<MinerVisual planId="alph" variant="hero" active={cycleActive} starting={activationEntry} />
<MinerVisual planId="ckb" variant="card" />
<MinerVisual planId="btc" variant="compact" />
```

Os componentes importam `visuals.css` diretamente. Classes possuem prefixo `visuals-`. Os tipos `BrandProps`, `PreloaderProps` e `MinerVisualProps` são exportados; `Brand` também possui exportação nomeada. O mapa `minerVisuals` contém nome, imagem apagada, `onImage` e pontos de iluminação das imagens. As cores vêm de `shared/miner-theme.ts`, a mesma fonte usada pelo restante da aplicação. `active` representa ciclo confirmado no servidor; `starting` representa apenas sua sequência de entrada de 3,6 segundos, controlada pela aplicação. Durante essa sequência, as duas propriedades são `true`.

Se uma imagem não carregar, `MinerVisual` usa uma ilustração SVG original identificada como “Representação visual”. Essa ilustração tem detalhe industrial, mas não se apresenta como fotografia ou modelo exato. Não há fontes remotas adicionais necessárias para o catálogo servido.

## Movimento

- Preloader: quatro barras em sequência, logo com entrada de 10 px, linha curta de progresso ornamental e saída de 360 ms. Permanece no mínimo 900 ms; inicia a saída aos 3.000 ms mesmo sem `ready`. A conclusão ocorre em aproximadamente 3.360 ms no limite normal. A camada não possui elementos focáveis e desativa eventos de ponteiro ao sair.
- Seleção de equipamento: `AnimatePresence` com chave `planId`; recorte lateral, deslocamento máximo de 24 px, escala de entrada de 0,97 e opacidade, com curva `[0.22, 1, 0.36, 1]` e duração de 600 ms. O produto mantém pose e proporções.
- Estado `active`: usa a versão derivada ligada, com iluminação localizada e brilho ambiente discreto, enquanto o ciclo confirmado permanece ativo. Ao reabrir uma máquina já ativa, a imagem ligada aparece imediatamente. Iluminação e pequenos arcos nos hubs são representações visuais do ciclo; não são telemetria ou confirmação de funcionamento físico.
- Carregamento das camadas: a foto apagada permanece visível até que a ligada tenha carregado. Uma falha no PNG ligado conserva a referência original com iluminação ornamental, evitando desaparecer com o equipamento. A seleção de modelo monta camadas independentes; nenhum ativo recebe filtro global para simular a cor de outro modelo.
- Entrada `starting`: 0–0,5 s mantém a foto apagada; LEDs e iluminação entram progressivamente, a foto ligada alcança opacidade integral em cerca de 2,2 s e a sequência estabiliza aos 3,6 s. Camadas usam o mesmo stage e `object-fit: contain`, sem transformações independentes no equipamento. O hero pré-carrega a versão ligada.
- Movimento reduzido: sem deslocamento ou recorte nos equipamentos, transição de seleção de 160 ms e saída do preloader de 120 ms. A ativação aplica imediatamente a imagem ligada, sem sequência, rotação de luz, brilho pulsante ou animações das barras e linha.

## Prompts das derivações por `image_gen`

Modo utilizado: ferramenta integrada; nenhuma edição por Python, canvas ou CLI. Todos os arquivos de entrada foram inspecionados com `view_image`. Foram criadas três derivações transparentes, das quais apenas a do A1566 é consumida pelo catálogo final; AL3 e KA3 passaram a usar originais transparentes encontrados posteriormente.

### AL3 — variante preservada em `docs/assets/references/alph-cutout.png`

> Use case: background-extraction. Asset type: dark mining dashboard product cutout. Input image 1 is the edit target: the official ICERIVER AL3 product photograph. Primary request: remove only the pure white backdrop and keep the mining machine as a clean, genuine transparent-background cutout. Keep the exact hardware shape, proportions, visible two front fans, silver metal casing, screw positions, angle, ICERIVER marking, lighting and every product detail unchanged. Entire device visible, centered with a narrow transparent margin. True alpha transparency outside the device, not white, not a checkerboard, no new text or graphics. No stylization, no additional glow, no invented hardware. Preserve photograph fidelity.

### KA3 — variante preservada em `docs/assets/references/kda-cutout.png`

> Use case: background-extraction. Asset type: dark mining dashboard product cutout. Input image 1 is the official BITMAIN ANTMINER KA3 product poster and the edit target. Primary request: extract ONLY the upper-right hardware product photograph as a single clean transparent-background cutout. Keep the exact ANTMINER KA3 device shape, its tall two black front fans, silver metal case, narrow right-side silver power-supply assembly, small stacked PSU fans, cables, screw locations and camera angle. Remove all poster text, all banner graphics, and remove all other repetitions of the device. Entire hardware device visible, centered, narrowly padded on a genuine alpha transparent backdrop. Retain realistic product photography, no new branding, no text, no lights, no stylization. Do not alter hardware geometry, do not invent ports or design details.

### A1566 — ativo final em `/assets/miners/btc.png`

> Use case: background-extraction. Asset type: mining dashboard product cutout. Input image 1 is the official Canaan Avalon Miner A1566 advertising banner and the edit target. Extract ONLY the large foreground Avalon A1566 mining machine at the right as one isolated clean product photograph on a true transparent alpha background. Keep its exact tall silver metal body, two stacked square black front fans, left-side AvalonMiner logo, control ports and visible cabling, viewing angle and original hardware proportions. Remove the blue glowing advertising rings from the fans to reveal natural dark black fan grilles underneath; keep the real fan shape. Remove the second smaller device, floor reflection, all advertising text, blue background and decorative lights. Entire single device visible and centered with a narrow transparent margin. Real metal studio photograph, no added features, no invented manufacturer text, no stylization, no background, no pedestal.

## Sete versões ligadas e cores individuais

Referência do proprietário: `docs/design/machine-power-reference.png`. O catálogo mantém os sete modelos documentados; a referência visual também contém equipamentos que não pertencem a este catálogo.

| ID / modelo | Apagada | Ligada | Cor da ativação | Hex |
| --- | --- | --- | --- | --- |
| SC / Goldshell SC BOX | `/assets/miners/sc.png` | `/assets/miners/sc-on.png` | Turquesa | `#39D8B8` |
| ETC / JASMINER X16 | `/assets/miners/etc.png` | `/assets/miners/etc-on.png` | Verde vivo | `#7DE52F` |
| CKB / ANTMINER K7 | `/assets/miners/ckb.png` | `/assets/miners/ckb-on.png` | Laranja | `#FF9D23` |
| KDA / ANTMINER KA3 | `/assets/miners/kda.png` | `/assets/miners/kda-on.png` | Azul | `#248CFF` |
| ALPH / ICERIVER AL3 | `/assets/miners/alph.png` | `/assets/miners/alph-on.png` | Ciano | `#14D8DD` |
| DOGE / VOLCMINER D1 | `/assets/miners/doge.png` | `/assets/miners/doge-on.png` | Dourado | `#FFD24A` |
| BTC / Avalon A1566 | `/assets/miners/btc.png` | `/assets/miners/btc-on.png` | Branco azulado | `#CFE9FF` |

Os sete PNGs ligados mostram a iluminação dentro dos ventiladores, reflexos localizados nas grades e indicadores iluminados. Não representam fotos operacionais. Carcaça, pose, proporções, cabos e marcações mantêm a referência do equipamento apagado. Ambas as camadas usam a mesma caixa com `object-fit: contain`; as seis primeiras imagens ligadas são quadradas de 1.254 × 1.254 px, e a A1566 preserva 1.181 × 1.332 px, igual à versão apagada. Não há deformação por escala independente.

### Outputs reaproveitados e inspecionados

Estes outputs foram encontrados já gerados pela ferramenta integrada, inspecionados com `view_image` e copiados para os caminhos finais. Foram conferidos pose, equipamento inteiro, cor e transparência. Os prompts originais desta geração anterior não estão registrados neste documento; os arquivos abaixo identificam as derivações sem recriá-las.

Diretório de origem: `C:/Users/LiPeX/.codex/generated_images/01a0e540-0f07-7762-a4da-83130f8df82d/`.

| Modelo | Output selecionado | Caminho final no workspace |
| --- | --- | --- |
| K7 | `exec-61472bd0-fd0e-4d87-8af0-858c970a2281.png` | `public/assets/miners/ckb-on.png` |
| KA3 | `exec-33d6cb8a-f223-4e6c-86cc-9ee76abe5d56.png` | `public/assets/miners/kda-on.png` |
| AL3 | `exec-18935e7f-d4bf-4fd4-a23d-d9bc743961ae.png` | `public/assets/miners/alph-on.png` |
| D1 | `exec-7c13cd93-ba14-4302-afc4-54467926ad7b.png` | `public/assets/miners/doge-on.png` |
| A1566 | `exec-0256a1b0-b41f-449f-9113-8620c66ec20e.png` | `public/assets/miners/btc-on.png` |

### Correção SC BOX — prompt utilizado

Entrada: versão ligada anterior, preservada em `docs/assets/references/sc-on-v1.png`. Output: `C:/Users/LiPeX/.codex/generated_images/01a0e72b-cece-7b30-b282-e8c87ccaaa81/exec-a8653f13-219a-4ca4-b7f0-1f4fc5d42618.png`, copiado para `public/assets/miners/sc-on.png`.

> Use case: lighting-weather. Asset type: transparent mining dashboard powered-on product cutout. Input image 1 is the edit target, the exact existing powered-on Goldshell SC BOX photograph. Primary request: change ONLY the green fan illumination and green edge reflections to the SC model's own saturated TURQUOISE blue-green light, hue matching #39D8B8. Turquoise must visibly differ from the bright lime green ETC model and from the blue-cyan ALPH model. Keep the same moderate localized light intensity, lit internal fan hubs, natural metallic reflections. Preserve exactly the original device geometry, perspective, complete silhouette, canvas aspect ratio, padding, two fans, wire grilles, screws, ports, labels, silver color, and all unaffected pixels. Do not move or rescale the device. Keep a genuine transparent alpha background outside the equipment, with no scenery, shadows outside, checkerboard or floor. No extra fan, text, logo, particles, halo rings or hardware. This is only a localized light color correction; avoid green-only lighting, aqua-white washout or global recoloring.

### Correção JASMINER X16 — prompt utilizado

Entrada: versão ligada anterior, preservada em `docs/assets/references/etc-on-v1.png`. Output: `C:/Users/LiPeX/.codex/generated_images/01a0e72b-cece-7b30-b282-e8c87ccaaa81/exec-df6ff333-8855-4b99-be1e-2f216ea19d6e.png`, copiado para `public/assets/miners/etc-on.png`.

> Use case: lighting-weather. Asset type: transparent mining dashboard powered-on product cutout. Input image 1 is the edit target, the exact existing powered-on JASMINER X16 Q photograph. Primary request: change ONLY the mint/turquoise fan illumination to vivid fresh LIME GREEN LEDs, hue matching #7DE52F, the ETC model's individual power-on color. All three fan hubs and grille illumination should be clearly green (slightly yellow green), never teal, mint, aqua or cyan. Keep controlled luminous intensity, local reflections and readable dark fan grilles, with a silver-black casing. Preserve exactly the same device geometry, perspective, complete silhouette, padding, canvas aspect ratio, perforated front face, three fans, screws, ports, gold JASMINER logo and all unaffected detail. Do not move or rescale the device. Keep a genuine transparent alpha background outside the equipment, with no scenery, checkerboard or floor. No additional branding, text, particles, rings or invented hardware. Change only the light hue; do not recolor the gold logo or the whole casing.

### Evidência dos arquivos

`docs/assets/miners-manifest.json` registra os 14 arquivos finais, dimensões, hashes SHA-256 e alpha dos quatro cantos. Todos têm canal alpha; os cantos das versões ligadas são transparentes ou têm alpha residual de 1/255, imperceptível na composição. A conferência de arquivos e imagens não homologa telemetria física ou integração de mineração.
