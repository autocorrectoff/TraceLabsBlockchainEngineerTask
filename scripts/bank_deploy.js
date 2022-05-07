const hre = require("hardhat");
const { utils, Contract, Wallet, providers } = require("ethers");
const { readFile } = require("fs/promises");

const erc20ABI = [
  "function symbol() public view returns (string)",
  "function name() public view returns (string)",
  "function decimals() public view returns (uint8)",
  "function totalSupply() public view returns (uint)",
  "function balanceOf(address usr) public view returns (uint)",
  "function transfer(address dst, uint wad) returns (bool)",
];

const account0Addr = "";
const account0PK =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

async function main() {
  let tokenAddr;
  if (process.env.HARDHAT_NETWORK == "localhost") {
    tokenAddr = await readFile("token_addr_localhost.txt", "utf-8");
  } else if (process.env.HARDHAT_NETWORK == "rinkeby") {
    tokenAddr = await readFile("token_addr_rinkeby.txt", "utf-8");
  }
  let tokenAmount = "100";
  tokenAmount = utils.parseUnits(tokenAmount, 18);
  const timeLap = 5 * 60; // 5 minutes
  const Bank = await hre.ethers.getContractFactory("Bank");
  const bank = await Bank.deploy(tokenAddr, timeLap);

  await bank.deployed();

  console.log("Bank Contract deployed to:", bank.address);

  // if depoying to testnets you'll have to fund contract on your own
  if (process.env.HARDHAT_NETWORK == "localhost") {
    await fundContract(tokenAddr, bank.address, tokenAmount);
  }
}

const fundContract = async (tokenAddr, contractAddr, tokenAmount) => {
  const provider = new providers.JsonRpcProvider("http://localhost:8545");
  const wallet = new Wallet(account0PK, provider);

  const tokenContract = new Contract(tokenAddr, erc20ABI, wallet);

  const tx = await tokenContract.transfer(contractAddr, tokenAmount);
  await tx.wait(1);

  const res = await tokenContract.balanceOf(contractAddr);
  console.log("Token balance: " + utils.formatEther(res));
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
