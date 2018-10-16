import Web3 from 'web3'
import { SignedContract } from 'loom-js'

import { Account } from 'web3/eth/accounts'

export const DEFAULT_GAS = '3141592'
export const CHILD_BLOCK_INTERVAL = 1000

export function ERC721(web3: Web3, tokenAddress: string, account: Account): any {
  const abi = require('./../ABI/ERC721.json')
  // @ts-ignore
  return new SignedContract(web3, abi, tokenAddress, account)
}

export function ERC20(web3: Web3, tokenAddress: string, account: Account): any {
  const abi = require('./../ABI/ERC20.json')
  // @ts-ignore
  return new SignedContract(web3, abi, tokenAddress, account)
}
