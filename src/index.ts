#!/usr/bin/env node

import { startCLI } from './modules/repl'
import args, { CommanderStatic } from 'commander'
import path from 'path'
import BN from 'bn.js'

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

let privateKey, plasmaAddress, erc721Address
try {
  privateKey = require(path.resolve(args.keystore)).privateKey
  const config = require(path.resolve(args.config))
  plasmaAddress = config.plasma
  erc721Address = config.erc721
} catch (e) {
  if (!args.key || !args.address) {
    console.error('Options --key and --address are mandatory')
    process.exit(-1)
  }
  privateKey = args.key
  plasmaAddress = args.address
}

startCLI(args.ethereum, args.dappchain, privateKey, plasmaAddress, erc721Address, new BN(3085051))
