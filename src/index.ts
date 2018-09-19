#!/usr/bin/env node

const args = require('commander')
import Web3 from 'web3'
import { ERC20, ERC721, createEntity } from './config'
import repl from 'repl'

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

// Setup args
const provider = new Web3.providers.HttpProvider(args.ethereum)
const web3 = new Web3(provider)
const user = createEntity(web3, args.address, args.dappchain, args.key)
const plasmaABI = require("./ABI/PlasmaCash.json")
const plasma = new web3.eth.Contract(plasmaABI, args.address)

// Create the REPL
const prompt = repl.start('$ ')
prompt.context.plasma = plasma;
prompt.context.web3 = web3;
prompt.context.dappchain = user;
prompt.context.ERC20 = ERC20;
prompt.context.ERC721 = ERC721;
