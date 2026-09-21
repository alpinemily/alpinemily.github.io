const CART_KEY = "cart";

function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch {
    // localStorage unavailable (private browsing, etc.) — cart just won't persist
  }
  updateCartBadge();
}

function addToCart(item) {
  const cart = getCart();
  const existing = cart.find(
    (i) => i.productId === item.productId && i.sizeId === item.sizeId && i.sourceImage === item.sourceImage,
  );
  if (existing) {
    existing.qty += item.qty;
  } else {
    cart.push(item);
  }
  saveCart(cart);
}

function updateCartQty(index, qty) {
  const cart = getCart();
  if (!cart[index]) return;
  if (qty <= 0) {
    cart.splice(index, 1);
  } else {
    cart[index].qty = qty;
  }
  saveCart(cart);
}

function removeFromCart(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
}

function clearCart() {
  saveCart([]);
}

function cartCount() {
  return getCart().reduce((sum, i) => sum + i.qty, 0);
}

function cartTotal() {
  return getCart().reduce((sum, i) => sum + i.price * i.qty, 0);
}

function updateCartBadge() {
  const badge = document.getElementById("cart-badge");
  if (!badge) return;
  const count = cartCount();
  const navItem = document.getElementById("cart-nav-item");
  if (navItem) navItem.hidden = count === 0;
  badge.textContent = count > 0 ? `Cart (${count})` : "Cart";
}

document.addEventListener("DOMContentLoaded", updateCartBadge);
