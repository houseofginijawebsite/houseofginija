'use client';

// Trigger build after Vercel unpause

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const StoreContext = createContext();

export function StoreProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [jewelleryEnabled, setJewelleryEnabledState] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('houseofginija_jewellery_enabled');
      if (stored === 'false') return false;
      if (stored === 'true') return true;
    }
    return true;
  });
  const router = useRouter();

  const setJewelleryEnabled = (val) => {
    setJewelleryEnabledState(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('houseofginija_jewellery_enabled', val ? 'true' : 'false');
    }
  };

  const applySettings = (settings) => {
    if (!settings || settings.jewellery_enabled === undefined || settings.jewellery_enabled === null) {
      return;
    }

    const enabled = settings.jewellery_enabled === true || settings.jewellery_enabled === 'true';
    setJewelleryEnabledState(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('houseofginija_jewellery_enabled', enabled ? 'true' : 'false');
    }
  };

  const syncSettings = () => {
    fetch('/api/homepage?t=' + Date.now(), { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.jewellery_enabled !== undefined && data.jewellery_enabled !== null) {
          // DB returns string "true"/"false", API may return boolean true/false — handle both
          const enabled = data.jewellery_enabled === true || data.jewellery_enabled === 'true';
          setJewelleryEnabledState(enabled);
          if (typeof window !== 'undefined') {
            localStorage.setItem('houseofginija_jewellery_enabled', enabled ? 'true' : 'false');
          }
        }
      })
      .catch(() => {});
  };

  // Load initial settings and set up real-time sync listeners
  useEffect(() => {
    syncSettings();

    if (typeof window !== 'undefined') {
      const handleStorage = (e) => {
        if (e.key === 'houseofginija_jewellery_enabled' || !e.key) {
          const val = localStorage.getItem('houseofginija_jewellery_enabled');
          if (val === 'false') setJewelleryEnabledState(false);
          if (val === 'true') setJewelleryEnabledState(true);
        }
      };

      window.addEventListener('storage', handleStorage);
      window.addEventListener('houseofginija_settings_updated', syncSettings);

      let channel;
      try {
        channel = new BroadcastChannel('houseofginija-catalog-sync');
        channel.onmessage = (event) => {
          if (event.data?.type === 'settings-updated') {
            applySettings(event.data.settings);
            syncSettings();
          }
        };
      } catch {}

      const interval = setInterval(syncSettings, 3000);

      return () => {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener('houseofginija_settings_updated', syncSettings);
        if (channel) channel.close();
        clearInterval(interval);
      };
    }
  }, []);

  // Load cart, wishlist and session on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkSession = async () => {
        try {
          const res = await fetch('/api/auth/me');
          if (res.ok) {
            const data = await res.json();
            if (data.user) {
              setUser(data.user);
              // Load user-specific cart and wishlist
              const userCartKey = data.user.role === 'admin' ? null : `ginija_cart_${data.user.id}`;
              const userWishlistKey = data.user.role === 'admin' ? null : `ginija_wishlist_${data.user.id}`;

              if (userCartKey) {
                const storedCart = localStorage.getItem(userCartKey);
                if (storedCart) {
                  try {
                    setCart(JSON.parse(storedCart));
                  } catch (e) {
                    setCart([]);
                  }
                } else {
                  // Migrate guest cart if it has items
                  const guestCart = localStorage.getItem('ginija_cart_guest') || localStorage.getItem('ginija_cart');
                  if (guestCart) {
                    try {
                      setCart(JSON.parse(guestCart));
                      localStorage.setItem(userCartKey, guestCart);
                    } catch (e) {
                      setCart([]);
                    }
                  } else {
                    setCart([]);
                  }
                }
              } else {
                setCart([]); // Admin has no cart
              }

              if (userWishlistKey) {
                const storedWishlist = localStorage.getItem(userWishlistKey);
                if (storedWishlist) {
                  try {
                    setWishlist(JSON.parse(storedWishlist));
                  } catch (e) {
                    setWishlist([]);
                  }
                } else {
                  const guestWishlist = localStorage.getItem('ginija_wishlist_guest') || localStorage.getItem('ginija_wishlist');
                  if (guestWishlist) {
                    try {
                      setWishlist(JSON.parse(guestWishlist));
                      localStorage.setItem(userWishlistKey, guestWishlist);
                    } catch (e) {
                      setWishlist([]);
                    }
                  } else {
                    setWishlist([]);
                  }
                }
              } else {
                setWishlist([]); // Admin has no wishlist
              }

              // Background sync to ensure localStorage isn't out of sync with database
              if (data.user.role !== 'admin') {
                fetch('/api/account/wishlist').then(res => {
                  if (!res.ok) throw new Error('Network response was not ok');
                  return res.json();
                }).then(wishlistData => {
                  if (wishlistData.wishlist) {
                    setWishlist(wishlistData.wishlist);
                    localStorage.setItem(userWishlistKey, JSON.stringify(wishlistData.wishlist));
                  }
                }).catch(e => console.error('Background wishlist sync failed', e));
              }
            } else {
              loadGuestData();
            }
          } else {
            loadGuestData();
          }
        } catch (err) {
          console.error('Failed to fetch session:', err);
          loadGuestData();
        } finally {
          setLoading(false);
        }
      };

      const loadGuestData = () => {
        const guestCart = localStorage.getItem('ginija_cart_guest') || localStorage.getItem('ginija_cart');
        const guestWishlist = localStorage.getItem('ginija_wishlist_guest') || localStorage.getItem('ginija_wishlist');

        if (guestCart) {
          try {
            setCart(JSON.parse(guestCart));
          } catch (e) {
            setCart([]);
          }
        } else {
          setCart([]);
        }

        if (guestWishlist) {
          try {
            setWishlist(JSON.parse(guestWishlist));
          } catch (e) {
            setWishlist([]);
          }
        } else {
          setWishlist([]);
        }
      };

      checkSession();
    }
  }, []);

  // Sync cart to localstorage on change
  useEffect(() => {
    if (typeof window !== 'undefined' && !loading) {
      const key = !user ? 'ginija_cart_guest' : user.role === 'admin' ? null : `ginija_cart_${user.id}`;
      if (key) {
        localStorage.setItem(key, JSON.stringify(cart));
        if (!user) {
          localStorage.setItem('ginija_cart', JSON.stringify(cart));
        }
      }
    }
  }, [cart, user, loading]);

  // Sync wishlist to localstorage on change
  useEffect(() => {
    if (typeof window !== 'undefined' && !loading) {
      const key = !user ? 'ginija_wishlist_guest' : user.role === 'admin' ? null : `ginija_wishlist_${user.id}`;
      if (key) {
        localStorage.setItem(key, JSON.stringify(wishlist));
        if (!user) {
          localStorage.setItem('ginija_wishlist', JSON.stringify(wishlist));
        }
      }
    }
  }, [wishlist, user, loading]);

  // Cart actions
  const addToCart = (product, size, color, quantity = 1) => {
    // Find the variant stock
    const matchingVariant = product.variants && product.variants.find(
      v => (v.size || '') === (size || '') && (v.color || '') === (color || '')
    );
    const stock = matchingVariant ? matchingVariant.stock : 10;
    
    // Check if adding exceeds stock
    const existingItem = cart.find(
      item => Number(item.id) === Number(product.id) && 
              (item.size || '') === (size || '') && 
              (item.color || '') === (color || '')
    );
    const alreadyInCart = existingItem ? existingItem.quantity : 0;

    if (alreadyInCart + quantity > stock) {
      return;
    }

    setCart((prevCart) => {
      // Find if item with same ID, size and color already exists
      const existingItemIndex = prevCart.findIndex(
        (item) => Number(item.id) === Number(product.id) && 
                  (item.size || '') === (size || '') && 
                  (item.color || '') === (color || '')
      );

      if (existingItemIndex > -1) {
        const newCart = [...prevCart];
        newCart[existingItemIndex] = {
          ...newCart[existingItemIndex],
          quantity: newCart[existingItemIndex].quantity + quantity
        };
        return newCart;
      } else {
        return [
          ...prevCart,
          {
            id: product.id,
            slug: product.slug,
            name: product.name,
            price: (product.flash_sale && product.flash_sale_price) 
              ? parseFloat(product.flash_sale_price) 
              : parseFloat(product.price),
            original_price: parseFloat(product.price),
            flash_sale: product.flash_sale || false,
            image: product.images[0] || '',
            images: product.images || [],
            size,
            color,
            quantity,
            stock, // Store stock inside cart item for update checks
          },
        ];
      }
    });
    
    // Add micro-interaction: Confetti / Sparkle burst on Add to Cart
    triggerSparkleConfetti();
  };

  const removeFromCart = (productId, size, color) => {
    setCart((prevCart) =>
      prevCart.filter(
        (item) => !(
          Number(item.id) === Number(productId) && 
          (item.size || '') === (size || '') && 
          (item.color || '') === (color || '')
        )
      )
    );
  };

  const updateCartQuantity = (productId, size, color, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId, size, color);
      return;
    }
    
    let stockExceeded = false;
    let availableStock = 10;

    setCart((prevCart) => {
      // Find the item first to check stock
      const targetItem = prevCart.find(
        (item) => Number(item.id) === Number(productId) && 
                  (item.size || '') === (size || '') && 
                  (item.color || '') === (color || '')
      );
      if (targetItem) {
        const itemStock = targetItem.stock !== undefined ? targetItem.stock : 10;
        if (quantity > itemStock) {
          stockExceeded = true;
          availableStock = itemStock;
          return prevCart; // Do not update state if exceeded
        }
      }

      return prevCart.map((item) =>
        Number(item.id) === Number(productId) && 
        (item.size || '') === (size || '') && 
        (item.color || '') === (color || '')
          ? { ...item, quantity }
          : item
      );
    });
  };

  const clearCart = () => {
    setCart([]);
  };

  // Wishlist actions
  const toggleWishlist = async (productId) => {
    setWishlist(prevWishlist => {
      if (prevWishlist.includes(productId)) {
        return prevWishlist.filter((id) => id !== productId);
      } else {
        return [...prevWishlist, productId];
      }
    });

    // If logged in, sync with database
    if (user) {
      try {
        await fetch('/api/account/wishlist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ productId }),
        });
      } catch (err) {
        console.error('Failed to sync wishlist with database:', err);
      }
    }
  };

  // Auth actions
  const login = async (userData) => {
    setUser(userData);
    if (typeof window !== 'undefined') {
      const userCartKey = userData.role === 'admin' ? null : `ginija_cart_${userData.id}`;
      const userWishlistKey = userData.role === 'admin' ? null : `ginija_wishlist_${userData.id}`;

      if (userCartKey) {
        const storedCart = localStorage.getItem(userCartKey);
        if (storedCart) {
          try {
            const parsedStoredCart = JSON.parse(storedCart);
            let mergedCart = [...parsedStoredCart];
            
            for (const guestItem of cart) {
              const existingIndex = mergedCart.findIndex(
                (item) => Number(item.id) === Number(guestItem.id) && 
                          (item.size || '') === (guestItem.size || '') && 
                          (item.color || '') === (guestItem.color || '')
              );
              
              if (existingIndex > -1) {
                const stock = guestItem.stock || 10;
                mergedCart[existingIndex].quantity = Math.min(mergedCart[existingIndex].quantity + guestItem.quantity, stock);
              } else {
                mergedCart.push(guestItem);
              }
            }
            setCart(mergedCart);
            localStorage.setItem(userCartKey, JSON.stringify(mergedCart));
          } catch (e) {
            console.error('Failed to merge cart', e);
          }
        } else {
          localStorage.setItem(userCartKey, JSON.stringify(cart));
        }
      } else {
        setCart([]); // Admin has no cart
      }

      if (userWishlistKey) {
        try {
          const res = await fetch('/api/account/wishlist/merge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guestWishlist: wishlist }),
          });
          
          if (res.ok) {
            const data = await res.json();
            setWishlist(data.wishlist || []);
            localStorage.setItem(userWishlistKey, JSON.stringify(data.wishlist || []));
          } else {
            // Fallback
             const storedWishlist = localStorage.getItem(userWishlistKey);
             if (storedWishlist) {
               try { setWishlist(JSON.parse(storedWishlist)); } catch (e) {}
             } else {
               localStorage.setItem(userWishlistKey, JSON.stringify(wishlist));
             }
          }
        } catch (e) {
          console.error('Failed to merge wishlist with server', e);
        }
      } else {
        setWishlist([]); // Admin has no wishlist
      }

      // Clear guest local storage
      localStorage.removeItem('ginija_cart_guest');
      localStorage.removeItem('ginija_wishlist_guest');
    }
    router.refresh();
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      // Restore guest cart
      if (typeof window !== 'undefined') {
        const guestCart = localStorage.getItem('ginija_cart_guest') || localStorage.getItem('ginija_cart');
        const guestWishlist = localStorage.getItem('ginija_wishlist_guest') || localStorage.getItem('ginija_wishlist');
        try {
          setCart(guestCart ? JSON.parse(guestCart) : []);
        } catch (e) {
          setCart([]);
        }
        try {
          setWishlist(guestWishlist ? JSON.parse(guestWishlist) : []);
        } catch (e) {
          setWishlist([]);
        }
      } else {
        setCart([]);
        setWishlist([]);
      }
      router.push('/');
      router.refresh();
    } catch (err) {
      console.error('Failed to logout:', err);
    }
  };

  // Micro-interaction helper for celebratory sparkles
  const triggerSparkleConfetti = () => {
    if (typeof window === 'undefined') return;
    const body = document.body;
    
    for (let i = 0; i < 20; i++) {
      const sparkle = document.createElement('div');
      sparkle.classList.add('sparkle');
      
      const size = Math.random() * 8 + 4;
      sparkle.style.width = `${size}px`;
      sparkle.style.height = `${size}px`;
      
      // Spawn near bottom right where toast/feedback might be, or center of viewport
      sparkle.style.left = `${window.innerWidth / 2 + (Math.random() - 0.5) * 150}px`;
      sparkle.style.top = `${window.innerHeight / 2 + (Math.random() - 0.5) * 150}px`;
      
      sparkle.style.setProperty('--x', `${(Math.random() - 0.5) * 200}px`);
      sparkle.style.setProperty('--y', `${(Math.random() - 0.5) * 200}px`);
      
      body.appendChild(sparkle);
      
      setTimeout(() => {
        sparkle.remove();
      }, 1000);
    }
  };

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartSubtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);

  return (
    <StoreContext.Provider
      value={{
        cart,
        cartCount,
        cartSubtotal,
        wishlist,
        user,
        loading,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        toggleWishlist,
        login,
        logout,
        triggerSparkleConfetti,
        isLoginOpen,
        setIsLoginOpen,
        jewelleryEnabled,
        setJewelleryEnabled,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
