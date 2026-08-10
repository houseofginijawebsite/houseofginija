const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // ssl: { rejectUnauthorized: true }, // Disabled for local development
});

async function main() {
  console.log('=== HOUSE OF GINIJA DATABASE SEED ===');
  if (!process.env.DATABASE_URL) {
    console.error('CRITICAL ERROR: DATABASE_URL is not set in environment variables.');
    process.exit(1);
  }

  const client = await pool.connect();

  try {
    console.log('Initializing transaction...');
    await client.query('BEGIN');

    // 1. Drop existing tables if any
    console.log('Dropping old tables...');
    await client.query('DROP TABLE IF EXISTS page_visits CASCADE');
    await client.query('DROP TABLE IF EXISTS newsletter_subscribers CASCADE');
    await client.query('DROP TABLE IF EXISTS wishlist CASCADE');
    await client.query('DROP TABLE IF EXISTS orders CASCADE');
    await client.query('DROP TABLE IF EXISTS products CASCADE');
    await client.query('DROP TABLE IF EXISTS collections CASCADE');
    await client.query('DROP TABLE IF EXISTS addresses CASCADE');
    await client.query('DROP TABLE IF EXISTS users CASCADE');
    await client.query('DROP TABLE IF EXISTS coupons CASCADE');

    // 2. Create tables with PostgreSQL dialect
    console.log('Creating tables...');

    await client.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'customer' NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE addresses (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        type VARCHAR(50) NOT NULL,
        line1 TEXT NOT NULL,
        line2 TEXT,
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100) NOT NULL,
        postal_code VARCHAR(20) NOT NULL,
        phone VARCHAR(20) NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE collections (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        image_url TEXT
      )
    `);

    await client.query(`
      CREATE TABLE products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        collection_id INT REFERENCES collections(id) ON DELETE SET NULL,
        is_out_of_stock BOOLEAN DEFAULT FALSE NOT NULL,
        images JSONB NOT NULL,
        variants JSONB NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE coupons (
        code VARCHAR(50) PRIMARY KEY,
        discount_type VARCHAR(20) NOT NULL,
        discount_value DECIMAL(10, 2) NOT NULL,
        expiry_date TIMESTAMP NOT NULL,
        usage_limit INT NOT NULL,
        times_used INT DEFAULT 0 NOT NULL,
        active BOOLEAN DEFAULT TRUE NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE orders (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE SET NULL,
        items JSONB NOT NULL,
        status VARCHAR(50) DEFAULT 'Pending' NOT NULL,
        shipping_address JSONB NOT NULL,
        payment_status VARCHAR(50) DEFAULT 'Pending' NOT NULL,
        razorpay_order_id VARCHAR(255),
        razorpay_payment_id VARCHAR(255),
        coupon_code VARCHAR(50),
        discount_amount DECIMAL(10, 2) DEFAULT 0 NOT NULL,
        total DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE wishlist (
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        product_id INT REFERENCES products(id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, product_id)
      )
    `);

    await client.query(`
      CREATE TABLE page_visits (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        path TEXT NOT NULL,
        session_id VARCHAR(255) NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE newsletter_subscribers (
        email VARCHAR(255) PRIMARY KEY,
        subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);

    console.log('Tables created successfully. Seeding initial data...');

    // 3. Seed Users
    console.log('Seeding users...');
    const adminPassword = process.env.ADMIN_PASSWORD || 'HouseOfGinija@Admin2026';
    const customerPassword = process.env.CUSTOMER_PASSWORD || 'HouseOfGinija@User2026';
    const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
    const customerPasswordHash = await bcrypt.hash(customerPassword, 10);

    const adminUser = await client.query(`
      INSERT INTO users (name, email, password_hash, role) 
      VALUES ('House Of Ginija Admin', 'admin@houseofginija.com', $1, 'admin')
      RETURNING id
    `, [adminPasswordHash]);
    const customerUser = await client.query(`
      INSERT INTO users (name, email, password_hash, role) 
      VALUES ('Aria Sharma', 'customer@houseofginija.com', $1, 'customer')
      RETURNING id
    `, [customerPasswordHash]);

    // Seed address for customer
    await client.query(`
      INSERT INTO addresses (user_id, type, line1, line2, city, state, postal_code, phone)
      VALUES ($1, 'shipping', 'Flat 101, Regency Enclave', 'Richmond Road', 'Bengaluru', 'Karnataka', '560025', '+919876501234')
    `, [customerUser.rows[0].id]);
    // 4. Seed Collections
    console.log('Seeding collections...');
    const collectionsData = [
      {
        name: 'Suits',
        slug: 'suits',
        description: 'Premium handcrafted suits, featuring custom-tailored silhouettes and fine archival fabrics.',
        image_url: '/images/suits/WhatsApp Image 2026-06-18 at 4.41.45 PM.jpeg'
      },
      {
        name: 'Jewellery',
        slug: 'jewellery',
        description: 'Exquisite artisan-crafted jewelry, featuring heirloom-quality necklaces, rings, earrings, and bracelets.',
        image_url: '/images/jewellery/necklace/WhatsApp Image 2026-06-19 at 2.48.31 PM.jpeg'
      }
    ];

    const collMap = {};
    for (const c of collectionsData) {
      const res = await client.query(`
        INSERT INTO collections (name, slug, description, image_url)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [c.name, c.slug, c.description, c.image_url]);
      collMap[c.slug] = res.rows[0].id;
    }

    // 5. Seed Products
    console.log('Seeding products...');
    const fs = require('fs');
    const path = require('path');
    
    // A. Seed Suits
    const suitsDir = path.join(process.cwd(), 'public', 'images', 'suits');
    if (fs.existsSync(suitsDir)) {
      const files = fs.readdirSync(suitsDir);
      let itemCounter = 1;
      for (const file of files) {
        if (!file.endsWith('.jpeg') && !file.endsWith('.jpg') && !file.endsWith('.png')) continue;
        
        const imageUrl = `/images/suits/${file}`;
        const name = `Bespoke Suit ${itemCounter}`;
        const slug = `bespoke-suit-${itemCounter}`;
        
        // Price: ₹25,000 to ₹40,000
        const price = 25000 + ((itemCounter * 17) % 15) * 1000;
        const description = `A finely tailored bespoke suit, crafted from exceptional textiles with structured shoulders and a modern silhouette.`;
        
        // Variants: S, M, L
        const variants = [
          { size: 'S', color: 'Classic Black', stock: 5 + (itemCounter % 3) },
          { size: 'M', color: 'Classic Black', stock: 8 + (itemCounter % 4) },
          { size: 'L', color: 'Classic Black', stock: 4 + (itemCounter % 2) }
        ];

        await client.query(`
          INSERT INTO products (name, slug, description, price, collection_id, is_out_of_stock, images, variants)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          name,
          slug,
          description,
          price,
          collMap['suits'],
          false,
          JSON.stringify([imageUrl]),
          JSON.stringify(variants)
        ]);
        
        itemCounter++;
      }
      console.log(`Seeded ${itemCounter - 1} Suits products.`);
    } else {
      console.warn('Suits directory not found, skipping suits seeding.');
    }

    // B. Seed Jewellery
    const jewelleryBaseDir = path.join(process.cwd(), 'public', 'images', 'jewellery');
    const categories = ['bracelets', 'earrings', 'necklace', 'rings'];
    let jewelleryCounter = 1;

    for (const category of categories) {
      const catDir = path.join(jewelleryBaseDir, category);
      if (!fs.existsSync(catDir)) continue;

      const files = fs.readdirSync(catDir);
      let catItemCounter = 1;

      for (const file of files) {
        if (!file.endsWith('.jpeg') && !file.endsWith('.jpg') && !file.endsWith('.png')) continue;
        
        const imageUrl = `/images/jewellery/${category}/${file}`;
        
        let catName = category.charAt(0).toUpperCase() + category.slice(1);
        if (catName === 'Earrings') catName = 'Earring Set';
        if (catName === 'Bracelets') catName = 'Bracelet';
        if (catName === 'Rings') catName = 'Ring';
        
        const name = `Bespoke ${catName} ${catItemCounter}`;
        const slug = `bespoke-${category}-${catItemCounter}`;
        
        let price = 15000;
        if (category === 'necklace') price = 45000;
        if (category === 'bracelets') price = 22000;
        if (category === 'rings') price = 18000;
        if (category === 'earrings') price = 14000;
        
        price = price + ((catItemCounter * 13) % 7) * 1000; 

        await client.query(`
          INSERT INTO products (name, slug, description, price, collection_id, is_out_of_stock, images, variants)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          name,
          slug,
          `Hand-crafted ${category} from the exclusive House of Ginija collections.`,
          price,
          collMap['jewellery'],
          false,
          JSON.stringify([imageUrl]),
          JSON.stringify([{ size: 'One Size', color: 'Gold', stock: 5 + (catItemCounter % 3) }])
        ]);

        catItemCounter++;
        jewelleryCounter++;
      }
    }
    console.log(`Seeded ${jewelleryCounter - 1} Jewellery products.`);

    // 6. Seed Coupons
    console.log('Seeding coupons...');
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1); // Valid for 1 year

    await client.query(`
      INSERT INTO coupons (code, discount_type, discount_value, expiry_date, usage_limit, times_used, active)
      VALUES ('GINIJA1000', 'flat', 1000.00, $1, 100, 0, true)
    `, [expiry]);

    // 7. Seed page visits (for initial graph rendering)
    console.log('Seeding page visits analytics...');
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      
      // Seed several visits for each of the last 7 days
      const visitsCount = 10 + Math.floor(Math.random() * 20);
      for (let j = 0; j < visitsCount; j++) {
        await client.query(`
          INSERT INTO page_visits (timestamp, path, session_id)
          VALUES ($1, $2, $3)
        `, [date, Math.random() > 0.3 ? '/' : '/collections', `sess_${i}_${j}`]);
      }
    }

    // Commit Transaction
    await client.query('COMMIT');
    console.log('Database successfully seeded!');
    
    console.log('\n================================================================');
    console.log('⚠️ PRODUCTION DEPLOYMENT WARNING ⚠️');
    console.log('Default credentials have been created:');
    console.log('  Admin User:     admin@houseofginija.com / admin123');
    console.log('  Customer User:  customer@houseofginija.com / customer123');
    console.log('IMPORTANT: These passwords MUST be changed or the accounts');
    console.log('deleted before deploying to a staging/production environment.');
    console.log('================================================================\n');

  } catch (err) {
    console.log('Error encountered, rolling back transaction...');
    await client.query('ROLLBACK');
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
