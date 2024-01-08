# Arcana Gasless SDK (Standalone) Usage Guide

**Contents**

1. [Installation](#installation)
2. [Usage](#usage)
    - [Initialize](#initialize)
    - [Perform Gasless Transaction](#perform-gasless-transaction)
3. [Functions]
    - [`getSCWAddress()`](#getscwaddress)
    - [`getPaymasterBalance()`](#getpaymasterbalance)
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

### `doTx()`

Takes the transaction object as input and performs the gasless transaction using the SCW address.  If the gas tank is depleted or not available, then the gas fees are paid via the SCW account. In this case when the gas tank is not available, if the SCW account has the necessary funds for gas fees, the transaction goes through otherwise it fails.
