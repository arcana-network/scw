import { Signer, ethers } from "ethers";
import SmartAccount from "@biconomy-sdk-dev/smart-account";
// import { ChainId } from "@biconomy-sdk-dev/core-types";
import axios from "axios";
import {
  ExternalProvider,
  TransactionResponse,
  Web3Provider,
} from "@ethersproject/providers";

export class SCW {
  private api_key!: string;
  private gateway_url: string = "http://localhost:9010/";
  private provider!: Web3Provider;
  private wallet!: Signer;
  private owner!: string;
  private scwAddress!: string;
  private smart_account!: SmartAccount;

  public async init(arcana_key: string, provider: ExternalProvider) {
    console.log({ ethers });
    this.provider = new ethers.providers.Web3Provider(provider);
    this.wallet = await this.provider.getSigner();
    this.owner = await this.wallet.getAddress();

    // fetch chain id from provider
    let chain_id = (await this.provider.getNetwork()).chainId;

    // make a get request to gateway_url to get api key
    let res = await axios.get(
      this.gateway_url +
        `/api/v1/gastank/api-key/?app_address=${arcana_key}&chain_id=${chain_id}`
    );
    this.api_key = res.data.api_key;

    let options = {
      activeNetworkId: chain_id,
      supportedNetworksIds: [chain_id],
      networkConfig: [
        {
          chainId: chain_id,
          dappAPIKey: this.api_key,
        },
      ],
    };

    this.smart_account = new SmartAccount(this.provider, options);
    await this.smart_account.init();
    this.scwAddress = this.smart_account.address;
  }

  // function to get the owner
  public getOwner(): string {
    return this.owner;
  }

  // function to get the scw address
  public getSCWAddress(): string {
    return this.scwAddress;
  }

  public async doTx(tx: any): Promise<TransactionResponse> {
    const txResponse = await this.smart_account.sendTransaction({
      transaction: tx,
    });
    return txResponse;
  }

  public onTxHashGenerated(callback: any) {
    this.smart_account.on("txHashGenerated", callback);
  }

  public onHashChanged(callback: any) {
    this.smart_account.on("onHashChanged", callback);
  }

  public onTxMined(callback: any) {
    this.smart_account.on("txMined", callback);
  }

  public onError(callback: any) {
    this.smart_account.on("error", callback);
  }
}

export { SCW as default };
