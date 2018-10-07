#!/usr/bin/env node


import args from 'commander'
import { PlasmaDB } from 'loom-js'
import Web3 from 'web3'
import { createEntity, ERC721, ERC20 } from './modules/config'
import path from 'path'

import Vorpal = require('vorpal');
import {Args, CommandInstance} from "vorpal";
import { User } from './modules/user'
import BN from 'bn.js';
import { networkInterfaces } from 'os';

const vorpal = new Vorpal();
const vorpalLog = require('vorpal-log')
const repl = require('vorpal-repl')
vorpal.use(vorpalLog);
vorpal.history('plasma-cash.log');

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
const database = new PlasmaDB(args.ethereum, args.dappchain, plasmaAddress, privateKey)
const entity = createEntity(
  web3,
  web3.utils.toChecksumAddress(plasmaAddress),
  args.dappchain,
  privateKey,
  database
)

const ERC721At = (addr: string) => ERC721(web3, addr, entity.ethAccount)
const ERC20At = (addr: string) => ERC20(web3, addr, entity.ethAccount)
const token = ERC721At(erc721Address).instance
const addressbook = {
  plasmaAddress: plasmaAddress,
  demoToken: erc721Address,
  web3Endpoint: args.ethereum,
  dappchainEndpoint: args.dappchain,
  self: web3.eth.accounts.privateKeyToAccount(privateKey).address,
  selfPrivate: privateKey
}
const user = new User(entity, database, web3, addressbook, token, startBlock)

// Next iteration make depositERC20/depositERC721/depositETH for each 
vorpal
  .command('deposit <coinId>', 'Deposit a coin to the Plasma Chain ')
  .types({string: ['_']})
  .action(async function(this: CommandInstance, args: Args) {
    this.log(`Depositing ${args.coinId}`)
    await user.deposit(args.coinId)
    // wait for the deposit event for receipt
  })

vorpal
  .command('exitCoin <coinId>', 'Start the exit of a coin from the Plasma Chain')
  .types({string: ['_']})
  .action(async function(this: CommandInstance, args: Args) {
    this.log(`Exiting ${args.coindId}!. Please wait for the exit period...`)
    await user.exit(args.coinID)
    // Wait for the started exit event for receipt
  })

vorpal
  .command('transfer <coinId> <newOwner>', 'Send a coin to a new user')
  .types({string: ['_']})
  .action(async function(this: CommandInstance, args: Args) {
    this.log(`Transferring ${args.coinId} to ${args.newOwner}`)
    await user.transfer(args.coinId, args.newOwner)
    // Wait for the submit block and the data availability for receipt
  })

vorpal
  .command('finalize <coinId>', 'Finalize the exit of a coin and withdraw it')
  .types({string: ['_']})
  .action(async function(this: CommandInstance, args: Args) {
    this.log(`Finalizing the exit for ${args.slot}`)
    await user.finalizeExit(args.slot)
    // wait for the finalize exit for receipt
  })

vorpal
  .command('refresh', 'Refreshes the user\'s state')
  .action(async function(this: CommandInstance, args: Args) {
    this.log(`Refreshing state`)
    await user.refresh()
    this.log(`Updated!`)
  })


vorpal
  .command('withdraw <coinId>', 'Gets the details about a coin')
  .types({string: ['_']})
  .action(async function(this: CommandInstance, args: Args) {
    this.log(`Withdrawing ${args.coinId}`)
    await user.withdraw(args.coinId)
    // wait for receipt
  })

vorpal
  .command('withdrawBonds', 'Withdraws the user\'s bonds')
  .types({string: ['_']})
  .action(async function(this: CommandInstance, args: Args) {
    this.log(`Withdrawing user bonds`)
    await user.withdrawBonds()
  })

vorpal
  .command('coin <coinId>', 'Gets the details about a coin')
  .types({string: ['_']})
  .action(async function(this: CommandInstance, args: Args) {
    this.log(`Retrieving info for coin ${args.coinId}`)
    this.log(await user.coin(args.coinId))
  })


vorpal
  .delimiter('✨ ')
  .use(repl)
  .show();