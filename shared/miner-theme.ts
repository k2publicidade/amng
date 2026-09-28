/** Visual identity from the owner's off/on machine reference. */
export const MINER_ACCENTS: Readonly<Record<string, string>> = Object.freeze({
  sc: '#39D8B8',
  etc: '#7DE52F',
  ckb: '#FF9D23',
  kda: '#248CFF',
  alph: '#14D8DD',
  doge: '#FFD24A',
  btc: '#CFE9FF',
});

export const minerAccent = (planId: string) => MINER_ACCENTS[planId] ?? '#8EBADA';
