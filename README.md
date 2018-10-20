# [Loom Network](https://loomx.io) Plasma Cash Client

Node JS All in one Plasma Cash client.

## Installation

`npm install -g plasma-cli`


## Usage

```
Usage: plasma-cli [options]

Options:
  -V, --version                        output the version number
  -d, --dappchain [dappchain-address]  The DAppChain's endpoint (default: "http://localhost:46658")
  -e, --ethereum [web3-endpoint]       The web3 Ethereum endpoint (default: "http://localhost:8545")
  -a, --address [plasma-address]       The Plasma Contract's address
  --key [private-key]                  Your private key
  --keystore [json-keystore]           Your private key in a file
  -c --config [config-file]            Your config file
  -h, --help                           output usage information
```


## Example connecting to Rinkeby 

### Config File

`plasma-cli --keystore ./config/alice.json -c config/contracts.json -e wss://rinkeby.infura.io/ws`

`alice.json` has your private key in hex form.
`contract.json` has a `plasma` key which is the Plasma Contract's address, and a `block` parameter which should be the block at which the Plasma Contract was deployed. This is needed so that event filtering doesnt check from blocks before than the Plasma contract was deployed. 

### Command Line Arguments

`plasma-cli --key <yourprivatekey> --address <plasmacontractaddress> --block <startblock> -e wss://rinkeby.infura.io/ws`

## Usage inside the CLI

```
> help

  Commands:

    help [command...]                 Provides help for a given command.
    exit                              Exits application.
    myCoins                           Retrieves the user coins from the dappchain or from the state.
    depositERC721 <address> <coinId>  Deposits an ERC721 coin to the Plasma Chain
    depositERC20 <address> <amount>   Deposits an ERC20 coin to the Plasma Chain
    depositETH <amount>               Deposit ether to the Plasma Chain
    deposits                          Gets all the deposits the user has made
    exitCoin <coinId>                 Start the exit of a coin from the Plasma Chain
    transfer <coinId> <newOwner>      Send a coin to a new user
    finalize <coinId>                 Finalize the exit of a coin and withdraw it
    refresh                           Refreshes the user's state
    withdraw <coinId>                 Gets the details about a coin
    withdrawBonds                     Withdraws the user's bonds
    receive <coinId>                  Check coin history and watch exits
    coin <coinId>                     Gets the details about a coin
```

First, you need to deposit some funds to the Plasma Contract. You do this with one of the `deposit{ETH,ERC20,ERC721}` functions. 

## Examples

### Deposit
`depositETH 1000`: Will deposit 1000 Wei to the smart contract
`depositERC20 0xa4e8c3ec456107ea67d3075bf9e3df3a75823db0 1000`: Will deposit 1000 Loom Tokens to the smart contract (with the approve/transferFrom pattern)
`depositERC721 0x06012c8cf97bead5deae237070f9587f8e7a266d 124654`: Will deposit Cryptokitty #124654

After the coin has been deposited, the CLI will return the data for that coin.

```
> depositETH 100000
Depositing 100000 Wei
Coin deposited!
{ slot: <BN: e901f51acd48b12f>,
  blockNumber: <BN: 7d1>,
  denomination: <BN: 186a0>,
  from: '0x3D5Cf1f50C7124ACbC6ea69b96a912fE890619D0',
  contractAddress: '0x3D5Cf1f50C7124ACbC6ea69b96a912fE890619D0' } // when a user deposits ETH, the contractAddress field is set to the user's address
```

The user can then inspect the above information with the `coin` command: `coin e901f51acd48b12f`

### Sending a coin

In order to transact then you can use the command `transfer`. This command will send the transaction, and also send a confirmation receipt of the txs inclusion, if the transaction is included within a set number of blocks (default 6). If not, the user can assume they are being censored and should exit. If successfuly included, it will also stop any watchers for the coin's exits.

```
> transfer e901f51acd48b12f 0x82472162c3e7927557e7bcf5cca7261e188747d3
Transferring e901f51acd48b12f to 0x82472162c3e7927557e7bcf5cca7261e188747d3
Tx(e901f51acd48b12f, 0x82472162c3e7927557e7bcf5cca7261e188747d3) included & verified in block 3000
```

The receiver at this point shoudl call `receive`

### Exiting a coin

This is as simple as calling `exitCoin`. The client will initiate an exit (and deposit the required security bond). It will also automatically trigger a watcher for challenges on that exit. 

```
> exitCoin e901f51acd48b12f
Exiting e901f51acd48b12f!
Exit initiated!

> coin e901f51acd48b12f
Retrieving info for coin e901f51acd48b12f
{ slot: <BN: e901f51acd48b12f>,
  uid: <BN: 0>,
  depositBlockNum: <BN: 7d1>,
  denomination: <BN: 186a0>,
  owner: '0x3D5Cf1f50C7124ACbC6ea69b96a912fE890619D0',
  state: 1, // State = 1 indicates that it's currently under an exit
  mode: 0,
  contractAddress: '0x3D5Cf1f50C7124ACbC6ea69b96a912fE890619D0' }
```

After the dispute period has passed, they can finalize the exit, and withdraw the coin with their bonds. This will stop all watchers

```
> finalize e901f51acd48b12f
Finalized the exit for e901f51acd48b12f

> coin e901f51acd48b12f
Retrieving info for coin e901f51acd48b12f
{ slot: <BN: e901f51acd48b12f>,
  uid: <BN: 0>,
  depositBlockNum: <BN: 7d1>,
  denomination: <BN: 186a0>,
  owner: '0x82472162c3E7927557E7bCF5CCa7261E188747d3',
  state: 2, // State = 2 indicates the exit has been finalized
  mode: 0,
  contractAddress: '0x3D5Cf1f50C7124ACbC6ea69b96a912fE890619D0' }

> withdraw e901f51acd48b12f
Withdrawing e901f51acd48b12f
Withdrew e901f51acd48b12f

> coin e901f51acd48b12f
Retrieving info for coin e901f51acd48b12f
{ slot: <BN: e901f51acd48b12f>,
  uid: <BN: 0>,
  depositBlockNum: <BN: 0>,
  denomination: <BN: 0>,
  owner: '0x0000000000000000000000000000000000000000',
  state: 0,
  mode: 0,
  contractAddress: '0x0000000000000000000000000000000000000000' }

> withdrawBonds
Bonds withdrawn:)
```

## Deploy to Rinkeby

```
yarn
REPO_ROOT=`pwd`
git clone https://github.com/loomnetwork/plasma-cash
cd $REPO_ROOT/plasma-cash/server
git checkout deploy
npm install
mnemonic="your mnemonic here" .node_modules/bin/truffle migrate -f2 --network rinkeby
PLASMA_ADDRESS=$(python -c "import json ; print(json.load(open('./build/contracts/RootChain.json'))['networks']['4']['address'])")
ERC721_ADDRESS=$(python -c "import json ; print(json.load(open('./build/contracts/CryptoCards.json'))['networks']['4']['address'])")
ERC20_ADDRESS=$(python -c "import json ; print(json.load(open('./build/contracts/.json'))['networks']['4']['address'])")
```

At this moment, the Plasma contract has been deployed (along with the Validator Manager contract, and 2 toy tokens for you to play with). We need to put the `PLASMA_ADDRESS` in the loom.yml.


```
cd $REPO_ROOT/dappchain
curl https://raw.githubusercontent.com/loomnetwork/loom-sdk-documentation/master/scripts/get_loom.sh | sh
chmod +x ./loom

# Modify the Plasma contract's address
sed -i -e "s/PlasmaHexAddress:.*/PlasmaHexAddress: \"$PLASMA_ADDRESS\"/" loom.yml

# Initialize loom params - also initialize the oracle address
./loom init -f
cp oracle.genesis.json genesis.json

./loom run
```

Now you have a Loom DAppchain running that has Plasma Cash deployed and is hooked to Rinkeby.
You can launch the CLI as described above and interact with it.
