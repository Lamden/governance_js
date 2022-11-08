import send_lamden_tx from './send_tx.js'
import pr from 'prompt-sync'
const prompt = pr()

export default (sender_wallet) => {
    const motion_map = {
        "Add Seat": add_seat_kwargs,
        "Remove Member": remove_member_kwargs
    }

    async function send(motion){
        const txInfo = {
            senderVk: sender_wallet.vk,
            contractName: "election_house",
            methodName: "vote",
            kwargs: await motion_map[motion](),
            stampLimit: 100
        }

        console.log(`\n[${process.current_prompt()}] Type '${motion}' to confirm`)
		let confirm = process.prompt(": ");

		if (confirm === motion){
			await send_lamden_tx(sender_wallet, txInfo)  
		}else{
			console.log("\nINTRODUCE MOTION CANCELLED")
			await process.app_utils.async_sleep(1000)
		}
    }

    function add_seat_kwargs(){
        return {
            policy: "masternodes",
            value: ["introduce_motion", 2]
        }
    }

    async function remove_member_kwargs(){
        const current_members = await process.app_utils.get_current_members_list()

        console.log("\nNode Group:")
        for (const [index, member_vk] of current_members.entries()){
            console.log(`${index + 1}) ${member_vk}`)
        }

        let opt = -1

        while (!process.app_utils.prompt_in_range(opt, current_members.length)){
            console.log(`\n[${process.current_prompt()}] Which Node to you want to vote out? (1-${current_members.length})`)
            opt = process.prompt(": ");
            if(process.app_utils.handle_special_prompts(opt)) return
        }


        const vk = current_members[opt - 1]

        console.log (`\n** YOU ARE CREATING A MOTION TO REMOVE MEMBER`)
        console.log (`** ${vk}`)
        
        return {
            policy: "masternodes",
            value: ["introduce_motion", 1, vk]
        }
    }

    return {
        send,
        motion_map
    }
}