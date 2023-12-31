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
import { Web3Provider, ExternalProvider } from "@ethersproject/providers";

export class SCW {
  private api_key!: string;
  private gateway_url: string = "https://gateway.arcana.network";
  private provider!: Web3Provider | ExternalProvider;
  private wallet!: Signer;
  private scwAddress!: string;
  private smart_account!: BiconomySmartAccount;
  private pre_scw: boolean = false;
  private smart_account_owner!: string;
  private paymaster_contract_address!: string;
  private paymaster_owner!: string;

  public async init(
    arcana_key: string,
    wallet: Signer,
    gateway_url: string | undefined
  ) {
    // @ts-ignore
    if (typeof this.provider?.request === "function") {
      this.provider = new Web3Provider(this.provider as ExternalProvider);
    } else {
      this.provider = wallet.provider as Web3Provider;
    }
    if (arcana_key.includes("xar")) {
      let [xar, env, key] = arcana_key.split("_");
      arcana_key = key;
      if (env == "dev") {
        this.gateway_url = "https://gateway-dev.arcana.network";
      } else if (env == "test") {
        this.gateway_url = "https://gateway001-testnet.arcana.network";
      } else if (env == "live") {
        this.gateway_url = "https://gateway.arcana.network";
      }
    }
    this.wallet = wallet;
    // @ts-ignore
    if (this.provider.provider?.addressType == "scw") {
      this.pre_scw = true;
      // @ts-ignore
      this.scwAddress = await this.wallet.getAddress();
      let abi = ["function owner() view returns (address)"];
      let contract = new ethers.Contract(this.scwAddress, abi, this.provider);
      this.smart_account_owner = await contract.owner();
      return;
    }
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
    this.paymaster_contract_address = res.data.paymaster.address;
    this.paymaster_owner = res.data.owner;

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
    this.smart_account_owner = await this.smart_account.owner;
  }

  // function to get the owner
  public async getOwner(): Promise<string> {
    return this.smart_account_owner;
  }

  // function to get the scw address
  public getSCWAddress(): string {
    return this.scwAddress;
  }

  public async getPaymasterBalance(): Promise<number> {
    let contract = new ethers.Contract(
      this.paymaster_contract_address,
      ["function getBalance(address) view returns (uint256)"],
      this.wallet
    );
    let balance = await contract.getBalance(this.paymaster_owner);
    return balance;
  }

  public async doTx(tx: any, param: any): Promise<UserOpResponse> {
    if (this.pre_scw) {
      tx = await this.wallet.sendTransaction(tx);
      let orignalWait = tx.wait;
      tx.wait = async () => {
        let res = await orignalWait();
        if (!res.receipt) {
          res.receipt = {};
        }
        res.receipt.transactionHash = tx.hash;
        return res;
      };
      return tx;
    }
    if (param == undefined) {
      param = {
        mode: PaymasterMode.SPONSORED,
        calculateGasLimits: true,
      };
    }
    let txs: any[] = [];
    if (Array.isArray(tx)) {
      txs = tx;
    } else {
      txs.push(tx);
    }
    const userOp = await this.smart_account.buildUserOp(txs);
    if (param.callGasLimit) {
      userOp.callGasLimit = param.callGasLimit;
    }
    if (param.verificationGasLimit) {
      userOp.verificationGasLimit = param.verificationGasLimit;
    }
    if (param.preVerificationGas) {
      userOp.preVerificationGas = param.preVerificationGas;
    }
    if (param.maxFeePerGas) {
      userOp.maxFeePerGas = param.maxFeePerGas;
    }
    if (param.maxPriorityFeePerGas) {
      userOp.maxPriorityFeePerGas = param.maxPriorityFeePerGas;
    }
    const biconomyPaymaster = this.smart_account
      .paymaster as IHybridPaymaster<SponsorUserOperationDto>;

    if (param.mode !== "SCW") {
      try {
        let paymasterServiceData: SponsorUserOperationDto = {
          mode: param.mode,
          calculateGasLimits: param.calculateGasLimits,
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
          userOp.preVerificationGas =
            paymasterAndDataResponse.preVerificationGas;
        }
      } catch (e) {}
    }
    const userOpResponse = await this.smart_account.sendUserOp(userOp);
    return userOpResponse;
  }
}

export { SCW as default };
