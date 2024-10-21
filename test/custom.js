import { erc20abi } from "./erc20.js";

(async () => {
  const scw = new arcana.scw.SCW();
  await window.ethereum.enable();
  await scw.init(
    "xar_dev_64fd93467489d19c82517c2a54c097358d4da332",
    window.ethereum
  );
  console.log("Address: " + scw.getSCWAddress());
  console.log("Paymaster Balance: " + (await scw.getPaymasterBalance()));

  let amount = ethers.utils.parseUnits("0.000001", 18);
  const erc20Address = "0x1Ba5e8cF8846d15287d4221bcaF609AD22cA9468";
  const toAddress = "0xbd92a7c9BF0aE4CaaE3978f9177A696fe7eA179F";
  const Erc20Interface = new ethers.utils.Interface(erc20abi);
  // Encode an ERC-20 token transfer to recipientAddress of the specified amount
  const encodedData = Erc20Interface.encodeFunctionData("transfer", [
    toAddress,
    amount,
  ]);

  // // You need to create transaction objects of the following interface
  const tx0 = {
    from: scw.getSCWAddress(),
    to: erc20Address, // destination smart contract address
    data: encodedData,
  };

  // let params = {
  //   mode: "SPONSORED",
  //   calculateGasLimits: false,
  //   callGasLimit: 1000000,
  //   verificationGasLimit: 1000000,
  //   preVerificationGas: 1000000,
  //   maxFeePerGas: 1000000000,
  //   maxPriorityFeePerGas: 1000000000,
  // };

  let params = {
    mode: "BICONOMY",
    calculateGasLimits: true,
  };

  let tx = await scw.doTx(tx0, params);
  console.log(tx0, amount);
  let txDetails = await tx.wait();
  console.log("txHash:(CORRECT) " + txDetails.receipt.transactionHash);
})();
