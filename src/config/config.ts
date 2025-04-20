export default {
  files: {
    inputOrdersPath: "./data/orders.json",
    outputOrderBookPath: "./data/orderbook.json",
    outputTradesPath: "./data/trades.json",
  },

  logging: {
    level: process.env.LOG_LEVEL || "info",
    format: process.env.NODE_ENV == "production" ? "json" : "pretty",
  },

  precision: {
    decimalPlaces: 8,
    rounding: 4,
  },

  performance: {
    batchSize: 100,
  },
};
