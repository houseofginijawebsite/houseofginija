import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import crypto from 'crypto';

export async function POST(request) {
  // Capture raw text body to verify webhook signature accurately
  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature');

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const isDev = process.env.NODE_ENV === 'development';

  if (!webhookSecret) {
    if (isDev) {
      console.log('DEV ONLY: Skipping webhook signature check as RAZORPAY_WEBHOOK_SECRET is missing.');
    } else {
      console.error('CRITICAL: Webhook secret missing in production environment.');
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }
  } else {
    // Standard signature validation using HMAC SHA256
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.warn('Webhook signature verification failed!');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
  }

  const client = await pool.connect();
  try {
    const payload = JSON.parse(rawBody);
    const event = payload.event;

    // We listen primarily for payment.captured or order.paid
    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload.payload.payment.entity;
      const razorpayOrderId = paymentEntity.order_id;
      const razorpayPaymentId = paymentEntity.id;

      if (!razorpayOrderId) {
        return NextResponse.json({ received: true, error: 'No order ID in payment entity' });
      }

      // Fetch matching order from Postgres
      const orderQuery = await pool.query(
        'SELECT id, payment_status, items, coupon_code FROM orders WHERE razorpay_order_id = $1',
        [razorpayOrderId]
      );

      if (orderQuery.rows.length === 0) {
        console.warn(`Order with Razorpay ID "${razorpayOrderId}" not found in database.`);
        return NextResponse.json({ received: true, message: 'Order mapping not found' });
      }

      const order = orderQuery.rows[0];

      // If already Paid, return success idempotently
      if (order.payment_status === 'Paid') {
        return NextResponse.json({ received: true, message: 'Order already marked Paid' });
      }

      // Start transaction to update stock and coupon status
      await client.query('BEGIN');

      // Recheck inside transaction with FOR UPDATE row locks
      const txCheck = await client.query(
        'SELECT id, payment_status, items, coupon_code FROM orders WHERE id = $1 FOR UPDATE',
        [order.id]
      );

      if (txCheck.rows[0].payment_status === 'Paid') {
        await client.query('ROLLBACK');
        return NextResponse.json({ received: true, message: 'Order marked Paid by parallel process' });
      }

      let items = txCheck.rows[0].items || [];
      if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch { items = []; }
      }
      const couponCode = txCheck.rows[0].coupon_code;

      // A. Verify and Increment Coupon usage
      if (couponCode) {
        const couponTxResult = await client.query(
          'SELECT times_used, usage_limit, active, expiry_date FROM coupons WHERE code = $1 FOR UPDATE',
          [couponCode]
        );

        if (couponTxResult.rows.length > 0) {
          const coupon = couponTxResult.rows[0];
          if (coupon.active && new Date(coupon.expiry_date) > new Date() && coupon.times_used < coupon.usage_limit) {
            await client.query(
              'UPDATE coupons SET times_used = times_used + 1 WHERE code = $1',
              [couponCode]
            );
          }
        }
      }

      // B. Decrement Product Variant Stock (locking products table rows via SELECT FOR UPDATE)
      for (const item of items) {
        const productResult = await client.query(
          'SELECT variants, name FROM products WHERE id = $1 FOR UPDATE',
          [item.id]
        );

        if (productResult.rows.length > 0) {
          const product = productResult.rows[0];
          let variants = product.variants || [];
          if (typeof variants === 'string') {
            try { variants = JSON.parse(variants); } catch { variants = []; }
          }
          const variantIndex = variants.findIndex(
            (v) => v.size === item.size && v.color === item.color
          );

          if (variantIndex !== -1) {
            const currentStock = variants[variantIndex].stock;
            // Only decrement if we actually have stock, webhook fails gracefully if double-billed
            const newStock = Math.max(0, currentStock - item.quantity);
            variants[variantIndex].stock = newStock;

            const totalStockLeft = variants.reduce((sum, v) => sum + (v.stock || 0), 0);
            const isOutOfStock = totalStockLeft <= 0;

            await client.query(
              'UPDATE products SET variants = $1, is_out_of_stock = $2 WHERE id = $3',
              [JSON.stringify(variants), isOutOfStock, item.id]
            );
          }
        }
      }

      // C. Update Order status
      await client.query(
        `UPDATE orders 
         SET payment_status = 'Paid', status = 'Placed', razorpay_payment_id = $1 
         WHERE id = $2`,
        [razorpayPaymentId, order.id]
      );

      await client.query('COMMIT');
      console.log(`Webhook successfully processed order ID ${order.id} as Paid.`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {}
    console.error('Webhook processing error:', error);
    // Return 500 so Razorpay retries the webhook delivery later if DB fails temporarily
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  } finally {
    client.release();
  }
}
