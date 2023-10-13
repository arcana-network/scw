import { Signer, ethers } from "ethers";
import {
  BiconomySmartAccount,
  BiconomySmartAccountConfig,
  DEFAULT_ENTRYPOINT_ADDRESS,
} from "@biconomy/account";
import { IBundler, Bundler, UserOpResponse } from "@biconomy/bundler";
import {
  BiconomyPaymaster,
  PaymasterMode,
  IHybridPaymaster,
  SponsorUserOperationDto,
} from "@biconomy/paymaster";

import axios from "axios";
import { Web3Provider } from "@ethersproject/providers";

export class SCW {
  private api_key!: string;
  private gateway_url: string = "https://gateway-dev.arcana.network/";
  private provider!: Web3Provider;
  private wallet!: Signer;
  private scwAddress!: string;
  private smart_account!: BiconomySmartAccount;

  public async init(
    arcana_key: string,
    wallet: Signer,
    gateway_url: string | undefined
  ) {
    this.provider = wallet.provider as Web3Provider;
    this.wallet = wallet;
    if (gateway_url != undefined) {
      // check if gateway url ends with / if yes then remove it
      if (gateway_url.endsWith("/")) {
        gateway_url = gateway_url.slice(0, -1);
      }
      this.gateway_url = gateway_url;
    }
    // fetch chain id from provider
    let chain_id = (await this.provider.getNetwork()).chainId;

    // make a get request to gateway_url to get api key
    let res = await axios.get(
      this.gateway_url +
        `/api/v1/gastank/api-key/?app_address=${arcana_key}&chain_id=${chain_id}`
    );
    this.api_key = res.data.api_key;

    const bundler: IBundler = new Bundler({
      bundlerUrl: `https://bundler.biconomy.io/api/v2/${chain_id}/cJPK7B3ru.kj908Yuj-89hY-45ic-lRe5-6877flTvjy561`, // you can get this value from biconomy dashboard.
      chainId: chain_id,
      entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
    });

    let paymaster_url = `https://paymaster.biconomy.io/api/v1/${chain_id}/${this.api_key}`;
    const paymaster = new BiconomyPaymaster({
      paymasterUrl: paymaster_url, // you can get this value from biconomy dashboard.
      strictMode: false,
    });

    const biconomySmartAccountConfig: BiconomySmartAccountConfig = {
      signer: this.wallet,
      chainId: chain_id,
      paymaster: paymaster, //you can skip paymaster instance if you are not interested in transaction sponsorship
      bundler: bundler,
    };

    const biconomyAccount = new BiconomySmartAccount(
      biconomySmartAccountConfig
    );
    this.smart_account = await biconomyAccount.init();
    this.scwAddress = await this.smart_account.getSmartAccountAddress();
  }

  // function to get the owner
  public getOwner(): string {
    return this.smart_account.owner;
  }

  // function to get the scw address
  public getSCWAddress(): string {
    return this.scwAddress;
  }

  public async doTx(tx: any): Promise<UserOpResponse> {
    const userOp = await this.smart_account.buildUserOp([tx]);
    const biconomyPaymaster = this.smart_account
      .paymaster as IHybridPaymaster<SponsorUserOperationDto>;
    try {
      let paymasterServiceData: SponsorUserOperationDto = {
        mode: PaymasterMode.SPONSORED,
        calculateGasLimits: true,
      };
      const paymasterAndDataResponse =
        await biconomyPaymaster.getPaymasterAndData(
          userOp,
          paymasterServiceData
        );
      userOp.paymasterAndData = paymasterAndDataResponse.paymasterAndData;

      if (
        paymasterAndDataResponse.callGasLimit &&
        paymasterAndDataResponse.verificationGasLimit &&
        paymasterAndDataResponse.preVerificationGas
      ) {
        userOp.callGasLimit = paymasterAndDataResponse.callGasLimit;
        userOp.verificationGasLimit =
          paymasterAndDataResponse.verificationGasLimit;
        userOp.preVerificationGas = paymasterAndDataResponse.preVerificationGas;
      }
    } catch (e) {}
    const userOpResponse = await this.smart_account.sendUserOp(userOp);
    return userOpResponse;
  }
}

export { SCW as default };
