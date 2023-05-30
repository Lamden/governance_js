import send_lamden_tx from './send_tx.js'
import pr from 'prompt-sync'
const prompt = pr()

export default (sender_wallet) => {
    async function send(motion){
        console.log(`\n[${process.current_prompt()}] New LAMDEN_TAG value?`)
		let lamden_tag = process.prompt(": ");

        console.log(`\n[${process.current_prompt()}] New CONTRACTING_TAG value?`)
		let contracting_tag = process.prompt(": ");

        const txInfo = {
            senderVk: sender_wallet.vk,
            contractName: "upgrade",
            methodName: "propose_upgrade",
            kwargs: {
                lamden_tag, 
                contracting_tag
            },
            stampLimit: 100
        }
        console.log(`LAMDEN_TAG=${lamden_tag} CONTRACTING_TAG=${contracting_tag}`)
        console.log(`\n[${process.current_prompt()}] If this is correct Type '${motion}' to confirm`)
		let confirm = process.prompt(": ");

		if (confirm === motion){
			await send_lamden_tx(sender_wallet, txInfo)  
		}else{
			console.log("\nUPGRADE MOTION CANCELLED")
			await process.app_utils.async_sleep(1000)
		}
    }

    return {
        send
    }
}