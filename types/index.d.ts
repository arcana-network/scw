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
    private paymaster_contract_address;
    private paymaster_owner;
    init(arcana_key: string, wallet: Signer, gateway_url: string | undefined): Promise<void>;
    getOwner(): Promise<string>;
    getSCWAddress(): string;
    getPaymasterBalance(): Promise<number>;
    doTx(tx: any, param: any): Promise<UserOpResponse>;
}
export { SCW as default };
