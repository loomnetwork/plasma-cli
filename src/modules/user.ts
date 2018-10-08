import BN from 'bn.js'
import { PlasmaDB, Entity } from 'loom-js'
import { increaseTime } from './ganache-helpers'
import Web3 from 'web3'
import { IDatabaseCoin } from 'loom-js/dist/plasma-cash/db'

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

  // Exiting a coin by specifying the slot. Finding the block numbers is done under the hood.
  async exit(slot: BN) {
    // TODO: If database empty -> get coin history
    const { prevBlockNum, blockNum } = this.findBlocks(slot)
    return await this._user.startExitAsync({
      slot: slot,
      prevBlockNum: prevBlockNum,
      exitBlockNum: blockNum
    })
  }
  // Transfer a coin by specifying slot & new owner
  async transfer(slot: BN, newOwner: string) {
    const { prevBlockNum, blockNum } = this.findBlocks(slot)
    return await this._user.transferTokenAsync({
      slot,
      prevBlockNum,
      denomination: 1,
      newOwner: newOwner
    })
  }

  findBlocks(slot: BN): any {
    const coinData: IDatabaseCoin[] = this._database.getCoin(slot)
    // Search for the latest transaction in the coin's history, O(N)
    let blockNum = coinData[0].blockNumber
    let prevBlockNum = coinData[0].tx.prevBlockNum
    for (let i in coinData) {
      const coin = coinData[i]
      if (coin.blockNumber > blockNum) {
        blockNum = coin.blockNumber
        prevBlockNum = coin.tx.prevBlockNum
      }
    }
    return { prevBlockNum, blockNum }
  }

  async finalizeExit(slot: BN) {
    return await this._user.plasmaCashContract.finalizeExit(new BN(slot, 16))
  }

  async withdraw(slot: BN) {
    return await this._user.withdrawAsync(new BN(slot, 16))
  }

  async withdrawBonds() {
    return await this._user.withdrawBondsAsync()
  }

  async coin(slot: BN) {
    return await this._user.getPlasmaCoinAsync(slot)
  }

  // Get all deposits, filtered by the user's address.
  async deposits(): Promise<any[]> {
    return await this._user.getDepositEvents(this._startBlock || new BN(0), false)
  }

  async refresh() {
    return await this._user.refreshAsync()
  }

  // Skip ahead time for finalizing exits in local tests
  async timeskip() {
    return await increaseTime(this._web3, 8 * 24 * 3600)
  }

  // Initialize a demo erc721 token
  async deposit(uid: BN) {
    return await this._token.safeTransferFrom([
      this._addressbook.self,
      this._addressbook.plasmaAddress,
      uid
    ])
  }
}
