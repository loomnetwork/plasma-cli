#!/usr/bin/env node

import args from 'commander'
import path from 'path'
import Vorpal = require('vorpal')
import { Args, CommandInstance } from 'vorpal'

import BN from 'bn.js'
import { PlasmaUser } from 'loom-js'

// Vorpal setup
const vorpal = new Vorpal()
const vorpalLog = require('vorpal-log')
vorpal.use(vorpalLog)
vorpal.history('plasma-cash.log')

// CLI Parser
args
  .version('0.1.0')
  .option('--eth-key [private-key]', 'Your private key')
  .option('--dappchain-key [dappchain-private-key]', 'Your dappchain private key')
  .option('--plasma-address [plasma-address]', "The Plasma Contract's address")
  .option(
    '--startblock [block number]',
    'The block number in which the plasma contract was deployed. Used for event filtering'
  )
  .option('--eth-url [ethereum-url]', 'The Ethereum url', 'http://localhost:8545')
  .option(
    '--eth-events-url [ethereum-event-url]',
    'The Ethereum url for listening to events',
    'ws://localhost:8546'
  )
  .option('--dappchain-url [dappchain-url]', "The DAppChain's url", 'http://localhost:46658')
  .option('--db-path [database path]', 'The path to the database file')
  .option('--config [config-file]', 'Your config file')
  .option('--contract-name [contract-name]', "The plasma contract's name in the DAppchain", 'plasmacash')
  .parse(process.argv)

let ethPrivateKey
let dappchainPrivateKey
let plasmaAddress
let startBlock
let ethUrl
let ethEventsUrl
let dappchainUrl
let contractName
let chainId //check how to regex grab chainId from the domain
let dbPath

let arg = false
try {
  let config = require(path.resolve(args.config))
  ethPrivateKey = config.ethPrivateKey
  dappchainPrivateKey = config.dappchainPrivateKey
  plasmaAddress = config.plasmaAddress
  startBlock = new BN(config.startBlock)
  ethUrl = config.ethUrl
  ethEventsUrl = config.ethEventsUrl
  dappchainUrl = config.dappchainUrl
  dbPath = config.dbPath
  contractName = config.contractName
  chainId = config.dappchainUrl.split('.')[0].split('-')[2]
} catch (e) {
  console.log(e)
  arg = true
}

// Otherwise we get the arguments from the commandline - CAREFUL WITH PASTING PRIVATEKEYS IN THE COMMAND LINE!
if (arg) {
  ethPrivateKey = args.ethPrivateKey
  dappchainPrivateKey = args.dappchainPrivateKey
  plasmaAddress = args.plasmaAddress
  startBlock = new BN(args.startBlock)
  ethUrl = args.ethUrl
  ethEventsUrl = args.ethEventsUrl
  dappchainUrl = args.dappchainUrl
  dbPath = args.dbPath
  contractName = args.contractName
  chainId = args.dappchainUrl.split('.')[0].split('-')[2]
}

;(async () => {

  PlasmaUser.contractName = contractName
  const user = await PlasmaUser.createOfflineUser(
    ethPrivateKey,
    dappchainPrivateKey,
    ethUrl,
    plasmaAddress,
    dappchainUrl,
    ethEventsUrl,
    dbPath,
    startBlock,
    chainId
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
    .command('myAddress', 'Logs the user\'s address')
    .types({ string: ['_'] })
    .action(async function(this: CommandInstance, args: Args) {
      console.log(user.ethAddress)
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
      }
    })

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
    .command('watch', "Refreshes the user's state")
    .action(async function(this: CommandInstance, args: Args) {
      this.log(`Starting to watch blocks and auto refresh state`)
      await user.watchBlocks()
    })
  vorpal
    .command('stop-watching', "Refreshes the user's state")
    .action(async function(this: CommandInstance, args: Args) {
      this.log(`Stopped watching blocks`)
      await user.stopWatchingBlocks()
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

  vorpal.delimiter('✨ ').show()

  process.on('SIGINT', async () => {
    console.log('Caught interrupt signal')
    process.exit()
  })
})()
