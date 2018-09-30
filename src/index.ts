#!/usr/bin/env node

import { startCLI } from './modules/repl'
import args, { CommanderStatic } from 'commander'
import path from 'path'

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
  .option('--keystore json-keystore [file]', 'Your private key')
  .option('-c --config [config-file]', 'Your config file')
  .parse(process.argv)

let privateKey, rootChainAddress
try {
  const config = require(path.resolve(args.config))
  privateKey = config.privateKey
  rootChainAddress = config.rootChain
} catch(e)  {
  if (!args.key || !args.address) {
    console.error('Options --key and --address are mandatory')
    process.exit(-1)
  }
  privateKey = args.key
  rootChainAddress = args.address
}

startCLI(args.ethereum, args.dappchain, rootChainAddress, privateKey)
