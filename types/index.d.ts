import { UserOpResponse } from "@biconomy/bundler";
import { Web3Provider } from "@ethersproject/providers";
export declare class SCW {
    private api_key;
    private gateway_url;
    private provider;
    private wallet;
    private scwAddress;
    private smart_account;
    init(arcana_key: string, provider: Web3Provider, gateway_url: string | undefined): Promise<void>;
    getOwner(): string;
    getSCWAddress(): string;
    doTx(tx: any): Promise<UserOpResponse>;
}
export { SCW as default };
