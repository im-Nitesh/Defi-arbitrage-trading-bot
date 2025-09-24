require('dotenv').config();

const config = {
  // Server configuration
  port: process.env.PORT || 3000,
  
  // RPC endpoints
  rpcUrls: {
    mainnet: process.env.RPC_URL_MAINNET,
    polygon: process.env.RPC_URL_POLYGON
  },
  
  // Bot parameters
  minProfitThreshold: parseFloat(process.env.MIN_PROFIT_THRESHOLD) || 0.01,
  gasPriceGwei: parseInt(process.env.GAS_PRICE_GWEI) || 20,
  safetyMargin: parseFloat(process.env.SAFETY_MARGIN) || 0.05,
  scanIntervalSeconds: parseInt(process.env.SCAN_INTERVAL_SECONDS) || 30,
  
  // DEX configurations
  dexes: {
    uniswap: {
      name: 'Uniswap V2',
      factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
      router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      network: 'mainnet'
    },
    sushiswap: {
      name: 'SushiSwap',
      factory: '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac',
      router: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
      network: 'mainnet'
    },
    quickswap: {
      name: 'QuickSwap',
      factory: '0x5757371414417b8C6CAd45bAeF941aBc7d3Ab32',
      router: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
      network: 'polygon'
    }
  },
  
  // Token addresses
  tokens: {
    mainnet: {
      WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F'
    },
    polygon: {
      WMATIC: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
      USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063'
    }
  }
};

module.exports = config;