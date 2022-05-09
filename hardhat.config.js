require("@nomiclabs/hardhat-waffle");
const { readFileSync } = require("fs");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

let privateKey;
try {
  privateKey = readFileSync("private_key.txt", "utf-8");
} catch (err) {
  console.error(
    "\x1b[31m",
    "Whooops! We can't do this without a private key. Did you remember to create a private_key.txt file and place a private key inside?"
  );
  process.exit(1);
}

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more
/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.4",
  paths: {
    artifacts: "./src/artifacts",
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    rinkeby: {
      url: "https://speedy-nodes-nyc.moralis.io/68be5cfb5f3e5bf20da7d6b0/eth/rinkeby",
      accounts: [privateKey],
    },
  },
};
