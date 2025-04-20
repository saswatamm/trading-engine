import { RawOrder } from "../models/order";
import { ValidationError } from "../utils/error";
import { createLogger } from "../utils/logger";

const logger = createLogger("OrderValidator");

export function validateOrder(order: RawOrder): void {
  const requiredFields = [
    "type_op",
    "account_id",
    "amount",
    "order_id",
    "pair",
    "limit_price",
    "side",
  ];

  const missingFields = requiredFields.filter(
    (field) => !order[field as keyof RawOrder]
  );

  if (missingFields.length > 0) {
    throw new ValidationError(
      `Order is missing required fields: ${missingFields.join(", ")}`,
      { order }
    );
  }

  // Validate side
  if (order.side !== "BUY" && order.side !== "SELL") {
    throw new ValidationError(`Invalid order side: ${order.side}`, { order });
  }

  // Validate amount is a positive number
  const amount = parseFloat(order.amount);
  if (isNaN(amount) || amount <= 0) {
    throw new ValidationError(`Invalid order amount: ${order.amount}`, {
      order,
    });
  }

  // Validate price is a positive number
  const price = parseFloat(order.limit_price);
  if (isNaN(price) || price <= 0) {
    throw new ValidationError(`Invalid order price: ${order.limit_price}`, {
      order,
    });
  }

  // Validating pair format (in this case : 'BTC/USDC')
  if (!order.pair.includes("/")) {
    throw new ValidationError(`Invalid trading pair format: ${order.pair}`, {
      order,
    });
  }
  logger.debug("Validated order successfully", { orderId: order.order_id });
}

export function validateOrders(orders: RawOrder[]): void {
  logger.info(`Validating ${orders.length} orders`);

  for (const order of orders) {
    validateOrder(order);
  }

  logger.info(`All ${orders.length} orders validated successfully`);
}
