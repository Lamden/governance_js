import send_lamden_tx from './send_tx.js'
import { get_approval_amount, is_registered } from './utils.js'

export default (network, sender_wallet) => {
    async function node_is_registered(vk){
        return await is_registered(network, vk)
    }

    async function send_approval(){
        let approval_amount = await get_approval_amount(network, sender_wallet.vk, "elect_masternodes")
        if (approval_amount.isGreaterThan(50)) return

        const txInfo = {
            senderVk: sender_wallet.vk,
            contractName: "currency",
            methodName: "approve",
            kwargs: {
                to: "elect_masternodes",
                amount: 1000
            },
            stampLimit: 50,
        }

        await send_lamden_tx(sender_wallet, network, txInfo) 
    }
    
    async function send_vote(vk){
        const txInfo = {
            senderVk: sender_wallet.vk,
            contractName: "elect_masternodes",
            methodName: "vote_candidate",
            kwargs: {
                address: vk
            },
            stampLimit: 50,
        }

        await send_lamden_tx(sender_wallet, network, txInfo)        
    }

    async function send(vk){
        await send_approval()
        await send_vote(vk)
    }

    return {
        send,
        node_is_registered
    }
}