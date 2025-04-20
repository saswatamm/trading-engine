import { DecimalValue } from "../utils/decimal";

export type OrderSide = "BUY" | "SELL";

export type OrderType = "CREATE" | "DELETE";

export type TradingPair = string;

export interface RawOrder {
  type_op: OrderType;
  account_id: string;
  amount: string;
  order_id: string;
  pair: TradingPair;
  limit_price: string;
  side: OrderSide;
}

export interface Order {
  type_op: OrderType;
  account_id: string;
  amount: DecimalValue;
  order_id: string;
  pair: TradingPair;
  limit_price: DecimalValue;
  side: OrderSide;
  timestamp: number;
}

export function createOrder(
  rawOrder: RawOrder,
  timestamp: number = Date.now()
): Order {
  return {
    ...rawOrder,
    amount: new DecimalValue(rawOrder.amount),
    limit_price: new DecimalValue(rawOrder.limit_price),
    timestamp,
  };
}

export function serializeOrder(order: Order): RawOrder {
  return {
    ...order,
    amount: order.amount.toString(),
    limit_price: order.limit_price.toString(),
  };
}
