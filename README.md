<!-- write readme by looking at custom.js file -->

## Installation

```
npm i @arcana/scw@0.0.1
```

### Usage

Initialising the SDK

```js
const scw = new arcana.scw.SCW();
await scw.init("<app_id>", window.ethereum);
```

Do a transaction

```js
  const erc20abi = [...];
  let amount = 0.1;
  const erc20Address = "0xfDB2aA382866bb31704558a0c439dA91353651a9";
  const toAddress = "0xA9E78cef5e6c0081b68AdA2554c04198DfF17C69";
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
  console.log(`Transfer done ${tx.hash}`)
```
