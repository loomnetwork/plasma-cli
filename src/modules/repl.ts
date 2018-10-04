import Web3 from 'web3'
import { ERC20, ERC721, createEntity } from './config'
import repl from 'repl'
import BN from 'bn.js'
import { increaseTime } from './ganache-helpers'
import { PlasmaDB } from 'loom-js'
import { IDatabaseCoin } from 'loom-js/dist/plasma-cash/db'

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

  const addressbook = {
    plasmaAddress: rootChain,
    demoToken: erc721,
    web3Endpoint: web3Endpoint,
    dappchainEndpoint: dappchainEndpoint,
    self: web3.eth.accounts.privateKeyToAccount(privateKey).address,
    selfPrivate: privateKey
  }

  // Various objects
  prompt.context.BN = BN
  prompt.context.plasma = user.plasmaCashContract
  prompt.context.web3 = web3
  prompt.context.eth = web3.eth
  prompt.context.dappchain = user
  prompt.context.ERC20 = myERC20
  prompt.context.ERC721 = myERC721
  prompt.context.local = database

  // Every prompt function following this line should be bound to a button. The above are "low level" calls for the more advanced user. All functions should take string argumetns since they'er expected to be parsed from an input box or from the repl. The conversion to BNs should be done under the hood.

  // Skip ahead time for finalizing exits in local tests
  prompt.context.timeskip = async () => await increaseTime(web3, 8 * 24 * 3600)

  // Refresh the user's state
  prompt.context.refresh = async () => await user.refreshAsync()

  // Set some convenience addresses
  prompt.context.addressbook = addressbook

  // Initialize a demo erc721 token
  if (!(erc721 === undefined)) {
    const token = myERC721(erc721).instance
    prompt.context.token = token
    // Easy function to deposit coins to plasma
    prompt.context.deposit = async (uid: string) => {
      return await token.safeTransferFrom([addressbook.self, addressbook.plasmaAddress, new BN(uid)])
    }
  }

  // Get all deposits, filtered by the user's address.
  if (startBlock !== undefined) {
    prompt.context.deposits = async () => await user.getDepositEvents(startBlock, false)
  }

  // TODO Check how prevBlockNum is saved and how exitBlockNum is saved. Keep every number in the same format in the local stoage
  // Exiting a coin by specifying the slot. Finding the block numbers is done under the hood.
  prompt.context.exit = async (slot: string) => {
    const coinData: any[] = database.getCoin(slot)
    // Search for the latest transaction in the coin's history, O(N)
    let max = coinData[0].block
    let tx = coinData[0].tx
    for (let i in coinData) {
      const coin = coinData[i]
      if (coin.blockNumber > max) {
        max = coin.block
        tx = coin.tx
      }
    }
    return await user.startExitAsync({
      slot: new BN(slot, 16),
      prevBlockNum: new BN(tx.prevBlockNum, 16), // prev block is in 0x FIXIFIXFIX
      exitBlockNum: new BN(max) // max is in decimal
    })
  }

  // Transfer a coin by specifyign the
  prompt.context.transfer = async (slot: string, newOwner: string) => {
    const coinData: IDatabaseCoin[] = database.getCoin(slot)
    // Search for the latest transaction in the coin's history, O(N)
    let max = coinData[0].blockNumber
    for (let i in coinData) {
      const coin = coinData[i]
      if (coin.blockNumber > max) {
        max = coin.blockNumber
      }
    }
    return await user.transferTokenAsync({
      slot: new BN(slot, 16),
      prevBlockNum: new BN(max, 16),
      denomination: 1,
      newOwner: newOwner
    })
  }

  prompt.context.withdraw = async (slot: string) => {
      return await await user.withdrawAsync(new BN(slot, 16))
  }

  prompt.context.withdrawBonds = async () => {
      return await user.withdrawBondsAsync()
  }

  transform(prompt)
}
