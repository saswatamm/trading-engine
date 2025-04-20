import {
  Order,
  OrderSide,
  TradingPair,
  RawOrder,
  createOrder,
} from "../models/order";
import {
  OrderBook,
  createOrderBook,
  serializeOrderBook,
} from "../models/orderbook";
import { Trade, serializeTrade } from "../models/trade";
import { MatchingEngine } from "./matchingEngine";
import { DecimalValue } from "../utils/decimal";
import { createLogger } from "../utils/logger";
import { OrderProcessingError, ValidationError } from "../utils/error";
import { validateOrder } from "../validator/orderValidator";

const logger = createLogger("OrderBookService");

/**
 * OrderBook service responsible for managing order books and processing orders
 */
export class OrderBookService {
  private orderBooks: Map<TradingPair, OrderBook> = new Map();
  private matchingEngine: MatchingEngine;
  private trades: Trade[] = [];

  constructor() {
    this.matchingEngine = new MatchingEngine();
    logger.info("OrderBookService initialized");
  }

  /**
   * Process a raw order from input
   * @param rawOrder - The raw order to process
   */
  public processRawOrder(rawOrder: RawOrder): void {
    try {
      // Validate the order
      validateOrder(rawOrder);

      // Convert to Order with decimal values
      const order = createOrder(rawOrder);

      // Process the order
      this.processOrder(order);
    } catch (error) {
      if (error instanceof ValidationError) {
        logger.warn("Invalid order", { error, orderId: rawOrder.order_id });
        throw error;
      }

      logger.error(
        "Error processing order",
        error instanceof Error ? error : new Error(String(error)),
        {
          orderId: rawOrder.order_id,
        }
      );
      throw new OrderProcessingError(
        `Failed to process order ${rawOrder.order_id}`,
        {
          originalError: error,
        }
      );
    }
  }

  /**
   * Process a batch of raw orders
   * @param rawOrders - Array of raw orders to process
   */
  public processRawOrders(rawOrders: RawOrder[]): void {
    logger.info(`Processing ${rawOrders.length} orders`);

    for (const rawOrder of rawOrders) {
      this.processRawOrder(rawOrder);
    }

    logger.info(
      `Completed processing ${rawOrders.length} orders, resulting in ${this.trades.length} trades`
    );
  }

  /**
   * Process a single order
   * @param order - The order to process
   */
  private processOrder(order: Order): void {
    logger.debug("Processing order", {
      orderId: order.order_id,
      type: order.type_op,
      side: order.side,
      price: order.limit_price.toString(),
      amount: order.amount.toString(),
    });

    // Create order book for this pair if it doesn't exist
    if (!this.orderBooks.has(order.pair)) {
      this.orderBooks.set(order.pair, createOrderBook(order.pair));
      logger.debug(`Created new order book for pair ${order.pair}`);
    }

    const orderBook = this.orderBooks.get(order.pair)!;

    if (order.type_op === "CREATE") {
      this.handleCreateOrder(order, orderBook);
    } else if (order.type_op === "DELETE") {
      this.handleDeleteOrder(order, orderBook);
    }
  }

  /**
   * Handle CREATE order operation
   * @param order - The order to create
   * @param orderBook - The order book for this trading pair
   */
  private handleCreateOrder(order: Order, orderBook: OrderBook): void {
    logger.debug("Handling CREATE order", { orderId: order.order_id });

    // Try to match the order first
    const newTrades = this.matchingEngine.matchOrder(order, orderBook);

    // Add the trades to our trade list
    this.trades.push(...newTrades);

    // If order still has remaining amount, add to the order book
    if (order.amount.gt(DecimalValue.ZERO)) {
      this.matchingEngine.addToOrderBook(order, orderBook);
    }

    // Log the result
    if (newTrades.length > 0) {
      logger.info(
        `Order ${order.order_id} matched with ${newTrades.length} trades`,
        {
          remainingAmount: order.amount.toString(),
        }
      );
    } else {
      logger.info(`Order ${order.order_id} added to order book, no matches`);
    }
  }

  /**
   * Handle DELETE order operation
   * @param order - The order to delete
   * @param orderBook - The order book for this trading pair
   */
  private handleDeleteOrder(order: Order, orderBook: OrderBook): void {
    logger.debug("Handling DELETE order", { orderId: order.order_id });

    const removed = this.matchingEngine.removeFromOrderBook(order, orderBook);

    if (removed) {
      logger.info(`Order ${order.order_id} successfully deleted`);
    } else {
      logger.warn(
        `Failed to delete order ${order.order_id}, not found in order book`
      );
    }
  }

  /**
   * Get all order books
   * @returns Map of trading pairs to order books
   */
  public getOrderBooks(): Map<TradingPair, OrderBook> {
    return this.orderBooks;
  }

  /**
   * Get all trades
   * @returns Array of executed trades
   */
  public getTrades(): Trade[] {
    return this.trades;
  }

  /**
   * Get serialized order books for output
   * @returns Record of trading pairs to serialized order books
   */
  public getSerializedOrderBooks(): Record<string, any> {
    const result: Record<string, any> = {};

    this.orderBooks.forEach((orderBook) => {
      const serialized = serializeOrderBook(orderBook);
      Object.assign(result, serialized);
    });

    return result;
  }

  /**
   * Get serialized trades for output
   * @returns Array of serialized trades
   */
  public getSerializedTrades(): Record<string, any>[] {
    return this.trades.map(serializeTrade);
  }

  /**
   * Get market statistics for all trading pairs
   * @returns Record of trading pairs to market statistics
   */
  public getMarketStatistics(): Record<string, any> {
    const result: Record<string, any> = {};

    this.orderBooks.forEach((orderBook, pair) => {
      const bestBid = this.matchingEngine.getBestBidPrice(orderBook);
      const bestAsk = this.matchingEngine.getBestAskPrice(orderBook);
      const spread = this.matchingEngine.getSpread(orderBook);

      result[pair] = {
        bestBid: bestBid ? bestBid.toString() : null,
        bestAsk: bestAsk ? bestAsk.toString() : null,
        spread: spread ? spread.toString() : null,
        bidCount: orderBook.bids.prices.reduce((count, price) => {
          const priceLevel = orderBook.bids.priceLevels.get(price.toString());
          return count + (priceLevel ? priceLevel.orders.length : 0);
        }, 0),
        askCount: orderBook.asks.prices.reduce((count, price) => {
          const priceLevel = orderBook.asks.priceLevels.get(price.toString());
          return count + (priceLevel ? priceLevel.orders.length : 0);
        }, 0),
      };
    });

    return result;
  }
}
