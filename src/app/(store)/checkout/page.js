'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/context/StoreContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CheckoutPage() {
  const { cart, cartSubtotal, cartCount, clearCart, user, loading: sessionLoading } = useStore();
  const router = useRouter();

  // Address states
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [useSavedAddressId, setUseSavedAddressId] = useState('');
  const [addressForm, setAddressForm] = useState({
    line1: '',
    line2: '',
    city: '',
    state: '',
    postal_code: '',
    phone: '',
  });

  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  const fillFormWithAddress = (address) => {
    if (!address) return;
    setAddressForm({
      line1: address.line1 || '',
      line2: address.line2 || '',
      city: address.city || '',
      state: address.state || '',
      postal_code: address.postal_code || '',
      phone: address.phone || '',
    });
  };

  // Load saved addresses and applied coupon
  useEffect(() => {
    if (!sessionLoading && !user) {
      router.push('/login?redirect=/checkout');
      return;
    }

    if (user) {
      const fetchAddresses = async () => {
        try {
          const res = await fetch('/api/account/address');
          if (res.ok) {
            const data = await res.json();
            setSavedAddresses(data.addresses || []);
            if (data.addresses && data.addresses.length > 0) {
              setUseSavedAddressId(data.addresses[0].id.toString());
              fillFormWithAddress(data.addresses[0]);
            }
          }
        } catch (err) {
          console.error(err);
        }
      };

      fetchAddresses();
    }

    const cachedCoupon = sessionStorage.getItem('ginija_applied_coupon');
    if (cachedCoupon) {
      try {
        setAppliedCoupon(JSON.parse(cachedCoupon));
      } catch (e) {
        sessionStorage.removeItem('ginija_applied_coupon');
      }
    }
  }, [user, sessionLoading]);

  const handleSavedAddressChange = (e) => {
    const id = e.target.value;
    setUseSavedAddressId(id);
    if (id === 'new') {
      setAddressForm({
        line1: '',
        line2: '',
        city: '',
        state: '',
        postal_code: '',
        phone: '',
      });
    } else {
      const address = savedAddresses.find((a) => a.id.toString() === id);
      if (address) fillFormWithAddress(address);
    }
  };

  const handleFormChange = (e) => {
    setAddressForm({
      ...addressForm,
      [e.target.name]: e.target.value,
    });
  };


  const shippingFee = cartSubtotal >= 10000 ? 0 : 250;
  
  const getDiscountAmount = () => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.discount_type === 'percentage') {
      return (cartSubtotal * appliedCoupon.discount_value) / 100;
    } else {
      return Math.min(cartSubtotal, appliedCoupon.discount_value);
    }
  };

  const discountAmount = getDiscountAmount();
  const cartTotal = cartSubtotal - discountAmount + shippingFee;

  // Load Razorpay Script helper
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;

    setPaymentLoading(true);
    setPaymentError('');

    try {
      // 1. Create order record on server-side
      const orderRes = await fetch('/api/checkout/razorpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          couponCode: appliedCoupon ? appliedCoupon.code : null,
          shippingAddress: addressForm,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.error || 'Failed to place order.');
      }

      // 2. Process payment (Mock vs. Real)
      if (orderData.mock) {
        // Development Mock Payment path
        console.log('Mock payment path triggered.');
        // Simulate immediate verify endpoint call
        const verifyRes = await fetch('/api/checkout/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: orderData.razorpay_order_id,
            razorpay_payment_id: 'pay_mock_' + Math.random().toString(36).substring(2, 10),
            razorpay_signature: 'sig_mock_verified',
            order_id: orderData.order_id,
          }),
        });

        if (verifyRes.ok) {
          clearCart();
          sessionStorage.removeItem('ginija_applied_coupon');
          router.push(`/checkout/success?orderId=${orderData.order_id}`);
        } else {
          const verifyData = await verifyRes.json();
          throw new Error(verifyData.error || 'Mock transaction verification failed.');
        }
      } else {
        // Real Razorpay Flow
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          throw new Error('Failed to load Razorpay payment client. Are you online?');
        }

        const options = {
          key: orderData.key_id,
          amount: orderData.amount,
          currency: orderData.currency,
          name: 'House Of Ginija',
          description: 'Timeless Archival Couture',
          image: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=80&auto=format&fit=crop&q=80',
          order_id: orderData.razorpay_order_id,
          handler: async function (response) {
            setPaymentLoading(true);
            try {
              const verifyRes = await fetch('/api/checkout/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  order_id: orderData.order_id,
                }),
              });

              if (verifyRes.ok) {
                clearCart();
                sessionStorage.removeItem('ginija_applied_coupon');
                router.push(`/checkout/success?orderId=${orderData.order_id}`);
              } else {
                const verifyData = await verifyRes.json();
                setPaymentError(verifyData.error || 'Payment signature validation failed.');
                setPaymentLoading(false);
              }
            } catch (err) {
              console.error(err);
              setPaymentError('Verification response error.');
              setPaymentLoading(false);
            }
          },
          prefill: {
            name: user.name,
            email: user.email,
            contact: addressForm.phone,
          },
          theme: {
            color: '#000000', // Deep Plum
          },
          modal: {
            ondismiss: function () {
              setPaymentLoading(false);
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (err) {
      console.error(err);
      setPaymentError(err.message || 'An error occurred during payment.');
      setPaymentLoading(false);
    }
  };

  if (sessionLoading || !user) {
    return <div style={loadingContainerStyle}>Accessing secured checkout...</div>;
  }

  return (
    <div style={pageStyle} className="container animate-fade-in">
      <h1 style={titleStyle}>Checkout</h1>
      <div style={dividerStyle}></div>

      {cart.length === 0 ? (
        <div style={emptyStateStyle}>
          <p>Your shopping bag is empty. Please add items before checking out.</p>
          <Link href="/collections" style={shopBtnStyle}>Explore Creations</Link>
        </div>
      ) : (
        <div style={layoutGridStyle} className="checkout-layout-grid">
          {/* Left: Address details Form */}
          <form onSubmit={handlePayment} style={formStyle} className="checkout-form-box">
            <h3 style={sectionTitleStyle}>Shipping Address</h3>
            
            {savedAddresses.length > 0 && (
              <div style={formGroupStyle}>
                <label style={labelStyle}>Use Saved Address</label>
                <select
                  value={useSavedAddressId}
                  onChange={handleSavedAddressChange}
                  style={selectStyle}
                >
                  {savedAddresses.map((addr) => (
                    <option key={addr.id} value={addr.id.toString()}>
                      {addr.line1}, {addr.city} ({addr.type})
                    </option>
                  ))}
                  <option value="new">-- Ship to a New Address --</option>
                </select>
              </div>
            )}

            <div style={formRowStyle} className="checkout-form-row">
              <div style={{ ...formGroupStyle, flex: 1 }}>
                <label style={labelStyle}>Address Line 1</label>
                <input
                  type="text"
                  name="line1"
                  value={addressForm.line1}
                  onChange={handleFormChange}
                  style={inputStyle}
                  required
                  placeholder="Street name, suite, flat number"
                  disabled={useSavedAddressId !== 'new' && savedAddresses.length > 0}
                />
              </div>
            </div>

            <div style={formRowStyle} className="checkout-form-row">
              <div style={{ ...formGroupStyle, flex: 1 }}>
                <label style={labelStyle}>Address Line 2 (Optional)</label>
                <input
                  type="text"
                  name="line2"
                  value={addressForm.line2}
                  onChange={handleFormChange}
                  style={inputStyle}
                  placeholder="Apartment, unit, landmark"
                  disabled={useSavedAddressId !== 'new' && savedAddresses.length > 0}
                />
              </div>
            </div>

            <div style={formRowStyle} className="checkout-form-row">
              <div style={{ ...formGroupStyle, flex: 1 }}>
                <label style={labelStyle}>City</label>
                <input
                  type="text"
                  name="city"
                  value={addressForm.city}
                  onChange={handleFormChange}
                  style={inputStyle}
                  required
                  placeholder="City"
                  disabled={useSavedAddressId !== 'new' && savedAddresses.length > 0}
                />
              </div>
              <div style={{ ...formGroupStyle, flex: 1 }}>
                <label style={labelStyle}>State</label>
                <input
                  type="text"
                  name="state"
                  value={addressForm.state}
                  onChange={handleFormChange}
                  style={inputStyle}
                  required
                  placeholder="State"
                  disabled={useSavedAddressId !== 'new' && savedAddresses.length > 0}
                />
              </div>
            </div>

            <div style={formRowStyle} className="checkout-form-row">
              <div style={{ ...formGroupStyle, flex: 1 }}>
                <label style={labelStyle}>Postal Code</label>
                <input
                  type="text"
                  name="postal_code"
                  value={addressForm.postal_code}
                  onChange={handleFormChange}
                  style={inputStyle}
                  required
                  placeholder="PIN code"
                  disabled={useSavedAddressId !== 'new' && savedAddresses.length > 0}
                />
              </div>
              <div style={{ ...formGroupStyle, flex: 1 }}>
                <label style={labelStyle}>Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={addressForm.phone}
                  onChange={handleFormChange}
                  style={inputStyle}
                  required
                  placeholder="10-digit number with area code"
                  disabled={useSavedAddressId !== 'new' && savedAddresses.length > 0}
                />
              </div>
            </div>

            {paymentError && <div style={errorBannerStyle}>{paymentError}</div>}

            <button
              type="submit"
              style={paymentLoading ? disabledSubmitBtnStyle : submitBtnStyle}
              disabled={paymentLoading}
            >
              {paymentLoading ? 'Processing Payment...' : `Authorize Payment • ₹${cartTotal.toLocaleString('en-IN')}`}
            </button>
          </form>

          {/* Right: Order Summary */}
          <div style={summaryPanelStyle}>
            <div style={cardStyle}>
              <h3 style={summaryTitleStyle}>Order Review ({cartCount} Items)</h3>
              <div style={summaryDividerStyle}></div>

              <div style={itemsListStyle}>
                {cart.map((item) => (
                  <div key={`${item.id}-${item.size}-${item.color}`} style={itemRowStyle}>
                    <img src={item.image} alt={item.name} style={itemImgStyle} loading="lazy" />
                    <div style={itemInfoStyle}>
                      <span style={itemNameStyle}>{item.name}</span>
                      <span style={itemMetaStyle}>Size: {item.size} | Color: {item.color} | Qty: {item.quantity}</span>
                      <span style={itemPriceStyle}>₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                ))}
              </div>



              <div style={summaryDividerStyle}></div>

              <div style={pricingRowStyle}>
                <span>Subtotal</span>
                <span>₹{cartSubtotal.toLocaleString('en-IN')}</span>
              </div>

              <div style={pricingRowStyle}>
                <span>Shipping</span>
                <span>{shippingFee === 0 ? 'Free' : `₹${shippingFee}`}</span>
              </div>

              {appliedCoupon && (
                <div style={pricingRowStyle}>
                  <span style={pinkTextStyle}>Discount ({appliedCoupon.code})</span>
                  <span style={pinkTextStyle}>- ₹{discountAmount.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div style={summaryDividerStyle}></div>

              <div style={totalRowStyle}>
                <span>Grand Total</span>
                <span>₹{cartTotal.toLocaleString('en-IN')}</span>
              </div>

              <div style={securePanelStyle}>
                <span style={secureIconStyle}>🛡️</span>
                <span style={secureTextStyle}>Secure payment handled by Razorpay. SSL encrypted transactions.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline styles for Checkout Page
const pageStyle = {
  paddingTop: '3rem',
  paddingBottom: '6rem',
  backgroundColor: '#FFFFFF',
};

const titleStyle = {
  fontSize: '2.5rem',
  fontFamily: 'var(--font-serif)',
  color: '#D98E9B',
  textAlign: 'center',
  fontWeight: '400',
};

const dividerStyle = {
  width: '60px',
  height: '1px',
  backgroundColor: '#D98E9B',
  margin: '1.2rem auto 2.5rem auto',
};

const loadingContainerStyle = {
  textAlign: 'center',
  padding: '10rem 0',
  color: '#000000',
  fontSize: '1.2rem',
  fontFamily: 'var(--font-serif)',
};

const emptyStateStyle = {
  textAlign: 'center',
  padding: '5rem 1rem',
};

const shopBtnStyle = {
  display: 'inline-block',
  marginTop: '1.5rem',
  backgroundColor: '#D98E9B',
  color: '#000000',
  padding: '0.6rem 2rem',
  borderRadius: '999px',
};

const layoutGridStyle = {
  display: 'grid',
  gridTemplateColumns: '1.2fr 1fr',
  gap: '4rem',
  alignItems: 'start',
};

const formStyle = {
  backgroundColor: '#FFFFFF',
  padding: '2.5rem',
  borderRadius: '8px',
  border: '1px solid rgba(139, 119, 137, 0.12)',
  boxShadow: 'var(--shadow-sm)',
};

const sectionTitleStyle = {
  fontFamily: 'var(--font-serif)',
  fontSize: '1.6rem',
  color: '#D98E9B',
  marginBottom: '1.8rem',
  fontWeight: '400',
};

const formRowStyle = {
  display: 'flex',
  gap: '1rem',
  width: '100%',
  marginBottom: '1rem',
};

const formGroupStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem',
  marginBottom: '1rem',
};

const labelStyle = {
  fontSize: '0.72rem',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#000000',
  fontWeight: '700',
};

const inputStyle = {
  padding: '0.75rem',
  border: '1px solid rgba(139, 119, 137, 0.25)',
  borderRadius: '4px',
};

const selectStyle = {
  padding: '0.75rem',
  border: '1px solid rgba(139, 119, 137, 0.25)',
  borderRadius: '4px',
  backgroundColor: '#FFFFFF',
};

const errorBannerStyle = {
  backgroundColor: '#FFFFFF',
  color: '#000000',
  padding: '0.8rem 1rem',
  borderRadius: '4px',
  fontSize: '0.8rem',
  marginBottom: '1.5rem',
  border: '1px solid #ffcdd2',
};

const submitBtnStyle = {
  width: '100%',
  backgroundColor: '#D98E9B',
  color: '#000000',
  padding: '1.1rem',
  fontSize: '0.9rem',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  borderRadius: '4px',
  boxShadow: 'var(--shadow-md)',
  marginTop: '1rem',
};

const disabledSubmitBtnStyle = {
  ...submitBtnStyle,
  backgroundColor: 'rgba(60, 48, 58, 0.15)',
  color: '#000000',
  cursor: 'not-allowed',
  boxShadow: 'none',
};

const summaryPanelStyle = {
  display: 'flex',
  flexDirection: 'column',
};

const cardStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: '8px',
  padding: '2rem',
  border: '1px solid rgba(139, 119, 137, 0.15)',
};

const summaryTitleStyle = {
  fontFamily: 'var(--font-sans)',
  fontSize: '0.9rem',
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  color: '#D98E9B',
  fontWeight: '700',
};

const summaryDividerStyle = {
  height: '1px',
  backgroundColor: 'rgba(139, 119, 137, 0.15)',
  margin: '1.2rem 0',
};

const itemsListStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  maxHeight: '300px',
  overflowY: 'auto',
  paddingRight: '0.5rem',
};

const itemRowStyle = {
  display: 'flex',
  gap: '1rem',
  alignItems: 'center',
  paddingBottom: '0.8rem',
  borderBottom: '1px solid rgba(139, 119, 137, 0.08)',
};

const itemImgStyle = {
  width: '55px',
  height: '65px',
  objectFit: 'cover',
  borderRadius: '4px',
};

const itemInfoStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.15rem',
};

const itemNameStyle = {
  fontSize: '0.85rem',
  fontWeight: '600',
  color: '#000000',
};

const itemMetaStyle = {
  fontSize: '0.72rem',
  color: '#000000',
};

const itemPriceStyle = {
  fontSize: '0.8rem',
  fontWeight: '700',
  color: '#000000',
};

const giftBoxStyle = {
  display: 'flex',
  gap: '0.8rem',
  backgroundColor: '#FFFFFF',
  padding: '0.8rem 1rem',
  borderRadius: '4px',
  border: '1px solid #D98E9B',
  marginTop: '1rem',
};

const giftIconStyle = {
  color: '#000000',
  fontSize: '1rem',
};

const giftTitleStyle = {
  fontSize: '0.78rem',
  fontWeight: '700',
  color: '#D98E9B',
  display: 'block',
};

const giftMetaStyle = {
  fontSize: '0.7rem',
  color: '#000000',
};

const pricingRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '0.85rem',
  color: '#000000',
  marginBottom: '0.6rem',
};

const pinkTextStyle = {
  color: '#000000',
  fontWeight: '600',
};

const totalRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '1.2rem',
  fontWeight: '700',
  color: '#000000',
};

const securePanelStyle = {
  display: 'flex',
  gap: '0.6rem',
  marginTop: '1.8rem',
  backgroundColor: 'rgba(255,255,255,0.3)',
  padding: '0.8rem',
  borderRadius: '4px',
};

const secureIconStyle = {
  fontSize: '1rem',
};

const secureTextStyle = {
  fontSize: '0.7rem',
  color: '#000000',
  lineHeight: 1.4,
};
