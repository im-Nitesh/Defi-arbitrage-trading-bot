const { ethers } = require('ethers');
const config = require('../config');
const logger = require('../utils/logger');
const Database = require('../database');

class ArbitrageService {
  constructor(priceService) {
    this.priceService = priceService;
    this.db = new Database();
  }

  calculateGasCost() {
    // Estimate gas cost for arbitrage transaction
    const gasLimit = 300000; // Typical gas limit for DEX swaps
    const gasPriceWei = ethers.parseUnits(config.gasPriceGwei.toString(), 'gwei');
    const gasCostWei = BigInt(gasLimit) * gasPriceWei;
    const gasCostEth = parseFloat(ethers.formatEther(gasCostWei));
    
    // Convert to USD (assuming ETH price of $2000 for simplicity)
    const ethPriceUSD = 2000;
    return gasCostEth * ethPriceUSD;
  }

  calculateArbitrageProfit(priceA, priceB, tradeAmount = 1000) {
    const priceDifference = Math.abs(priceA - priceB);
    const potentialProfit = (priceDifference / Math.min(priceA, priceB)) * tradeAmount;
    const gasCost = this.calculateGasCost();
    const netProfit = potentialProfit - gasCost;
    const profitPercentage = (netProfit / tradeAmount) * 100;
    
    return {
      priceDifference,
      potentialProfit,
      gasCost,
      netProfit,
      profitPercentage,
      isProfitable: netProfit > (tradeAmount * config.minProfitThreshold)
    };
  }

  async findArbitrageOpportunities(tokenPairs) {
    const opportunities = [];
    const prices = await this.priceService.getAllPrices(tokenPairs);

    for (const [pair, dexPrices] of Object.entries(prices)) {
      const dexNames = Object.keys(dexPrices);
      
      // Compare prices between all DEX pairs
      for (let i = 0; i < dexNames.length; i++) {
        for (let j = i + 1; j < dexNames.length; j++) {
          const dexA = dexNames[i];
          const dexB = dexNames[j];
          const priceA = dexPrices[dexA];
          const priceB = dexPrices[dexB];

          if (!priceA || !priceB || priceA <= 0 || priceB <= 0) continue;

          const analysis = this.calculateArbitrageProfit(priceA, priceB);
          
          const opportunity = {
            tokenPair: pair,
            dexA,
            dexB,
            priceA,
            priceB,
            tradeAmount: 1000, // Default trade amount
            ...analysis
          };

          opportunities.push(opportunity);
          
          // Store in database
          try {
            await this.db.insertArbitrageOpportunity(opportunity);
          } catch (error) {
            logger.error('Error storing opportunity:', error);
          }
          
          if (opportunity.isProfitable) {
            logger.info(`💰 Profitable arbitrage found: ${pair} - ${dexA}($${priceA.toFixed(4)}) vs ${dexB}($${priceB.toFixed(4)}) - Net profit: $${analysis.netProfit.toFixed(2)}`);
          }
        }
      }
    }

    return opportunities;
  }

  // Triangular arbitrage detection
  async findTriangularOpportunities() {
    const opportunities = [];
    const mainnetTokens = Object.values(config.tokens.mainnet);
    
    // Check triangular opportunities for each DEX
    for (const [dexName, dexConfig] of Object.entries(config.dexes)) {
      if (dexConfig.network !== 'mainnet') continue; // Focus on mainnet for now
      
      // Generate token triplets (limit to avoid too many combinations)
      for (let i = 0; i < Math.min(mainnetTokens.length, 3); i++) {
        for (let j = i + 1; j < Math.min(mainnetTokens.length, 4); j++) {
          for (let k = j + 1; k < Math.min(mainnetTokens.length, 4); k++) {
            const tokenA = mainnetTokens[i];
            const tokenB = mainnetTokens[j];
            const tokenC = mainnetTokens[k];

            const rates = await this.priceService.getTriangularRates(tokenA, tokenB, tokenC, dexConfig);
            if (!rates) continue;

            const expectedReturn = rates.rateAB * rates.rateBC * rates.rateCA;
            const tradeAmount = 1000;
            const potentialProfit = (expectedReturn - 1) * tradeAmount;
            const gasCost = this.calculateGasCost() * 3; // 3 swaps
            const netProfit = potentialProfit - gasCost;
            const isProfitable = netProfit > (tradeAmount * config.minProfitThreshold);

            const opportunity = {
              tokenA,
              tokenB,
              tokenC,
              dex: dexName,
              rateAB: rates.rateAB,
              rateBC: rates.rateBC,
              rateCA: rates.rateCA,
              expectedReturn,
              potentialProfit,
              gasCost,
              netProfit,
              tradeAmount,
              isProfitable
            };

            opportunities.push(opportunity);
            
            try {
              await this.db.insertTriangularOpportunity(opportunity);
            } catch (error) {
              logger.error('Error storing triangular opportunity:', error);
            }

            if (isProfitable) {
              logger.info(`🔺 Triangular arbitrage found on ${dexName}: Expected return: ${expectedReturn.toFixed(4)}, Net profit: $${netProfit.toFixed(2)}`);
            }
          }
        }
      }
    }

    return opportunities;
  }

  async simulateTradeExecution(opportunity) {
    // Simulate trade execution without actually executing
    logger.info(`🔄 Simulating trade execution for opportunity: ${opportunity.tokenPair || 'triangular'}`);
    
    const simulation = {
      success: true,
      estimatedGas: 300000,
      estimatedSlippage: 0.005, // 0.5%
      expectedOutput: opportunity.tradeAmount * (1 + opportunity.profitPercentage / 100),
      timestamp: new Date().toISOString()
    };

    return simulation;
  }
}

module.exports = ArbitrageService;