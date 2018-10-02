import Web3 from 'web3'
import { ERC20, ERC721, createEntity } from './config'
import repl from 'repl'
import BN from 'bn.js'
import { increaseTime } from './ganache-helpers'
import { PlasmaDB } from 'loom-js'

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
  const user = createEntity(
    web3,
    web3.utils.toChecksumAddress(rootChain),
    dappchainEndpoint,
    privateKey,
    database
  )
  const myERC721 = (addr: string) => ERC721(web3, addr, user.ethAccount)
  const myERC20 = (addr: string) => ERC20(web3, addr, user.ethAccount)

  // Create the REPL
  const prompt = repl.start('$ ')

  // Various objects
  prompt.context.BN = BN
  prompt.context.plasma = user.plasmaCashContract
  prompt.context.web3 = web3
  prompt.context.eth = web3.eth
  prompt.context.dappchain = user
  prompt.context.ERC20 = myERC20
  prompt.context.ERC721 = myERC721
  prompt.context.local = database
  prompt.context.timeskip = async () => await increaseTime(web3, 8 * 24 * 3600)
  // Set some convenience addresses
  prompt.context.addressbook = {
    plasmaAddress: rootChain,
    demoToken: erc721,
    web3Endpoint: web3Endpoint,
    dappchainEndpoint: dappchainEndpoint,
    self: web3.eth.accounts.privateKeyToAccount(privateKey).address,
    selfPrivate: privateKey
  }

  // Initialize a demo erc721 token
  if (!(erc721 === undefined)) prompt.context.token = myERC721(erc721).instance
  if (!(startBlock === undefined))
    prompt.context.deposits = async () => await user.getDepositEvents(startBlock, false)

  // Global functions to be added for the user
  const startExit = async (slot: string, prevBlockNum: string, exitBlockNum: string) =>
    user.startExitAsync({
      slot: new BN(slot),
      prevBlockNum: new BN(prevBlockNum),
      exitBlockNum: new BN(exitBlockNum)
    })

  prompt.context.exit = startExit

  transform(prompt)
}
