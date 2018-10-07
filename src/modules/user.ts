import BN from 'bn.js'
import { PlasmaDB, Entity } from 'loom-js'
import { increaseTime } from './ganache-helpers'
import Web3 from 'web3'

// User friendly wrapper for all Entity related functions, taking advantage of the database
export class User {
  private _user: Entity
  private _database: PlasmaDB
  private _web3: Web3
  private _startBlock: BN | undefined
  private _addressbook: any
  private _token: any | undefined

  constructor(
    user: Entity,
    database: PlasmaDB,
    web3: Web3,
    addressbook: any,
    token?: any,
    startBlock?: BN
  ) {
    this._user = user
    this._database = database
    this._startBlock = startBlock
    this._web3 = web3
    this._addressbook = addressbook
    this._token = token
  }

  // TODO Check how prevBlockNum is saved and how exitBlockNum is saved. Keep every number in the same format in the local stoage
  // Exiting a coin by specifying the slot. Finding the block numbers is done under the hood.
  async exit(slot: string) {
    const coinData: any[] = this._database.getCoin(slot)
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
    return await this._user.startExitAsync({
      slot: new BN(slot, 16),
      prevBlockNum: new BN(tx.prevBlockNum, 16), // prev block is in 0x FIXIFIXFIX
      exitBlockNum: new BN(max) // max is in decimal
    })
  }

  // Transfer a coin by specifying slot & new owner
  async transfer(slot: string, newOwner: string) {
    const coinData: any[] = this._database.getCoin(slot)
    // Search for the latest transaction in the coin's history, O(N)
    let max = coinData[0].blockNumber
    for (let i in coinData) {
      const coin = coinData[i]
      if (coin.blockNumber > max) {
        max = coin.blockNumber
      }
    }
    return await this._user.transferTokenAsync({
      slot: new BN(slot, 16),
      prevBlockNum: new BN(max, 16),
      denomination: 1,
      newOwner: newOwner
    })
  }

  async finalizeExit(slot: string) {
    await this._user.plasmaCashContract.finalizeExit(new BN(slot, 16))
  }

  async withdraw(slot: string) {
    await this._user.withdrawAsync(new BN(slot, 16))
  }

  async withdrawBonds() {
    await this._user.withdrawBondsAsync()
  }

  async coin(slot: string) {
    await this._user.getPlasmaCoinAsync(new BN(slot, 16))
  }

  // Get all deposits, filtered by the user's address.
  async deposits() {
    await this._user.getDepositEvents(this._startBlock || new BN(0), false)
  }

  async refresh() {
    await this._user.refreshAsync()
  }

  // Skip ahead time for finalizing exits in local tests
  async timeskip() {
    await increaseTime(this._web3, 8 * 24 * 3600)
  }

  // Initialize a demo erc721 token
  async deposit(uid: string) {
    await this._token.safeTransferFrom([
      this._addressbook.self,
      this._addressbook.plasmaAddress,
      uid
    ])
  }
}
