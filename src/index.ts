#!/usr/bin/env node

import { startCLI } from './modules/repl'

const args = require('commander')

// CLI Parser
args
  .version('0.1.0')
  .option(
    '-d, --dappchain [dappchain-address]',
    "The DAppChain's endpoint",
    'http://localhost:46658'
  )
  .option('-e, --ethereum [web3-endpoint]', 'The web3 Ethereum endpoint', 'http://localhost:8545')
  .option('-a, --address [plasma-address]', "The Plasma Contract's address", '0x123')
  .option('--key [private-key]', 'Your private key')
  .option('--keystore json-keystore [file]', 'Your private key')
  .parse(process.argv)

startCLI(args)
