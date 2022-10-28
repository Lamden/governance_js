#!/usr/bin/env node

import Lamden from 'lamden-js'
import pr from 'prompt-sync'

// Router Actions
import Transfer from './src/transfer.js'
import IntroduceMotions from './src/introduce_motions.js'
import VoteOnMotions from './src/vote_on_motions.js'
import Register from './src/register.js'
import Unregister from './src/unregister.js'
import VoteForNode from './src/vote_for_node.js'

// Networks
import network_list from './src/networks.json' assert { type: 'json' }

const { wallet } = Lamden

const prompt = pr()

let sender_wallet = null
let network = null
let init = false
let TAU_balance = 0

const main_menu = [
	'1) Make a Transfer', 
	'2) Register/Unregister Node',
	'3) Vote for Node',
	'4) Introduce Motion', 
	'5) Vote on Motion', 
	'6) Switch Network', 
	'7) Change Wallet', 
	'8) Refresh Balance'
]

const policies = {
	"masternodes": [
		"Add Seat", "Remove Seat", "Remove Member"
	]
}
const num_of_policies = Object.keys(policies).map(k => k).length

const router = {
	"1": make_transfer,
	"2": register_unregister_node,
	"3": vote_for_node_menu,
	"4": introduce_motions_menu,
	"5": vote_on_motions,
	"6": pickNetwork,
	"7": get_sk,
	"8": refresh_and_return
}

process.on('SIGINT', exit);

function showHeader(){
	console.log("\n--------------------------")
	console.log('  Lamden Governance CLI')
	console.log("--------------------------\n")
	console.log('All personal info, including keys, is kept local and no information is saved.\n')
	console.log('Type EXIT at any prompt to quit\n')
}

function pickNetwork(){
	if (init){
		router["back"] = showMainMenu
	}
	console.log("\n--------------------------")
	console.log("      SELECT NETWORK")
	console.log("--------------------------")
	console.log("  - type BACK to go back or EXIT to quit")
	for (let [index, network] of network_list.entries()){
		console.log(`${index + 1}) ${network.name}`)
	}

	console.log(`\n${network_list.length + 1}) Exit`)

	console.log(`\nChoose option (1-${network_list.length}, exit)`)
	let opt = prompt(": ");

	if (!init) router["back"] = pickNetwork

	if (handle_special_prompts(opt))return

	opt = parseInt(opt)

	if (!isNaN(opt) && opt > 0 && opt <= network_list.length + 1){
		if (opt === network_list.length + 1) exit()
		else{
			network = new Lamden.Network(network_list[opt - 1])

			if (!init) get_sk()
			else showMainMenu()
		}
	}else{
		pickNetwork()
	}
}

function showMainMenu(){
	init = true
	router["back"] = showMainMenu

	console.log("\n--------------------------")
	console.log("        MAIN MENU")
	console.log("--------------------------")
	console.log(`Wallet: ${sender_wallet.vk}`)
	console.log(`${network.currencySymbol} Balance: ${TAU_balance}`)
	console.log("--------------------------")
	for (let item of main_menu){
		console.log(item)
	}
	console.log(`\n${main_menu.length + 1}) Exit`)
	console.log("--------------------------")

	console.log(`\n[${network.name}] Choose Action (1-${main_menu.length + 1})`)
	let opt = prompt(': ');

	if (parseInt(opt) === main_menu.length + 1) exit()

	if (handle_special_prompts(opt)) return

	opt = parseInt(opt)

	if (isNaN(opt) || !prompt_in_range(opt, main_menu.length + 1)) showMainMenu()
	else{
		router["back"] = showMainMenu
		router[opt]()
	}
}

async function get_sk(){
	if (!init){
		router["back"] = pickNetwork
	}else{
		router["back"] = showMainMenu
	}
	console.log("\n--------------------------")
	console.log("      RECOVER WALLET")
	console.log("--------------------------")
	console.log("  - Enter the PRIVATE KEY of a lamden keypair to recover the wallet.")
	console.log("  - or type BACK to go back")
	console.log("  - or type EXIT to quit")
	console.log(`\n[${network.name}] Enter wallet Private Key to continue`)
	const sk = prompt(": ");

	if (handle_special_prompts(sk)) return

	try{
		sender_wallet = wallet.create_wallet({sk})
		await refresh_balance()
	}catch(e){
		console.log(`\n** Error Recovering Wallet: ${e.message}`)
		get_sk()
		return
	}
	

	console.log("\n--------------------------")
	console.log("      CONFIRM WALLET")
	console.log("--------------------------")
	console.log(`  - Wallet Address: ${sender_wallet.vk}`)
	console.log(`  - ${network.currencySymbol} Balance: ${TAU_balance}`)
	
	console.log(`\n[${network.name}] Is this the correct walllet address? (yes/no)`)
	let okay = prompt(": ");

	if (handle_special_prompts(okay)) return

	if (okay.toLocaleLowerCase() !== "yes") get_sk()
	else showMainMenu()
}

async function make_transfer(){
	router["back"] = showMainMenu

	console.log("\n--------------------------")
	console.log("      MAKE TRANSFER")
	console.log("--------------------------")
	console.log("  - type BACK to go back or EXIT to quit")
	console.log(`\n[${network.name}] How much TAU to transfer?`)
	let amount = prompt(": ");

	if (handle_special_prompts(amount)) return

	console.log(`[${network.name}] Who to transfer to?`)
	let to = prompt(": ");

	if (handle_special_prompts(to)) return

	console.log(`\n[${network.name}] Transfer ${amount} TAU to ${to}? (yes/no)`)
	let okay = prompt(": ");

	if (handle_special_prompts(okay)) return

	if (okay.toLocaleLowerCase() === 'yes') {
		let transfer = Transfer(network)
		await transfer.send(sender_wallet, amount, to).catch(console.error)
	}

	showMainMenu()
}

async function register_unregister_node(){
	router["back"] = showMainMenu

	console.log("\n--------------------------")
	console.log(" REGISTER/UNREGISTER NODE")
	console.log("--------------------------")
	console.log("  - type BACK to go back or EXIT to quit")

	console.log(`\n1) Register Node`)
	console.log(`2) Unregister Node`)
	console.log(`\n3) Back`)

	console.log(`\n[${network.name}] Choose option (1-3)`)
	let opt = prompt(": ");

	if (handle_special_prompts(opt)) return
	
	opt = parseInt(opt)
	if (isNaN(opt) || !prompt_in_range(opt, 3)) register_unregister_node()
	else{
		if (opt === 1) register_node_menu()
		if (opt === 2) unregister_node_menu()
		if (opt === 3) router["back"]()
	}
}

async function register_node_menu(){
	router["back"] = register_unregister_node

	function not_valid(){
		console.log(`\n1) Back`)

		console.log(`\n[${network.name}] Choose option (1)`)
		let opt = prompt(": ");

		if (handle_special_prompts(opt)) return
		
		opt = parseInt(opt)
		if (isNaN(opt) || !prompt_in_range(opt, 1)) register_node_menu()
		else{
			if (opt === 1) router["back"]()
		}
	}

	let register = Register(network, sender_wallet)

	console.log("\n--------------------------")
	console.log("      REGISTER NODE")
	console.log("--------------------------")
	console.log("  - type BACK to go back or EXIT to quit")

	const is_registered = await register.check_if_registered()


	if (!is_registered){
		const can_stake = await register.can_stake()

		if (can_stake){
			console.log(`\n1) Register Node`)
			console.log(`2) Back`)
	
			console.log(`\n[${network.name}] Choose option (1-2)`)
			let opt = prompt(": ");
	
			if (handle_special_prompts(opt)) return
			
			opt = parseInt(opt)
			if (isNaN(opt) || !prompt_in_range(opt, 2)) register_node_menu()
			else{
				if (opt === 1) {
					console.log(`\n[${network.name}] Type 'register' to confirm`)
					let confirm = prompt(": ");

					if (confirm === 'register'){
						await register.send()
						register_node_menu()
					}else{
						console.log('\n> REGISTER CANCELLED')
						await async_sleep(1000)
						register_node_menu()
					}
				}
				if (opt === 2) router["back"]()
			}
		}else{
			not_valid
		}
	}else{
		not_valid()
	}
}

async function unregister_node_menu(){
	router["back"] = register_unregister_node

	let unregister = Unregister(network, sender_wallet)

	console.log("\n--------------------------")
	console.log("     UNREGISTER NODE")
	console.log("--------------------------")
	console.log("  - type BACK to go back or EXIT to quit")

	const is_registered = await unregister.check_if_registered()

	if (is_registered){
		console.log(`\n1) Unregister Node`)
		console.log(`2) Back`)

		console.log(`\n[${network.name}] Choose option (1-2)`)
		let opt = prompt(": ");

		if (handle_special_prompts(opt)) return
		
		opt = parseInt(opt)
		if (isNaN(opt) || !prompt_in_range(opt, 2)) unregister_node_menu()
		else{
			if (opt === 1) {
				console.log(`\n[${network.name}] Type 'unregister' to confirm`)
				let confirm = prompt(": ");

				if (confirm === 'unregister'){
					await unregister.send()
					unregister_node_menu()
				}else{
					console.log('\n> UNREGISTER CANCELLED')
					await async_sleep(1000)
					unregister_node_menu()
				}
			}
			if (opt === 2) router["back"]()
		}
	}else{
		console.log(`\n1) Back`)

		console.log(`\n[${network.name}] Choose option (1)`)
		let opt = prompt(": ");

		if (handle_special_prompts(opt)) return
		
		opt = parseInt(opt)
		if (isNaN(opt) || !prompt_in_range(opt, 1)) unregister_node_menu()
		else{
			if (opt === 1) router["back"]()
		}
	}
}

async function introduce_motions_menu(){
	router["back"] = showMainMenu
	
	console.log("\n--------------------------")
	console.log("    INTRODUCE MOTIONS")
	console.log("--------------------------")
	console.log("  - type BACK to go back or EXIT to quit\n")

	console.log("Policies:")

	for (let [index, policy] of Object.keys(policies).map(k => k).entries()){
		console.log(`${index + 1 }) ${policy}`)
	}

	console.log(`\n[${network.name}] Choose a policy (1-${num_of_policies})`)
	let policy = prompt(": ");

	if (handle_special_prompts(policy)) return
	if (!prompt_in_range(policy, num_of_policies)) introduce_motions_menu()
	
	const motions = policies[Object.keys(policies).map(k => k)[policy - 1]]

	console.log("\nMotions:")
	for (let [index, motion] of motions.entries()){
		console.log(`${index + 1 }) ${motion}`)
	}
	
	console.log(`\n[${network.name}] Choose a motion (1-${motions.length})`)
	let okay = prompt(": ");

	if (handle_special_prompts(okay)) return

	if (!prompt_in_range(okay, motions.length)) introduce_motions_menu()
	else{
		const motion = motions[parseInt(okay) - 1]

		console.log(`\n[${network.name}] Type '${motion}' to confirm`)
		let confirm = prompt(": ");
		if (confirm === motion){
			const introduce_motions = IntroduceMotions(network, sender_wallet)
			await introduce_motions.send(sender_wallet)
			showMainMenu()
		}else{
			console.log("\nINTRODUCE MOTION CANCELLED")
			await async_sleep(1000)
			introduce_motions_menu()
		}


	}
}

async function vote_for_node_menu(){
	router["back"] = showMainMenu
	
	console.log("\n--------------------------")
	console.log("      VOTE FOR NODE")
	console.log("--------------------------")
	console.log("- Provide the Public Key (vk) of the node you want to vote for")
	console.log("- type BACK to go back or EXIT to quit\n")

	console.log(`\n[${network.name}] Enter Node Public Key (VK)`)
	let node_vk = prompt(": ");

	if (handle_special_prompts(node_vk)) return

	if (Lamden.utils.isLamdenKey(node_vk)){
		const vote_for_node = VoteForNode(network, sender_wallet)
		const node_is_registered =  await vote_for_node.node_is_registered(node_vk)

		if (node_is_registered){
			await vote_for_node.send(node_vk)
			vote_for_node_menu()
		}else{
			console.log("\n> NOT A REGISTERED NODE")
			await async_sleep(1000)
			vote_for_node_menu()
		}
	}else{
		console.log("\n> INVALID LAMDEN KEY")
		await async_sleep(1000)
		vote_for_node_menu()
	}
}

async function vote_on_motions(){
	router["back"] = showMainMenu

	console.log("\n--------------------------")
	console.log("    VOTE ON MOTIONS")
	console.log("--------------------------")
	console.log("  - type BACK to go back or EXIT to quit\n")

	console.log("Policies:")

	for (let [index, policy] of Object.keys(policies).map(k => k).entries()){
		console.log(`${index + 1 }) ${policy}`)
	}

	console.log(`\n[${network.name}] Choose a policy (1-${num_of_policies})`)
	let policy = prompt(": ");

	if (handle_special_prompts(policy)) return

	if (!prompt_in_range(policy, num_of_policies)) vote_on_motions()

	policy = Object.keys(policies).map(k => k)[policy - 1]

	console.log(`\nVote on current ${policy} policy`)

	console.log(`\n[${network.name}] How to vote? (yay/nay)`)
	let vote = prompt(": ");

	if (handle_special_prompts(vote)) return

	if (vote === "yay" || vote === "nay"){
		if (vote === "yay"){
			vote = true
			console.log(`\n[${network.name}] CONFIRM YAY VOTE (yes/no)`)
			
		}else{
			vote = false
			console.log(`\n[${network.name}] CONFIRM NAY VOTE (yes/no)`)
		}
		const okay = prompt(': ')

		if (handle_special_prompts(okay)) return

		if (okay === "yes"){
			const vote_on_motions_runner = VoteOnMotions(network)

			await vote_on_motions_runner.send(sender_wallet, policy, vote).catch(console.error)
		
			showMainMenu()
		}else{
			vote_on_motions()
		}
	} else {
		vote_on_motions()
	}

}

function handle_special_prompts(value){
	if (value === null) exit()
	if (value.toLowerCase() === "exit" || value.toLowerCase() === "quit") exit()
	if (value.toLowerCase() === "back") {
		router["back"]()
		return true
	}
}

function prompt_in_range(prompt, max){
	
	try{
		prompt = parseInt(prompt)
	}catch(e){
		return false
	}

	if (isNaN(prompt)) return false

	return prompt > 0 && prompt <= max
}

function refresh_and_return(){
	refresh_balance().then(showMainMenu)
}

async function refresh_balance(){
	TAU_balance = await network.API.getCurrencyBalance(sender_wallet.vk)
}

function async_sleep(ms){
	return new Promise(resolver => {
		setTimeout(resolver, ms)
	})
}

function start(){
	showHeader()
	pickNetwork()
}

function exit(){
	console.log("\BYE!");
	process.exit();
}

start()
  


