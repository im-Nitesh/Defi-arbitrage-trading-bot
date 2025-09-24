# DeFi Arbitrage Trading Bot

A comprehensive backend service that identifies and analyzes arbitrage opportunities across multiple Uniswap V2-compatible DEXs. The bot fetches real-time token prices, calculates potential profits, and stores results for analysis.

---

## Features

### Core Features

- ✅ Real-time price fetching from multiple DEXs (Uniswap, SushiSwap, QuickSwap)  
- ✅ Arbitrage opportunity detection with price difference analysis  
- ✅ Profit calculation including gas fees and safety margins  
- ✅ Trade execution simulation (no real on-chain trades)  
- ✅ SQLite database storage for historical data  
- ✅ REST API for accessing opportunities and statistics  

### Bonus Features

- ✅ Triangular arbitrage detection - Identifies 3-token arbitrage cycles within single DEXs  
- ✅ Configurable scanning intervals and profit thresholds  
- ✅ Comprehensive logging and error handling  
- ✅ Health monitoring and statistics endpoints  

---

## Architecture Overview

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Routes    │    │     Scanner     │    │  Price Service  │
│                 │    │                 │    │                 │
│ GET /api/...    │    │ Cron Jobs       │    │ DEX Integration │
│                 │    │ Scheduling      │    │ Price Fetching  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
│                       │                       │
▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Arbitrage Service                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Regular Arb     │  │ Triangular Arb  │  │ Profit Calc     │ │
│  │ Detection       │  │ Detection       │  │ & Simulation    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────┐
│   SQLite Database   │
│ • Opportunities     │
│ • Triangular Ops    │
│ • Historical Data   │
└─────────────────────┘

## Installation & Setup

### Prerequisites\

- Node.js 18+  
- NPM or Yarn  
- RPC endpoint access (Infura, Alchemy, or local node)  

### Step 1: Clone and Install

```bash
git clone <repository-url>
cd defi-arbitrage-bot
npm install
````

### Step 2: Environment Configuration

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
RPC_URL_MAINNET=https://mainnet.infura.io/v3/YOUR_INFURA_KEY
RPC_URL_POLYGON=https://polygon-mainnet.infura.io/v3/YOUR_INFURA_KEY
PORT=3000
MIN_PROFIT_THRESHOLD=0.01
GAS_PRICE_GWEI=20
SAFETY_MARGIN=0.05
SCAN_INTERVAL_SECONDS=30
```

### Step 3: Database Setup

```bash
npm run setup-db
```

### Step 4: Start the Bot

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

---

## Configuration Parameters

| Parameter               | Description                                      | Default   |
| ----------------------- | ------------------------------------------------ | --------- |
| MIN\_PROFIT\_THRESHOLD  | Minimum profit percentage to consider profitable | 0.01 (1%) |
| GAS\_PRICE\_GWEI        | Gas price in Gwei for cost calculations          | 20        |
| SAFETY\_MARGIN          | Additional margin for profit calculations        | 0.05 (5%) |
| SCAN\_INTERVAL\_SECONDS | How often to scan for opportunities              | 30        |

---

## API Endpoints

### 1. Get Arbitrage Opportunities

```http
GET /api/opportunities
```

**Query Parameters:**

- `limit` (optional): Number of results (default: 100)
- `profitable` (optional): Filter only profitable opportunities (`true/false`)

**Response:**

```json
{
  "success": true,
  "count": 25,
  "data": [
    {
      "id": 1,
      "token_pair": "ETH/USDC",
      "dex_a": "uniswap",
      "dex_b": "sushiswap", 
      "price_a": 1850.25,
      "price_b": 1847.80,
      "price_difference": 2.45,
      "potential_profit": 1.32,
      "gas_cost": 0.85,
      "net_profit": 0.47,
      "profit_percentage": 0.047,
      "trade_amount": 1000,
      "timestamp": "2025-09-24T10:30:00Z",
      "is_profitable": true
    }
  ]
}
```

### 2. Get Triangular Arbitrage Opportunities

```http
GET /api/triangular-opportunities
```

**Query Parameters:** same as above

**Response:**

```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "token_a": "ETH",
      "token_b": "USDC",
      "token_c": "USDT",
      "dex": "uniswap",
      "rate_ab": 1850.25,
      "rate_bc": 0.9998,
      "rate_ca": 0.0005403,
      "expected_return": 1.0015,
      "potential_profit": 1.50,
      "gas_cost": 2.55,
      "net_profit": -1.05,
      "trade_amount": 1000,
      "timestamp": "2025-09-24T10:30:00Z",
      "is_profitable": false
    }
  ]
}
```

### 3. Get Statistics

```http
GET /api/stats
```

**Response:**

```json
{
  "success": true,
  "data": {
    "totalOpportunities": 1250,
    "profitableOpportunities": 45,
    "profitabilityRate": "3.60%",
    "averageProfit": "2.35",
    "lastScan": "2025-09-24T10:30:00Z"
  }
}
```

### 4. Health Check

```http
GET /health
```

---

## Logic & Calculations

### Price Fetching

- Pair Discovery: Uses factory contracts
- Reserve Reading: Calls `getReserves()` on pair contracts
- Price Calculation: `price = reserve1 / reserve0`
- Caching: 10-second cache to reduce RPC calls

```javascript
const [reserves0, reserves1] = await pair.getReserves();
const token0 = await pair.token0();
let price;
if (token0.toLowerCase() === tokenA.toLowerCase()) {
  price = parseFloat(ethers.formatEther(reserves1)) / parseFloat(ethers.formatEther(reserves0));
} else {
  price = parseFloat(ethers.formatEther(reserves0)) / parseFloat(ethers.formatEther(reserves1));
}
```

### Arbitrage Profit Calculation

```javascript
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
```

### Triangular Arbitrage

- Cycle through 3 tokens: A → B → C → A
- Expected Return = Rate(A→B) × Rate(B→C) × Rate(C→A)
- Profitable if: `Expected Return > 1 + fees + safety margin`

---

### Gas Cost Estimation

```javascript
calculateGasCost() {
  const gasLimit = 300000;
  const gasPriceWei = ethers.parseUnits(config.gasPriceGwei.toString(), 'gwei');
  const gasCostWei = gasLimit * gasPriceWei;
  const gasCostEth = parseFloat(ethers.formatEther(gasCostWei));
  const ethPriceUSD = 2000;
  return gasCostEth * ethPriceUSD;
}
```

### Trade Simulation

```javascript
async simulateTradeExecution(opportunity) {
  const simulation = {
    success: true,
    estimatedGas: 300000,
    estimatedSlippage: 0.005,
    expectedOutput: opportunity.tradeAmount * (1 + opportunity.profitPercentage / 100),
    timestamp: new Date().toISOString()
  };
  return simulation;
}
```

---

## Database Schema

### Arbitrage Opportunities

```sql
CREATE TABLE arbitrage_opportunities (
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
);
```

### Triangular Opportunities

```sql
CREATE TABLE triangular_opportunities (
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
);
```

---

## Supported DEXs

| DEX        | Network  | Factory Address                            | Router Address                             |
| ---------- | -------- | ------------------------------------------ | ------------------------------------------ |
| Uniswap V2 | Ethereum | 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6  | 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488  |
| SushiSwap  | Ethereum | 0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac | 0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F |
| QuickSwap  | Polygon  | 0x5757371414417b8C6CAd45bAeF941aBc7d3Ab320 | 0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff |

---

## Token Pairs Monitored

## Ethereum Mainnet

- ETH/USDC
- ETH/USDT
- ETH/DAI
- USDC/USDT
- USDC/DAI

## Token Addresses

```javascript
tokens: {
  mainnet: {
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    DAI:  '0x6B175474E89094C44Da98b954EedeAC495271d0F'
  }
}
```
