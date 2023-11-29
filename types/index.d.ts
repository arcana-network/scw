import { Signer } from "ethers";
import { UserOpResponse } from "@biconomy/bundler";
export declare class SCW {
    private api_key;
    private gateway_url;
    private provider;
    private wallet;
    private scwAddress;
    private smart_account;
    private pre_scw;
    private smart_account_owner;
    init(arcana_key: string, wallet: Signer, gateway_url: string | undefined): Promise<void>;
    getOwner(): Promise<string>;
    getSCWAddress(): string;
    doTx(tx: any): Promise<UserOpResponse>;
}
export { SCW as default };
