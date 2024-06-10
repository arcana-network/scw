import { erc20abi } from "./erc20.js";

(async () => {
  const scw = new arcana.scw.SCW();
  await window.ethereum.enable();
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  let signer = await provider.getSigner();
  console.log("EOA: ", await signer.getAddress());
  await scw.init("xar_dev_19759f514a8976ef8b125d93f9ba6908053a5174", signer);
  console.log("Address: " + scw.getSCWAddress());
  // console.log("Paymaster Balance: " + (await scw.getPaymasterBalance()) / 1e18);

  // let amount = ethers.utils.parseUnits("0", 6);
  // const erc20Address = "0xd513E4537510C75E24f941f159B7CAFA74E7B3B9";
  // const toAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  // const Erc20Interface = new ethers.utils.Interface(erc20abi);
  // // Encode an ERC-20 token transfer to recipientAddress of the specified amount
  // const encodedData = Erc20Interface.encodeFunctionData("approve", [
  //   toAddress,
  //   amount,
  // ]);

  // // You need to create transaction objects of the following interface
  // const tx0 = {
  //   from: scw.getSCWAddress(),
  //   to: erc20Address, // destination smart contract address
  //   data: encodedData,
  // };

  // let params = {
  //   mode: "SPONSORED",
  //   calculateGasLimits: false,
  //   callGasLimit: 1000000,
  //   verificationGasLimit: 1000000,
  //   preVerificationGas: 1000000,
  //   maxFeePerGas: 1000000000,
  //   maxPriorityFeePerGas: 1000000000,
  // };

  // let params = {
  //   mode: "BICONOMY",
  //   calculateGasLimits: true,
  // };

  // let tx = await scw.doTx(tx0, params);

  // let txDetails = await tx.wait();
  // console.log("txHash:(CORRECT) " + txDetails.receipt.transactionHash);
})();
