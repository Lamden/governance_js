import send_lamden_tx from './send_tx.js'

export default () => {
    async function send(sender_wallet, policy, vote_for){
        const txInfo = {
            senderVk: sender_wallet.vk,
            contractName: "election_house",
            methodName: "vote",
            kwargs: {
                policy,
                value: ["vote_on_motion", vote_for]
            },
            stampLimit: 200,
        }

        await send_lamden_tx(sender_wallet, txInfo)        
    }

    return {
        send
    }
}