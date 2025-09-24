const { ethers } = require('ethers');
const config = require('../config');
const logger = require('../utils/logger');

// Uniswap V2 Pair ABI (minimal)
const PAIR_ABI = [
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)'
];

// Uniswap V2 Factory ABI (minimal)
const FACTORY_ABI = [
  'function getPair(address tokenA, address tokenB) external view returns (address pair)'
];

class PriceService {
  constructor() {
    this.providers = {};
    this.initProviders();
    this.priceCache = new Map();
    this.cacheTimeout = 10000; // 10 seconds
  }

  initProviders() {
    try {
      if (config.rpcUrls.mainnet) {
        this.providers.mainnet = new ethers.JsonRpcProvider(config.rpcUrls.mainnet);
        logger.info('Mainnet provider initialized');
      }
      if (config.rpcUrls.polygon) {
        this.providers.polygon = new ethers.JsonRpcProvider(config.rpcUrls.polygon);
        logger.info('Polygon provider initialized');
      }
    } catch (error) {
      logger.error('Error initializing providers:', error);
    }
  }

  async getPairAddress(factoryAddress, tokenA, tokenB, provider) {
    try {
      const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, provider);
      const pairAddress = await factory.getPair(tokenA, tokenB);
      
      if (pairAddress === ethers.ZeroAddress) {
        return null;
      }
      
      return pairAddress;
    } catch (error) {
      logger.error(`Error getting pair address: ${error.message}`);
      return null;
    }
  }

  async getTokenPrice(tokenA, tokenB, dexConfig) {
    const cacheKey = `${tokenA}-${tokenB}-${dexConfig.name}`;
    const cached = this.priceCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.price;
    }

    try {
      const provider = this.providers[dexConfig.network];
      if (!provider) {
        logger.warn(`No provider for network: ${dexConfig.network}`);
        return null;
      }

      const pairAddress = await this.getPairAddress(
        dexConfig.factory,
        tokenA,
        tokenB,
        provider
      );

      if (!pairAddress) {
        logger.warn(`No pair found for ${tokenA}/${tokenB} on ${dexConfig.name}`);
        return null;
      }

      const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);
      const [reserves0, reserves1] = await pair.getReserves();
      const token0 = await pair.token0();
      
      let price;
      if (token0.toLowerCase() === tokenA.toLowerCase()) {
        // tokenA is token0, tokenB is token1
        price = parseFloat(ethers.formatEther(reserves1)) / parseFloat(ethers.formatEther(reserves0));
      } else {
        // tokenA is token1, tokenB is token0
        price = parseFloat(ethers.formatEther(reserves0)) / parseFloat(ethers.formatEther(reserves1));
      }

      // Cache the price
      this.priceCache.set(cacheKey, {
        price,
        timestamp: Date.now()
      });

      return price;
    } catch (error) {
      logger.error(`Error fetching price for ${tokenA}/${tokenB} on ${dexConfig.name}: ${error.message}`);
      return null;
    }
  }

  async getAllPrices(tokenPairs) {
    const prices = {};
    
    for (const pair of tokenPairs) {
      const [tokenA, tokenB] = pair.split('/');
      prices[pair] = {};
      
      for (const [dexName, dexConfig] of Object.entries(config.dexes)) {
        try {
          const price = await this.getTokenPrice(tokenA, tokenB, dexConfig);
          if (price && price > 0) {
            prices[pair][dexName] = price;
          }
        } catch (error) {
          logger.error(`Error getting price for ${pair} on ${dexName}:`, error.message);
        }
      }
    }
    
    return prices;
  }

  // Get triangular rates for a DEX
  async getTriangularRates(tokenA, tokenB, tokenC, dexConfig) {
    try {
      const rateAB = await this.getTokenPrice(tokenA, tokenB, dexConfig);
      const rateBC = await this.getTokenPrice(tokenB, tokenC, dexConfig);
      const rateCA = await this.getTokenPrice(tokenC, tokenA, dexConfig);

      if (!rateAB || !rateBC || !rateCA) {
        return null;
      }

      return {
        rateAB,
        rateBC,
        rateCA
      };
    } catch (error) {
      logger.error(`Error getting triangular rates: ${error.message}`);
      return null;
    }
  }
}

module.exports = PriceService;