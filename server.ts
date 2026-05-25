import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Add body parser middleware
  app.use(express.json());

  // API Route for Invite Code Activation
  app.post("/api/code/activate", async (req, res) => {
    const { code } = req.body;
    
    // Simulate server-side validation delay
    await new Promise(r => setTimeout(r, 1000));
    
    // Example codes that are valid
    const validCodes = ['BLIK24', 'VIP123', 'TESTER', 'SDFKPP', 'SFDKPP'];
    
    if (validCodes.includes(code.toUpperCase())) {
      res.json({ success: true, message: 'Код успішно активовано!' });
    } else {
      res.status(400).json({ success: false, message: 'Invalid invite code!' });
    }
  });

  // API Route for BLIK payments
  app.post("/api/payment/blik", async (req, res) => {
    const { method, identifier } = req.body;
    console.log(`Processing BLIK Payment via ${method} with identifier: ${identifier}`);

    try {
      if (!process.env.PPRO_API_KEY) {
        throw new Error("PPRO_API_KEY_MISSING");
      }

      const pproPayload = {
        paymentMethod: "BLIK",
        amount: {
          value: 1000,
          currency: "PLN"
        },
        consumer: {
          name: "Test User",
          country: "PL",
          client: {
            ip: req.ip || "11.22.22.33",
            userAgent: req.headers["user-agent"] || "Mozilla/5.0"
          }
        },
        authenticationSettings: [
          {
            type: "MULTI_FACTOR",
            settings: {
              verificationCode: identifier // This assumes identifier is BLIK code
            }
          }
        ]
      };

      const pproResponse = await fetch('https://api-sandbox.ppro.com/v1/payment-charges', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.PPRO_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pproPayload)
      });

      const data = await pproResponse.json();

      if (pproResponse.ok) {
        // Here we could implement webhook listening or polling for completion,
        // For now we will return success to the client based on the charge creation
        return res.json({ success: true, transactionId: data.id });
      } else {
        console.error("PPRO Error:", data);
        return res.status(400).json({ success: false, message: data.failureMessage || 'Невірні дані платежу' });
      }
    } catch (error: any) {
      if (error.message === "PPRO_API_KEY_MISSING") {
        console.warn("PPRO_API_KEY is not configured, falling back to mock mode.");
        
        // Simulating transaction processing time
        await new Promise(r => setTimeout(r, 3000));
        
        if (method === 'code' && identifier.length === 6) {
          if (identifier === '000000') {
              return res.status(400).json({ success: false, message: 'Цей код відхилено банком.' });
          }
          return res.json({ success: true, transactionId: 'txn_' + Math.random().toString(36).substring(7) });
        } else if (method === 'phone' && identifier.length >= 9) {
          return res.json({ success: true, transactionId: 'txn_' + Math.random().toString(36).substring(7) });
        }
        return res.status(400).json({ success: false, message: 'Невірні дані платежу' });
      }
      
      console.error(error);
      return res.status(500).json({ success: false, message: "Помилка сервера" });
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
    // Production static files
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
