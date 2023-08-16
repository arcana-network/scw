import { Signer } from "ethers";
import { UserOpResponse } from "@biconomy/bundler";
export declare class SCW {
    private api_key;
    private gateway_url;
    private provider;
    private wallet;
    private scwAddress;
    private smart_account;
    init(arcana_key: string, wallet: Signer, gateway_url: string | undefined): Promise<void>;
    getOwner(): string;
    getSCWAddress(): string;
    doTx(tx: any): Promise<UserOpResponse>;
}
export { SCW as default };
