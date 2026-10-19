import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { 
  INITIAL_PRODUCTS, 
  INITIAL_CUSTOMERS, 
  INITIAL_ORDERS, 
  INITIAL_SYNC_RECORDS 
} from '../src/data/initialData.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || process.argv.find((arg) => arg.startsWith('--uri='))?.split('=')[1] || '';
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'saffron_bark_spice_erp';

async function seedMongo() {
  console.log('========================================================');
  console.log('🌶️  Saffron & Bark - MongoDB Wipe & Reseed Script');
  console.log('========================================================');
  
  if (!MONGODB_URI) {
    console.error('❌ Error: No MONGODB_URI found.');
    console.log('Please provide a URI via:');
    console.log('1. Setting MONGODB_URI="your_connection_string" in your environment / .env file');
    console.log('2. Running: npm run db:seed -- --uri="mongodb+srv://user:pass@cluster.mongodb.net"');
    process.exit(1);
  }

  console.log(`Connecting to MongoDB (${MONGODB_DB_NAME})...`);
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB successfully.');
    const db = client.db(MONGODB_DB_NAME);

    // 1. Delete all old records from collections
    console.log('\n--- 1. Deleting old records ---');
    const delProducts = await db.collection('products').deleteMany({});
    const delCustomers = await db.collection('customers').deleteMany({});
    const delOrders = await db.collection('orders').deleteMany({});
    const delSyncRecords = await db.collection('sync_records').deleteMany({});

    console.log(`Deleted ${delProducts.deletedCount} old product document(s)`);
    console.log(`Deleted ${delCustomers.deletedCount} old customer document(s)`);
    console.log(`Deleted ${delOrders.deletedCount} old order / invoice document(s)`);
    console.log(`Deleted ${delSyncRecords.deletedCount} old sync record(s)`);

    // 2. Insert new records
    console.log('\n--- 2. Inserting updated records ---');
    const insProducts = await db.collection('products').insertMany(INITIAL_PRODUCTS);
    const insCustomers = await db.collection('customers').insertMany(INITIAL_CUSTOMERS);
    const insOrders = await db.collection('orders').insertMany(INITIAL_ORDERS);
    const insSync = await db.collection('sync_records').insertMany(INITIAL_SYNC_RECORDS);

    console.log(`✅ Inserted ${insProducts.insertedCount} new spice packet products (100g, 50g, 25g)`);
    console.log(`✅ Inserted ${insCustomers.insertedCount} customer profiles with tiered pricing`);
    console.log(`✅ Inserted ${insOrders.insertedCount} sample invoices (INV-2026-0041 to 0045)`);
    console.log(`✅ Inserted ${insSync.insertedCount} accounting sync log records`);

    // 3. Create Indexes
    console.log('\n--- 3. Creating Unique & Search Indexes ---');
    await db.collection('products').createIndex({ id: 1 }, { unique: true });
    await db.collection('products').createIndex({ sku: 1 }, { unique: true });
    await db.collection('products').createIndex({ barcode: 1 });
    await db.collection('orders').createIndex({ id: 1 }, { unique: true });
    await db.collection('orders').createIndex({ invoiceNumber: 1 }, { unique: true });
    await db.collection('customers').createIndex({ id: 1 }, { unique: true });

    console.log('All indexes verified.');
    console.log('\n🎉 MongoDB database successfully wiped and reseeded with the 15 spice catalog and sample invoices!');
  } catch (err: any) {
    console.error('❌ Seeding failed with error:', err.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 MongoDB connection closed.');
  }
}

seedMongo();
