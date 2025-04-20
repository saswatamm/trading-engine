import { DecimalValue } from "../utils/decimal";
import { TradingPair } from "./order";

export interface Trade {
  trade_id: string;
  pair: TradingPair;
  maker_order_id: string;
  taker_order_id: string;
  maker_account_id: string;
  taker_account_id: string;
  amount: DecimalValue;
  price: DecimalValue;
  timestamp: number;
}

export interface SerializedTrade {
  trade_id: string;
  pair: TradingPair;
  maker_order_id: string;
  taker_order_id: string;
  maker_account_id: string;
  taker_account_id: string;
  amount: string;
  price: string;
  timestamp: number;
}

export function serializeTrade(trade: Trade): SerializedTrade {
  return {
    ...trade,
    amount: trade.amount.toString(),
    price: trade.price.toString(),
  };
}
