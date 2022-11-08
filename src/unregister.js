import send_lamden_tx from './send_tx.js'

export default (sender_wallet) => {
    async function check_if_registered(){
        const registered = await process.app_utils.is_registered(sender_wallet.vk)

        if (!registered) console.log("\n!! Node is not registered !!")

        return registered
    }

    async function send_unregister(){
        const txInfo = {
            senderVk: sender_wallet.vk,
            contractName: "elect_masternodes",
            methodName: "unregister",
            kwargs: {},
            stampLimit: 100
        }

        await send_lamden_tx(sender_wallet, txInfo)      
    }

    async function send(){
        await send_unregister()
    }
    return {
        send,
        check_if_registered
    }
}

