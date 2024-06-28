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
  createSessionSmartAccountClient,
  getSingleSessionTxParams,
  Transaction,
} from "@biconomy/account";

import axios, { AxiosInstance } from "axios";
import { getDefaultStorageClient, ISessionStorage, SessionLocalStorage, SessionMemoryStorage } from "./session"
import type { Hex, EIP1193Provider, PublicClient, WalletClient } from "viem"
import { custom, createPublicClient, createWalletClient, defineChain } from "viem"
import * as chains from 'viem/chains'

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

export type SmartWalletTransaction = {
  to: Hex,
  data: Hex,
  value: BigInt,
}

export class SCW {
  private api_key!: string;
  private gateway_url: string = "https://gateway.arcana.network";
  private provider!: PublicClient;
  private wallet!: WalletClient;
  private scwAddress!: Hex;
  private smart_account!: BiconomySmartAccountV2;
  private pre_scw: boolean = false;
  private smart_account_owner!: Hex;
  private paymaster_contract_address!: Hex;
  private paymaster_owner!: Hex;
  private gateway_api: AxiosInstance;
  private chain_id!: number;
  private chain!: chains.Chain;
  private session!: ISessionStorage;
  private arcana_key!: string;
  private session_account!: BiconomySmartAccountV2;

  public async init(
    arcana_key: string,
    provider: EIP1193Provider,
    gateway_url: string | undefined
  ) {

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

    this.provider = createPublicClient({
      transport: custom(provider)
    });

    const [account1] = await provider.request({ method: 'eth_requestAccounts' })
    // const [account] = await this.provider.request({ method: 'eth_requestAccounts' })

    this.chain_id = await this.provider.getChainId();
    const supportedNetworks = await this.fetchSupportedNetworks();
    if (supportedNetworks[this.chain_id] == undefined) {
      throw new Error("Chain not supported by Arcana");
    }
    this.chain = defineChain({
      id: this.chain_id,
      name: supportedNetworks[this.chain_id].name,
      nativeCurrency: supportedNetworks[this.chain_id].currency,
      rpcUrls: {
        default: {
          http: [supportedNetworks[this.chain_id].rpc_url]
        }
      },
    })

    this.wallet = createWalletClient({
      account: account1,
      chain: this.chain,
      transport: custom(provider)
    })

    // const [address] = await this.wallet.getAddresses() 
    this.smart_account_owner = account1

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

  public async getPaymasterBalance(): Promise<BigInt> {
    const balance = await this.provider.readContract({
      address: this.paymaster_contract_address,
      abi: ["function getBalance(address) view returns (uint256)"],
      functionName: 'getBalance',
      args: [this.paymaster_owner]
    }) as BigInt

    return balance
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

  public async initSession(config: SessionConfig) {
    if (!this.smart_account) {
      throw new Error("SCW wallet not initialized");
    }

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
    const res = await this.gateway_api.get(
      `/api/v1/chains/${this.arcana_key}/`
    );

    //convert to key-value
    const chains = res.data.chains;
    let tempChain: Record<number, any> = {}
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

    const ephermalAccount = await this.session.addSigner(undefined, this.chain);

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

    const { receipt: { transactionHash } } = await wait();

    console.info(
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

  private async getActiveSession(funcSelector: Hex, to: Hex, value: BigInt) {
    const sessions = await this.session.getAllSessionData();
    const foundSession = sessions.find((element) => {
      const slicedSessionData = element.sessionKeyData.slice(2)
      const sessionFuncSelector = slicedSessionData.substring(80, 88)
      const permittedAddress = slicedSessionData.substring(40, 80)
      const valueLimit = BigInt("0x" + slicedSessionData.substring(88, 120))

      if (element.status != "ACTIVE") return false;

      if (sessionFuncSelector != funcSelector.slice(2)) return false;

      if (to.slice(2).toLowerCase() != permittedAddress.toLowerCase()) return false;

      //@ts-ignore
      if (value > valueLimit && valueLimit != 0) return false;

      //@ts-ignore
      if ((element.validUntil < Date.now() / 1000) && valueLimit != 0n) return false;

      //@ts-ignore
      if ((element.validAfter > Date.now() / 1000) && valueLimit != 0n) return false;

      return true
    });

    return foundSession;

  }

  public async doSessionTx(tx: SmartWalletTransaction, param?: any): Promise<UserOpResponse> {
    if (!this.session) {
      throw new Error("Session Object not initialized");
    }

    this.session_account = await createSessionSmartAccountClient(
      {
        //@ts-ignore
        accountAddress: this.scwAddress, // Dapp can set the account address on behalf of the user
        //@ts-ignore
        bundlerUrl: this.smart_account.bundler.getBundlerUrl(),
        chainId: this.chain_id,
      },
      this.session);

    const txdata = tx.data.slice(0, 10) as Hex
    const approvedSession = await this.getActiveSession(txdata, tx.to, tx.value);

    if (!approvedSession) {
      throw new Error("No active session found");
    }

    const sessionParameters = await getSingleSessionTxParams(
      {
        //@ts-ignore
        sessionIDInfo: [approvedSession.sessionID],
        sessionStorageClient: this.session,
      },
      this.chain,
      0, // index of the relevant policy leaf to the tx
    );

    const receipt = await this.session_account.sendTransaction(
      [tx as Transaction],
      {
        ...sessionParameters,
        ...param
      },
    );

    console.log(`userOpHash : ${receipt.userOpHash} `);

    return receipt;

  }

}

export { SCW as default };
