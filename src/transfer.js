import Lamden from 'lamden-js'

export default (network) => {
    async function send(sender_wallet, amount, to){
        const txInfo = {
            senderVk: sender_wallet.vk,
            contractName: "currency",
            methodName: "transfer",
            kwargs: {
                to,
                amount: {"__fixed__": amount.toString()}
            },
            stampLimit: 50,
        }

        const tx = new Lamden.TransactionBuilder(network, txInfo)

        await tx.send(sender_wallet.sk)
        let res = await tx.checkForTransactionResult()

        console.log(res)

        if (res.status === 0) console.log("Transaction Successful!")
        else console.log("Transaction Failed!")

        if (network.blockExplorer) {
            console.log(`  - ${network.blockExplorer}/transactions/${res.hash}`)
        }
        
    }
    return {
        send
    }
}