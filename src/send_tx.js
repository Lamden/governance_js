import Lamden from 'lamden-js'

async function send(sender_wallet, txInfo){
    const tx = new Lamden.TransactionBuilder(process.lamden_network, txInfo)

    await tx.send(sender_wallet.sk)

    const { errors } = tx.txSendResult
    
    if (errors) {
        console.log("Transaction Failed!")
        console.log(errors)
    }else{
        let res = await tx.checkForTransactionResult()

        process.log(res)
    
        if (res.status === 0) console.log("Transaction Successful!")
        else console.log("Transaction Failed!")
    
        const { hash } = res
        if (process.lamden_network.blockExplorer && hash) {
            console.log(`  - ${process.lamden_network.blockExplorer}/transactions/${res.hash}`)
        }
    }

}

export default send