import * as fs from "fs";
import * as path from "path";
import { OrderBookService } from "../../src/services/orderBookService";
import { RawOrder } from "../../src/models/order";
import { asyncErrorHandler } from "../../src/utils/error";

describe("Order Processing Integration Tests", () => {
  // Setting Temporary Test Files
  const testDir = path.resolve(__dirname, "../../test-data");
  const inputFile = path.resolve(testDir, "test-orders.json");
  const outputOrderBookFile = path.resolve(testDir, "test-orderbook.json");
  const outputTradesFile = path.resolve(testDir, "test-trades.json");

  beforeAll(async () => {
    // Creating test directory if it doesn't exist
    if (!fs.existsSync(testDir)) {
      await fs.promises.mkdir(testDir, { recursive: true });
    }
  });

  afterAll(async () => {
    // Cleaning up test files
    if (fs.existsSync(inputFile)) {
      await fs.promises.unlink(inputFile);
    }
    if (fs.existsSync(outputOrderBookFile)) {
      await fs.promises.unlink(outputOrderBookFile);
    }
    if (fs.existsSync(outputTradesFile)) {
      await fs.promises.unlink(outputTradesFile);
    }

    // Removing test directory if empty
    try {
      await fs.promises.rmdir(testDir);
    } catch (error) {}
  });

  test("should process orders and generate output files", async () => {
    //Using whole numbers here for easier interpretation
    const testOrders: RawOrder[] = [
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
        amount: "5",
        order_id: "2",
        pair: "BTC/USDC",
        limit_price: "50000",
        side: "SELL",
      },
      {
        type_op: "CREATE",
        account_id: "3",
        amount: "10",
        order_id: "3",
        pair: "BTC/USDC",
        limit_price: "49000",
        side: "BUY",
      },
      {
        type_op: "DELETE",
        account_id: "3",
        amount: "10",
        order_id: "3",
        pair: "BTC/USDC",
        limit_price: "49000",
        side: "BUY",
      },
    ];

    //Test Order Input File
    await fs.promises.writeFile(inputFile, JSON.stringify(testOrders, null, 2));

    // Creating OrderBookService and process orders
    const orderBookService = new OrderBookService();

    // Reading and processing orders
    const orderData = await fs.promises.readFile(inputFile, "utf8");
    const orders: RawOrder[] = JSON.parse(orderData);
    orderBookService.processRawOrders(orders);

    // Results
    const orderBooks = orderBookService.getSerializedOrderBooks();
    const trades = orderBookService.getSerializedTrades();

    // Writing results to output files
    await fs.promises.writeFile(
      outputOrderBookFile,
      JSON.stringify(orderBooks, null, 2)
    );
    await fs.promises.writeFile(
      outputTradesFile,
      JSON.stringify(trades, null, 2)
    );

    // Verifing that output files exist
    expect(fs.existsSync(outputOrderBookFile)).toBe(true);
    expect(fs.existsSync(outputTradesFile)).toBe(true);

    // Reading and verifing output files
    const orderBookData = await fs.promises.readFile(
      outputOrderBookFile,
      "utf8"
    );
    const tradesData = await fs.promises.readFile(outputTradesFile, "utf8");

    const outputOrderBook = JSON.parse(orderBookData);
    const outputTrades = JSON.parse(tradesData);

    // Verifying order book content
    expect(outputOrderBook["BTC/USDC"]).toBeDefined();
    expect(outputOrderBook["BTC/USDC"].bids).toBeInstanceOf(Array);
    expect(outputOrderBook["BTC/USDC"].asks).toBeInstanceOf(Array);

    // Verifying bids remaining - should have one bid with 5 units left
    expect(outputOrderBook["BTC/USDC"].bids.length).toBe(1);
    expect(outputOrderBook["BTC/USDC"].bids[0].amount).toBe("5");

    // Verifying trades content - should have one trade of 5 units
    expect(outputTrades).toBeInstanceOf(Array);
    expect(outputTrades.length).toBe(1);
    expect(outputTrades[0].amount).toBe("5");
    expect(outputTrades[0].price).toBe("50000");
    expect(outputTrades[0].maker_order_id).toBe("1");
    expect(outputTrades[0].taker_order_id).toBe("2");
  });

  test(
    "should handle the sample orders from the assignment",
    asyncErrorHandler(async () => {
      //Defining second dataset to handle tasks specific to assignment
      const sampleOrders: RawOrder[] = [
        {
          type_op: "CREATE",
          account_id: "1",
          amount: "230",
          order_id: "1",
          pair: "BTC/USDC",
          limit_price: "63500",
          side: "SELL",
        },
        {
          type_op: "CREATE",
          account_id: "2",
          amount: "230",
          order_id: "2",
          pair: "BTC/USDC",
          limit_price: "63500",
          side: "BUY",
        },
        {
          type_op: "CREATE",
          account_id: "1",
          amount: "798",
          order_id: "3",
          pair: "BTC/USDC",
          limit_price: "62881",
          side: "BUY",
        },
        {
          type_op: "CREATE",
          account_id: "2",
          amount: "798",
          order_id: "4",
          pair: "BTC/USDC",
          limit_price: "62881",
          side: "SELL",
        },
      ];

      // Writing sample orders to input file
      await fs.promises.writeFile(
        inputFile,
        JSON.stringify(sampleOrders, null, 2)
      );

      // Creating OrderBookService and process orders
      const orderBookService = new OrderBookService();

      // Reading and processing orders
      const orderData = await fs.promises.readFile(inputFile, "utf8");
      const orders: RawOrder[] = JSON.parse(orderData);
      orderBookService.processRawOrders(orders);

      // Results
      const orderBooks = orderBookService.getSerializedOrderBooks();
      const trades = orderBookService.getSerializedTrades();

      // Writing results to output files
      await fs.promises.writeFile(
        outputOrderBookFile,
        JSON.stringify(orderBooks, null, 2)
      );
      await fs.promises.writeFile(
        outputTradesFile,
        JSON.stringify(trades, null, 2)
      );

      // Simply check that we have any trades at all
      expect(trades.length).toBeGreaterThan(0);
    })
  );
});
