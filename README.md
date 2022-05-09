# TraceLabsBlockchainEngineerTask

### Hardhat commands:

```shell
npx hardhat accounts
npx hardhat compile
npx hardhat clean
npx hardhat test
npx hardhat node
node scripts/sample-script.js
npx hardhat help
```

## Usage:

### Compiling Smart Contracts
```
npx hardhat compile
```
_ABIs and bytecodes are located in src/artifacts_

### Locally
**To start local network simulation run**
```
npx hardhat node
```
**To deploy Test Token Contract to local network simulation run**
```
npx hardhat run scripts/testERC20Token_deploy.js --network localhost
```
**To deploy Bank Contract to local network simulation run**
```
npx hardhat run scripts/bank_deploy.js --network localhost
```


### Rinkeby
**To deploy Test Token Contract to Rinkeby run**
**(you don't have to do this if you wish to use an existing token)**
```
npx hardhat run scripts/testERC20Token_deploy.js --network rinkeby
```
**To deploy Bank Contract to Rinkeby run**
**(beforehand in the token_addr_rinkeby.txt file specify erc20 address you wish the contract to work with)**
```
npx hardhat run scripts/bank_deploy.js --network rinkeby
```
**To fund the reward pool call _fundRewardPool_ as the contract owner**

🔴IMPORTANT❗**Don't forget to put your private key in the private_key.txt file where hardhat.config.js will pull it from or deployment will fail**🔴IMPORTANT❗

### Running Tests
```
npx hardhat test
```