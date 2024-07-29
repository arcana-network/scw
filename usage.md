# Arcana Gasless SDK (Standalone) Usage Guide

**Contents**

1. [Installation](#installation)
2. [Usage](#usage)
    - [Initialize](#initialize)
    - [Perform Gasless Transaction](#perform-gasless-transaction)
3. [Functions]
    - [`getSCWAddress()`](#getscwaddress)
    - [`getPaymasterBalance()`](#getpaymasterbalance)
    - [`createSession()`](#createsession)
    - [`doTx()`](#dotx)

---

## Installation

```
npm i @arcana/scw
```

## Usage

### Initialize

During initialization, the gasless SDK creates an SCW account associated with the EoA account corresponding to the provider `window.ethereum`.

```js
const scw = new arcana.scw.SCW();
await scw.init("<app_id>", window.ethereum");
```

### Perform Gasless Transaction

```js
  const erc20abi = [...];
  let amount = 0.1;
  const erc20Address = "0xba0398375hoef....3ef038533";
  const toAddress = "0xef027465950.....33y5ab8365";
  const Erc20Interface = new ethers.utils.Interface(erc20abi);

  const encodedData = Erc20Interface.encodeFunctionData("transfer", [
    toAddress,
    ethers.utils.parseEther(amount + ""),
  ]);

  // You need to create transaction objects of the following interface
  const tx1 = {
    from: scw.getSCWAddress(),
    to: erc20Address, // destination smart contract address
    data: encodedData,
  };

  let tx = await scw.doTx(tx1);
  await tx.wait();
  console.log(`Transfer done ${tx.userOpHash}`)
```

## Functions

### `getSCWAddress()`

Returns the Smart Address as per ERC-4337, the SCW address, associated with the current user's EoA address.

### `getPaymasterBalance()`

Returns the balance available in the gas tank that can be utilized via the current user's SCW address.

### `createSession()`

Creates session keys using the [`CreateSessionParam`](https://gasless-sdk-ref-guide.netlify.app/types/createsessionparam) policy and requests the user for permission. When the user initiates any app operation that fulfills the session policy, it will be autonomously approved.

```ts
  import { SCW, StorageType  } from "@arcana/scw";

  let scWallet: SCW;  

  type CreateSessionParam = {
    contractAddress: string;
    functionSelector: string;
    rules: string[];
    validUntil?: number;
    validAfter?: number;
    valueLimit?: number;
  };

  scWallet = new SCW();
  await scWallet.init(arcana_app_id, window.arcana.provider, undefined, 0);
  scwAddress = await scWallet.getSCWAddress();
  console.log("Address: " + scwAddress);

  sess = scWallet.initSession(StorageType.LOCAL_STORAGE);

  const rules = [{
    offset: 0,
    condition: 0,
    referenceValue: "0x7a8713E21e7434dC5441Fb666D252D13F380a97d",
  }];

  const config: CreateSessionParam = {
    contractAddress: getUsdcContract(scWallet.chain_id), //Specify your contract, this example uses some value
    functionSelector: "transfer(address,uint256)",  //specify function in the contract listed above
    validUntil: 0,  //no end time, infinite always allow
    validAfter: 0,   //no start time, infinite always allow
    valueLimit: 10,   //maximum 10 GWEI transaction is pre approved
    rules
  };

  await scWallet.createSession(config);  //wait for user approval via the UI pop up accept/reject notification

  ...

  // Perform doTx() after setting up managed session rules via createSession

  ...
  ```

### `doTx()`

Takes the transaction object as input and performs the gasless transaction using the SCW address.  If the gas tank is depleted or not available, then the gas fees are paid via the SCW account. In this case when the gas tank is not available, if the SCW account has the necessary funds for gas fees, the transaction goes through otherwise it fails.

```ts

    import {sessionTestAbi, erc20abi} from './utils';

    let amount = inputValue;
    const erc20Address = XNYT_ARB_SEPOLIA; //getLinkContract(scWallet.chain_id) // getErc20Contract(scWallet.chain_id);
    const toAddress = "0xFeCD581c539f8858c556Ab8FEf681975a6A25ACa";
    const contractInterface = new Interface(sessionTestAbi);

    const encodedData = contractInterface.encodeFunctionData("deposit", []);

    // You need to create transaction objects of the following interface
    const tx1 = {
      from: scWallet.getSCWAddress(),
      to: toAddress, // destination smart contract address
      data: encodedData,
      value : amount
    };

    // Normal txn
    //let tx = await scWallet.doTx(tx1);

    // Session txn
    let tx = await scWallet.doTx(tx1, {
      session: "4f871131ef"// true or the session created during initSession call, default is false
    });
    tx = await tx.wait();
    console.log(`Transfer done ${tx.userOpHash}`);

```
