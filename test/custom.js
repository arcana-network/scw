import { erc20abi } from "./erc20.js";

(async () => {
  const scw = new arcana.scw.SCW();
  await window.ethereum.enable();
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  let signer = await provider.getSigner();
  console.log("EOA: ", await signer.getAddress());
  await scw.init("xar_test_4c309c33e0343cf9b68e7c7e4486da181f6038ec", signer);
  console.log("Address: " + scw.getSCWAddress());

  let amount = ethers.utils.parseUnits("0", 6);
  const erc20Address = "0xd513E4537510C75E24f941f159B7CAFA74E7B3B9";
  const toAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const Erc20Interface = new ethers.utils.Interface(erc20abi);
  // Encode an ERC-20 token transfer to recipientAddress of the specified amount
  const encodedData = Erc20Interface.encodeFunctionData("approve", [
    toAddress,
    amount,
  ]);

  // You need to create transaction objects of the following interface
  const tx0 = {
    from: scw.getSCWAddress(),
    to: erc20Address, // destination smart contract address
    data: encodedData,
  };

  let tx = await scw.doTx(tx0);
  let txDetails = await tx.wait();
  console.log("txHash:(CORRECT) " + txDetails.receipt.transactionHash);
})();
