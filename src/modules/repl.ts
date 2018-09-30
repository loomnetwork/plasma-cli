import Web3 from 'web3'
import { ERC20, ERC721, createEntity } from './config'
import repl from 'repl'
import PlasmaDB from './db'
import SignedContract from './signed-contract';

const transform = require('./repl-utils/transform')

export function startCLI(web3Endpoint: string, dappchainEndpoint: string, rootChain: string,  privateKey: string) {
  // Setup args
  const provider = new Web3.providers.WebsocketProvider(web3Endpoint)
  const web3 = new Web3(provider)
  const user = createEntity(web3, web3.utils.toChecksumAddress(rootChain), dappchainEndpoint, privateKey)
  const plasmaABI = require('./../ABI/PlasmaCash.json')
  const plasma = new SignedContract(web3, plasmaABI, rootChain, privateKey)
  const database = new PlasmaDB(web3Endpoint, dappchainEndpoint, rootChain, privateKey)

  const myERC721 = (addr: string) => ERC721(web3, addr, privateKey)
  const myERC20 = (addr: string) => ERC20(web3, addr, privateKey)

  // Create the REPL
  const prompt = repl.start('$ ')
  prompt.context.plasma = plasma
  prompt.context.web3 = web3
  prompt.context.eth = web3.eth
  prompt.context.dappchain = user
  prompt.context.ERC20 = myERC20
  prompt.context.ERC721 = myERC721
  prompt.context.local = database

  // Set some convenience variables
  prompt.context.helpers = {
    plasmaAddress : rootChain,
    web3Endpoint : web3Endpoint,
    dappchainEndpoint : dappchainEndpoint,
    self : web3.eth.accounts.privateKeyToAccount(privateKey).address
  }

  transform(prompt)
}
