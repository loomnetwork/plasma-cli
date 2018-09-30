import Web3 from 'web3'
import { Contract, Account, Signature } from 'web3/types';

// Converts any contract to a signed contract
class SignedContract {
    account: Account
    contract: Contract
    address: string
    web3: Web3

    get instance() {
        return this.contract
    }

    constructor(web3: Web3, abi: any, address: string, key: string) {
        // Get the function names from the ABI
        this.web3 = web3
        this.address = address
        this.account = web3.eth.accounts.privateKeyToAccount(key)
        const mutable = abi.filter((element : any)=> element.type === 'function' && (!element.constant) )
        const nonMutable = abi.filter((element : any)=> element.type === 'function' && (element.constant) )
        const mutableFuncNames : string[] = mutable.map((f :any) => f.name)
        const nonMutableFuncNames : string[] = nonMutable.map((f :any) => f.name)

        this.contract = new web3.eth.Contract(abi, address)
        // Create a signed function for each
        mutableFuncNames.map(func => this.signedFunc(func) )
        nonMutableFuncNames.map(func => { this.wrapConstant(func) } )
    }

    wrapConstant(func: string) {
        const method = this.contract.methods[func]
        const wrappedNonConstant = async (...args: any[]): Promise<any> => {
            return await method(...args).call()
        }
        // @ts-ignore
        this.contract[func] = wrappedNonConstant
    }
    // Will sign the tx
    signedFunc(func: string) {
        const method = this.contract.methods[func]
        const wrappedFunction = async (...args:  any[]): Promise<any> => {
            const data = method(...args).encodeABI()
            const to = this.address
            console.log("Getting nonce for", this.account.address)
            const nonce = await this.web3.eth.getTransactionCount(this.account.address)

            const tx: any = {
                to: to,
                data: data,
                chainId: await this.web3.eth.net.getId(),
                nonce: nonce,
            }
            const gas = await method(...args).estimateGas({from: this.account.address})
            // Give extra gas since we may be off in the estimation
            tx['gas'] = 2 * gas

            // Sign the raw transaction
            const signedTx  = await <Signature>this.web3.eth.accounts.signTransaction(tx, this.account.privateKey)

            // @ts-ignore
            // Bug in ts-types
            return this.web3.eth.sendSignedTransaction(signedTx.rawTransaction, console.log)
        }
        // @ts-ignore
        this.contract[func] = wrappedFunction
    }

}


export default SignedContract