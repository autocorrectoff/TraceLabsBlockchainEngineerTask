const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const { utils, Wallet, Contract } = require("ethers");

const erc20ABI = [
  "function symbol() public view returns (string)",
  "function name() public view returns (string)",
  "function decimals() public view returns (uint8)",
  "function totalSupply() public view returns (uint)",
  "function balanceOf(address usr) public view returns (uint)",
  "function transfer(address dst, uint wad) returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function allowance(address owner, address spender) public view returns (uint)",
];

const contractABI = [
  "function deposit(uint256 amount)",
  "function withdraw()",
  "function fundRewardPool(uint256 amount)",
];

// Accounts 0, 1 and 2 from Hardhat console
const accounts = {
  zero: {
    address: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
    privateKey:
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  },
  one: {
    address: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    privateKey:
      "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  },
  two: {
    address: "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
    privateKey:
      "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  },
};

describe("Bank", function () {
  xit("Should be locked for deposits after initial deposit period", async function () {
    const tokenAddress = await deployTokenContract();

    const bankAddress = await deployBankContract(tokenAddress, 5 * 60);

    const amount = utils.parseUnits("5", 18);
    const token = await initTokenContract(
      accounts.one.privateKey,
      tokenAddress
    );
    let approveTx = await token.approve(bankAddress, amount.mul(3));
    await approveTx.wait(1);

    const bankContract = await initBankContract(
      accounts.one.privateKey,
      bankAddress
    );

    // Should succeed
    let depositTx = await bankContract.deposit(amount);
    await depositTx.wait(1);

    // Two minutes in - should also succeed
    const twoMin = 2 * 60;
    await increaseBlockTime(twoMin);
    depositTx = await bankContract.deposit(amount, {
      gasLimit: 100000,
    });
    await depositTx.wait(1);

    // Five minutes in - should be rejected
    let errorMessage;
    try {
      const threeMin = 3 * 60;
      await increaseBlockTime(threeMin);
      await bankContract.deposit(amount, {
        gasLimit: 100000,
      });
      errorMessage = null;
    } catch (err) {
      errorMessage = err.toString();
    }
    expect(errorMessage).to.contain("Deposit period has expired");
  });

  xit("Should be possible to withdrawal before the lock period", async () => {
    const tokenAddress = await deployTokenContract();

    const bankAddress = await deployBankContract(tokenAddress, 5 * 60);
    const amount = utils.parseUnits("5", 18);
    const token = await initTokenContract(
      accounts.one.privateKey,
      tokenAddress
    );
    let approveTx = await token.approve(bankAddress, amount);
    await approveTx.wait(1);

    const bankContract = await initBankContract(
      accounts.one.privateKey,
      bankAddress
    );

    let depositTx = await bankContract.deposit(amount);
    await depositTx.wait(1);

    const balance = await token.balanceOf(accounts.one.address);
    await bankContract.withdraw();
    const newBalance = await token.balanceOf(accounts.one.address);
    expect(newBalance).eq(amount.add(balance));
  });

  xit("Should be locked for withdrawals during the lock period", async () => {
    const tokenAddress = await deployTokenContract();
    const T = 5 * 60;
    const bankAddress = await deployBankContract(tokenAddress, T);
    const amount = utils.parseUnits("5", 18);
    const token = await initTokenContract(
      accounts.one.privateKey,
      tokenAddress
    );
    let approveTx = await token.approve(bankAddress, amount);
    await approveTx.wait(1);

    const bankContract = await initBankContract(
      accounts.one.privateKey,
      bankAddress
    );

    let depositTx = await bankContract.deposit(amount);
    await depositTx.wait(1);

    await increaseBlockTime(T);

    const balance = await token.balanceOf(accounts.one.address);
    let errorMessage;
    try {
      await bankContract.withdraw({
        gasLimit: 100000,
      });
      errorMessage = null;
    } catch (err) {
      errorMessage = err.toString();
    }
    const newBalance = await token.balanceOf(accounts.one.address);

    expect(newBalance).eq(balance);
    expect(errorMessage).to.contain("Asset lock period is still in effect");
  });

  xit("Should be opened for withdrawals after the lock period", async () => {
    const tokenAddress = await deployTokenContract();
    const T = 5 * 60;
    const bankAddress = await deployBankContract(tokenAddress, T);

    const amount = utils.parseUnits("5", 18);
    const token = await initTokenContract(
      accounts.one.privateKey,
      tokenAddress
    );
    let approveTx = await token.approve(bankAddress, amount);
    await approveTx.wait(1);

    const bankContract = await initBankContract(
      accounts.one.privateKey,
      bankAddress
    );

    let depositTx = await bankContract.deposit(amount);
    await depositTx.wait(1);

    const balance = await token.balanceOf(accounts.one.address);
    await increaseBlockTime(T * 2);
    await bankContract.withdraw({
      gasLimit: 200000,
    });
    const newBalance = await token.balanceOf(accounts.one.address);
    expect(newBalance).eq(amount.add(balance));
  });

  xit("Should allow contract owner to fund reward pool", async () => {
    const tokenAddress = await deployTokenContract();
    const bankAddress = await deployBankContract(tokenAddress, 5 * 60);

    const token = await initTokenContract(
      accounts.zero.privateKey,
      tokenAddress
    );
    const bankContract = await initBankContract(
      accounts.zero.privateKey,
      bankAddress
    );

    const amount = utils.parseUnits("100", 18);
    let approveTx = await token.approve(bankAddress, amount);
    await approveTx.wait(1);

    const balance = await token.balanceOf(bankAddress);
    await bankContract.fundRewardPool(amount, {
      gasLimit: 100000,
    });
    const newBalance = await token.balanceOf(bankAddress);
    expect(newBalance).eq(balance.add(amount));
  });

  it("Should withdraw correct amount for t0+2T to t0+3T withdrawal period", async() => {
    // Deploying Contracts
    const tokenAddress = await deployTokenContract();
    const T = 5 * 60;
    const bankAddress = await deployBankContract(tokenAddress, T);

    // Connect to Token Contract as owner and approve amount
    const reward = "1000";
    let amount = utils.parseUnits(reward, 18);
    const token0 = await initTokenContract(
      accounts.zero.privateKey,
      tokenAddress
    );
    let approveTx = await token0.approve(bankAddress, amount);
    await approveTx.wait(1);

    // Connect to Bank Contract as owner
    const bankContract0 = await initBankContract(
      accounts.zero.privateKey,
      bankAddress
    );

    // Owner funds the reward pool
    await bankContract0.fundRewardPool(amount, {
      gasLimit: 100000,
    });

    // Address 1 connects to Token Contract and approves amount
    const address1Deposit = "100";
    amount = utils.parseUnits(address1Deposit, 18);
    const token1 = await initTokenContract(
      accounts.one.privateKey,
      tokenAddress
    );
    approveTx = await token1.approve(bankAddress, amount);
    await approveTx.wait(1);

    // Address 1 connects to Bank Contract
    const bankContract1 = await initBankContract(
      accounts.one.privateKey,
      bankAddress
    );

    // Address 1 deposits amount
    let depositTx = await bankContract1.deposit(amount, {
      gasLimit: 200000,
    });
    await depositTx.wait(1);

    // Address 2 connects to Token Contract and approves amount
    const address2Deposit = "500";
    amount = utils.parseUnits(address2Deposit, 18);
    const token2 = await initTokenContract(
      accounts.two.privateKey,
      tokenAddress
    );
    approveTx = await token2.approve(bankAddress, amount);
    await approveTx.wait(1);

    // Address 2 connects to Bank Contract
    const bankContract2 = await initBankContract(
      accounts.two.privateKey,
      bankAddress
    );

    // Address 2 deposits amount
    depositTx = await bankContract2.deposit(amount, {
      gasLimit: 200000,
    });
    await depositTx.wait(1);

    const remainingBalance = await token1.balanceOf(accounts.one.address);
    await increaseBlockTime(2 * T);

    // Address 1 withdraws the deposit
    await bankContract1.withdraw({
      gasLimit: 200000,
    });
    const actualBalance = await token1.balanceOf(accounts.one.address);

    const ratioInTotal = Math.floor(parseInt(address1Deposit) / (parseInt(address1Deposit) + parseInt(address2Deposit)) * 100);
    const R1 = 0.2 * parseInt(reward);
    let withdrewed = (R1 / ratioInTotal) + parseInt(address1Deposit);
    withdrewed = utils.parseUnits(withdrewed.toString(), 18);
    
    expect(actualBalance).eq(withdrewed.add(remainingBalance));
  });

});

const deployBankContract = async (tokenAddress, seconds) => {
  const Contract = await ethers.getContractFactory("Bank");
  const contract = await Contract.deploy(tokenAddress, seconds);
  await contract.deployed();
  return contract.address;
};

const deployTokenContract = async () => {
  let initialMintAmount = "10000";
  initialMintAmount = utils.parseUnits(initialMintAmount, 18);
  const Contract = await ethers.getContractFactory("TestERC20Token");
  const contract = await Contract.deploy(initialMintAmount);
  await contract.deployed();
  const twoHundredTokens = utils.parseUnits("200", 18);
  const sixHundredTokens = utils.parseUnits("600", 18);
  await fundAccount(accounts.one.address, twoHundredTokens, contract.address);
  await fundAccount(accounts.two.address, sixHundredTokens, contract.address);
  return contract.address;
};

const fundAccount = async (address, amount, tokenAddress) => {
  const wallet = new Wallet(accounts.zero.privateKey, ethers.provider);
  const tokenContract = new Contract(tokenAddress, erc20ABI, wallet);
  const tx = await tokenContract.transfer(address, amount);
  await tx.wait(1);
};

const increaseBlockTime = async (seconds) => {
  await network.provider.send("evm_increaseTime", [seconds]);
  await network.provider.send("evm_mine");
};

const getCurrentBlockTimestamp = async () => {
  const currentBlock = await ethers.provider.getBlock();
  return currentBlock.timestamp;
};

const initTokenContract = async (pk, address) => {
  const wallet = new Wallet(pk, ethers.provider);
  return new Contract(address, erc20ABI, wallet);
};

const initBankContract = async (pk, address) => {
  const wallet = new Wallet(pk, ethers.provider);
  return new Contract(address, contractABI, wallet);
};
