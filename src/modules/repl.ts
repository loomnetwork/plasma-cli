import BN from 'bn.js'
import { PlasmaDB } from 'loom-js'
import repl from 'repl'
import Web3 from 'web3'
import { createEntity, ERC20, ERC721 } from './config'
import { User } from './user'

const transform = require('./repl-utils/transform')

export function startCLI(
  web3Endpoint: string,
  dappchainEndpoint: string,
  privateKey: string,
  rootChain: string,
  erc721?: string,
  startBlock?: BN
) {
  // Setup args
  const provider = new Web3.providers.WebsocketProvider(web3Endpoint)
  const web3 = new Web3(provider)
  const database = new PlasmaDB(web3Endpoint, dappchainEndpoint, rootChain, privateKey)
  const entity = createEntity(
    web3,
    web3.utils.toChecksumAddress(rootChain),
    dappchainEndpoint,
    privateKey,
    database
  )
  const ERC721At = (addr: string) => ERC721(web3, addr, entity.ethAccount)
  const ERC20At = (addr: string) => ERC20(web3, addr, entity.ethAccount)
  const token = ERC721At(erc721!).instance
  // Create the REPL
  const prompt = repl.start('$ ')

  const addressbook = {
    plasmaAddress: rootChain,
    demoToken: erc721,
    web3Endpoint: web3Endpoint,
    dappchainEndpoint: dappchainEndpoint,
    self: web3.eth.accounts.privateKeyToAccount(privateKey).address,
    selfPrivate: privateKey
  }
  const user = new User(entity, database, web3, addressbook, token, startBlock)
  
  // Low level prompt objects
  prompt.context.BN = BN
  prompt.context.contract = entity.plasmaCashContract
  prompt.context.web3 = web3
  prompt.context.eth = web3.eth
  prompt.context.dappchain = entity
  prompt.context.ERC20 = ERC20At
  prompt.context.ERC721 = ERC721At
  prompt.context.token = token
  prompt.context.local = database
  prompt.context.addressbook = addressbook
  
  // The user interacts with the functions of the `user` object only.
  prompt.context.plasma = user
  
  // prompt.context.timeskip = user.timeskip
  // prompt.context.refresh = user.refresh
  // prompt.context.deposit = user.deposit
  // prompt.context.transfer = user.transfer
  // prompt.context.exit = user.exit
  // prompt.context.finalize = user.finalizeExit
  // prompt.context.withdraw = user.withdraw
  // prompt.context.withdrawBonds = user.withdrawBonds
  // prompt.context.deposits = user.deposits
  // prompt.context.getCoin = user.coin

  // Apply the async/await functionality on the repl
  transform(prompt)
}
