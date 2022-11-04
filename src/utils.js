import Lamden from 'lamden-js'

export default {
    get_approval_amount,
    get_current_members_list,
    res_to_bignumber,
    is_registered,
    prompt_in_range,
    handle_special_prompts,
    async_sleep
}

export async function get_approval_amount(vk, to){
    const approval_key = `${vk}:${to}`
    let res = await process.lamden_network.getVariable('currency', 'balances', approval_key)
    
    return res_to_bignumber(res)

}

export async function get_current_members_list(){
    let res = await process.lamden_network.getVariable('masternodes', 'S', "members")
    const { value } = res

    if (!value) return []
    return value

}

export async function res_to_bignumber(res){
    if (!res) return Lamden.Encoder('bigNumber', "0")

    const { value } = res
    
    if (!value) return Lamden.Encoder('bigNumber', "0")
    if (value.__fixed__) return Lamden.Encoder('bigNumber', value.__fixed__)
    return Lamden.Encoder('bigNumber', value)
}

export async function is_registered(vk){
    let res = await process.lamden_network.getVariable('elect_masternodes', 'candidate_state', `registered:${vk}`)

    if(!res) return false

    const { value } = res

    return value
}

export function prompt_in_range(prompt, max){
    try{
		prompt = parseInt(prompt)
	}catch(e){
		return false
	}

	if (isNaN(prompt)) return false

	return prompt > 0 && prompt <= max
}

export function handle_special_prompts(value){
	if (value === null) process.exit_app()
	if (value.toLowerCase() === "exit" || value.toLowerCase() === "quit") process.exit_app()
	if (value.toLowerCase() === "back") {
		process.router["back"]()
		return true
	}
}

export function async_sleep(ms){
	return new Promise(resolver => {
		setTimeout(resolver, ms)
	})
}
