// src/index.ts

import * as fs from "fs";
import * as path from "path";
import { RawOrder } from "./models/order";
import { OrderBookService } from "./services/orderBookService";
import { createLogger } from "./utils/logger";
import { asyncErrorHandler, FileIOError } from "./utils/error";
import config from "./config/config";

const logger = createLogger("App");

/**
 * Read orders from input file
 * @param filePath - Path to the input file
 * @returns Array of raw orders
 */
async function readOrdersFromFile(filePath: string): Promise<RawOrder[]> {
  try {
    logger.info(`Reading orders from ${filePath}`);
    const data = await fs.promises.readFile(filePath, "utf8");
    const orders: RawOrder[] = JSON.parse(data);
    logger.info(`Successfully read ${orders.length} orders from ${filePath}`);
    return orders;
  } catch (error) {
    logger.error(
      "Failed to read orders from file",
      error instanceof Error ? error : new Error(String(error)),
      {
        filePath,
      }
    );
    throw new FileIOError(`Failed to read orders from ${filePath}`, {
      originalError: error,
    });
  }
}

/**
 * Write data to output file
 * @param filePath - Path to the output file
 * @param data - Data to write
 */
async function writeToFile(filePath: string, data: any): Promise<void> {
  try {
    logger.info(`Writing data to ${filePath}`);
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
    logger.info(`Successfully wrote data to ${filePath}`);
  } catch (error) {
    logger.error(
      "Failed to write to file",
      error instanceof Error ? error : new Error(String(error)),
      {
        filePath,
      }
    );
    throw new FileIOError(`Failed to write to ${filePath}`, {
      originalError: error,
    });
  }
}

/**
 * Main function to run the trading engine
 */
const main = asyncErrorHandler(async (): Promise<void> => {
  logger.info("Starting trading engine");

  // Resolve file paths
  const inputFilePath = path.resolve(config.files.inputOrdersPath);
  const orderBookOutputPath = path.resolve(config.files.outputOrderBookPath);
  const tradesOutputPath = path.resolve(config.files.outputTradesPath);

  // Create directories if they don't exist
  const orderBookDir = path.dirname(orderBookOutputPath);
  const tradesDir = path.dirname(tradesOutputPath);

  await fs.promises.mkdir(orderBookDir, { recursive: true });
  await fs.promises.mkdir(tradesDir, { recursive: true });

  // Read orders from input file
  const orders = await readOrdersFromFile(inputFilePath);

  // Create order book service and process orders
  const orderBookService = new OrderBookService();
  orderBookService.processRawOrders(orders);

  // Get results
  const orderBooks = orderBookService.getSerializedOrderBooks();
  const trades = orderBookService.getSerializedTrades();

  // Get market statistics for logging
  const marketStats = orderBookService.getMarketStatistics();
  logger.info("Market statistics", { marketStats });

  // Write results to output files
  await writeToFile(orderBookOutputPath, orderBooks);
  await writeToFile(tradesOutputPath, trades);

  logger.info("Trading engine completed successfully", {
    processedOrders: orders.length,
    executedTrades: trades.length,
  });
});

// Run the application
if (require.main === module) {
  main().catch((error) => {
    logger.error("Fatal error in trading engine", error);
    process.exit(1);
  });
}

export { main, readOrdersFromFile, writeToFile };
