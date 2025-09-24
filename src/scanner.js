// src/scanner.js - IMPROVED VERSION
const cron = require('node-cron');
const config = require('./config');
const PriceService = require('./services/priceService');
const ArbitrageService = require('./services/arbitrageService');
const logger = require('./utils/logger');

class ArbitrageScanner {
  constructor() {
    this.priceService = new PriceService();
    this.arbitrageService = new ArbitrageService(this.priceService);
    this.isScanning = false;
    this.scanCount = 0;
  }

  async scan() {
    if (this.isScanning) {
      logger.info('Scan already in progress, skipping...');
      return;
    }

    this.isScanning = true;
    this.scanCount++;
    logger.info(`🔍 Starting arbitrage scan #${this.scanCount}...`);

    try {
      // Test RPC connection first
      const provider = this.priceService.providers.mainnet;
      if (!provider) {
        throw new Error('No mainnet provider available');
      }

      const blockNumber = await provider.getBlockNumber();
      logger.info(`📊 Connected to Ethereum mainnet, latest block: ${blockNumber}`);

      // Define token pairs to monitor
      const tokenPairs = [
        `${config.tokens.mainnet.WETH}/${config.tokens.mainnet.USDC}`,
        `${config.tokens.mainnet.WETH}/${config.tokens.mainnet.USDT}`,
        `${config.tokens.mainnet.WETH}/${config.tokens.mainnet.DAI}`,
        `${config.tokens.mainnet.USDC}/${config.tokens.mainnet.USDT}`,
        `${config.tokens.mainnet.USDC}/${config.tokens.mainnet.DAI}`
      ];

      logger.info(`🎯 Scanning ${tokenPairs.length} token pairs across ${Object.keys(config.dexes).length} DEXs`);

      // Find regular arbitrage opportunities
      const opportunities = await this.arbitrageService.findArbitrageOpportunities(tokenPairs);
      const profitableCount = opportunities.filter(opp => opp.isProfitable).length;
      
      logger.info(`✅ Regular arbitrage scan completed. Found ${opportunities.length} opportunities, ${profitableCount} profitable`);

      // Find triangular arbitrage opportunities (with error handling)
      let triangularOpportunities = [];
      let triangularProfitableCount = 0;
      
      try {
        triangularOpportunities = await this.arbitrageService.findTriangularOpportunities();
        triangularProfitableCount = triangularOpportunities.filter(opp => opp.isProfitable).length;
        logger.info(`🔺 Triangular scan completed. Found ${triangularOpportunities.length} opportunities, ${triangularProfitableCount} profitable`);
      } catch (triangularError) {
        logger.warn('Triangular arbitrage scan failed, continuing with regular arbitrage:', triangularError.message);
      }

      // Summary
      const totalProfitable = profitableCount + triangularProfitableCount;
      if (totalProfitable > 0) {
        logger.info(`🎉 Scan #${this.scanCount} summary: ${totalProfitable} total profitable opportunities found!`);
      } else {
        logger.info(`📈 Scan #${this.scanCount} summary: No profitable opportunities at current gas prices`);
      }

    } catch (error) {
      logger.error(`❌ Error during scan #${this.scanCount}:`, error.message);
      
      // Check if it's an RPC connection error
      if (error.message.includes('could not detect network') || 
          error.message.includes('CONNECTION ERROR') ||
          error.message.includes('timeout')) {
        logger.error('🔌 RPC Connection Error - Please check your .env file and RPC endpoints');
      }
    } finally {
      this.isScanning = false;
    }
  }

  start() {
    logger.info(`🚀 Starting arbitrage scanner with ${config.scanIntervalSeconds} second intervals`);
    
    // Validate configuration
    if (!config.rpcUrls.mainnet) {
      logger.error('❌ RPC_URL_MAINNET not configured in .env file');
      return;
    }
    
    // Run initial scan
    this.scan();
    
    // Schedule periodic scans
    const cronExpression = `*/${config.scanIntervalSeconds} * * * * *`;
    cron.schedule(cronExpression, () => {
      this.scan();
    });

    logger.info(`⏰ Scheduled scans every ${config.scanIntervalSeconds} seconds`);
  }
}

module.exports = ArbitrageScanner;