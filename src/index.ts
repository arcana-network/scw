import { Signer, ethers } from "ethers";
import {
  BiconomySmartAccountV2,
  BiconomySmartAccountV2Config,
  createSmartAccountClient,
  DEFAULT_ENTRYPOINT_ADDRESS,
  Paymaster,
  PaymasterMode as BiconomyPaymasterMode,
  IHybridPaymaster,
  SponsorUserOperationDto,
  createSession,
  PaymasterAndDataResponse,
  IBundler,
  Bundler,
  UserOpResponse,
} from "@biconomy/account";

import axios, { AxiosInstance } from "axios";
import { Web3Provider, ExternalProvider } from "@ethersproject/providers";
import { getDefaultStorageClient, ISessionStorage, SessionLocalStorage, SessionMemoryStorage } from "./session"

export enum PaymasterMode {
  SCW = "SCW",
  ARCANA = "ARCANA",
  BICONOMY = "BICONOMY",
}

export type PaymasterParam = {
  mode: PaymasterMode;
  calculateGasLimits: boolean;
};

export enum SessionStorageType {
  MEMORY = "MEMORY",
  LOCAL = "LOCAL",
}


export type SessionConfig = {
  storageType: SessionStorageType,
}

export type CreateSessionParam = {
  contractAddress: string,
  functionSelector: string,
  validUntil?: number,
  validAfter?: number,
  valueLimit?: number,
}

export type SupportedNetwork = {
  rpc_url: string;
  name: string;
  chain_id: number;
  currency: string,
}

export class SCW {
  private api_key!: string;
  private gateway_url: string = "https://gateway.arcana.network";
  private provider!: Web3Provider | ExternalProvider;
  private wallet!: Signer;
  private scwAddress!: string;
  private smart_account!: BiconomySmartAccountV2;
  private pre_scw: boolean = false;
  private smart_account_owner!: string;
  private paymaster_contract_address!: string;
  private paymaster_owner!: string;
  private gateway_api: AxiosInstance;
  private chain_id!: number;
  private session!: ISessionStorage;
  private arcana_key!: string;

  public async init(
    arcana_key: string,
    wallet: Signer,
    gateway_url: string | undefined
  ) {
    // @ts-ignore
    if (typeof wallet?.request === "function") {
      this.provider = new Web3Provider(wallet as ExternalProvider);
    } else {
      this.provider = wallet.provider as Web3Provider;
    }
    if (arcana_key.includes("xar")) {
      let [xar, env, key] = arcana_key.split("_");
      this.arcana_key = key;
      if (env == "dev") {
        this.gateway_url = "https://gateway-dev.arcana.network";
      } else if (env == "test") {
        this.gateway_url = "https://gateway001-testnet.arcana.network";
      } else if (env == "live") {
        this.gateway_url = "https://gateway.arcana.network";
      }
    }
    this.wallet = await this.provider.getSigner();
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
    this.gateway_api = axios.create({
      baseURL: this.gateway_url,
    });

    // fetch chain id from provider
    this.chain_id = (await this.provider.getNetwork()).chainId;

    // make a get request to gateway_url to get api key
    let res = await this.gateway_api.get(
      `/api/v1/gastank/api-key/?app_address=${this.arcana_key}&chain_id=${this.chain_id}`
    );
    this.api_key = res.data.api_key;
    this.paymaster_contract_address = res.data.paymaster.address;
    this.paymaster_owner = res.data.owner;

    const bundler: IBundler = new Bundler({
      bundlerUrl: `https://bundler.biconomy.io/api/v2/${this.chain_id}/cJPK7B3ru.kj908Yuj-89hY-45ic-lRe5-6877flTvjy561`, // you can get this value from biconomy dashboard.
      chainId: this.chain_id,
      entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
    });

    let paymaster_url = `https://paymaster.biconomy.io/api/v1/${this.chain_id}/${this.api_key}`;
    const paymaster = new Paymaster({
      paymasterUrl: paymaster_url, // you can get this value from biconomy dashboard.
      strictMode: false,
    });

    const biconomySmartAccountConfig: BiconomySmartAccountV2Config = {
      signer: this.wallet,
      chainId: this.chain_id,
      paymaster: paymaster, //you can skip paymaster instance if you are not interested in transaction sponsorship
      bundler: bundler,
    };

    this.smart_account = await createSmartAccountClient(
      biconomySmartAccountConfig
    );
    this.scwAddress = await this.smart_account.getAccountAddress();
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

  private async getPaymasterDataRaw(
    tx: any,
    param: any,
    userOp: any
  ): Promise<any> {
    const biconomyPaymaster = this.smart_account
      .paymaster as IHybridPaymaster<SponsorUserOperationDto>;

    let paymasterServiceData: SponsorUserOperationDto = {
      mode: BiconomyPaymasterMode.SPONSORED,
      calculateGasLimits: param.calculateGasLimits,
    };
    const paymasterAndDataResponse =
      await biconomyPaymaster.getPaymasterAndData(userOp, paymasterServiceData);
    return paymasterAndDataResponse;
  }

  public async getPaymasterData(
    tx: any,
    param: PaymasterParam = {
      calculateGasLimits: true,
      mode: PaymasterMode.BICONOMY,
    }
  ): Promise<PaymasterAndDataResponse> {
    let userOp: any = await this.smart_account.buildUserOp(tx);
    let paymasterAndDataResponse: PaymasterAndDataResponse = {
      paymasterAndData: "0x",
      callGasLimit: userOp.callGasLimit,
      preVerificationGas: userOp.preVerificationGas,
      verificationGasLimit: userOp.verificationGasLimit,
    };

    switch (param.mode) {
      case PaymasterMode.ARCANA:
        let stringifiedUserOp = userOp as any;
        Object.keys(stringifiedUserOp).forEach((key) => {
          // Convert each value to string
          stringifiedUserOp[key] = String(stringifiedUserOp[key]);
        });
        let res = await this.gateway_api.post(
          `/api/v1/paymaster/${this.chain_id}/`,
          { userOp: stringifiedUserOp }
        );
        paymasterAndDataResponse.paymasterAndData = res.data.paymasterAndData;
        paymasterAndDataResponse.verificationGasLimit =
          Number(paymasterAndDataResponse.verificationGasLimit) + 80000;
        break;
      case PaymasterMode.BICONOMY:
        paymasterAndDataResponse = await this.getPaymasterDataRaw(
          tx,
          param,
          userOp
        );
        break;
    }

    return paymasterAndDataResponse;
  }

  public async doTx(tx: any, param?: any): Promise<UserOpResponse> {
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
        mode: PaymasterMode.BICONOMY,
        calculateGasLimits: true,
      };
    }
    let txs: any[] = [];
    if (Array.isArray(tx)) {
      txs = tx;
    } else {
      txs.push(tx);
    }

    let userOp: any = await this.smart_account.buildUserOp(txs);
    //Call getPaymasterData
    const paymasterData = await this.getPaymasterData(txs, {
      mode: param.mode,
      calculateGasLimits: param.calculateGasLimits,
    });

    Object.assign(userOp, paymasterData);

    // Overide with user's supplied values
    const keys = [
      "callGasLimit",
      "verificationGasLimit",
      "preVerificationGas",
      "maxFeePerGas",
      "maxPriorityFeePerGas",
    ];
    keys.forEach((key) => {
      if (param[key] !== undefined) {
        userOp[key] = param[key];
      }
    });

    const userOpResponse = await this.smart_account.sendUserOp(userOp);
    return userOpResponse;
  }

  public initSession(config: SessionConfig) {
    switch (config.storageType) {
      case SessionStorageType.LOCAL:
        //@ts-ignore
        this.session = new SessionLocalStorage(this.scwAddress);
        break;
      case SessionStorageType.MEMORY:
        //@ts-ignore
        this.session = new SessionMemoryStorage(this.scwAddress);
        break;
      default:
        //@ts-ignore
        this.session = getDefaultStorageClient(this.scwAddress);
    }

  }



  private async fetchSupportedNetworks() {
    const data = await this.gateway_api.get(
      `/api/v1/chains/${this.arcana_key}/`
    );

    console.log(`data ${JSON.stringify(data)}`);
    
    //convert to key-value
    const chains = data.data.chains;
    let tempChain = {}
    for (let i = 0; i < chains.length; i++) {
      //@ts-ignore
      tempChain[chains[i].chain_id] = chains[i];
    }

    //@ts-ignore
    return tempChain
  }

  public async createSession(config: CreateSessionParam) {
    if (!this.session) {
      throw new Error("Session not initialized");
    }
    const supportedNetworks = await this.fetchSupportedNetworks();
    console.log(`after sup ${JSON.stringify(supportedNetworks)}`);

    //@ts-ignore
    const rpcUrls = {
      default: {
        //@ts-ignore
        http: [supportedNetworks[this.chain_id].rpc_url]
      }
    };
    //@ts-ignore
    rpcUrls[this.chain_id] = supportedNetworks[this.chain_id].rpc_url;

    //@ts-ignore
    const ephermalAccount = await this.session.addSigner(null, {
      id: this.chain_id,
      rpcUrls
    });

    console.log("after signer");

    const sessionKeyAddress = await ephermalAccount.getAddress()

    const policy = [
      {
        /** The address of the sessionKey upon which the policy is to be imparted */
        sessionKeyAddress,
        /** The address of the contract to be included in the policy */
        contractAddress: config.contractAddress,
        /** The specific function selector from the contract to be included in the policy */
        functionSelector: config.functionSelector,
        /** The list of rules which make up the policy */
        rules: [],
        /** The time interval within which the session is valid. Setting both to 0 will keep a session alive indefinitely */
        interval: {
          validUntil: config.validUntil,
          validAfter: config.validAfter,
        },
        /** The maximum value that can be transferred in a single transaction */
        valueLimit: config.valueLimit,
      },
    ];

    //@ts-ignore
    const { wait, session } = await createSession(
      this.smart_account,
      //@ts-ignore
      policy,
      this.session,
    );

    console.log("after create session");

    const {
      receipt: { transactionHash },
      success,
    } = await wait();

    console.log(
      `Created Session with
       ID :  ${session.sessionIDInfo[0]} 
       txHash : ${transactionHash}`,
    );

    await this.session.updateSessionStatus(
      {
        sessionID: session.sessionIDInfo[0],
      },
      "ACTIVE",
    );

  }
}

export { SCW as default };
