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
  createSessionSmartAccountClient,
  getSingleSessionTxParams,
  Transaction,
  DEFAULT_SESSION_KEY_MANAGER_MODULE,
  DEFAULT_ECDSA_OWNERSHIP_MODULE,
  createSessionKeyManagerModule,
  StorageType,
  SessionKeyManagerModule,
  Rule,
  UserOperationStruct,
  BuildUserOpOptions
} from "@biconomy/account";

import axios, { AxiosInstance } from "axios";
import type { Hex, EIP1193Provider, PublicClient, WalletClient } from "viem"
import { custom, createPublicClient, createWalletClient, defineChain } from "viem"
import type { Chain } from 'viem/chains'

export enum PaymasterMode {
  SCW = "SCW",
  ARCANA = "ARCANA",
  BICONOMY = "BICONOMY",
}

export type PaymasterParam = {
  mode: PaymasterMode;
  calculateGasLimits: boolean;
};

export type ModuleType = {
  name: string,
  address: Hex,
}

export type TransactionOpts = {
  mode?: PaymasterMode,
  calculateGasLimits?: boolean,
  session?: string | boolean,
  overrideUserOp?: UserOperationStruct
}
/**
 * @typedef {Object} CreateSessionParam - Session Configuration Object
 * @property {string} contractAddress - The address of the contract to be included in the policy
 * @property {string} functionSelector - The specific function selector from the contract to be included in the policy
 * @property {number} [validUntil] - The time until which the session is valid. Setting both to 0 will keep a session alive indefinitely
 * @property {number} [validAfter] - The time after which the session is valid. Setting both to 0 will keep a session alive indefinitely
 * @property {number} [valueLimit] - The maximum value that can be transferred in a single transaction
 * @property {Rule[]} [rules] - The list of rules which make up the policy
 */

export type CreateSessionParam = {
  contractAddress: string,
  functionSelector?: string,
  validUntil?: number,
  validAfter?: number,
  valueLimit?: number,
  rules?: Rule[],
}

export type SupportedNetwork = {
  rpc_url: string;
  name: string;
  chain_id: number;
  currency: string,
}

export type { Transaction, StorageType, Rule }

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
  private chain!: Chain;
  private sessionManager!: SessionKeyManagerModule;
  private arcana_key!: string;

  public async init(
    arcana_key: string,
    provider: EIP1193Provider,
    gateway_url: string | undefined,
    sessionStorageType?: StorageType
  ) {
    this.provider = createPublicClient({
      transport: custom(provider)
    });
    const [account] = await provider.request({ method: 'eth_requestAccounts' })
    let accountType = "eoa"
    try {
      // check if provider is arcana provider
      //@ts-ignore
      accountType = await provider.request({ method: '_arcana_getAccountType' })
    } catch (e) {
      // do nothing
      console.info("Non-Arcana Provider")
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
      account,
      chain: this.chain,
      transport: custom(provider)
    })

    if (accountType == "scw") {
      this.pre_scw = true;
      this.scwAddress = account;
      return;
    } else {
      this.pre_scw = false;
    }

    this.smart_account_owner = account

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

    if (sessionStorageType)
      this.sessionManager = await createSessionKeyManagerModule({
        smartAccountAddress: this.scwAddress,
        storageType: sessionStorageType,
      });

  }

  // function to get the owner
  public async getOwner(): Promise<string> {
    return this.smart_account_owner;
  }

  // function to get the scw address
  public getSCWAddress(): string {
    return this.scwAddress;
  }
  /**
   * Get the active validation modules of the SCW 
   * @returns {ModuleType[]} Array of active modules
   */
  public async getActiveModules(): Promise<ModuleType[]> {
    const modules = await this.smart_account.getAllModules(10);
    const activeModules: ModuleType[] = [];
    for (let i = 0; i < modules.length; i++) {
      switch (modules[i]) {
        case DEFAULT_SESSION_KEY_MANAGER_MODULE:
          activeModules.push({ name: "SESSION_KEY_MANAGER", address: modules[i] as Hex })
          break;
        case DEFAULT_ECDSA_OWNERSHIP_MODULE:
          activeModules.push({ name: "ECDSA_OWNERSHIP", address: modules[i] as Hex })
          break;
        default:
          activeModules.push({ name: "UnNamed", address: modules[i] as Hex })
          break;
      }
    }
    return activeModules;
  }

  /**
   * 
   * @param module module address to be added
   * 
   * W.I.P: 🤫 using simple enum for popular modules
   */
  public async addModule(module: Hex) {
    await this.smart_account.enableModule(module);
  }

  /**
   * Remove module, Sibiling function to addModule, 
   * @param module address of the module to be removed
   */
  public async removeModule(module: Hex) {
    //identify prev module to be removed
    const modules = await this.getActiveModules();
    const moduleIndex = modules.findIndex((element) => element.address == module);
    let prevModule: Hex;
    switch (moduleIndex) {
      case -1:
        throw new Error("Module not found");
      case 0:
        prevModule = "0x0000000000000000000000000000000000000001" // SENTINEL MODULE
        break;
      default:
        prevModule = modules[moduleIndex - 1].address
    }
    await this.smart_account.disableModule(prevModule, modules[moduleIndex].address);
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
  /**
   * Initialize Session Manager
   * @param sessionStorageType Storage Type for Session Manager
   * @throws Error if SCW wallet not initialized
   * @return void, added session manager to the SCW class
   */
  public async initSession(sessionStorageType: StorageType) {
    if (!this.smart_account) {
      throw new Error("SCW wallet not initialized");
    }

    this.sessionManager = await createSessionKeyManagerModule({
      smartAccountAddress: this.scwAddress,
      storageType: sessionStorageType || StorageType.LOCAL_STORAGE,
    })
  }
  /**
   * Get supported networks by the Arcana App
   * @returns {SupportedNetwork[]} Array of supported networks
   */
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

  /**
  * Create a session for a specific address with rules
  * Address could be a contract address or an EOA, rules detact the condition on function arguments
  * 
  * Automatically adds the session to the session manager instance
  * @param config Session Configuration Object
  */
  public async createSession(config: CreateSessionParam) {
    if (!this.sessionManager) {
      throw new Error("Session not initialized");
    }

    const ephermalAccount = await this.sessionManager.sessionStorageClient.addSigner(undefined, this.chain);
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
      this.sessionManager.sessionStorageClient
    );

    const { receipt: { transactionHash } } = await wait();

    console.info(
      `Created Session with
       ID :  ${session.sessionIDInfo[0]} 
       txHash : ${transactionHash}`,
    );

    await this.sessionManager.updateSessionStatus(
      {
        sessionID: session.sessionIDInfo[0],
      },
      "ACTIVE",
    );

  }
  /**
   * A helper function to get the active session for the transaction
   * @param tx 
   * @returns Session ID if found else undefined
   * 
   */
  private async getActiveSession(tx: Transaction) {
    const sessions = await this.sessionManager.sessionStorageClient.getAllSessionData();
    const foundSession = sessions.find((element) => {
      const slicedSessionData = element.sessionKeyData.slice(2)
      const sessionFuncSelector = slicedSessionData.substring(80, 88)
      const permittedAddress = slicedSessionData.substring(40, 80)
      const valueLimit = BigInt("0x" + slicedSessionData.substring(88, 120))

      if (element.status != "ACTIVE") return false;

      // check if the tx is contract interaction
      //@ts-ignore
      if (tx.data?.length > 2) {
        //@ts-ignore
        const funcSelector = tx.data?.slice(2, 10)
        if (sessionFuncSelector != funcSelector) return false;
      }

      if (tx.to.slice(2).toLowerCase() != permittedAddress.toLowerCase()) return false;

      //@ts-ignore
      if (tx.value > valueLimit && valueLimit != 0) return false;

      //@ts-ignore
      if ((element.validUntil < Date.now() / 1000) && valueLimit != 0n) return false;

      //@ts-ignore
      if ((element.validAfter > Date.now() / 1000) && valueLimit != 0n) return false;

      return true
    });

    return foundSession?.sessionID;

  }

  /**
   * Send AA transaction using Biconomy Smart Account Client 
   * @param tx contains transaction object or array of transaction objects having properties like to, data, value 
   * @param param Optional parameters for transaction
   * 
   *  - `session` is for using Session Validation Module,
   *  can be passed as true (for auto selection of suitable session) or sessionID string itself 
   * - `mode` is for Paymaster Sponsership, transaction will be sponsored by paymaster subjected to availability
   * @returns {UserOpResponse} UserOpResponse having `wait` and `waitForTxHash` functions to wait for transaction to be mined
   * 
   */
  public async doTx(tx: Transaction, param?: TransactionOpts) {
    if (this.pre_scw) {
      return await this.wallet.sendTransaction(tx as any);
    }

    let txs: any[] = [];
    if (Array.isArray(tx)) {
      txs = tx;
    } else {
      txs.push(tx);
    }

    let Options: BuildUserOpOptions = {}
    //Session
    let smartAccount = this.smart_account;
    if (param?.session) {
      if (!this.sessionManager) {
        throw new Error("Session not initialized. use initSession() to initialize session manager");
      }

      let sessionID: string | undefined

      if (typeof param.session == 'boolean' && param.session) {
        sessionID = await this.getActiveSession(tx)
      }

      if (typeof param.session == 'string') {
        sessionID = param.session
      }

      const sessionParameters = await getSingleSessionTxParams(
        {
          //@ts-ignore
          sessionIDInfo: [sessionID],
          sessionStorageClient: this.sessionManager.sessionStorageClient,
        },
        this.chain,
        0, // index of the relevant policy leaf to the tx
      );

      Options = { ...sessionParameters }

      smartAccount = await createSessionSmartAccountClient(
        {
          //@ts-ignore
          accountAddress: this.scwAddress, // Dapp can set the account address on behalf of the user
          //@ts-ignore
          bundlerUrl: this.smart_account.bundler.getBundlerUrl(),
          chainId: this.chain_id,
        },
        this.sessionManager.sessionStorageClient);

    }

    let userOp: any = await smartAccount.buildUserOp(txs, Options);

    //Paymaster options
    if (param?.mode) {
      const paymasterData = await this.getPaymasterData(txs, {
        mode: param?.mode,
        calculateGasLimits: param?.calculateGasLimits || true,
      });
      Object.assign(userOp, paymasterData);
    }


    if (param?.overrideUserOp) {
      Object.assign(userOp, param?.overrideUserOp);
    }

    const userOpResponse = await smartAccount.sendUserOp(userOp);
    return userOpResponse;
  }


}