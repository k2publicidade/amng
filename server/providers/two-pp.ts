/** 2PP has been selected by the product owner. Its API contract has not yet been supplied.
 * Authentication, endpoint paths, amounts/currency and signature verification must be
 * implemented from that contract. Never substitute a similarly named provider. */
export type ProviderState='NOT_CONFIGURED'|'CONTRACT_PENDING'|'READY';
export interface PaymentCommand { reference:string;amountCents:number;currency:string; }
export interface ProviderPayment { reference:string;state:'PENDING'|'CONFIRMED'|'FAILED'|'REVIEW_REQUIRED';externalId:string; }
export interface PaymentProvider {
  name:'2PP';state:ProviderState;
  createDeposit(command:PaymentCommand):Promise<ProviderPayment>;
  sendWithdrawal(command:PaymentCommand):Promise<ProviderPayment>;
  verifyWebhook(rawBody:Uint8Array,headers:Record<string,string>):Promise<ProviderPayment>;
}
export class TwoPPProvider implements PaymentProvider {
  readonly name='2PP' as const;
  readonly state:ProviderState;
  constructor(config:{apiUrl?:string;apiKey?:string;webhookSecret?:string}){
    this.state=config.apiUrl||config.apiKey||config.webhookSecret?'CONTRACT_PENDING':'NOT_CONFIGURED';
  }
  async createDeposit(_command:PaymentCommand):Promise<ProviderPayment>{throw new Error('2PP API contract and homologation required');}
  async sendWithdrawal(_command:PaymentCommand):Promise<ProviderPayment>{throw new Error('2PP API contract and homologation required');}
  async verifyWebhook(_body:Uint8Array,_headers:Record<string,string>):Promise<ProviderPayment>{throw new Error('2PP signature contract required');}
}
