import Decimal from "decimal.js";
import { DecimalValue } from "../utils/decimal";
import { TradingPair, OrderSide, createOrder } from "./order";

export interface OrderBookEntry {
  order_id: string;
  account_id: string;
  amount: DecimalValue;
  limit_price: DecimalValue;
  timestamp: number;
}

export interface SerializedOrderBookEntry {
  order_id: string;
  account_id: string;
  amount: string;
  limit_price: string;
  timestamp: number;
}

export interface PriceLevel {
  price: DecimalValue;
  orders: OrderBookEntry[];
  totalVolume: DecimalValue;
}

export interface OrderBookSide {
  priceLevels: Map<String, PriceLevel>;
  prices: DecimalValue[];
}

export interface OrderBook {
  pair: TradingPair;
  bids: OrderBookSide;
  asks: OrderBookSide;
}

export function createOrderBookSide(): OrderBookSide {
  return {
    priceLevels: new Map<string, PriceLevel>(),
    prices: [],
  };
}

export function createOrderBook(pair: TradingPair): OrderBook {
  return {
    pair,
    bids: createOrderBookSide(),
    asks: createOrderBookSide(),
  };
}

export function getOrderBookSide(
  orderBook: OrderBook,
  side: OrderSide
): OrderBookSide {
  return side === "BUY" ? orderBook.bids : orderBook.asks;
}

export function serializeOrderBookEntry(
  entry: OrderBookEntry
): SerializedOrderBookEntry {
  return {
    order_id: entry.order_id,
    account_id: entry.account_id,
    amount: entry.amount.toString(),
    limit_price: entry.limit_price.toString(),
    timestamp: entry.timestamp,
  };
}

//Serializes an OrderBook to a format suitable for JSON output

export function serializeOrderBook(
  orderBook: OrderBook
): Record<
  string,
  { bids: SerializedOrderBookEntry[]; asks: SerializedOrderBookEntry[] }
> {
  const serializedBids: SerializedOrderBookEntry[] = [];
  const serializedAsks: SerializedOrderBookEntry[] = [];

  // Extract and serialize all bid orders
  orderBook.bids.prices.forEach((price) => {
    const priceLevel = orderBook.bids.priceLevels.get(price.toString());
    if (priceLevel) {
      priceLevel.orders.forEach((order) => {
        serializedBids.push(serializeOrderBookEntry(order));
      });
    }
  });

  // Extract and serialize all ask orders
  orderBook.asks.prices.forEach((price) => {
    const priceLevel = orderBook.asks.priceLevels.get(price.toString());
    if (priceLevel) {
      priceLevel.orders.forEach((order) => {
        serializedAsks.push(serializeOrderBookEntry(order));
      });
    }
  });

  return {
    [orderBook.pair]: {
      bids: serializedBids,
      asks: serializedAsks,
    },
  };
}
