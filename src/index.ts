#!/usr/bin/env node

import args from 'commander'
import Web3 from 'web3'
import { PlasmaUser } from 'loom-js'
import path from 'path'

import Vorpal = require('vorpal')
import { Args, CommandInstance } from 'vorpal'
import BN from 'bn.js'
import Tx from 'ethereumjs-tx'

const vorpal = new Vorpal()
const vorpalLog = require('vorpal-log')
const repl = require('vorpal-repl')
vorpal.use(vorpalLog)
vorpal.history('plasma-cash.log')

// CLI Parser
args
  .version('0.1.0')
  .option(
    '-d, --dappchain [dappchain-address]',
    "The DAppChain's endpoint",
    'http://localhost:46658'
  )
  .option('-e, --ethereum [web3-endpoint]', 'The web3 Ethereum endpoint', 'http://localhost:8545')
  .option('-b, --startblock [block number]', 'The block number in which the plasma contract was deployed. Used for event filtering')
  .option('-a, --address [plasma-address]', "The Plasma Contract's address")
  .option('--key [private-key]', 'Your private key')
  .option('--keystore [json-keystore]', 'Your private key in a file')
  .option('-c --config [config-file]', 'Your config file')
  .parse(process.argv)

let privateKey: string = ''
let plasmaAddress: string = ''
let erc721Address: string = ''
let erc20Address: string = ''
let startBlock: BN
privateKey = require(path.resolve(args.keystore)).privateKey
try {
  const config = require(path.resolve(args.config))
  plasmaAddress = config.plasma
  erc721Address = config.erc721
  erc20Address = config.erc20
  startBlock = new BN(config.block)
} catch (e) {
  if (!args.keystore || !args.address) {
    console.error('Options --key and --address are mandatory')
    process.exit(-1)
  }
  privateKey = require(path.resolve(args.keystore)).privateKey
  plasmaAddress = args.address
  startBlock = new BN(args.startblock)
  startBlock = new BN(0)
}

const provider = new Web3.providers.WebsocketProvider(args.ethereum)
const web3 = new Web3(provider)
const account = web3.eth.accounts.privateKeyToAccount(privateKey)
const addressbook = {
  plasmaAddress: plasmaAddress,
  demoToken: erc721Address,
  web3Endpoint: args.ethereum,
  dappchainEndpoint: args.dappchain,
  self: web3.eth.accounts.privateKeyToAccount(privateKey).address,
  selfPrivate: privateKey
}
const user = PlasmaUser.createUser(
  args.ethereum,
  plasmaAddress,
  args.dappchain,
  privateKey,
  startBlock
)

// On login: -- This requires exit/withdraw oracle to be working properly
// Get all coins that have been validated
// Check if any events happened since the latst observed block in the last session
//  Start watching these coins
// const lastCheckedBlock = user.database.getLastBlock()
// const coins = user.database.getAllCoinSlots()
// coins.forEach(async coinId => {
//     const events: any[] = await user.plasmaCashContract.getPastEvents('StartedExit', {
//       filter: { slot: coinId },
//       fromBlock: lastCheckedBlock
//     })
//     if (events.length > 0) {
//       // Challenge the last exit of this coin if there were any exits at the time
//       const exit = events[events.length - 1]
//       await user.challengeExitAsync(coinId, exit.owner)
//     }
//     console.log(`Verified ${coinId} history, started watching.)`)
//     user.watchExit(coinId, new BN(await web3.eth.getBlockNumber()))
//   })
// // In addition, check for any new coins
// user.refreshAsync()

vorpal
  .command('myCoins', 'Retrieves the user coins from the dappchain or from the state.')
  .types({ string: ['_'] })
  .action(async function(this: CommandInstance, args: Args) {
    const coins = await user.getUserCoinsAsync()
    console.log(coins)
  })

vorpal
  .command('depositERC721 <address> <coinId>', 'Deposits an ERC721 coin to the Plasma Chain')
  .types({ string: ['_'] })
  .action(async function(this: CommandInstance, args: Args) {
    this.log(`Depositing ${args.coinId}`)
    const coin = await user.depositERC721Async(new BN(args.coinId), args.address)
    console.log('Deposited coin:')
    console.log(coin)
  })

vorpal
  .command('depositERC20 <address> <amount>', 'Deposits an ERC20 coin to the Plasma Chain')
  .types({ string: ['_'] })
  .action(async function(this: CommandInstance, args: Args) {
    this.log(`Depositing ${args.amount}`)
    const coin = await user.depositERC20Async(new BN(args.amount), args.address)
    console.log('Deposited coin:')
    console.log(coin)
  })

vorpal
  .command('depositETH <amount>', 'Deposit wei to the Plasma Chain')
  .types({ string: ['_'] })
  .action(async function(this: CommandInstance, args: Args) {
    try {
      this.log(`Depositing ${args.amount} Wei`)
      const coin = await user.depositETHAsync(new BN(args.amount))
      console.log('Deposited coin:')
      console.log(coin)
    } catch (e) {
      console.log(e)
      console.log(
        `Failed to deposit. User owns only ${await web3.eth.getBalance(addressbook.self)}`
      )
    }
  })
  .hidden()

// Next iteration make depositERC20/depositERC721/depositETH for each
vorpal
  .command('deposits', 'Gets all the deposits the user has made')
  .action(async function(this: CommandInstance, args: Args) {
    const deposits = await user.deposits()
    console.log(deposits)
  })

vorpal
  .command('exitCoin <coinId>', 'Start the exit of a coin from the Plasma Chain')
  .types({ string: ['_'] })
  .action(async function(this: CommandInstance, args: Args) {
    this.log(`Exiting ${args.coinId}!`)
    try {
      await user.exitAsync(new BN(args.coinId, 16))
      console.log('Exit initiated!')
    } catch (e) {
      console.log('Exit failed! Error: ', e)
    }
  })

vorpal
  .command('transfer <coinId> <newOwner>', 'Send a coin to a new user')
  .types({ string: ['_'] })
  .action(async function(this: CommandInstance, args: Args) {
    this.log(`Transferring ${args.coinId} to ${args.newOwner}`)
    await user.transferAndVerifyAsync(new BN(args.coinId, 16), args.newOwner)
  })

vorpal
  .command('finalize <coinId>', 'Finalize the exit of a coin and withdraw it')
  .types({ string: ['_'] })
  .action(async function(this: CommandInstance, args: Args) {
    await user.finalizeExitAsync(new BN(args.coinId, 16))
    this.log(`Finalized the exit for ${args.coinId}`)
  })

vorpal
  .command('refresh', "Refreshes the user's state")
  .action(async function(this: CommandInstance, args: Args) {
    this.log(`Refreshing state`)
    await user.refreshAsync()
    this.log(`Updated!`)
  })

vorpal
  .command('withdraw <coinId>', 'Gets the details about a coin')
  .types({ string: ['_'] })
  .action(async function(this: CommandInstance, args: Args) {
    this.log(`Withdrawing ${args.coinId}`)
    const coin = await user.getPlasmaCoinAsync(new BN(args.coinId, 16))
    await user.withdrawAsync(new BN(args.coinId, 16))
    console.log(`Withdrew ${coin}`)
  })

vorpal
  .command('withdrawBonds', "Withdraws the user's bonds")
  .types({ string: ['_'] })
  .action(async function(this: CommandInstance, args: Args) {
    await user.withdrawBondsAsync()
    this.log(`Bonds withdrawn:)`)
  })

vorpal
  .command('receive <coinId>', 'Check coin history and watch exits')
  .types({ string: ['_'] })
  .action(async function(this: CommandInstance, args: Args) {
    const coinId = new BN(args.coinId, 16)
    await user.receiveAndWatchCoinAsync(coinId)
  })

vorpal
  .command('coin <coinId>', 'Gets the details about a coin')
  .types({ string: ['_'] })
  .action(async function(this: CommandInstance, args: Args) {
    this.log(`Retrieving info for coin ${args.coinId}`)
    console.log(await user.getPlasmaCoinAsync(new BN(args.coinId, 16)))
  })

vorpal
  .delimiter('✨ ')
  .use(repl)
  .show()

process.on('SIGINT', async () => {
  console.log('Caught interrupt signal')
  user.database.saveLastBlock(new BN(await web3.eth.getBlockNumber()))
  process.exit()
})
