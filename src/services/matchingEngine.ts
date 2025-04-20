import { Order, OrderSide } from "../models/order";
import { OrderBook, OrderBookEntry, PriceLevel } from "../models/orderbook";
import { Trade } from "../models/trade";
import { DecimalValue } from "../utils/decimal";
import { createLogger } from "../utils/logger";
import { MatchingEngineError } from "../utils/error";
import { match } from "assert";

const logger = createLogger("Matching Engine");

export class MatchingEngine {
  private nextTradeId = 1;

  public matchOrder(order: Order, orderBook: OrderBook): Trade[] {
    logger.debug("Attempting to match order", {
      orderId: order.order_id,
      side: order.side,
      price: order.limit_price.toString(),
      amount: order.amount.toString(),
    });

    const oppositeSide = order.side === "BUY" ? orderBook.asks : orderBook.bids;

    if (oppositeSide.prices.length === 0) {
      logger.debug("No orders on opposite side to match against");
      return [];
    }

    const remainingOrder = { ...order };

    const trades: Trade[] = [];

    const pricesToMatch = [...oppositeSide.prices];

    while (
      remainingOrder.amount.gt(DecimalValue.ZERO) &&
      pricesToMatch.length > 0
    ) {
      const currentPrice = pricesToMatch[0];

      const priceIsCompatible =
        (order.side === "BUY" && order.limit_price.gte(currentPrice)) ||
        (order.side === "SELL" && order.limit_price.lte(currentPrice));

      if (!priceIsCompatible) {
        break;
      }

      const priceLevel = oppositeSide.priceLevels.get(currentPrice.toString());

      if (!priceLevel || priceLevel.orders.length === 0) {
        pricesToMatch.shift();
        continue;
      }

      const newTrades = this.matchAtPriceLevel(
        remainingOrder,
        priceLevel,
        orderBook.pair
      );
      trades.push(...newTrades);

      if (priceLevel.orders.length === 0) {
        oppositeSide.priceLevels.delete(currentPrice.toString());
        pricesToMatch.shift();
      }
    }

    logger.debug(`Matched order with ${trades.length} trades`, {
      orderId: order.order_id,
      remainingAmount: remainingOrder.amount.toString(),
    });

    return trades;
  }

  private matchAtPriceLevel(
    order: Order,
    priceLevel: PriceLevel,
    pair: string
  ): Trade[] {
    const trades: Trade[] = [];

    while (order.amount.gt(DecimalValue.ZERO) && priceLevel.orders.length > 0) {
      const matchOrder = priceLevel.orders[0];

      const matchAmount = DecimalValue.min(order.amount, matchOrder.amount);

      order.amount = order.amount.minus(matchAmount);
      matchOrder.amount = matchOrder.amount.minus(matchAmount);

      priceLevel.totalVolume = priceLevel.totalVolume.minus(matchAmount);

      const trade: Trade = {
        trade_id: (this.nextTradeId++).toString(),
        pair,
        maker_order_id: matchOrder.order_id,
        taker_order_id: order.order_id,
        maker_account_id: matchOrder.account_id,
        taker_account_id: order.account_id,
        amount: matchAmount,
        price: priceLevel.price,
        timestamp: Date.now(),
      };

      trades.push(trade);

      if (
        matchOrder.amount.isZero() ||
        matchOrder.amount.lt(DecimalValue.ZERO)
      ) {
        priceLevel.orders.shift();
      }
    }
    return trades;
  }

  public addToOrderBook(order: Order, orderBook: OrderBook): void {
    const side = order.side === "BUY" ? orderBook.bids : orderBook.asks;
    const priceStr = order.limit_price.toString();

    if (!side.priceLevels.has(priceStr)) {
      side.priceLevels.set(priceStr, {
        price: order.limit_price,
        orders: [],
        totalVolume: DecimalValue.ZERO,
      });

      side.prices.push(order.limit_price);

      if (order.side === "BUY") {
        side.prices.sort((a, b) => b.getValue().comparedTo(a.getValue()));
      } else {
        side.prices.sort((a, b) => a.getValue().comparedTo(b.getValue()));
      }
    }

    const priceLevel = side.priceLevels.get(priceStr)!;

    const entry: OrderBookEntry = {
      order_id: order.order_id,
      account_id: order.account_id,
      amount: order.amount,
      limit_price: order.limit_price,
      timestamp: order.timestamp,
    };

    priceLevel.orders.push(entry);

    priceLevel.totalVolume = priceLevel.totalVolume.plus(order.amount);

    logger.debug("Added order to order book", {
      orderId: order.order_id,
      side: order.side,
      price: order.limit_price.toString(),
      amount: order.amount.toString(),
    });
  }

  public removeFromOrderBook(order: Order, orderBook: OrderBook): boolean {
    const side = order.side === "BUY" ? orderBook.bids : orderBook.asks;
    const priceStr = order.limit_price.toString();

    if (!side.priceLevels.has(priceStr)) {
      logger.debug("Price level not found for order removal", {
        orderId: order.order_id,
        price: order.limit_price.toString(),
      });
      return false;
    }

    const priceLevel = side.priceLevels.get(priceStr)!;

    const orderIndex = priceLevel.orders.findIndex(
      (o) => o.order_id === order.order_id
    );

    if (orderIndex === -1) {
      logger.debug("Order not found for removal", {
        orderId: order.order_id,
      });
      return false;
    }

    const orderToRemove = priceLevel.orders[orderIndex];

    priceLevel.orders.splice(orderIndex, 1);

    priceLevel.totalVolume = priceLevel.totalVolume.minus(orderToRemove.amount);

    if (priceLevel.orders.length === 0) {
      side.priceLevels.delete(priceStr);

      const priceIndex = side.prices.findIndex(
        (p) => p.toString() === priceStr
      );
      if (priceIndex !== -1) {
        side.prices.splice(priceIndex, 1);
      }
    }

    logger.debug("Removed order from order book", { orderId: order.order_id });
    return true;
  }

  public getBestBidPrice(orderBook: OrderBook): DecimalValue | null {
    return orderBook.bids.prices.length > 0 ? orderBook.bids.prices[0] : null;
  }

  public getBestAskPrice(orderBook: OrderBook): DecimalValue | null {
    return orderBook.asks.prices.length > 0 ? orderBook.asks.prices[0] : null;
  }

  public getSpread(orderBook: OrderBook): DecimalValue | null {
    const bestBid = this.getBestBidPrice(orderBook);
    const bestAsk = this.getBestAskPrice(orderBook);

    if (!bestBid || !bestAsk) {
      return null;
    }

    return bestAsk.minus(bestBid);
  }
}
