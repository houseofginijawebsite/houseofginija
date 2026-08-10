import { NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';
import pool from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyJWT(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Retrieve user orders from Postgres
    const result = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY id DESC',
      [decoded.id]
    );

    const orders = result.rows.map((order) => {
      let items = order.items;
      if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch { items = []; }
      }
      let shippingAddress = order.shipping_address;
      if (typeof shippingAddress === 'string') {
        try { shippingAddress = JSON.parse(shippingAddress); } catch {}
      }
      return {
        ...order,
        items: Array.isArray(items) ? items : [],
        shipping_address: shippingAddress,
      };
    });

    // Fetch product images for order items to display thumbnails
    const allProductIds = [
      ...new Set(
        orders
          .flatMap((o) => (Array.isArray(o.items) ? o.items : []).map((i) => Number.parseInt(i.id, 10)))
          .filter(Number.isInteger)
      ),
    ];
    
    if (allProductIds.length > 0) {
      const prodRes = await pool.query(
        'SELECT id, images FROM products WHERE id = ANY($1::int[])',
        [allProductIds]
      );
      
      const productImagesMap = prodRes.rows.reduce((acc, p) => {
        let images = p.images;
        if (typeof images === 'string') {
          try { images = JSON.parse(images); } catch { images = []; }
        }
        acc[p.id] = Array.isArray(images) && images.length > 0 ? images[0] : null;
        return acc;
      }, {});

      for (const order of orders) {
        if (order.items && Array.isArray(order.items)) {
          for (const item of order.items) {
            if (!item.image) {
              item.image = productImagesMap[item.id] || null;
            }
          }
        }
      }
    }

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Fetch account orders error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
