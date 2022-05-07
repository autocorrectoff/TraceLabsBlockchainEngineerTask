const { expect } = require("chai");
const { ethers } = require("hardhat");
const { utils } = require("ethers");

describe("TestERC20Token", function () {
  it("Should return correct total supply", async function () {
    let initialMintAmount = "10000";
    initialMintAmount = utils.parseUnits(initialMintAmount, 18);
    const Contract = await ethers.getContractFactory("TestERC20Token");
    const contract = await Contract.deploy(initialMintAmount);
    await contract.deployed();

    const totalSupply = await contract.totalSupply();
    expect(+utils.formatUnits(totalSupply, "ether")).to.equal(
      +initialMintAmount.toString()
    );
  });
});
