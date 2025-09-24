const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

class Database {
  constructor() {
    this.db = null;
    this.init();
  }

  init() {
    // Ensure data directory exists
    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = path.join(dataDir, 'arbitrage.db');
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        logger.error('Error opening database:', err);
        throw err;
      }
      logger.info('Connected to SQLite database');
      this.createTables();
    });
  }

  createTables() {
    const createArbitrageOpportunitiesTable = `
      CREATE TABLE IF NOT EXISTS arbitrage_opportunities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token_pair TEXT NOT NULL,
        dex_a TEXT NOT NULL,
        dex_b TEXT NOT NULL,
        price_a REAL NOT NULL,
        price_b REAL NOT NULL,
        price_difference REAL NOT NULL,
        potential_profit REAL NOT NULL,
        gas_cost REAL NOT NULL,
        net_profit REAL NOT NULL,
        profit_percentage REAL NOT NULL,
        trade_amount REAL NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_profitable BOOLEAN NOT NULL
      )
    `;

    const createTriangularOpportunitiesTable = `
      CREATE TABLE IF NOT EXISTS triangular_opportunities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token_a TEXT NOT NULL,
        token_b TEXT NOT NULL,
        token_c TEXT NOT NULL,
        dex TEXT NOT NULL,
        rate_ab REAL NOT NULL,
        rate_bc REAL NOT NULL,
        rate_ca REAL NOT NULL,
        expected_return REAL NOT NULL,
        potential_profit REAL NOT NULL,
        gas_cost REAL NOT NULL,
        net_profit REAL NOT NULL,
        trade_amount REAL NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_profitable BOOLEAN NOT NULL
      )
    `;

    this.db.run(createArbitrageOpportunitiesTable, (err) => {
      if (err) logger.error('Error creating arbitrage_opportunities table:', err);
      else logger.info('Arbitrage opportunities table ready');
    });

    this.db.run(createTriangularOpportunitiesTable, (err) => {
      if (err) logger.error('Error creating triangular_opportunities table:', err);
      else logger.info('Triangular opportunities table ready');
    });
  }

  insertArbitrageOpportunity(opportunity) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO arbitrage_opportunities (
          token_pair, dex_a, dex_b, price_a, price_b, price_difference,
          potential_profit, gas_cost, net_profit, profit_percentage,
          trade_amount, is_profitable
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      this.db.run(sql, [
        opportunity.tokenPair,
        opportunity.dexA,
        opportunity.dexB,
        opportunity.priceA,
        opportunity.priceB,
        opportunity.priceDifference,
        opportunity.potentialProfit,
        opportunity.gasCost,
        opportunity.netProfit,
        opportunity.profitPercentage,
        opportunity.tradeAmount,
        opportunity.isProfitable
      ], function(err) {
        if (err) {
          logger.error('Error inserting arbitrage opportunity:', err);
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  insertTriangularOpportunity(opportunity) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO triangular_opportunities (
          token_a, token_b, token_c, dex, rate_ab, rate_bc, rate_ca,
          expected_return, potential_profit, gas_cost, net_profit,
          trade_amount, is_profitable
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      this.db.run(sql, [
        opportunity.tokenA,
        opportunity.tokenB,
        opportunity.tokenC,
        opportunity.dex,
        opportunity.rateAB,
        opportunity.rateBC,
        opportunity.rateCA,
        opportunity.expectedReturn,
        opportunity.potentialProfit,
        opportunity.gasCost,
        opportunity.netProfit,
        opportunity.tradeAmount,
        opportunity.isProfitable
      ], function(err) {
        if (err) {
          logger.error('Error inserting triangular opportunity:', err);
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  getRecentOpportunities(limit = 100, onlyProfitable = false) {
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT * FROM arbitrage_opportunities
        ${onlyProfitable ? 'WHERE is_profitable = 1' : ''}
        ORDER BY timestamp DESC
        LIMIT ?
      `;

      this.db.all(sql, [limit], (err, rows) => {
        if (err) {
          logger.error('Error fetching opportunities:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  getRecentTriangularOpportunities(limit = 100, onlyProfitable = false) {
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT * FROM triangular_opportunities
        ${onlyProfitable ? 'WHERE is_profitable = 1' : ''}
        ORDER BY timestamp DESC
        LIMIT ?
      `;

      this.db.all(sql, [limit], (err, rows) => {
        if (err) {
          logger.error('Error fetching triangular opportunities:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          logger.error('Error closing database:', err);
        } else {
          logger.info('Database connection closed');
        }
      });
    }
  }
}

module.exports = Database;