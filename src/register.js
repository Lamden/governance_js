import send_lamden_tx from './send_tx.js'

export default (sender_wallet) => {
    let node_cost = null
    let currency_balance = null

    async function check_if_registered(){
        const registered = await process.app_utils.is_registered(sender_wallet.vk)

        if (registered === true) console.log("\n!! Node already registered !!")

        return registered
    }

    async function can_stake(){
        node_cost = await get_node_cost()
        currency_balance = await process.lamden_network.API.getCurrencyBalance(sender_wallet.vk)

        let has_enough = currency_balance.isGreaterThan(node_cost)

        if (!has_enough) {
            console.log(`\n!! Not enough ${network.currencySymbol} to register node !!`)
        }else{
            console.log(`\nYou have enough ${network.currencySymbol} to register a node.`)
        }
        console.log(`  - Node Cost: ${node_cost} ${network.currencySymbol}`)
        console.log(`  - ${network.currencySymbol} Balance: ${currency_balance}`)

        return has_enough
    }

    async function get_node_cost(){
        let balance = await process.lamden_network.getVariable('elect_masternodes', 'member_cost')
        
        return process.app_utils.res_to_bignumber(balance)
    }

    async function send_approval(){
        let approval_amount = await process.app_utils.get_approval_amount(sender_wallet.vk, "elect_masternodes")
        if (approval_amount.isGreaterThan(node_cost)) return

        const txInfo = {
            senderVk: sender_wallet.vk,
            contractName: "currency",
            methodName: "approve",
            kwargs: {
                "to": "elect_masternodes",
                "amount": 100000
            },
            stampLimit: 100
        }

        await send_lamden_tx(sender_wallet, txInfo)
    }

    async function send_register(){
        const txInfo = {
            senderVk: sender_wallet.vk,
            contractName: "elect_masternodes",
            methodName: "register",
            kwargs: {},
            stampLimit: 100
        }

        await send_lamden_tx(sender_wallet, txInfo)      
    }

    async function send(){
        await send_approval()
        await send_register()
    }
    return {
        send,
        can_stake,
        check_if_registered
    }
}

