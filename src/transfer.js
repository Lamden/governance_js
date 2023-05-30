import Lamden from 'lamden-js'

export default () => {
    async function send(sender_wallet, amount, to){
        const txInfo = {
            senderVk: sender_wallet.vk,
            contractName: "currency",
            methodName: "transfer",
            kwargs: {
                to,
                amount: {"__fixed__": amount.toString()}
            },
            stampLimit: 100
        }
        console.log(process.lamden_network)
        const tx = new Lamden.TransactionBuilder(process.lamden_network, txInfo)

        console.log(tx.getAllInfo())

        await tx.send(sender_wallet.sk)
        let res = await tx.checkForTransactionResult()

        console.log(res)

        if (res.status === 0) console.log("Transaction Successful!")
        else console.log("Transaction Failed!")

        if (process.lamden_network.blockExplorer) {
            console.log(`  - ${process.lamden_network.blockExplorer}/transactions/${res.hash}`)
        }
        
    }
    return {
        send
    }
}