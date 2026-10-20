import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { MongoClient, Db } from 'mongodb';
import { 
  INITIAL_PRODUCTS, 
  INITIAL_CUSTOMERS, 
  INITIAL_ORDERS, 
  INITIAL_SYNC_RECORDS,
  INITIAL_PRICING_TIERS,
  INITIAL_PAYMENT_TERMS,
  INITIAL_USERS
} from './src/data/initialData.ts';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3000', 10);
const MONGO_CONFIG_PATH = path.join(process.cwd(), '.mongo_connection.json');

function getStoredMongoConfig(): { uri: string; dbName: string } {
  try {
    if (fs.existsSync(MONGO_CONFIG_PATH)) {
      const content = fs.readFileSync(MONGO_CONFIG_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      return {
        uri: parsed.uri || '',
        dbName: parsed.dbName || process.env.MONGODB_DB_NAME || 'na_distributors_erp',
      };
    }
  } catch (err) {
    // ignore read error
  }
  return {
    uri: process.env.MONGODB_URI || '',
    dbName: process.env.MONGODB_DB_NAME || 'na_distributors_erp',
  };
}

function saveStoredMongoConfig(uri: string, dbName: string) {
  try {
    fs.writeFileSync(MONGO_CONFIG_PATH, JSON.stringify({ uri, dbName }, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not persist MongoDB config file:', err);
  }
}

const initialMongoConfig = getStoredMongoConfig();
let currentMongoUri = process.env.MONGODB_URI || initialMongoConfig.uri || '';
let currentMongoDbName = process.env.MONGODB_DB_NAME || initialMongoConfig.dbName || 'na_distributors_erp';

// In-Memory fallback store when MongoDB URI is not provided or connecting
interface DataStore {
  products: any[];
  customers: any[];
  orders: any[];
  users: any[];
  notifications: any[];
  syncRecords: any[];
  pricingTiers: any[];
  paymentTerms: any[];
  adminDeletePassword: string;
}

const store: DataStore = {
  products: [...INITIAL_PRODUCTS],
  customers: [...INITIAL_CUSTOMERS],
  orders: [...INITIAL_ORDERS],
  users: [...INITIAL_USERS],
  pricingTiers: [...INITIAL_PRICING_TIERS],
  paymentTerms: [...INITIAL_PAYMENT_TERMS],
  adminDeletePassword: 'Vista',
  notifications: [
    {
      id: 'notif-welcome',
      type: 'order_status',
      title: 'NA Distributors ERP Loaded',
      message: 'System loaded with 15 pristine spice packet products from Vista Essentials Food Pvt Ltd. Ready for order processing and customer network additions.',
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      read: false,
      actionRequired: false,
    },
  ],
  syncRecords: [...INITIAL_SYNC_RECORDS],
};

let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;
let isMongoConnected = false;

// Helper to sanitize documents before MongoDB upserts to prevent "immutable field '_id'" error
function sanitizeForMongo<T extends Record<string, any>>(doc: T): Record<string, any> {
  if (!doc || typeof doc !== 'object') return doc;
  const clean = { ...doc };
  delete clean._id;
  return clean;
}

// Attempt MongoDB Connection
async function initMongoDB(uri = currentMongoUri, dbName = currentMongoDbName) {
  if (!uri) {
    console.log('ℹ️ No active MONGODB_URI configured. Running with in-memory persistent store.');
    isMongoConnected = false;
    return false;
  }

  try {
    console.log(`🔌 Attempting connection to MongoDB (${dbName})...`);
    mongoClient = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    await mongoClient.connect();
    mongoDb = mongoClient.db(dbName);
    isMongoConnected = true;
    currentMongoUri = uri;
    currentMongoDbName = dbName;
    console.log('✅ Connected successfully to MongoDB Database:', dbName);

    // Seed database if empty
    const productCount = await mongoDb.collection('products').countDocuments();
    if (productCount === 0) {
      console.log('🌱 Seeding MongoDB collections with initial spice catalog...');
      await mongoDb.collection('products').insertMany(INITIAL_PRODUCTS.map(sanitizeForMongo));
      await mongoDb.collection('customers').insertMany(INITIAL_CUSTOMERS.map(sanitizeForMongo));
      await mongoDb.collection('orders').insertMany(INITIAL_ORDERS.map(sanitizeForMongo));
      await mongoDb.collection('sync_records').insertMany(INITIAL_SYNC_RECORDS.map(sanitizeForMongo));
      console.log('🌱 MongoDB collections successfully seeded.');
    }

    return true;
  } catch (error: any) {
    console.warn('⚠️ Could not connect to MongoDB:', error.message);
    isMongoConnected = false;
    return false;
  }
}

async function startServer() {
  await initMongoDB();

  const app = express();
  app.use(express.json());

  // CORS middleware for mobile APK, Capacitor Android & Cross-Device Access
  app.use((req: Request, res: Response, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // -------------------------------------------------------------
  // REST API Routes
  // -------------------------------------------------------------

  // Health & MongoDB Status
  app.get('/api/health', async (req: Request, res: Response) => {
    let mongoStats = null;
    if (isMongoConnected && mongoDb) {
      try {
        const collections = await mongoDb.listCollections().toArray();
        const pCount = await mongoDb.collection('products').countDocuments();
        const cCount = await mongoDb.collection('customers').countDocuments();
        const oCount = await mongoDb.collection('orders').countDocuments();
        mongoStats = {
          collections: collections.map((c) => c.name),
          counts: { products: pCount, customers: cCount, orders: oCount },
        };
      } catch (err: any) {
        mongoStats = { error: err.message };
      }
    }

    res.json({
      status: 'online',
      server: 'Express (Node.js)',
      database: isMongoConnected ? 'MongoDB Atlas (Connected)' : 'In-Memory Store (Active)',
      isMongoConnected,
      isMongoUriConfigured: Boolean(currentMongoUri),
      dbName: currentMongoDbName,
      mongoStats,
      timestamp: new Date().toISOString(),
    });
  });

  // Test MongoDB Connection
  app.post('/api/mongodb/test-connection', async (req: Request, res: Response) => {
    const { uri, dbName } = req.body;
    const targetUri = uri || currentMongoUri;
    const targetDb = dbName || currentMongoDbName;

    if (!targetUri) {
      return res.status(400).json({
        success: false,
        message: 'No MongoDB URI provided. Provide a MongoDB Atlas connection string (e.g. mongodb+srv://...).',
      });
    }

    try {
      const testClient = new MongoClient(targetUri, { serverSelectionTimeoutMS: 5000 });
      await testClient.connect();
      const testDb = testClient.db(targetDb);
      const collections = await testDb.listCollections().toArray();
      await testClient.close();

      res.json({
        success: true,
        message: 'Successfully pinged and connected to MongoDB cluster!',
        database: targetDb,
        existingCollections: collections.map((c) => c.name),
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: `Failed to connect to MongoDB: ${err.message}`,
      });
    }
  });

  // Dynamically Connect MongoDB on backend
  app.post('/api/mongodb/connect', async (req: Request, res: Response) => {
    const { uri, dbName } = req.body;
    const targetUri = uri || currentMongoUri;
    const targetDb = dbName || currentMongoDbName;

    if (!targetUri) {
      return res.status(400).json({
        success: false,
        message: 'No MongoDB URI provided.',
      });
    }

    try {
      if (mongoClient) {
        try {
          await mongoClient.close();
        } catch {
          // ignore close error
        }
      }
      mongoClient = new MongoClient(targetUri, { serverSelectionTimeoutMS: 5000 });
      await mongoClient.connect();
      mongoDb = mongoClient.db(targetDb);
      isMongoConnected = true;
      currentMongoUri = targetUri;
      currentMongoDbName = targetDb;
      saveStoredMongoConfig(targetUri, targetDb);

      const collections = await mongoDb.listCollections().toArray();
      res.json({
        success: true,
        message: `Successfully connected Express backend to MongoDB database '${targetDb}'! Auto-sync is active.`,
        database: targetDb,
        collections: collections.map((c) => c.name),
      });
    } catch (err: any) {
      isMongoConnected = false;
      res.status(500).json({
        success: false,
        message: `Failed to establish active MongoDB connection: ${err.message}`,
      });
    }
  });

  // Wipe All Old Records & Reseed with 15 Packet Spices & Invoices
  app.post('/api/mongodb/wipe-and-reseed', async (req: Request, res: Response) => {
    try {
      // 1. Reset in-memory store
      const previousProductCount = store.products.length;
      const previousOrderCount = store.orders.length;
      store.products = [...INITIAL_PRODUCTS];
      store.customers = [...INITIAL_CUSTOMERS];
      store.orders = [...INITIAL_ORDERS];
      store.syncRecords = [...INITIAL_SYNC_RECORDS];

      let mongoReport: any = null;

      // 2. If MongoDB is connected, wipe and reseed collections
      if (isMongoConnected && mongoDb) {
        const delProducts = await mongoDb.collection('products').deleteMany({});
        const delCustomers = await mongoDb.collection('customers').deleteMany({});
        const delOrders = await mongoDb.collection('orders').deleteMany({});
        const delSync = await mongoDb.collection('sync_records').deleteMany({});

        const insProducts = await mongoDb.collection('products').insertMany(INITIAL_PRODUCTS);
        const insCustomers = await mongoDb.collection('customers').insertMany(INITIAL_CUSTOMERS);
        const insOrders = await mongoDb.collection('orders').insertMany(INITIAL_ORDERS);
        const insSync = await mongoDb.collection('sync_records').insertMany(INITIAL_SYNC_RECORDS);

        mongoReport = {
          mode: 'mongodb',
          deleted: {
            products: delProducts.deletedCount,
            customers: delCustomers.deletedCount,
            orders: delOrders.deletedCount,
            syncRecords: delSync.deletedCount,
          },
          inserted: {
            products: insProducts.insertedCount,
            customers: insCustomers.insertedCount,
            orders: insOrders.insertedCount,
            syncRecords: insSync.insertedCount,
          },
        };
      }

      res.json({
        success: true,
        message: isMongoConnected
          ? 'MongoDB wiped clean of old records and successfully reseeded with 15 spice products and sample invoices!'
          : 'Backend store wiped and reseeded with 15 spice products and sample invoices! (Connect MongoDB Atlas to mirror changes).',
        isMongoConnected,
        mongoReport,
        recordsSummary: {
          products: INITIAL_PRODUCTS.length,
          customers: INITIAL_CUSTOMERS.length,
          orders: INITIAL_ORDERS.length,
          previousProductCount,
          previousOrderCount,
        },
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: `Failed to wipe and reseed MongoDB: ${err.message}`,
      });
    }
  });

  // Sync Data to MongoDB (Push, Wipe & Push, or Pull)
  app.post('/api/mongodb/sync', async (req: Request, res: Response) => {
    const { action, products: clientProds, customers: clientCusts, orders: clientOrds } = req.body;

    if (!isMongoConnected || !mongoDb) {
      if (clientProds) store.products = clientProds;
      if (clientCusts) store.customers = clientCusts;
      if (clientOrds) store.orders = clientOrds;

      return res.json({
        success: true,
        mode: 'in-memory',
        message: 'Synchronized with Express backend store. (Connect MongoDB Atlas to persist permanently).',
        counts: {
          products: store.products.length,
          customers: store.customers.length,
          orders: store.orders.length,
        },
      });
    }

    try {
      if (action === 'wipe_and_push') {
        // Complete clean replacement in MongoDB
        const delProds = await mongoDb.collection('products').deleteMany({});
        const delCusts = await mongoDb.collection('customers').deleteMany({});
        const delOrds = await mongoDb.collection('orders').deleteMany({});

        if (clientProds && clientProds.length > 0) {
          await mongoDb.collection('products').insertMany(clientProds);
        }
        if (clientCusts && clientCusts.length > 0) {
          await mongoDb.collection('customers').insertMany(clientCusts);
        }
        if (clientOrds && clientOrds.length > 0) {
          await mongoDb.collection('orders').insertMany(clientOrds);
        }

        store.products = clientProds || store.products;
        store.customers = clientCusts || store.customers;
        store.orders = clientOrds || store.orders;

        return res.json({
          success: true,
          mode: 'mongodb',
          message: `Clean replaced MongoDB: Deleted ${delProds.deletedCount} old products, ${delOrds.deletedCount} old orders. Inserted ${clientProds?.length || 0} products and ${clientOrds?.length || 0} orders.`,
          counts: {
            products: clientProds?.length || 0,
            customers: clientCusts?.length || 0,
            orders: clientOrds?.length || 0,
          },
        });
      } else if (action === 'push') {
        // Upsert products
        if (clientProds && Array.isArray(clientProds)) {
          for (const p of clientProds) {
            await mongoDb.collection('products').updateOne({ id: p.id }, { $set: p }, { upsert: true });
          }
        }
        // Upsert customers
        if (clientCusts && Array.isArray(clientCusts)) {
          for (const c of clientCusts) {
            await mongoDb.collection('customers').updateOne({ id: c.id }, { $set: c }, { upsert: true });
          }
        }
        // Upsert orders
        if (clientOrds && Array.isArray(clientOrds)) {
          for (const o of clientOrds) {
            await mongoDb.collection('orders').updateOne({ id: o.id }, { $set: o }, { upsert: true });
          }
        }

        const pCount = await mongoDb.collection('products').countDocuments();
        const cCount = await mongoDb.collection('customers').countDocuments();
        const oCount = await mongoDb.collection('orders').countDocuments();

        return res.json({
          success: true,
          mode: 'mongodb',
          message: 'All collections successfully upserted and indexed in MongoDB Atlas!',
          counts: { products: pCount, customers: cCount, orders: oCount },
        });
      } else {
        // Pull data from MongoDB
        const pulledProducts = await mongoDb.collection('products').find({}).toArray();
        const pulledCustomers = await mongoDb.collection('customers').find({}).toArray();
        const pulledOrders = await mongoDb.collection('orders').find({}).toArray();

        return res.json({
          success: true,
          mode: 'mongodb',
          message: 'Fetched latest records from MongoDB cluster.',
          data: {
            products: pulledProducts,
            customers: pulledCustomers,
            orders: pulledOrders,
          },
        });
      }
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: `MongoDB synchronization failed: ${err.message}`,
      });
    }
  });

  // Export Mongoose Schemas & MongoImport Commands
  app.get('/api/mongodb/schema-guide', (req: Request, res: Response) => {
    res.json({
      database: currentMongoDbName,
      collections: ['products', 'customers', 'orders', 'notifications', 'sync_records'],
      mongooseSchemas: {
        Product: `const ProductSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  sku: { type: String, required: true, unique: true, index: true },
  barcode: { type: String, required: true, index: true },
  name: { type: String, required: true },
  botanicalName: String,
  origin: String,
  grade: String,
  unit: { type: String, enum: ['kg', 'sack_25kg', 'jar_500g', 'box_10kg'] },
  initialStock: Number,
  currentStock: Number,
  reorderThreshold: Number,
  costPrice: Number,
  retailPrice: Number,
  wholesalePrice: Number,
  distributorPrice: Number,
  batchNumber: String,
  harvestDate: String,
  description: String,
  category: { type: String, enum: ['Whole', 'Ground', 'Exotic', 'Seeds'] }
}, { timestamps: true });`,
        Order: `const OrderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  invoiceNumber: { type: String, required: true, unique: true, index: true },
  customerId: { type: String, required: true, index: true },
  customerName: String,
  customerTier: { type: String, enum: ['retail', 'wholesale', 'distributor'] },
  orderDate: String,
  dueDate: String,
  items: [{
    productId: String,
    productName: String,
    sku: String,
    unit: String,
    quantity: Number,
    unitPrice: Number,
    costPrice: Number,
    totalPrice: Number
  }],
  subtotal: Number,
  discountPercentage: Number,
  discountAmount: Number,
  taxRate: Number,
  taxAmount: Number,
  totalAmount: Number,
  paidAmount: Number,
  paymentStatus: { type: String, enum: ['Paid', 'Pending', 'Partially Paid', 'Overdue'] },
  paymentMethod: String,
  orderStatus: String,
  notes: String
}, { timestamps: true });`,
      },
      cliCommands: {
        mongoImportProducts: `mongoimport --uri="YOUR_MONGODB_URI" --collection=products --file=products.json --jsonArray`,
        mongoImportOrders: `mongoimport --uri="YOUR_MONGODB_URI" --collection=orders --file=orders.json --jsonArray`,
        mongoshConnect: `mongosh "YOUR_MONGODB_URI"`,
      },
    });
  });

  // PRODUCTS API
  app.get('/api/products', async (req: Request, res: Response) => {
    if (isMongoConnected && mongoDb) {
      try {
        const prods = await mongoDb.collection('products').find({}).toArray();
        return res.json(prods);
      } catch (err: any) {
        console.error('MongoDB find error:', err.message);
      }
    }
    res.json(store.products);
  });

  app.post('/api/products', async (req: Request, res: Response) => {
    const newProd = req.body;
    if (!newProd.id) newProd.id = `prod-${Date.now()}`;
    if (!newProd.barcode) newProd.barcode = '8901' + Math.floor(10000000 + Math.random() * 90000000);

    store.products.unshift(newProd);

    if (isMongoConnected && mongoDb) {
      try {
        const cleanProd = sanitizeForMongo(newProd);
        await mongoDb.collection('products').updateOne({ id: newProd.id }, { $set: cleanProd }, { upsert: true });
        console.log(`✅ MongoDB: Product ${newProd.id} saved`);
      } catch (err: any) {
        console.error('MongoDB insert error:', err.message);
      }
    }

    res.status(201).json(newProd);
  });

  app.put('/api/products/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const updated = req.body;

    const idx = store.products.findIndex((p) => p.id === id);
    if (idx !== -1) {
      store.products[idx] = { ...store.products[idx], ...updated };
    }

    if (isMongoConnected && mongoDb) {
      try {
        const cleanUpdate = sanitizeForMongo(updated);
        await mongoDb.collection('products').updateOne({ id }, { $set: cleanUpdate }, { upsert: true });
        console.log(`✅ MongoDB: Product ${id} updated automatically`);
      } catch (err: any) {
        console.error('MongoDB update error:', err.message);
      }
    }

    res.json(updated);
  });

  app.post('/api/products/:id/adjust-stock', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { delta, note } = req.body;

    const idx = store.products.findIndex((p) => p.id === id);
    if (idx !== -1) {
      const p = store.products[idx];
      p.currentStock = Math.max(0, p.currentStock + Number(delta));
    }

    if (isMongoConnected && mongoDb) {
      try {
        await mongoDb.collection('products').updateOne(
          { id },
          { $inc: { currentStock: Number(delta) } }
        );
        console.log(`✅ MongoDB: Product ${id} stock adjusted by ${delta}`);
      } catch (err: any) {
        console.error('MongoDB adjust stock error:', err.message);
      }
    }

    res.json({ success: true, newStock: store.products[idx]?.currentStock, note });
  });

  // CUSTOMERS API
  app.get('/api/customers', async (req: Request, res: Response) => {
    if (isMongoConnected && mongoDb) {
      try {
        const custs = await mongoDb.collection('customers').find({}).toArray();
        return res.json(custs);
      } catch (err: any) {
        console.error('MongoDB find error:', err.message);
      }
    }
    res.json(store.customers);
  });

  app.post('/api/customers', async (req: Request, res: Response) => {
    const newCust = req.body;
    if (!newCust.id) newCust.id = `cust-${Date.now()}`;
    store.customers.unshift(newCust);

    if (isMongoConnected && mongoDb) {
      try {
        const cleanCust = sanitizeForMongo(newCust);
        await mongoDb.collection('customers').updateOne({ id: newCust.id }, { $set: cleanCust }, { upsert: true });
        console.log(`✅ MongoDB: Customer ${newCust.id} saved`);
      } catch (err: any) {
        console.error('MongoDB insert customer error:', err.message);
      }
    }

    res.status(201).json(newCust);
  });

  app.put('/api/customers/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const updated = req.body;
    const idx = store.customers.findIndex((c) => c.id === id);
    if (idx !== -1) {
      store.customers[idx] = { ...store.customers[idx], ...updated };
    }
    if (isMongoConnected && mongoDb) {
      try {
        const cleanUpdate = sanitizeForMongo(updated);
        await mongoDb.collection('customers').updateOne({ id }, { $set: cleanUpdate }, { upsert: true });
        console.log(`✅ MongoDB: Customer ${id} updated automatically`);
      } catch (err: any) {
        console.error('MongoDB update customer error:', err.message);
      }
    }
    res.json(updated);
  });

  // ORDERS API
  app.get('/api/orders', async (req: Request, res: Response) => {
    if (isMongoConnected && mongoDb) {
      try {
        const ords = await mongoDb.collection('orders').find({}).toArray();
        return res.json(ords);
      } catch (err: any) {
        console.error('MongoDB find orders error:', err.message);
      }
    }
    res.json(store.orders);
  });

  app.post('/api/orders', async (req: Request, res: Response) => {
    const newOrder = req.body;
    if (!newOrder.id) newOrder.id = `ord-${Date.now()}`;

    // Decrement stock for each item
    for (const item of newOrder.items || []) {
      const pIdx = store.products.findIndex((p) => p.id === item.productId);
      if (pIdx !== -1) {
        store.products[pIdx].currentStock = Math.max(0, store.products[pIdx].currentStock - item.quantity);
      }
      if (isMongoConnected && mongoDb) {
        try {
          await mongoDb.collection('products').updateOne(
            { id: item.productId },
            { $inc: { currentStock: -item.quantity } }
          );
        } catch (err: any) {
          console.error('MongoDB decrement error:', err.message);
        }
      }
    }

    store.orders.unshift(newOrder);

    if (isMongoConnected && mongoDb) {
      try {
        const cleanOrder = sanitizeForMongo(newOrder);
        await mongoDb.collection('orders').updateOne({ id: newOrder.id }, { $set: cleanOrder }, { upsert: true });
        console.log(`✅ MongoDB: Order ${newOrder.id} saved`);
      } catch (err: any) {
        console.error('MongoDB insert order error:', err.message);
      }
    }

    res.status(201).json(newOrder);
  });

  app.put('/api/orders/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const updated = req.body;
    const idx = store.orders.findIndex((o) => o.id === id);
    if (idx !== -1) {
      store.orders[idx] = { ...store.orders[idx], ...updated };
    }
    if (isMongoConnected && mongoDb) {
      try {
        const cleanUpdate = sanitizeForMongo(updated);
        await mongoDb.collection('orders').updateOne({ id }, { $set: cleanUpdate }, { upsert: true });
        console.log(`✅ MongoDB: Order ${id} updated automatically`);
      } catch (err: any) {
        console.error('MongoDB update order error:', err.message);
      }
    }
    res.json(updated);
  });

  app.put('/api/orders/:id/payment', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { paymentStatus, paidAmount } = req.body;
    const idx = store.orders.findIndex((o) => o.id === id);
    if (idx !== -1) {
      store.orders[idx].paymentStatus = paymentStatus;
      store.orders[idx].paidAmount = paidAmount;
    }
    if (isMongoConnected && mongoDb) {
      try {
        await mongoDb.collection('orders').updateOne(
          { id },
          { $set: { paymentStatus, paidAmount } }
        );
      } catch (err: any) {
        console.error('MongoDB payment status update error:', err.message);
      }
    }
    res.json({ success: true, id, paymentStatus, paidAmount });
  });

  // -------------------------------------------------------------
  // OWNER / ADMIN SETTINGS: Pricing Tiers & Payment Terms
  // -------------------------------------------------------------
  app.get('/api/settings/pricing-tiers', async (req: Request, res: Response) => {
    if (isMongoConnected && mongoDb) {
      try {
        const tiers = await mongoDb.collection('pricing_tiers').find({}).toArray();
        if (tiers.length > 0) return res.json(tiers);
      } catch (err: any) {
        console.error('MongoDB find pricing tiers error:', err.message);
      }
    }
    res.json(store.pricingTiers);
  });

  app.put('/api/settings/pricing-tiers', async (req: Request, res: Response) => {
    const tiers = req.body;
    if (Array.isArray(tiers)) {
      store.pricingTiers = tiers;
      if (isMongoConnected && mongoDb) {
        try {
          await mongoDb.collection('pricing_tiers').deleteMany({});
          if (tiers.length > 0) {
            await mongoDb.collection('pricing_tiers').insertMany(tiers);
          }
        } catch (err: any) {
          console.error('MongoDB replace pricing tiers error:', err.message);
        }
      }
    }
    res.json({ success: true, count: store.pricingTiers.length, tiers: store.pricingTiers });
  });

  app.get('/api/settings/payment-terms', async (req: Request, res: Response) => {
    if (isMongoConnected && mongoDb) {
      try {
        const terms = await mongoDb.collection('payment_terms').find({}).toArray();
        if (terms.length > 0) return res.json(terms);
      } catch (err: any) {
        console.error('MongoDB find payment terms error:', err.message);
      }
    }
    res.json(store.paymentTerms);
  });

  app.put('/api/settings/payment-terms', async (req: Request, res: Response) => {
    const terms = req.body;
    if (Array.isArray(terms)) {
      store.paymentTerms = terms;
      if (isMongoConnected && mongoDb) {
        try {
          await mongoDb.collection('payment_terms').deleteMany({});
          if (terms.length > 0) {
            await mongoDb.collection('payment_terms').insertMany(terms);
          }
        } catch (err: any) {
          console.error('MongoDB replace payment terms error:', err.message);
        }
      }
    }
    res.json({ success: true, count: store.paymentTerms.length, terms: store.paymentTerms });
  });

  // DELETE PRODUCT
  app.delete('/api/products/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    store.products = store.products.filter((p) => p.id !== id);
    if (isMongoConnected && mongoDb) {
      try {
        await mongoDb.collection('products').deleteOne({ id });
      } catch (err: any) {
        console.error('MongoDB delete product error:', err.message);
      }
    }
    res.json({ success: true, id });
  });

  // DELETE CUSTOMER
  app.delete('/api/customers/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    store.customers = store.customers.filter((c) => c.id !== id);
    if (isMongoConnected && mongoDb) {
      try {
        await mongoDb.collection('customers').deleteOne({ id });
      } catch (err: any) {
        console.error('MongoDB delete customer error:', err.message);
      }
    }
    res.json({ success: true, id });
  });

  // DELETE ORDER / INVOICE
  app.delete('/api/orders/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    store.orders = store.orders.filter((o) => o.id !== id);
    if (isMongoConnected && mongoDb) {
      try {
        await mongoDb.collection('orders').deleteOne({ id });
      } catch (err: any) {
        console.error('MongoDB delete order error:', err.message);
      }
    }
    res.json({ success: true, id });
  });

  // -------------------------------------------------------------
  // USER MANAGEMENT & SECURITY PASSWORDS
  // -------------------------------------------------------------
  app.get('/api/users', async (req: Request, res: Response) => {
    if (isMongoConnected && mongoDb) {
      try {
        const users = await mongoDb.collection('users').find({}).toArray();
        if (users.length > 0) return res.json(users);
      } catch (err: any) {
        console.error('MongoDB find users error:', err.message);
      }
    }
    res.json(store.users);
  });

  app.post('/api/users', async (req: Request, res: Response) => {
    const newUser = req.body;
    if (!newUser.id) newUser.id = `usr-${Date.now()}`;
    store.users.push(newUser);

    if (isMongoConnected && mongoDb) {
      try {
        const cleanUser = sanitizeForMongo(newUser);
        await mongoDb.collection('users').updateOne({ id: newUser.id }, { $set: cleanUser }, { upsert: true });
        console.log(`✅ MongoDB: User ${newUser.id} saved`);
      } catch (err: any) {
        console.error('MongoDB insert user error:', err.message);
      }
    }

    res.status(201).json(newUser);
  });

  app.put('/api/users/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const updated = req.body;
    const idx = store.users.findIndex((u) => u.id === id);
    if (idx !== -1) {
      store.users[idx] = { ...store.users[idx], ...updated };
    }

    if (isMongoConnected && mongoDb) {
      try {
        const cleanUser = sanitizeForMongo(updated);
        await mongoDb.collection('users').updateOne({ id }, { $set: cleanUser }, { upsert: true });
        console.log(`✅ MongoDB: User ${id} updated automatically`);
      } catch (err: any) {
        console.error('MongoDB update user error:', err.message);
      }
    }

    if (idx !== -1) {
      return res.json(store.users[idx]);
    }
    res.json(updated);
  });

  app.delete('/api/users/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    store.users = store.users.filter((u) => u.id !== id);

    if (isMongoConnected && mongoDb) {
      try {
        await mongoDb.collection('users').deleteOne({ id });
        console.log(`✅ MongoDB: User ${id} deleted`);
      } catch (err: any) {
        console.error('MongoDB delete user error:', err.message);
      }
    }

    res.json({ success: true, id });
  });

  // Master Deletion Password
  app.get('/api/settings/delete-password', (req: Request, res: Response) => {
    res.json({ password: store.adminDeletePassword });
  });

  app.put('/api/settings/delete-password', (req: Request, res: Response) => {
    const { password } = req.body;
    if (password && typeof password === 'string') {
      store.adminDeletePassword = password;
      return res.json({ success: true, message: 'Admin master deletion password updated' });
    }
    res.status(400).json({ error: 'Valid password required' });
  });

  // Wipe All Orders and Customers
  app.post('/api/settings/wipe-customers-and-orders', async (req: Request, res: Response) => {
    const { password } = req.body;
    if (password !== store.adminDeletePassword) {
      return res.status(403).json({ error: 'Unauthorized: Incorrect master deletion password' });
    }

    const custCount = store.customers.length;
    const ordCount = store.orders.length;

    store.customers = [];
    store.orders = [];
    store.syncRecords = [];

    if (isMongoConnected && mongoDb) {
      try {
        await mongoDb.collection('customers').deleteMany({});
        await mongoDb.collection('orders').deleteMany({});
        await mongoDb.collection('sync_records').deleteMany({});
      } catch (err: any) {
        console.error('MongoDB wipe customers/orders error:', err.message);
      }
    }

    res.json({
      success: true,
      message: `Cleared ${custCount} customer(s) and ${ordCount} order(s). Ready for fresh entries.`,
    });
  });

  // -------------------------------------------------------------
  // Vite Frontend Middleware / Static Serve
  // -------------------------------------------------------------
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 NA Distributors MERN Backend listening on port ${PORT}`);
    console.log(`📦 MongoDB Database: ${currentMongoDbName} (Status: ${isMongoConnected ? 'CONNECTED' : 'STANDBY'})`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
