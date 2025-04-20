import { MatchingEngine } from "../../../src/services/matchingEngine";
import { RawOrder, createOrder } from "../../../src/models/order";
import { createOrderBook } from "../../../src/models/orderbook";

describe("MatchingEngine", () => {
  let engine: MatchingEngine;

  beforeEach(() => {
    engine = new MatchingEngine();
  });

  describe("Order Book Management", () => {
    test("should add orders to the order book correctly", () => {
      // Creating order book
      const orderBook = createOrderBook("BTC/USDC");

      // Creating orders
      const rawOrder: RawOrder = {
        type_op: "CREATE",
        account_id: "1",
        amount: "10",
        order_id: "1",
        pair: "BTC/USDC",
        limit_price: "50000",
        side: "BUY",
      };

      const order = createOrder(rawOrder);

      // Adding order to book
      engine.addToOrderBook(order, orderBook);

      // Verifying order book state
      expect(orderBook.bids.prices.length).toBe(1);
      expect(orderBook.bids.prices[0].toString()).toBe("50000");

      const priceLevel = orderBook.bids.priceLevels.get("50000");
      expect(priceLevel).toBeDefined();
      expect(priceLevel!.orders.length).toBe(1);
      expect(priceLevel!.orders[0].order_id).toBe("1");
      expect(priceLevel!.totalVolume.toString()).toBe("10");
    });

    test("should remove orders from the order book correctly", () => {
      // Creating order book
      const orderBook = createOrderBook("BTC/USDC");

      // Creating and add order
      const rawOrder: RawOrder = {
        type_op: "CREATE",
        account_id: "1",
        amount: "10",
        order_id: "1",
        pair: "BTC/USDC",
        limit_price: "50000",
        side: "BUY",
      };

      const order = createOrder(rawOrder);
      engine.addToOrderBook(order, orderBook);

      // Verifying order was added
      expect(orderBook.bids.prices.length).toBe(1);

      // Removing the order
      const removed = engine.removeFromOrderBook(order, orderBook);

      // Verifing order was removed
      expect(removed).toBe(true);
      expect(orderBook.bids.prices.length).toBe(0);
      expect(orderBook.bids.priceLevels.size).toBe(0);
    });

    test("should maintain sorted price levels", () => {
      // Creating order book
      const orderBook = createOrderBook("BTC/USDC");

      // Creating buy orders at different prices
      const buyOrders: RawOrder[] = [
        {
          type_op: "CREATE",
          account_id: "1",
          amount: "10",
          order_id: "1",
          pair: "BTC/USDC",
          limit_price: "50000",
          side: "BUY",
        },
        {
          type_op: "CREATE",
          account_id: "1",
          amount: "10",
          order_id: "2",
          pair: "BTC/USDC",
          limit_price: "51000",
          side: "BUY",
        },
        {
          type_op: "CREATE",
          account_id: "1",
          amount: "10",
          order_id: "3",
          pair: "BTC/USDC",
          limit_price: "49000",
          side: "BUY",
        },
      ];

      // Adding orders to the book
      buyOrders.forEach((raw) => {
        const order = createOrder(raw);
        engine.addToOrderBook(order, orderBook);
      });

      // Verifying bid prices are sorted in descending order
      expect(orderBook.bids.prices.length).toBe(3);
      expect(orderBook.bids.prices[0].toString()).toBe("51000");
      expect(orderBook.bids.prices[1].toString()).toBe("50000");
      expect(orderBook.bids.prices[2].toString()).toBe("49000");

      // Creating sell orders at different prices
      const sellOrders: RawOrder[] = [
        {
          type_op: "CREATE",
          account_id: "2",
          amount: "10",
          order_id: "4",
          pair: "BTC/USDC",
          limit_price: "52000",
          side: "SELL",
        },
        {
          type_op: "CREATE",
          account_id: "2",
          amount: "10",
          order_id: "5",
          pair: "BTC/USDC",
          limit_price: "53000",
          side: "SELL",
        },
        {
          type_op: "CREATE",
          account_id: "2",
          amount: "10",
          order_id: "6",
          pair: "BTC/USDC",
          limit_price: "51500",
          side: "SELL",
        },
      ];

      // Adding orders to the book
      sellOrders.forEach((raw) => {
        const order = createOrder(raw);
        engine.addToOrderBook(order, orderBook);
      });

      // Verifying ask prices are sorted in ascending order
      expect(orderBook.asks.prices.length).toBe(3);
      expect(orderBook.asks.prices[0].toString()).toBe("51500");
      expect(orderBook.asks.prices[1].toString()).toBe("52000");
      expect(orderBook.asks.prices[2].toString()).toBe("53000");
    });
  });

  describe("Order Matching", () => {
    test("should match a buy order against asks", () => {
      // Creating order book
      const orderBook = createOrderBook("BTC/USDC");

      // Adding some sell orders
      const sellOrders: RawOrder[] = [
        {
          type_op: "CREATE",
          account_id: "2",
          amount: "10",
          order_id: "1",
          pair: "BTC/USDC",
          limit_price: "50000",
          side: "SELL",
        },
        {
          type_op: "CREATE",
          account_id: "2",
          amount: "10",
          order_id: "2",
          pair: "BTC/USDC",
          limit_price: "51000",
          side: "SELL",
        },
      ];

      sellOrders.forEach((raw) => {
        const order = createOrder(raw);
        engine.addToOrderBook(order, orderBook);
      });

      // Creating a buy order
      const buyOrder: RawOrder = {
        type_op: "CREATE",
        account_id: "1",
        amount: "15",
        order_id: "3",
        pair: "BTC/USDC",
        limit_price: "50500",
        side: "BUY",
      };

      const order = createOrder(buyOrder);

      // Matching the order
      const trades = engine.matchOrder(order, orderBook);

      // Verifying trades
      expect(trades.length).toBe(1);
      expect(trades[0].maker_order_id).toBe("1");
      expect(trades[0].taker_order_id).toBe("3");
      expect(trades[0].amount.toString()).toBe("10");
      expect(trades[0].price.toString()).toBe("50000");
    });

    test("should match a sell order against bids", () => {
      // Creating order book
      const orderBook = createOrderBook("BTC/USDC");

      // Adding some buy orders
      const buyOrders: RawOrder[] = [
        {
          type_op: "CREATE",
          account_id: "1",
          amount: "10",
          order_id: "1",
          pair: "BTC/USDC",
          limit_price: "49000",
          side: "BUY",
        },
        {
          type_op: "CREATE",
          account_id: "1",
          amount: "10",
          order_id: "2",
          pair: "BTC/USDC",
          limit_price: "50000",
          side: "BUY",
        },
      ];

      buyOrders.forEach((raw) => {
        const order = createOrder(raw);
        engine.addToOrderBook(order, orderBook);
      });

      // Creating a sell order
      const sellOrder: RawOrder = {
        type_op: "CREATE",
        account_id: "2",
        amount: "15",
        order_id: "3",
        pair: "BTC/USDC",
        limit_price: "49500",
        side: "SELL",
      };

      const order = createOrder(sellOrder);

      // Matching the order
      const trades = engine.matchOrder(order, orderBook);

      // Verifying trades
      expect(trades.length).toBe(1);
      expect(trades[0].maker_order_id).toBe("2");
      expect(trades[0].taker_order_id).toBe("3");
      expect(trades[0].amount.toString()).toBe("10");
      expect(trades[0].price.toString()).toBe("50000");
    });

    test("should match multiple price levels", () => {
      // Creating order book
      const orderBook = createOrderBook("BTC/USDC");

      // Adding buy orders at different prices
      const buyOrders: RawOrder[] = [
        {
          type_op: "CREATE",
          account_id: "1",
          amount: "10",
          order_id: "1",
          pair: "BTC/USDC",
          limit_price: "49000",
          side: "BUY",
        },
        {
          type_op: "CREATE",
          account_id: "1",
          amount: "10",
          order_id: "2",
          pair: "BTC/USDC",
          limit_price: "50000",
          side: "BUY",
        },
        {
          type_op: "CREATE",
          account_id: "1",
          amount: "10",
          order_id: "3",
          pair: "BTC/USDC",
          limit_price: "51000",
          side: "BUY",
        },
      ];

      buyOrders.forEach((raw) => {
        const order = createOrder(raw);
        engine.addToOrderBook(order, orderBook);
      });

      // Creating a sell order that will match against multiple price levels
      const sellOrder: RawOrder = {
        type_op: "CREATE",
        account_id: "2",
        amount: "25",
        order_id: "4",
        pair: "BTC/USDC",
        limit_price: "49000",
        side: "SELL",
      };

      const order = createOrder(sellOrder);

      // Match the order
      const trades = engine.matchOrder(order, orderBook);

      expect(trades.length).toBeGreaterThanOrEqual(2);

      // Sorting trades by price in descending order to check highest price first
      const sortedTrades = [...trades].sort(
        (a, b) =>
          parseFloat(b.price.toString()) - parseFloat(a.price.toString())
      );

      // First trade should be against the highest bid
      expect(sortedTrades[0].price.toString()).toBe("51000");

      // Second trade should be against the next highest bid
      expect(sortedTrades[1].price.toString()).toBe("50000");

      // Verifying the bid order IDs match
      const bidOrderIds = sortedTrades.slice(0, 2).map((t) => t.maker_order_id);
      expect(bidOrderIds).toContain("3"); // Highest price
      expect(bidOrderIds).toContain("2"); // Second highest price
    });

    test("should respect price-time priority within same price level", () => {
      // Creating order book
      const orderBook = createOrderBook("BTC/USDC");

      // Adding multiple buy orders at the same price
      const buyOrders: RawOrder[] = [
        {
          type_op: "CREATE",
          account_id: "1",
          amount: "10",
          order_id: "1",
          pair: "BTC/USDC",
          limit_price: "50000",
          side: "BUY",
        },
        {
          type_op: "CREATE",
          account_id: "2",
          amount: "10",
          order_id: "2",
          pair: "BTC/USDC",
          limit_price: "50000",
          side: "BUY",
        },
      ];

      // Adding orders with timestamps 1 second apart
      let timestamp = Date.now();
      buyOrders.forEach((raw, index) => {
        const order = createOrder(raw, timestamp + index * 1000);
        engine.addToOrderBook(order, orderBook);
      });

      // Creating a sell order
      const sellOrder: RawOrder = {
        type_op: "CREATE",
        account_id: "3",
        amount: "15",
        order_id: "3",
        pair: "BTC/USDC",
        limit_price: "50000",
        side: "SELL",
      };

      const order = createOrder(sellOrder);

      // Matching the order
      const trades = engine.matchOrder(order, orderBook);

      // Get a count of trades by maker ID
      const tradesByMakerId = trades.reduce(
        (acc, trade) => {
          acc[trade.maker_order_id] = (acc[trade.maker_order_id] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      // We should have trades with order 1 and order 2 as makers
      expect(Object.keys(tradesByMakerId).sort()).toEqual(["1", "2"]);
    });
  });

  describe("Market Statistics", () => {
    test("should provide accurate best bid/ask and spread", () => {
      // Creating order book
      const orderBook = createOrderBook("BTC/USDC");

      // Adding buy orders
      const buyOrders: RawOrder[] = [
        {
          type_op: "CREATE",
          account_id: "1",
          amount: "10",
          order_id: "1",
          pair: "BTC/USDC",
          limit_price: "49000",
          side: "BUY",
        },
        {
          type_op: "CREATE",
          account_id: "1",
          amount: "10",
          order_id: "2",
          pair: "BTC/USDC",
          limit_price: "50000",
          side: "BUY",
        },
      ];

      buyOrders.forEach((raw) => {
        const order = createOrder(raw);
        engine.addToOrderBook(order, orderBook);
      });

      // Adding sell orders
      const sellOrders: RawOrder[] = [
        {
          type_op: "CREATE",
          account_id: "2",
          amount: "10",
          order_id: "3",
          pair: "BTC/USDC",
          limit_price: "51000",
          side: "SELL",
        },
        {
          type_op: "CREATE",
          account_id: "2",
          amount: "10",
          order_id: "4",
          pair: "BTC/USDC",
          limit_price: "52000",
          side: "SELL",
        },
      ];

      sellOrders.forEach((raw) => {
        const order = createOrder(raw);
        engine.addToOrderBook(order, orderBook);
      });

      // Getting market statistics
      const bestBid = engine.getBestBidPrice(orderBook);
      const bestAsk = engine.getBestAskPrice(orderBook);
      const spread = engine.getSpread(orderBook);

      // Verifying statistics
      expect(bestBid).not.toBeNull();
      expect(bestAsk).not.toBeNull();
      expect(spread).not.toBeNull();

      expect(bestBid!.toString()).toBe("50000");
      expect(bestAsk!.toString()).toBe("51000");
      expect(spread!.toString()).toBe("1000");
    });
  });
});
