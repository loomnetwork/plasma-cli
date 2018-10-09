#!/usr/bin/env node

import args from 'commander'
import Web3 from 'web3'
import { PlasmaUser } from 'loom-js'
import { ERC721, ERC20 } from './modules/config'
import path from 'path'

import Vorpal = require('vorpal')
import { Args, CommandInstance } from 'vorpal'
import BN from 'bn.js'

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
  .option('-a, --address [plasma-address]', "The Plasma Contract's address")
  .option('--key [private-key]', 'Your private key')
  .option('--keystore [json-keystore]', 'Your private key in a file')
  .option('-c --config [config-file]', 'Your config file')
  .parse(process.argv)

let privateKey, plasmaAddress, erc721Address, startBlock
try {
  privateKey = require(path.resolve(args.keystore)).privateKey
  const config = require(path.resolve(args.config))
  plasmaAddress = config.plasma
  erc721Address = config.erc721
  startBlock = new BN(config.block)
} catch (e) {
  if (!args.key || !args.address) {
    console.error('Options --key and --address are mandatory')
    process.exit(-1)
  }
  privateKey = args.key
  plasmaAddress = args.address
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

// Next iteration make depositERC20/depositERC721/depositETH for each
const ERC721At = (addr: string) => ERC721(web3, addr, account)
vorpal
  .command(
    'depositERC721 <address> <coinId>',
    'Deposits an ERC721 coin to the Plasma Chain'
  )
  .types({ string: ['_'] })
  .action(async function(this: CommandInstance, args: Args) {
    this.log(`Depositing ${args.coinId}`)
    const token = ERC721At(args.address).instance
    try {
      await token.safeTransferFrom([addressbook.self, addressbook.plasmaAddress, args.coinId])
      // wait for the deposit event for receipt
      const deposits = await user.deposits()
      this.log('Coin deposited!')
      console.log(deposits[deposits.length - 1])
    } catch (e) {
      console.log(
        `Failed to deposit. Current owner of ${args.coinId} is ${await token.ownerOf(args.coinId)}`
      )
    }
  })

const ERC20At = (addr: string) => ERC20(web3, addr, account)
vorpal
  .command(
    'depositERC20 <address> <amount>',
    'Deposits an ERC20 coin to the Plasma Chain'
  )
  .types({ string: ['_'] })
  .action(async function(this: CommandInstance, args: Args) {
    this.log(`Depositing ${args.coinId}`)
    const token = ERC20At(args.address).instance
    try {
      // Approve
      await token.approve([addressbook.plasmaAddress, args.amount])
      // Transfer
      await user.plasmaCashContract.depositERC20([args.amount])

      // wait for the deposit event for receipt
      const deposits = await user.deposits()
      this.log('Coin deposited!')
      console.log(deposits[deposits.length - 1])
    } catch (e) {
      console.log(`Failed to deposit. User owns only ${await token.balanceOf(addressbook.self)}`)
    }
  })
  .hidden() // make command hidden until we enable plasma erc20 approve/transferFrom

vorpal
  .command('depositETH <amount>', 'Deposit ether to the Plasma Chain')
  .types({ string: ['_'] })
  .action(async function(this: CommandInstance, args: Args) {
    console.log('TBD')
    try {
      this.log(`Depositing ${args.amount} Ether`)
      // wait for the deposit event for receipt
      const deposits = await user.deposits()
      this.log('Coin deposited!')
      console.log(deposits[deposits.length - 1])
    } catch (e) {
      console.log(
        `Failed to deposit. User owns only ${await web3.eth.getBalance(addressbook.self)}`
      )
    }
  })

vorpal
  .command('debug submitDeposit i', 'Submit deposits to the dappchain in place of the oracle')
  .types({ string: ['_'] })
  .action(async function(this: CommandInstance, args: Args) {
    await user.debug(args.i)
  })

vorpal
  .command('debug submitBlock', 'Submits the pending dappchain block in place of the oracle')
  .types({ string: ['_'] })
  .action(async function(this: CommandInstance, args: Args) {
    await user.submitPlasmaBlockAsync()
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
    this.log(`Exiting ${args.coinId}!. Please wait for the exit period...`)
    await user.exitAsync(new BN(args.coinId, 16))
    // Wait for the started exit event for receipt
  })

vorpal
  .command('transfer <coinId> <newOwner>', 'Send a coin to a new user')
  .types({ string: ['_'] })
  .action(async function(this: CommandInstance, args: Args) {
    this.log(`Transferring ${args.coinId} to ${args.newOwner}`)
    await user.transferAsync(new BN(args.coinId, 16), args.newOwner)
    // Wait for the submit block and the data availability for receipt
  })

vorpal
  .command('finalize <coinId>', 'Finalize the exit of a coin and withdraw it')
  .types({ string: ['_'] })
  .action(async function(this: CommandInstance, args: Args) {
    await user.finalizeExitAsync(new BN(args.coinId, 16))
    this.log(`Finalized the exit for ${args.coinId}`)
    // wait for the finalize exit for receipt
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
    const coin = user.getPlasmaCoinAsync(new BN(args.coinId, 16))
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
