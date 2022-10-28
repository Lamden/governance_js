import Lamden from 'lamden-js'

async function send(sender_wallet, network, txInfo){
    const tx = new Lamden.TransactionBuilder(network, txInfo)

    await tx.send(sender_wallet.sk)
    let res = await tx.checkForTransactionResult()

    console.dir(res, { depth: null })

    if (res.status === 0) console.log("Transaction Successful!")
    else console.log("Transaction Failed!")

    const { hash } = res
    if (network.blockExplorer && hash) {
        console.log(`  - ${network.blockExplorer}/transactions/${res.hash}`)
    }
}

export default send