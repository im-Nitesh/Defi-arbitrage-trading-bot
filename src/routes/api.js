const express = require('express');
const Database = require('../database');
const logger = require('../utils/logger');

const router = express.Router();
const db = new Database();

// Get recent arbitrage opportunities
router.get('/opportunities', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const onlyProfitable = req.query.profitable === 'true';
    
    const opportunities = await db.getRecentOpportunities(limit, onlyProfitable);
    
    res.json({
      success: true,
      count: opportunities.length,
      data: opportunities
    });
  } catch (error) {
    logger.error('Error fetching opportunities:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get recent triangular arbitrage opportunities
router.get('/triangular-opportunities', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const onlyProfitable = req.query.profitable === 'true';
    
    const opportunities = await db.getRecentTriangularOpportunities(limit, onlyProfitable);
    
    res.json({
      success: true,
      count: opportunities.length,
      data: opportunities
    });
  } catch (error) {
    logger.error('Error fetching triangular opportunities:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get statistics
router.get('/stats', async (req, res) => {
  try {
    // Get recent profitable opportunities count
    const profitableOpportunities = await db.getRecentOpportunities(1000, true);
    const totalOpportunities = await db.getRecentOpportunities(1000, false);
    
    const stats = {
      totalOpportunities: totalOpportunities.length,
      profitableOpportunities: profitableOpportunities.length,
      profitabilityRate: totalOpportunities.length > 0 ? 
        (profitableOpportunities.length / totalOpportunities.length * 100).toFixed(2) + '%' : '0%',
      averageProfit: profitableOpportunities.length > 0 ?
        (profitableOpportunities.reduce((sum, opp) => sum + opp.net_profit, 0) / profitableOpportunities.length).toFixed(2) : 0,
      lastScan: totalOpportunities.length > 0 ? totalOpportunities[0].timestamp : null
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;