import Web3 from 'web3'
import {
  Entity,
  EthereumPlasmaClient,
  CryptoUtils,
  NonceTxMiddleware,
  SignedTxMiddleware,
  Address,
  LocalAddress,
  DAppChainPlasmaClient,
  Client,
  createJSONRPCClient,
  SignedContract
} from 'loom-js'

import { Account } from 'web3/eth/accounts'

export const DEFAULT_GAS = '3141592'
export const CHILD_BLOCK_INTERVAL = 1000

export function ERC721(web3: Web3, tokenAddress: string, account: Account): any {
  const abi = require('./../ABI/ERC721.json')
  return new SignedContract(web3, abi, tokenAddress, account)
}

export function ERC20(web3: Web3, tokenAddress: string, account: Account): any {
  const abi = require('./../ABI/ERC20.json')
  return new SignedContract(web3, abi, tokenAddress, account)
}

export function createEntity(
  web3: Web3,
  plasmaAddress: string,
  dappchainAddress: string,
  ethPrivateKey: string
): Entity {
  const ethAccount = web3.eth.accounts.privateKeyToAccount(ethPrivateKey)
  const ethPlasmaClient = new EthereumPlasmaClient(web3, ethAccount, plasmaAddress)
  const writer = createJSONRPCClient({ protocols: [{ url: dappchainAddress + '/rpc' }] })
  const reader = createJSONRPCClient({ protocols: [{ url: dappchainAddress + '/query' }] })
  const dAppClient = new Client('default', writer, reader)
  // TODO: Key should not be generated each time, user should provide their key, or it should be retrieved through some one way mapping
  const privKey = CryptoUtils.generatePrivateKey()
  const pubKey = CryptoUtils.publicKeyFromPrivateKey(privKey)
  dAppClient.txMiddleware = [
    new NonceTxMiddleware(pubKey, dAppClient),
    new SignedTxMiddleware(privKey)
  ]
  const callerAddress = new Address('default', LocalAddress.fromPublicKey(pubKey))
  const contractName = undefined
  const dAppPlasmaClient = new DAppChainPlasmaClient({ dAppClient, callerAddress, contractName })
  return new Entity(web3, {
    ethAccount,
    ethPlasmaClient,
    dAppPlasmaClient,
    defaultGas: DEFAULT_GAS,
    childBlockInterval: CHILD_BLOCK_INTERVAL
  })
}
