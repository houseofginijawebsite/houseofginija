import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import crypto from 'crypto';

export async function POST(request) {
  const client = await pool.connect();
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = await request.json();

    if (!order_id) {
      return NextResponse.json({ error: 'Missing database order ID' }, { status: 400 });
    }

    // 1. IDEMPOTENCY CHECK: Verify order is not already processed (e.g. by Webhook)
    const checkOrder = await pool.query(
      'SELECT payment_status, items, coupon_code FROM orders WHERE id = $1',
      [order_id]
    );

    if (checkOrder.rows.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const orderRecord = checkOrder.rows[0];
    if (orderRecord.payment_status === 'Paid') {
      return NextResponse.json({ success: true, message: 'Order already processed as Paid' });
    }

    // 2. SIGNATURE VALIDATION
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const isDev = process.env.NODE_ENV === 'development';

    if (!keyId || !keySecret) {
      if (isDev) {
        // Local Dev simulation bypass
        console.log('DEV ONLY: Simulating successful signature verification.');
      } else {
        return NextResponse.json({ error: 'Production environment misconfigured: payment keys missing' }, { status: 500 });
      }
    } else {
      // Standard signature validation
      const generatedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (generatedSignature !== razorpay_signature) {
        return NextResponse.json({ error: 'Signature verification failed: payment invalid' }, { status: 400 });
      }
    }

    // 3. DATABASE TRANSACTION WITH SELECT FOR UPDATE LOCKING
    await client.query('BEGIN');

    // Recheck state inside transaction
    const txCheck = await client.query(
      'SELECT payment_status, items, coupon_code FROM orders WHERE id = $1 FOR UPDATE',
      [order_id]
    );
    if (txCheck.rows[0].payment_status === 'Paid') {
      await client.query('ROLLBACK');
      return NextResponse.json({ success: true, message: 'Order already marked Paid' });
    }

    let items = txCheck.rows[0].items || [];
    if (typeof items === 'string') {
      try { items = JSON.parse(items); } catch { items = []; }
    }
    const couponCode = txCheck.rows[0].coupon_code;

    // A. Validate and Increment Coupon usage
    if (couponCode) {
      const couponTxResult = await client.query(
        'SELECT times_used, usage_limit, active, expiry_date FROM coupons WHERE code = $1 FOR UPDATE',
        [couponCode]
      );

      if (couponTxResult.rows.length === 0) {
        throw new Error(`Coupon "${couponCode}" no longer exists in DB`);
      }

      const coupon = couponTxResult.rows[0];
      if (!coupon.active || new Date(coupon.expiry_date) < new Date() || coupon.times_used >= coupon.usage_limit) {
        throw new Error(`Coupon "${couponCode}" limit exceeded or inactive during verification`);
      }

      // Increment coupon usage
      await client.query(
        'UPDATE coupons SET times_used = times_used + 1 WHERE code = $1',
        [couponCode]
      );
    }

    // B. Decrement Product Variant Stock (locking products table rows via SELECT FOR UPDATE)
    for (const item of items) {
      const productResult = await client.query(
        'SELECT variants, name FROM products WHERE id = $1 FOR UPDATE',
        [item.id]
      );

      if (productResult.rows.length === 0) {
        throw new Error(`Product "${item.name}" (ID ${item.id}) not found during inventory check`);
      }

      const product = productResult.rows[0];
      let variants = product.variants || [];
      if (typeof variants === 'string') {
        try { variants = JSON.parse(variants); } catch { variants = []; }
      }
      const variantIndex = variants.findIndex(
        (v) => v.size === item.size && v.color === item.color
      );

      if (variantIndex === -1) {
        throw new Error(`Variant Size: ${item.size} / Color: ${item.color} for product "${product.name}" not found`);
      }

      const currentStock = variants[variantIndex].stock;
      if (currentStock < item.quantity) {
        throw new Error(`Insufficient stock for "${product.name}" (${item.size}/${item.color}). Needed ${item.quantity}, had ${currentStock}.`);
      }

      // Decrement stock in array
      variants[variantIndex].stock = currentStock - item.quantity;

      const totalStockLeft = variants.reduce((sum, v) => sum + (v.stock || 0), 0);
      const isOutOfStock = totalStockLeft <= 0;

      // Update variants array and is_out_of_stock status in Postgres
      await client.query(
        'UPDATE products SET variants = $1, is_out_of_stock = $2 WHERE id = $3',
        [JSON.stringify(variants), isOutOfStock, item.id]
      );
    }

    // C. Mark Order as Paid and Placed
    await client.query(
      `UPDATE orders 
       SET payment_status = 'Paid', status = 'Placed', razorpay_payment_id = $1 
       WHERE id = $2`,
      [razorpay_payment_id || 'mock_pay_id', order_id]
    );

    await client.query('COMMIT');
    return NextResponse.json({ success: true });

  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {}
    console.error('Verify payment transaction rolled back:', error);
    return NextResponse.json({ error: error.message || 'Payment processing failed' }, { status: 500 });
  } finally {
    client.release();
  }
}
