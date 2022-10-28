import send_lamden_tx from './send_tx.js'

export default (network, sender_wallet) => {
    const motion_map = {
        "Add Seat": add_seat_kwargs
    }

    async function send(motion){
        const txInfo = {
            senderVk: sender_wallet.vk,
            contractName: "election_house",
            methodName: "vote",
            kwargs: motion_map[motion](),
            stampLimit: 100,
        }

        await send_lamden_tx(sender_wallet, network, txInfo)        
    }

    function add_seat_kwargs(){
        return {
            policy: "masternodes",
            value: ["introduce_motion", 2]
        }
    }

    return {
        send
    }
}