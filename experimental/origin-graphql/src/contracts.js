import MarketplaceContract from 'origin-contracts/build/contracts/V00_Marketplace'
import UserRegistryContract from 'origin-contracts/build/contracts/V00_UserRegistry'
import ClaimHolderRegisteredContract from 'origin-contracts/build/contracts/ClaimHolderRegistered'
import ClaimHolderPresignedContract from 'origin-contracts/build/contracts/ClaimHolderPresigned'
import OriginTokenContract from 'origin-contracts/build/contracts/OriginToken'
import TokenContract from 'origin-contracts/build/contracts/TestToken'

import Web3 from 'web3'
import EventSource from 'origin-eventsource'

import eventCache from './utils/eventCache'
import pubsub from './utils/pubsub'
// import OriginMessaging from 'origin-messaging-client'

let metaMask, metaMaskEnabled, web3WS, wsSub, web3
const HOST = process.env.HOST || 'localhost'

let OriginMessaging
if (typeof window !== 'undefined') {
  OriginMessaging = require('origin-messaging-client').default
}

let OriginLinkerClient
if (typeof window !== 'undefined') {
  OriginLinkerClient = require('origin-linker-client').default
}

const Configs = {
  mainnet: {
    provider: 'https://mainnet.infura.io/v3/98df57f0748e455e871c48b96f2095b2',
    providerWS: 'wss://mainnet.infura.io/ws',
    ipfsGateway: 'https://ipfs.originprotocol.com',
    ipfsRPC: 'https://ipfs.originprotocol.com',
    ipfsEventCache: 'QmQT7tfMA21xsxRiVKitGSxHqiAqnX3J1mXJEqWjWcPrR9',
    discovery: 'https://discovery.originprotocol.com',
    V00_UserRegistry: '0xa4428439ec214cc68240552ec93298d1da391114',
    OriginIdentity: '0x1af44feeb5737736b6beb42fe8e5e6b7bb7391cd',
    OriginToken: '0x8207c1ffc5b6804f6024322ccf34f29c3541ae26',
    V00_Marketplace: '0x819bb9964b6ebf52361f1ae42cf4831b921510f9',
    V00_Marketplace_Epoch: '6436157',
    tokens: [
      {
        id: '0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359',
        type: 'Standard',
        name: 'DAI Stablecoin',
        symbol: 'DAI',
        decimals: '18'
      },
      {
        id: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        type: 'Standard',
        name: 'USDC Stablecoin',
        symbol: 'USDC',
        decimals: '6'
      },
      {
        id: '0x056fd409e1d7a124bd7017459dfea2f387b6d5cd',
        type: 'Standard',
        name: 'Gemini Dollar',
        symbol: 'GUSD',
        decimals: '2'
      }
    ],
    affiliate: '0x7aD0fa0E2380a5e0208B25AC69216Bd7Ff206bF8',
    arbitrator: '0x64967e8cb62b0cd1bbed27bee4f0a6a2e454f06a'
  },
  rinkeby: {
    provider: 'https://rinkeby.infura.io',
    providerWS: 'wss://rinkeby.infura.io/ws',
    ipfsGateway: 'https://ipfs.staging.originprotocol.com',
    ipfsRPC: `https://ipfs.staging.originprotocol.com`,
    ipfsEventCache: 'QmdMTYdXtKHzhTHDuUmx4eGG372pwbK4sQptPtoS6q3LsK',
    discovery: 'https://discovery.staging.originprotocol.com',
    V00_UserRegistry: '0x56727c8a51b276aec911afa8d6d80d485c89d5cc',
    OriginIdentity: '0x8a294aaece85ca472f09ab6c09d75448bf3b25c1',
    OriginToken: '0xa115e16ef6e217f7a327a57031f75ce0487aadb8',
    V00_Marketplace: '0xe842831533c4bf4b0f71b4521c4320bdb669324e',
    V00_Marketplace_Epoch: '3086315',
    affiliate: '0xc1a33cda27c68e47e370ff31cdad7d6522ea93d5',
    arbitrator: '0xc9c1a92ba54c61045ebf566b154dfd6afedea992',
    messaging: {
      ipfsSwarm:
        '/dnsaddr/messaging.staging.originprotocol.com/tcp/443/wss/ipfs/QmR4xhzHSKJiHmhCTf3tWXLe3UV4RL5kqUJ2L81cV4RFbb',
      messagingNamespace: 'origin:staging',
      globalKeyServer: 'https://messaging-api.staging.originprotocol.com'
    }
  },
  rinkebyTst: {
    provider: 'https://rinkeby.infura.io',
    providerWS: 'wss://rinkeby.infura.io/ws',
    ipfsGateway: 'https://ipfs.staging.originprotocol.com',
    ipfsRPC: `https://ipfs.staging.originprotocol.com`
  },
  kovanTst: {
    provider: 'https://kovan.infura.io',
    providerWS: 'wss://kovan.infura.io/ws',
    ipfsGateway: 'https://ipfs.staging.originprotocol.com',
    ipfsRPC: `https://ipfs.staging.originprotocol.com`,
    OriginToken: '0xf2D5AeA9057269a1d97A952BAf5E1887462c67b6',
    V00_Marketplace: '0x66E8c312dC89599c84A93353d6914631ce7857Cc',
    V00_Marketplace_Epoch: '10135260'
  },
  localhost: {
    provider: `http://${HOST}:8545`,
    providerWS: `ws://${HOST}:8545`,
    ipfsGateway: `http://${HOST}:9090`,
    ipfsRPC: `http://${HOST}:5002`,
    bridge: 'https://bridge.staging.originprotocol.com',
    automine: 2000,
    affiliate: '0x0d1d4e623D10F9FBA5Db95830F7d3839406C6AF2',
    arbitrator: '0x821aEa9a577a9b44299B9c15c88cf3087F3b5544',
    linker: `http://${HOST}:3008`,
    linkerWS: `ws://${HOST}:3008`

    // messaging: {
    //   ipfsSwarm:
    //     '/ip4/127.0.0.1/tcp/9012/ws/ipfs/QmYsCaLzzso7kYuAZ8b5DwhpwGvgzKyFtvs37bG95GTQGA',
    //   messagingNamespace: 'dev',
    //   globalKeyServer: 'http://127.0.0.1:6647'
    // }
  },
  test: {
    provider: `http://${HOST}:8545`,
    providerWS: `ws://${HOST}:8545`,
    ipfsGateway: `http://${HOST}:9090`,
    ipfsRPC: `http://${HOST}:5002`
  }
}

const DefaultMessagingConfig = {
  // ipfsSwarm:
  //   '/dnsaddr/messaging.staging.originprotocol.com/tcp/443/wss/ipfs/QmR4xhzHSKJiHmhCTf3tWXLe3UV4RL5kqUJ2L81cV4RFbb',
  // messagingNamespace: 'origin:staging'
  ipfsSwarm:
    '/dnsaddr/messaging.dev.originprotocol.com/tcp/443/wss/ipfs/Qma8wRkeXeYtE3RQfqFDGjsKCEqXR5CGxfmRxvus9aULcs',
  messagingNamespace: 'origin:dev',
  globalKeyServer: 'https://messaging-api.dev.originprotocol.com'
}

const context = {}

// web3.js version 35 + 36 need this hack...
function applyWeb3Hack(web3Instance) {
  if (!web3Instance.version.match(/(35|36)$/)) return web3Instance

  web3Instance.eth.abi.decodeParameters = function(outputs, bytes) {
    if (bytes === '0x') bytes = '0x00'
    return web3Instance.eth.abi.__proto__.decodeParameters(outputs, bytes)
  }
  return web3Instance
}

export function setNetwork(net, customConfig) {
  let config = JSON.parse(JSON.stringify(Configs[net]))
  if (!config) {
    return
  }
  if (net === 'test') {
    config = { ...config, ...customConfig }
  } else if (net === 'localhost') {
    config.OriginToken = window.localStorage.OGNContract
    config.V00_Marketplace = window.localStorage.marketplaceContract
    config.V00_UserRegistry = window.localStorage.userRegistryContract
  }
  context.net = net
  context.config = config
  context.automine = config.automine

  context.ipfsGateway = config.ipfsGateway
  context.ipfsRPC = config.ipfsRPC
  context.discovery = config.discovery

  delete context.marketplace
  delete context.marketplaceExec
  delete context.ogn
  delete context.ognExec
  delete context.marketplaces
  delete context.tokens
  delete context.claimHolderRegistered
  delete context.metaMask
  if (wsSub) {
    wsSub.unsubscribe()
  }

  web3 = applyWeb3Hack(new Web3(config.provider))
  if (typeof window !== 'undefined') {
    window.localStorage.ognNetwork = net
    window.web3 = web3
  }
  context.web3 = web3
  context.web3Exec = web3

  if (typeof window !== 'undefined') {
    const MessagingConfig = config.messaging || DefaultMessagingConfig
    MessagingConfig.personalSign = metaMask && metaMaskEnabled ? true : false
    context.messaging = OriginMessaging({ ...MessagingConfig, web3 })

    context.linker = OriginLinkerClient({
      httpUrl: config.linker,
      wsUrl: config.linkerWS
    })
  }

  context.metaMaskEnabled = metaMaskEnabled
  if (typeof window !== 'undefined' && window.localStorage.privateKeys) {
    JSON.parse(window.localStorage.privateKeys).forEach(key =>
      web3.eth.accounts.wallet.add(key)
    )
    web3.eth.defaultAccount = window.localStorage.defaultAccount
  }

  context.EventBlock = config.V00_Marketplace_Epoch || 0

  context.claimHolderRegistered = new web3.eth.Contract(
    ClaimHolderRegisteredContract.abi
  )
  context.claimHolderPresigned = new web3.eth.Contract(
    ClaimHolderPresignedContract.abi
  )

  context.userRegistry = new web3.eth.Contract(
    UserRegistryContract.abi,
    config.V00_UserRegistry
  )
  setMarketplace(config.V00_Marketplace, config.V00_Marketplace_Epoch)

  if (typeof window !== 'undefined') {
    web3WS = applyWeb3Hack(new Web3(config.providerWS))
    wsSub = web3WS.eth.subscribe('newBlockHeaders').on('data', blockHeaders => {
      context.marketplace.eventCache.updateBlock(blockHeaders.number)
      context.eventSource.resetCache()
      pubsub.publish('NEW_BLOCK', {
        newBlock: { ...blockHeaders, id: blockHeaders.hash }
      })
    })
    web3.eth.getBlockNumber().then(block => {
      web3.eth.getBlock(block).then(blockHeaders => {
        if (blockHeaders) {
          context.marketplace.eventCache.updateBlock(blockHeaders.number)
          context.eventSource.resetCache()
          pubsub.publish('NEW_BLOCK', {
            newBlock: { ...blockHeaders, id: blockHeaders.hash }
          })
        }
      })
    })
    context.pubsub = pubsub
  }

  context.tokens = config.tokens || []
  if (config.OriginToken) {
    context.ogn = new web3.eth.Contract(
      OriginTokenContract.abi,
      config.OriginToken
    )
    context[config.OriginToken] = context.ogn
    context.tokens.unshift({
      id: config.OriginToken,
      type: 'OriginToken',
      name: 'Origin Token',
      symbol: 'OGN',
      decimals: '18',
      supply: '1000000000'
    })
  }
  try {
    const storedTokens = JSON.parse(window.localStorage[`${net}Tokens`])
    storedTokens.forEach(token => {
      if (context.tokens.find(t => t.id === token.id)) {
        return
      }
      context.tokens.push(token)
    })
  } catch (e) {
    /* Ignore */
  }

  context.tokens.forEach(token => {
    const contractDef =
      token.type === 'OriginToken' ? OriginTokenContract : TokenContract
    const contract = new web3.eth.Contract(contractDef.abi, token.id)
    token.contract = contract
    token.contractExec = contract
  })

  context.transactions = {}
  try {
    context.transactions = JSON.parse(window.localStorage[`${net}Transactions`])
  } catch (e) {
    /* Ignore */
  }

  if (metaMask) {
    context.metaMask = metaMask
    context.ognMM = new metaMask.eth.Contract(
      OriginTokenContract.abi,
      config.OriginToken
    )
    context.tokens.forEach(token => {
      token.contractMM = new metaMask.eth.Contract(
        token.contract.options.jsonInterface,
        token.contract.options.address
      )
    })
  }
  setMetaMask()
}

function setMetaMask() {
  if (metaMask && metaMaskEnabled) {
    context.metaMaskEnabled = true
    context.web3Exec = metaMask
    context.marketplaceExec = context.marketplaceMM
    context.ognExec = context.ognMM
    context.tokens.forEach(token => (token.contractExec = token.contractMM))
  } else {
    context.metaMaskEnabled = false
    context.web3Exec = web3
    context.marketplaceExec = context.marketplace
    context.ognExec = context.ogn
    context.tokens.forEach(token => (token.contractExec = token.contract))
  }
  if (context.messaging) {
    context.messaging.web3 = context.web3Exec
  }
}

export function toggleMetaMask(enabled) {
  metaMaskEnabled = enabled
  if (metaMaskEnabled) {
    window.localStorage.metaMaskEnabled = true
  } else {
    delete window.localStorage.metaMaskEnabled
  }
  setMetaMask()
}

export function setMarketplace(address, epoch) {
  context.marketplace = new web3.eth.Contract(MarketplaceContract.abi, address)
  context.marketplace.eventCache = eventCache(
    context.marketplace,
    epoch,
    context.web3,
    context.config
  )
  if (address) {
    context.marketplaces = [context.marketplace]
  } else {
    context.marketplaces = []
  }
  context.eventSource = new EventSource({
    marketplaceContract: context.marketplace,
    ipfsGateway: context.ipfsGateway,
    web3: context.web3
  })
  context.marketplaceExec = context.marketplace

  if (metaMask) {
    context.marketplaceMM = new metaMask.eth.Contract(
      MarketplaceContract.abi,
      address
    )
    if (metaMaskEnabled) {
      context.marketplaceExec = context.marketplaceMM
    }
  }
}

if (typeof window !== 'undefined') {
  if (window.ethereum) {
    metaMask = applyWeb3Hack(new Web3(window.ethereum))
    metaMaskEnabled = window.localStorage.metaMaskEnabled ? true : false
  }

  setNetwork(window.localStorage.ognNetwork || 'mainnet')

  window.context = context
}

export default context
