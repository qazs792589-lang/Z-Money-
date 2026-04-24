import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const DATA_FILE = path.join(process.cwd(), "stock_prices.json");

  // Initial prices placeholder
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ updated: null, prices: {} }));
  }

  // Fetch from TWSE
  async function refreshPrices() {
    console.log("Refreshing stock prices from TWSE...");
    try {
      const response = await fetch("https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL");
      if (!response.ok) throw new Error("Failed to fetch from TWSE");
      const data = await response.json();
      
      const newPrices: Record<string, number> = {};
      data.forEach((item: any) => {
        // ClosingPrice is index 10 or 7 depending on the API version, usually "ClosingPrice" field in JSON
        const price = parseFloat(item.ClosingPrice);
        if (!isNaN(price)) {
          newPrices[item.Code] = price;
        }
      });

      fs.writeFileSync(DATA_FILE, JSON.stringify({ 
        updated: new Date().toISOString(), 
        prices: newPrices 
      }));
      console.log("Successfully updated prices for", Object.keys(newPrices).length, "stocks.");
    } catch (error) {
      console.error("Error refreshing prices:", error);
    }
  }

  // API Routes
  app.get("/api/prices", (req, res) => {
    if (fs.existsSync(DATA_FILE)) {
      res.json(JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")));
    } else {
      res.json({ updated: null, prices: {} });
    }
  });

  app.post("/api/refresh", async (req, res) => {
    await refreshPrices();
    res.json({ success: true });
  });

  app.get("/api/chart/:ticker", async (req, res) => {
    try {
      const ticker = req.params.ticker;
      const symbol = /^\d+$/.test(ticker) ? `${ticker}.TW` : ticker;
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=5y&interval=1d`;
      
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
      });
      
      if (!response.ok) throw new Error("Yahoo Finance fetch failed");
      const data = await response.json();
      
      if (!data.chart.result || data.chart.result.length === 0) {
        return res.json([]);
      }
      
      const result = data.chart.result[0];
      const timestamps = result.timestamp || [];
      const closePrices = result.indicators?.quote?.[0]?.close || [];
      
      const chartData = timestamps.map((ts: number, i: number) => {
        const date = new Date(ts * 1000);
        return {
          date: `${date.getMonth() + 1}/${date.getDate()}`,
          timestamp: ts * 1000,
          price: closePrices[i] ? Number(closePrices[i].toFixed(2)) : null
        };
      }).filter((item: any) => item.price !== null);
      
      res.json(chartData);
    } catch (error) {
      console.error("Error fetching historical data:", error);
      res.status(500).json({ error: "Failed to fetch chart data" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    // Initial fetch if empty
    const currentData = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    if (!currentData.updated) {
      refreshPrices();
    }

    // Background timer to check for 2 PM refresh
    setInterval(() => {
      const now = new Date();
      // Taiwan time (UTC+8)
      const twTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Taipei" }));
      if (twTime.getHours() === 14 && twTime.getMinutes() === 0) {
        refreshPrices();
      }
    }, 60000); // Check every minute
  });
}

startServer();
