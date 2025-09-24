// src/server.js - IMPROVED VERSION
const express = require('express');
const cors = require('cors');
const config = require('./config');
const apiRoutes = require('./routes/api');
const ArbitrageScanner = require('./scanner');
const logger = require('./utils/logger');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'DeFi Arbitrage Bot API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      opportunities: '/api/opportunities',
      triangular: '/api/triangular-opportunities',
      stats: '/api/stats'
    }
  });
});

// Configuration check endpoint
app.get('/config', (req, res) => {
  res.json({
    dexCount: Object.keys(config.dexes).length,
    mainnetRpcConfigured: !!config.rpcUrls.mainnet,
    polygonRpcConfigured: !!config.rpcUrls.polygon,
    scanInterval: config.scanIntervalSeconds,
    minProfitThreshold: config.minProfitThreshold
  });
});

// Start server
const server = app.listen(config.port, () => {
  logger.info(`🚀 Server running on port ${config.port}`);
  logger.info(`📊 API available at http://localhost:${config.port}`);
  
  // Validate configuration before starting scanner
  if (!config.rpcUrls.mainnet) {
    logger.error('❌ RPC_URL_MAINNET not configured! Please check your .env file');
    logger.info('💡 Example: RPC_URL_MAINNET=https://mainnet.infura.io/v3/YOUR_PROJECT_ID');
    return;
  }

  // Start the arbitrage scanner
  try {
    const scanner = new ArbitrageScanner();
    scanner.start();
  } catch (error) {
    logger.error('❌ Failed to start scanner:', error);
  }
});

// Keep server running even if scanner fails
server.on('error', (error) => {
  logger.error('Server error:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Don't exit on uncaught exceptions, just log them
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception (continuing):', error);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection (continuing):', reason);
});