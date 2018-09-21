import Web3 from 'web3'
import { ERC20, ERC721, createEntity } from './config'
import repl from 'repl'
import PlasmaDB from './db'

export function startCLI(args: any) {
  // Setup args
  const provider = new Web3.providers.HttpProvider(args.ethereum)
  const web3 = new Web3(provider)
  const user = createEntity(web3, args.address, args.dappchain, args.key)
  const plasmaABI = require('./../ABI/PlasmaCash.json')
  const plasma = new web3.eth.Contract(plasmaABI, args.address)
  const database = new PlasmaDB(args.ethereum, args.dappchain, args.address, args.key)

  // Create the REPL
  const prompt = repl.start('$ ')
  prompt.context.plasma = plasma
  prompt.context.web3 = web3
  prompt.context.dappchain = user
  prompt.context.ERC20 = ERC20
  prompt.context.ERC721 = ERC721
  prompt.context.local = database
}
