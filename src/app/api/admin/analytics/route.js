import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const resultData = {
    visitsTrend: [],
    metrics: { totalOrders: 0, totalRevenue: 0 },
    bestSellers: [],
    lowStockAlerts: [],
    customers: [],
    subscribers: [],
  };

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(resultData);
  }

  try {
    const [
      visitsRes,
      revenueRes,
      ordersRes,
      productsRes,
      customersRes,
      subscribersRes,
    ] = await Promise.allSettled([
      pool.query(`
        SELECT 
          TO_CHAR(timestamp, 'YYYY-MM-DD') as date, 
          COUNT(id)::int as visits 
        FROM page_visits 
        WHERE timestamp > NOW() - INTERVAL '30 days'
        GROUP BY date 
        ORDER BY date ASC
      `),
      pool.query(`
        SELECT 
          COUNT(id)::int as order_count, 
          COALESCE(SUM(total), 0)::float as revenue 
        FROM orders 
        WHERE payment_status = 'Paid'
      `),
      pool.query(`
        SELECT items FROM orders WHERE payment_status = 'Paid'
      `),
      pool.query(`
        SELECT id, name, variants, is_out_of_stock FROM products
      `),
      pool.query(`
        SELECT id, name, email, created_at 
        FROM users 
        WHERE role = 'customer' 
        ORDER BY id DESC
      `),
      pool.query(`
        SELECT email, subscribed_at 
        FROM newsletter_subscribers 
        ORDER BY subscribed_at DESC
      `),
    ]);

    if (visitsRes.status === 'fulfilled' && visitsRes.value.rows) {
      resultData.visitsTrend = visitsRes.value.rows;
    }
    if (revenueRes.status === 'fulfilled' && revenueRes.value.rows.length > 0) {
      const metrics = revenueRes.value.rows[0];
      resultData.metrics = {
        totalOrders: metrics.order_count || 0,
        totalRevenue: metrics.revenue || 0,
      };
    }
    if (ordersRes.status === 'fulfilled' && ordersRes.value.rows) {
      const productSales = {};
      ordersRes.value.rows.forEach(order => {
        let items = order.items || [];
        if (typeof items === 'string') {
          try { items = JSON.parse(items); } catch { items = []; }
        }
        if (Array.isArray(items)) {
          items.forEach(item => {
            if (!item || !item.id) return;
            if (!productSales[item.id]) {
              productSales[item.id] = {
                id: item.id,
                name: item.name,
                sales_count: 0,
                revenue: 0,
              };
            }
            productSales[item.id].sales_count += item.quantity || 1;
            productSales[item.id].revenue += (item.price || 0) * (item.quantity || 1);
          });
        }
      });
      resultData.bestSellers = Object.values(productSales)
        .sort((a, b) => b.sales_count - a.sales_count)
        .slice(0, 5);
    }
    if (productsRes.status === 'fulfilled' && productsRes.value.rows) {
      const lowStockAlerts = [];
      productsRes.value.rows.forEach(product => {
        let variants = product.variants || [];
        if (typeof variants === 'string') {
          try { variants = JSON.parse(variants); } catch { variants = []; }
        }
        if (Array.isArray(variants)) {
          variants.forEach(v => {
            if (v.stock <= 3 && !product.is_out_of_stock) {
              lowStockAlerts.push({
                id: product.id,
                name: product.name,
                size: v.size,
                color: v.color,
                stock: v.stock,
              });
            }
          });
        }
      });
      resultData.lowStockAlerts = lowStockAlerts;
    }
    if (customersRes.status === 'fulfilled' && customersRes.value.rows) {
      resultData.customers = customersRes.value.rows;
    }
    if (subscribersRes.status === 'fulfilled' && subscribersRes.value.rows) {
      resultData.subscribers = subscribersRes.value.rows;
    }

    return NextResponse.json(resultData);
  } catch (error) {
    console.error('Fetch admin analytics error:', error);
    return NextResponse.json(resultData);
  }
}
