# High-Performance Trading Engine

A production-ready trading engine implemented in TypeScript that processes orders and executes trades based on a price-time priority matching algorithm.

## Features

- **Efficient Order Matching**: Uses price-time priority algorithm with O(1) lookups
- **Price Level-Based Order Book**: Optimized data structure for fast matching
- **High Precision Decimal Handling**: Uses decimal.js for financial calculations
- **Robust Error Handling**: Comprehensive validation and error management
- **Extensive Logging**: Detailed logging for operations and debugging
- **Comprehensive Test Suite**: Unit tests and integration tests with high coverage
- **Performance Optimizations**: Efficient data structures and algorithms
- **Well-Documented Code**: JSDoc comments and clear architecture

## Project Structure

```
trading-engine/
├── src/                    # Source code
│   ├── config/             # Configuration settings
│   ├── models/             # Data models and interfaces
│   ├── services/           # Core business logic
│   ├── utils/              # Helper utilities
│   ├── validators/         # Input validation
│   └── index.ts            # Entry point
├── tests/                  # Test files
│   ├── unit/               # Unit tests
│   └── integration/        # Integration tests
├── data/                   # Input/output data
│   └── orders.json         # Input orders
├── dist/                   # Compiled JavaScript code
├── tsconfig.json           # TypeScript configuration
├── jest.config.js          # Jest configuration
└── package.json            # Project metadata
```

## Installation

```bash
# Clone the repository
git clone https://github.com/saswatamm/trading-engine.git
cd trading-engine

# Install dependencies
npm install
```

## Usage

1. Place your `orders.json` file in the `data` directory
2. Run the trading engine:

```bash
npm start
```

3. The engine will generate two output files:
   - `data/orderbook.json`: Final state of the order book
   - `data/trades.json`: List of executed trades

## Development

```bash
# Run in development mode with auto-restart
npm run dev

# Run tests
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Generate test coverage report
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format

# Build for production
npm run build
```

## Technical Details

### Order Book Architecture

The trading engine uses a sophisticated order book structure:

- **Price Level Management**: Orders are grouped by price levels for efficient matching
- **Separate Buy and Sell Books**: Each trading pair has distinct books for bids and asks
- **Sorted Price Levels**: Prices are maintained in sorted order (desc for bids, asc for asks)
- **Time Priority Queue**: Within each price level, orders are sorted by timestamp

### Order Matching Algorithm

1. New orders are first validated against business rules
2. For a new order, the engine tries to match against the opposite side of the book
3. The engine walks through price levels in order of priority:
   - For buy orders: ascending ask prices starting from the lowest
   - For sell orders: descending bid prices starting from the highest
4. At each price level, orders are matched in time priority (oldest first)
5. When a match is found, a trade is executed and recorded
6. Matching continues until the order is fully filled or no more matches are possible
7. Any remaining amount is added to the order book

### Data Structures

- **Map for Price Levels**: O(1) lookup by price
- **Sorted Array for Price Navigation**: Quick traversal of prices in order
- **Array for Time-Priority Queue**: Orders stored in FIFO order within price levels

### Precision Handling

All numerical operations use the decimal.js library to ensure precision in financial calculations, avoiding floating-point errors common in JavaScript.

### Performance Optimizations

- **Price Level Aggregation**: Orders are grouped by price for efficient matching
- **Indexing by Price**: Fast lookup of orders at specific prices
- **Minimal Sorting**: Prices are maintained in sorted order incrementally
- **Efficient Data Structures**: Optimized for the common operations in a trading engine

## License

MIT
