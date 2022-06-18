import React, { useEffect, useState } from 'react';
import './styles/App.css';
import twitterLogo from './assets/twitter-logo.svg';
import { ethers } from 'ethers';
import contractAbi from './utils/Domains.json';
import polygonLogo from './assets/polygonlogo.png';
import ethLogo from './assets/ethlogo.png';
import { networks } from './utils/networks';

// Constants
const TWITTER_HANDLE = '_aiky967';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const tld = '.gtfol';
const CONTRACT_ADDRESS = '0xe0110D2D5cC9a3DD033C0Ed77b6f8137c9cB923F';

const App = () => {

	const [currentAccount, setCurrentAccount] = useState('');
	const [domain, setDomain] = useState('');
	const [record, setRecord] = useState('');
	const [email, setEmail] = useState('');
	const [network, setNetwork] = useState('');
	const [editing, setEditing] = useState(false);
	const [mints, setMints] = useState([]);
	const [loading, setLoading] = useState('');

	const checkIfWalletIsConnected = async () => {
		const { ethereum } = window;

		if (!ethereum) {
			console.log("Make sure you have metamask!");
			return;
		} else {
			console.log("We have the ethereum object", ethereum)
		}

		const accounts = await ethereum.request({ method: 'eth_accounts' });

		// Users can have multiple authorized accounts, we grab the first one if its there!
		if (accounts.length !== 0) {
			const account = accounts[0];
			console.log('Found an authorized account:', account);
			setCurrentAccount(account);
		} else {
			console.log('No authorized account found');
		}

		const chainId = await ethereum.request({ method: 'eth_chainId' });
		setNetwork(networks[chainId]);

		ethereum.on('chainChanged', handleChainChanged);

		function handleChainChanged(_chainId) {
			window.location.reload();                    
		}
	};

	const connectWallet = async () => {
		try {
			const { ethereum } = window;

			if (!ethereum) {
				alert("Get MetaMask -> https://metamask.io/");
				return;
			} 

			const accounts = await ethereum.request({ method: "eth_requestAccounts" });

			console.log("Connected", accounts[0]);
		} catch (error) {
			console.error(error);
		}
	};

	const switchNetwork = async () => {
		if (window.ethereum) {
			try {
				await window.ethereum.request({
					method: 'wallet_switchEthereumChain',
					params: [{ chainId: '0x13881'}],
				});
			} catch (error) {
				if (error.code === 4902) {
					try {
						await window.ethereum.request({
							method: 'wallet_addEthereumChain',
							params: [
								{
									chainId: '0x13881',
									chainName: 'Polygon Mumbai Testnet',
									rpcUrls: ['https://rpc-mumbai.maticvigil.com/'],
									nativeCurrency: {
										name: "Mumbai Matic",
										symbol: "MATIC",
										decimals: 18
									},
									blockExplorerUrls: ["https://mumbai.polygonscan.com/"],
								},
							],
						});
					} catch (error) {
						console.log(error);
					}
				}
				console.log(error);
			}
		} else {
			alert('MetaMask is not installed. Please install it to use this app: https://metamask.io/download.html');
		}
	} 


	const mintDomain = async () => {
		// Don't run if the domain is empty
		if (!domain) { return }
		// Alert the user if the domain is too short
		if (domain.length < 3) {
			alert('Domain must be at least 3 characters long');
			return;
		}
		// Calculate price based on length of domain (change this to match your contract)	
		// 3 chars = 0.5 MATIC, 4 chars = 0.3 MATIC, 5 or more = 0.1 MATIC
		const price = domain.length === 3 ? '0.5' : domain.length === 4 ? '0.3' : '0.1';
		console.log("Minting domain", domain, "with price", price);
	  try {
		const { ethereum } = window;
		if (ethereum) {
		  const provider = new ethers.providers.Web3Provider(ethereum);
		  const signer = provider.getSigner();
		  const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);
	
				console.log("Going to pop wallet now to pay gas...");
		  		let tx = await contract.register(domain, {value: ethers.utils.parseEther(price)});
		  		// Wait for the transaction to be mined
				const receipt = await tx.wait();
	
				// Check if the transaction was successfully completed
				if (receipt.status === 1) {
					console.log("Domain minted! https://mumbai.polygonscan.com/tx/"+tx.hash);
					
					// Set the record for the domain
					tx = await contract.setRecord(domain, record);
					await tx.wait();

					tx = await contract.setEmail(domain, email);
					await tx.wait();
	
					console.log("Record set! https://mumbai.polygonscan.com/tx/"+tx.hash);
					
					// Call fetchMints after 2 seconds
					setTimeout(() => {
						fetchMints();
					}, 2000);

					setRecord('');
					setEmail('');
					setDomain('');
				}
				else {
					alert("Transaction failed! Please try again");
				}
		}
	  }
	  catch(error){
		console.log(error);
	  }
	};

	const updateDomain = async () => {
		if (!record || !domain || !email) { return }
		setLoading(true);
		console.log("updating domain", domain, "with record", record, "and email", email);
		try {
			const { ethereum } = window;
			if (ethereum) {
				const provider = new ethers.providers.Web3Provider(ethereum);
				const signer = provider.getSigner();
				const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi, signer);

				let tx = await contract.setRecord(domain, record);
				await tx.wait();
				console.log("Record set https://mumbvai.polygonscan.com/tx/" + tx.hash)

				let tx2 = await contract.setEmail(domain, email);
				await tx2.wait();
				console.log("Email set https://mumbvai.polygonscan.com/tx/" + tx.hash)

				fetchMints();
				setRecord();
				setEmail();
				setDomain();
			}
		} catch (error) {
			console.log(error)
		}
		setLoading(false);
	};


	const fetchMints = async () => {
		try {
			const { ethereum } = window;
			if (ethereum) {
				
				const provider = new ethers.providers.Web3Provider(ethereum);
				const signer = provider.getSigner();
				const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);
					
				const names = await contract.getAllNames();
					
				// For each name, get the record and the address
				const mintRecords = await Promise.all(names.map(async (name) => {
				const mintRecord = await contract.records(name);
				const owner = await contract.domains(name);
				return {
					id: names.indexOf(name),
					name: name,
					record: mintRecord,
					owner: owner,
				};
			}));
	
			console.log("MINTS FETCHED ", mintRecords);
			setMints(mintRecords);
			}
		} catch(error){
			console.log(error);
		}
	};
	

	const renderNotConnectedContainer = () => (
		<div className='connect-wallet-container'>
			<img src="https://c4.wallpaperflare.com/wallpaper/316/886/460/anime-one-piece-zoro-roronoa-wallpaper-preview.jpg" alt='zoro' />
			<button onClick={connectWallet} className='cta-button connect-wallet-button'>
				Connect Wallet
			</button>
		</div>
	);

	const renderInputForm = () => {
		if (network !== 'Polygon Mumbai Testnet') {
			return (
				<div className='connect-wallet-container'>
					<p>Please connect to the Polygon Mumbai Testnet</p>
					<button className='cta-button mint-button' onClick={switchNetwork}> Click here to switch </button>
				</div>
			);
		}
		return (
			<div className='form-container'>
				<div className='first-row'>
					<input 
						type="text"
						value={domain}
						placeholder='domain'
						onChange={e => setDomain(e.target.value)}
					/>
					<p className='tld'> {tld} </p>
				</div>

				<input 
					type="text"
					value={record}
					placeholder='Whats so special about it?'
					onChange={e => setRecord(e.target.value)}
				/>

				<input 
					type="text"
					value={email}
					placeholder='record your email in this PNS.'
					onChange={e => setEmail(e.target.value)}
				/>
				{editing ? (
					<div className='button-container'>
						<button className='cta-button mint-button' disabled={loading} onClick={updateDomain}>
							Set record
						</button>

						<button className='cta-button mint-button' onClick={() => {setEditing(false)}}>
								Cancel
						</button>	
					</div>
				) : (
					<button className='cta-button mint-button' disabled={loading} onClick={mintDomain}>
						Mint 
					</button>
				)}

			</div>
		);
	};

	const renderMints = () => {
		if (currentAccount && mints.length > 0) {
			return (
				<div className="mint-container">
					<p className="subtitle"> Recently minted domains!</p>
					<div className="mint-list">
						{ mints.map((mint, index) => {
							return (
								<div className="mint-item" key={index}>
									<div className='mint-row'>
										<a className="link" href={`https://testnets.opensea.io/assets/mumbai/${CONTRACT_ADDRESS}/${mint.id}`} target="_blank" rel="noopener noreferrer">
											<p className="underlined">{' '}{mint.name}{tld}{' '}</p>
										</a>
										{/* If mint.owner is currentAccount, add an "edit" button*/}
										{ mint.owner.toLowerCase() === currentAccount.toLowerCase() ?
											<button className="edit-button" onClick={() => editRecord(mint.name)}>
												<img className="edit-icon" src="https://img.icons8.com/metro/26/000000/pencil.png" alt="Edit button" />
											</button>
											:
											null
										}
									</div>
						<p> {mint.record} </p>
					</div>)
					})}
				</div>
			</div>);
		}
	};

	const editRecord = (name) => {
		console.log("Editing record for", name);
		setEditing(true);
		setDomain(name);
	}

	// Create function to render if wallet is not connected yet
	useEffect(() => {
		checkIfWalletIsConnected();
	}, []);

	useEffect(() =>{
		if (network === 'Polygon Mumbai Testnet')
		fetchMints();
	}, [currentAccount, network]);

  return (
		<div className="App">
			<div className="container">

				<div className="header-container">
					<header>
            <div className="left">
              <p className="title">🐱‍👤 Polygon Name Service</p>
              <p className="subtitle">Your immortal API on the blockchain!</p>
            </div>

			<div className='right'>
				<img alt="Network logo" className='logo' src={network.includes("Polygon") ? polygonLogo : ethLogo} />
				{ currentAccount ? <p>Wallet: {currentAccount.slice(0, 6)}...{currentAccount.slice(-4)}</p> : <p> Not Connected </p> }
			</div>
					</header>
				</div>

				{/* Hide the connect button if currentAccount isn't empty */}
				{!currentAccount && renderNotConnectedContainer()}
				{currentAccount && renderInputForm()}
				{mints && renderMints()}

        <div className="footer-container">
					<img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
					<a
						className="footer-text"
						href={TWITTER_LINK}
						target="_blank"
						rel="noreferrer"
					>{`built by @${TWITTER_HANDLE}`}</a>
				</div>
			</div>
		</div>
	);
}

export default App;
