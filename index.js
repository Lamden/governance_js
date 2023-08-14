#!/usr/bin/env node

import Lamden from 'lamden-js'
import pr from 'prompt-sync'

// Router Actions
import Transfer from './src/transfer.js'
import MasternodesMotions from './src/masternodes_motions.js'
import UpgradeMotions from './src/upgrade_motion.js'
import VoteOnMotions from './src/vote_on_motions.js'
import Register from './src/register.js'
import Unregister from './src/unregister.js'
import VoteForNode from './src/vote_for_node.js'

// Networks
import network_list from './src/networks.json' assert { type: 'json' }

// Misc
import utils from './src/utils.js'
import util from 'util'
import fs from 'fs'


const { wallet } = Lamden
const aux_network_file = "./aux_networks.json"

// Load AUX Networks

// Check if aux_networks file exist
if (fs.existsSync(aux_network_file)) {
	let data = false
	try{
		data = fs.readFileSync(aux_network_file, 'utf-8');
	}catch(err){
		console.log("No AUX networks found")
	}

	if (data){
		try {
			const aux_networks_list = JSON.parse(data);

			if (Array.isArray(network_list) && Array.isArray(aux_networks_list)){
				for (let aux_network of aux_networks_list){
					network_list.push(aux_network)
				}	
			}
		} catch (err) {
			console.log(err)
			throw new Error(`Invalid aux_network.json (list). Not valid JSON in file: ${aux_network_file}`);
		}
	}
}


let sender_wallet = null
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
	"masternodes": {
		motions: [
			"Add Seat", "Remove Member", "Remove Seat"
		],
		script: MasternodesMotions
	},
	"upgrade":{
		motions: [
			"Propose Upgrade"
		],
		script: UpgradeMotions
	}
}
const num_of_policies = Object.keys(policies).map(k => k).length


process.prompt = pr()
process.app_utils = utils
process.log = (obj) => console.log(util.inspect(obj, false, null, true))
process.exit_app = exit
process.router = {
	"1": make_transfer,
	"2": register_unregister_node,
	"3": vote_for_node_menu,
	"4": introduce_motions_menu,
	"5": vote_on_motions_menu,
	"6": pickNetwork,
	"7": get_sk,
	"8": refresh_and_return
}

process.current_prompt = () => `${process.lamden_network.name}`

process.on('SIGINT', exit);
//process.on('SIGKILL', exit);

function showHeader(){
	console.log("\n--------------------------")
	console.log('  Lamden Governance CLI')
	console.log("--------------------------\n")
	console.log('All personal info, including keys, is kept local and no information is saved.\n')
	console.log('Type EXIT at any prompt to quit\n')
}

function pickNetwork(){
	if (init){
		process.router["back"] = showMainMenu
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
	let opt = process.prompt(": ");

	if (!init) process.router["back"] = pickNetwork

	if(process.app_utils.handle_special_prompts(opt))return

	opt = parseInt(opt)

	if (!isNaN(opt) && opt > 0 && opt <= network_list.length + 1){
		if (opt === network_list.length + 1) exit()
		else{
			process.lamden_network = new Lamden.Network(network_list[opt - 1])
			console.log(process.lamden_network.getNetworkInfo())

			if (!init) get_sk()
			else showMainMenu()
		}
	}else{
		pickNetwork()
	}
}

function showMainMenu(){
	init = true
	process.router["back"] = showMainMenu

	console.log("\n--------------------------")
	console.log("        MAIN MENU")
	console.log("--------------------------")
	console.log(`Wallet: ${sender_wallet.vk}`)
	console.log(`${process.lamden_network.currencySymbol} Balance: ${TAU_balance}`)
	console.log("--------------------------")
	for (let item of main_menu){
		console.log(item)
	}
	console.log(`\n${main_menu.length + 1}) Exit`)
	console.log("--------------------------")

	console.log(`\n[${process.current_prompt()}] Choose Action (1-${main_menu.length + 1})`)
	let opt = process.prompt(': ');

	if (parseInt(opt) === main_menu.length + 1) exit()

	if(process.app_utils.handle_special_prompts(opt)) return

	opt = parseInt(opt)

	if (isNaN(opt) || !prompt_in_range(opt, main_menu.length + 1)) showMainMenu()
	else{
		process.router["back"] = showMainMenu
		process.router[opt]()
	}
}

async function get_sk(){
	if (!init){
		process.router["back"] = pickNetwork
	}else{
		process.router["back"] = showMainMenu
	}
	console.log("\n--------------------------")
	console.log("      RECOVER WALLET")
	console.log("--------------------------")
	console.log("  - Enter the PRIVATE KEY of a lamden keypair to recover the wallet.")
	console.log("  - or type BACK to go back")
	console.log("  - or type EXIT to quit")
	console.log(`\n[${process.current_prompt()}] Enter wallet Private Key to continue`)
	const sk = process.prompt(": ");

	if(process.app_utils.handle_special_prompts(sk)) return

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
	console.log(`  - ${process.lamden_network.currencySymbol} Balance: ${TAU_balance}`)
	
	console.log(`\n[${process.current_prompt()}] Is this the correct walllet address? (yes/no)`)
	let okay = process.prompt(": ");

	if(process.app_utils.handle_special_prompts(okay)) return

	if (okay.toLocaleLowerCase() !== "yes") get_sk()
	else showMainMenu()
}

async function make_transfer(){
	process.router["back"] = showMainMenu

	console.log("\n--------------------------")
	console.log("      MAKE TRANSFER")
	console.log("--------------------------")
	console.log("  - type BACK to go back or EXIT to quit")
	console.log(`\n[${process.current_prompt()}] How much TAU to transfer?`)
	let amount = process.prompt(": ");

	if(process.app_utils.handle_special_prompts(amount)) return

	console.log(`[${process.current_prompt()}] Who to transfer to?`)
	let to = process.prompt(": ");

	if(process.app_utils.handle_special_prompts(to)) return

	console.log(`\n[${process.current_prompt()}] Transfer ${amount} TAU to ${to}? (yes/no)`)
	let okay = process.prompt(": ");

	if(process.app_utils.handle_special_prompts(okay)) return

	if (okay.toLocaleLowerCase() === 'yes') {
		let transfer = Transfer()
		console.log('TRANSFERRING')
		await transfer.send(sender_wallet, amount, to).catch(console.error)
	}

	showMainMenu()
}

async function register_unregister_node(){
	process.router["back"] = showMainMenu

	console.log("\n--------------------------")
	console.log(" REGISTER/UNREGISTER NODE")
	console.log("--------------------------")
	console.log("  - type BACK to go back or EXIT to quit")

	console.log(`\n1) Register Node`)
	console.log(`2) Unregister Node`)
	console.log(`\n3) Back`)

	console.log(`\n[${process.current_prompt()}] Choose option (1-3)`)
	let opt = process.prompt(": ");

	if(process.app_utils.handle_special_prompts(opt)) return
	
	opt = parseInt(opt)
	if (isNaN(opt) || !prompt_in_range(opt, 3)) register_unregister_node()
	else{
		if (opt === 1) register_node_menu()
		if (opt === 2) unregister_node_menu()
		if (opt === 3) process.router["back"]()
	}
}

async function register_node_menu(){
	process.router["back"] = register_unregister_node

	function not_valid(){
		console.log(`\n1) Back`)

		console.log(`\n[${process.current_prompt()}] Choose option (1)`)
		let opt = process.prompt(": ");

		if(process.app_utils.handle_special_prompts(opt)) return
		
		opt = parseInt(opt)
		if (isNaN(opt) || !prompt_in_range(opt, 1)) register_node_menu()
		else{
			if (opt === 1) process.router["back"]()
		}
	}

	let register = Register(sender_wallet)

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
	
			console.log(`\n[${process.current_prompt()}] Choose option (1-2)`)
			let opt = process.prompt(": ");
	
			if(process.app_utils.handle_special_prompts(opt)) return
			
			opt = parseInt(opt)
			if (isNaN(opt) || !prompt_in_range(opt, 2)) register_node_menu()
			else{
				if (opt === 1) {
					console.log(`\n[${process.current_prompt()}] Type 'register' to confirm`)
					let confirm = process.prompt(": ");

					if (confirm === 'register'){
						await register.send()
						register_node_menu()
					}else{
						console.log('\n> REGISTER CANCELLED')
						await process.app_utils.async_sleep(1000)
						register_node_menu()
					}
				}
				if (opt === 2) process.router["back"]()
			}
		}else{
			not_valid
		}
	}else{
		not_valid()
	}
}

async function unregister_node_menu(){
	process.router["back"] = register_unregister_node

	let unregister = Unregister(sender_wallet)

	console.log("\n--------------------------")
	console.log("     UNREGISTER NODE")
	console.log("--------------------------")
	console.log("  - type BACK to go back or EXIT to quit")

	const is_registered = await unregister.check_if_registered()

	if (is_registered){
		console.log(`\n1) Unregister Node`)
		console.log(`2) Back`)

		console.log(`\n[${process.current_prompt()}] Choose option (1-2)`)
		let opt = process.prompt(": ");

		if(process.app_utils.handle_special_prompts(opt)) return
		
		opt = parseInt(opt)
		if (isNaN(opt) || !prompt_in_range(opt, 2)) unregister_node_menu()
		else{
			if (opt === 1) {
				console.log(`\n[${process.current_prompt()}] Type 'unregister' to confirm`)
				let confirm = process.prompt(": ");

				if (confirm === 'unregister'){
					await unregister.send()
					unregister_node_menu()
				}else{
					console.log('\n> UNREGISTER CANCELLED')
					await process.app_utils.async_sleep(1000)
					unregister_node_menu()
				}
			}
			if (opt === 2) process.router["back"]()
		}
	}else{
		console.log(`\n1) Back`)

		console.log(`\n[${process.current_prompt()}] Choose option (1)`)
		let opt = process.prompt(": ");

		if(process.app_utils.handle_special_prompts(opt)) return
		
		opt = parseInt(opt)
		if (isNaN(opt) || !prompt_in_range(opt, 1)) unregister_node_menu()
		else{
			if (opt === 1) process.router["back"]()
		}
	}
}

async function introduce_motions_menu(){
	process.router["back"] = showMainMenu
	
	console.log("\n--------------------------")
	console.log("    INTRODUCE MOTIONS")
	console.log("--------------------------")
	console.log("  - type BACK to go back or EXIT to quit\n")

	console.log("Policies:")

	for (let [index, policy] of Object.keys(policies).map(k => k).entries()){
		console.log(`${index + 1 }) ${policy}`)
	}

	console.log(`\n[${process.current_prompt()}] Choose a policy (1-${num_of_policies})`)
	let policy = process.prompt(": ");

	if(process.app_utils.handle_special_prompts(policy)) return
	if (!prompt_in_range(policy, num_of_policies)) introduce_motions_menu()
	
	const policy_info = policies[Object.keys(policies).map(k => k)[policy - 1]]

	console.log("\nMotions:")
	for (let [index, motion] of policy_info.motions.entries()){
		console.log(`${index + 1 }) ${motion}`)
	}
	
	console.log(`\n[${process.current_prompt()}] Choose a motion (1-${policy_info.motions.length})`)
	let okay = process.prompt(": ");

	if(process.app_utils.handle_special_prompts(okay)) return

	if (!prompt_in_range(okay, policy_info.motions.length)) introduce_motions_menu()
	else{
		const motion = policy_info.motions[parseInt(okay) - 1]

		const motion_script = policy_info.script(sender_wallet)
		await motion_script.send(motion)
		introduce_motions_menu()
	}
}

async function vote_for_node_menu(){
	process.router["back"] = showMainMenu
	
	console.log("\n--------------------------")
	console.log("      VOTE FOR NODE")
	console.log("--------------------------")
	console.log("- Provide the Public Key (vk) of the node you want to vote for")
	console.log("- type BACK to go back or EXIT to quit\n")

	console.log(`\n[${process.current_prompt()}] Enter Node Public Key (VK)`)
	let node_vk = process.prompt(": ");

	if(process.app_utils.handle_special_prompts(node_vk)) return

	if (Lamden.utils.isLamdenKey(node_vk)){
		const vote_for_node = VoteForNode(sender_wallet)
		const node_is_registered =  await vote_for_node.node_is_registered(node_vk)

		if (node_is_registered){
			await vote_for_node.send(node_vk)
			vote_for_node_menu()
		}else{
			console.log("\n> NOT A REGISTERED NODE")
			await process.app_utils.async_sleep(1000)
			vote_for_node_menu()
		}
	}else{
		console.log("\n> INVALID LAMDEN KEY")
		await process.app_utils.async_sleep(1000)
		vote_for_node_menu()
	}
}

async function vote_on_motions_menu(){
	process.router["back"] = showMainMenu

	console.log("\n--------------------------")
	console.log("    VOTE ON MOTIONS")
	console.log("--------------------------")
	console.log("  - type BACK to go back or EXIT to quit\n")

	console.log("Policies:")

	for (let [index, policy] of Object.keys(policies).map(k => k).entries()){
		console.log(`${index + 1 }) ${policy}`)
	}

	console.log(`\n[${process.current_prompt()}] Choose a policy (1-${num_of_policies})`)
	let policy = process.prompt(": ");

	if(process.app_utils.handle_special_prompts(policy)) return

	if (!prompt_in_range(policy, num_of_policies)) vote_on_motions_menu()

	policy = Object.keys(policies).map(k => k)[policy - 1]

	console.log(`\nVote on current ${policy} policy`)

	console.log(`\n[${process.current_prompt()}] How to vote? (yay/nay)`)
	let vote = process.prompt(": ");

	if(process.app_utils.handle_special_prompts(vote)) return

	if (vote === "yay" || vote === "nay"){
		if (vote === "yay"){
			vote = true
			console.log(`\n[${process.current_prompt()}] CONFIRM YAY VOTE (yes/no)`)
			
		}else{
			vote = false
			console.log(`\n[${process.current_prompt()}] CONFIRM NAY VOTE (yes/no)`)
		}
		const okay = process.prompt(': ')

		if(process.app_utils.handle_special_prompts(okay)) return

		if (okay === "yes"){
			const vote_on_motions = VoteOnMotions()
			await vote_on_motions.send(sender_wallet, policy, vote).catch(console.error)
		
			showMainMenu()
		}else{
			vote_on_motions_menu()
		}
	} else {
		vote_on_motions_menu()
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
	TAU_balance = await process.lamden_network.API.getCurrencyBalance(sender_wallet.vk)
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
  


