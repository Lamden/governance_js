import Lamden from 'lamden-js'

export async function get_approval_amount(network, vk, to){
    const approval_key = `${vk}:${to}`
    let res = await network.getVariable('currency', 'balances', approval_key)
    
    return res_to_bignumber(res)

}

export async function res_to_bignumber(res){
    if (!res) return Lamden.Encoder('bigNumber', "0")

    const { value } = res
    
    if (!value) return Lamden.Encoder('bigNumber', "0")
    if (value.__fixed__) return Lamden.Encoder('bigNumber', value.__fixed__)
    return Lamden.Encoder('bigNumber', value)
}

export async function is_registered(network, vk){
    let res = await network.getVariable('elect_masternodes', 'candidate_state', `registered:${vk}`)

    if(!res) return false

    const { value } = res

    return value
}