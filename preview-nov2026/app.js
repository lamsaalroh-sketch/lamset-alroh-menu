/* Lamset Alroh preview | rebuilt order-safe behavior, data is external and unchanged */
"use strict";
const DATA = window.LAMSET_MENU_DATA || [];
const $ = id => document.getElementById(id);
let active = null;
let cart = [];
let toastTimer;
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
}

function normalizeSearch(value) {
  return String(value || "").trim().toLowerCase().replace(/[\u0640\s]+/g, " ");
}

function numericPrice(value) {
  return Number(String(value ?? "0").replace(/[^\d]/g, "")) || 0;
}

function money(amount) {
  return Number(amount).toLocaleString("en-US") + " د.ع";
}

function itemPhoto(category,item) {
  // Only explicit item-level image paths are used; no misleading category photo as a substitute.
  return (typeof item.img === "string" && item.img.trim()) || (window.LAMSET_ITEM_IMAGES && window.LAMSET_ITEM_IMAGES[category.ar + "|" + item.ar]) || "";
}

function renderHome(filter = "") {
  const query = normalizeSearch(filter);
  const shown = DATA.filter((category) =>
    !query || normalizeSearch(category.ar + " " + category.en).includes(query)
  );
  $("categories").innerHTML = shown.map((category, i) => `
    <button class="cat" data-cat="${escapeHtml(category.ar)}" type="button" style="animation-delay:${Math.min(i, 12) * 24}ms">
      <img class="cat-image" src="${escapeHtml(category.img)}" alt="" loading="lazy" decoding="async">
      <span class="cat-text"><strong>${escapeHtml(category.ar)}</strong><small>${escapeHtml(category.en)}</small></span>
      <span class="cat-chevron" aria-hidden="true">‹</span>
    </button>
  `).join("");
  $("categories").querySelectorAll("[data-cat]").forEach((button) => {
    button.addEventListener("click", () => openCategory(button.dataset.cat));
  });
  const results = [];
  if (query) {
    DATA.forEach((category) => category.items.forEach((item) => {
      if (normalizeSearch(item.ar).includes(query)) results.push({category, item});
    }));
  }
  $("searchResults").hidden = !query;
  $("searchResultList").innerHTML = results.map(({ category,item }) => `
    <button class="result-card" type="button" data-result-cat="${escapeHtml(category.ar)}">
      <span><strong>${escapeHtml(item.ar)}</strong><small>${escapeHtml(category.ar)}</small></span>
      <span class="result-price">${money(numericPrice(item.price))}</span>
    </button>
  `).join("");
  $("searchEmpty").hidden = results.length > 0;
  $("searchResultList").querySelectorAll("[data-result-cat]").forEach((button) => {
    button.addEventListener("click", () => openCategory(button.dataset.resultCat));
  });
}


function cartQuantity(category, item) {
  const key = category.ar + "|" + item.ar;
  return cart.find(entry => entry.key === key)?.qty || 0;
}

function renderItemQuantityControl(category, item, index) {
  const count = cartQuantity(category, item);
  return `<div class="item-quantity-controls" data-item-index="${index}" data-qty="${count}">
    <button class="item-qty-button qty-minus" type="button" data-item-delta="-1" aria-label="تقليل كمية ${escapeHtml(item.ar)}">−</button>
    <output class="item-qty-number" aria-live="polite" aria-label="العدد الحالي">${count.toLocaleString("en-US")}</output>
    <button class="item-qty-button qty-plus" type="button" data-item-delta="1" aria-label="زيادة كمية ${escapeHtml(item.ar)}">+</button>
  </div>`;
}

function syncVisibleItemControls() {
  if (!active || $("page").hidden) return;
  $("items").querySelectorAll(".item-quantity-controls").forEach(control => {
    const item = active.items[Number(control.dataset.itemIndex)];
    if (!item) return;
    const count = cartQuantity(active, item);
    if (Number(control.dataset.qty) !== count) {
      control.dataset.qty = String(count);
      control.querySelector(".item-qty-number").textContent = count.toLocaleString("en-US");
      const article = control.closest(".item");
      if (article) article.classList.toggle("item-has-quantity", count > 0);
    }
  });
}

function changeItemQuantity(category, index, delta) {
  const item = category?.items[index];
  if (!item || !Number.isInteger(delta) || ![-1, 1].includes(delta)) return;
  const key = category.ar + "|" + item.ar;
  const existing = cart.find(entry => entry.key === key);
  if (!existing && delta < 0) return;
  if (!existing) {
    cart.push({key, section:category.ar, name:item.ar, price:numericPrice(item.price), qty:1});
    showToast("انضاف للسلة ✓");
  } else {
    existing.qty += delta;
    if (existing.qty <= 0) cart.splice(cart.indexOf(existing), 1);
  }
  updateCartUI();
}


function sectionIcon(name) {
  const icons={
    "المطبخ الشرقي":"🍲","المشاوي":"🍖","الشاورما":"🌯","السناكات":"🍔",
    "البيتزا":"🍕","حلا بارد":"🍰","بان كيك":"🥞","الكريب و الوافل":"🧇",
    "الايس كريم":"🍨","المشروبات الغازية":"🥤","المشروبات الساخنة":"☕",
    "العصائر والمشروبات":"🍹","ايس كوفي":"🧋","سموذي":"🍓",
    "ميلك شيك":"🥛","الاراكيل":"💨","الاراكيل الطبيعية":"🍍",
    "الموهيتو":"🍋","المكسرات":"🥜","فواكة":"🍉","عروض لمسة الروح":"🎁"
  };
  return icons[name] || "🍽️";
}


function installReviewPhotoSprites() {
  if (!Array.isArray(window.LAMSET_SPRITE_DATA) || window.LAMSET_SPRITE_DATA.length !== 6) return;
  if (document.getElementById("lamset-photo-sprite-styles")) return;
  const style = document.createElement("style");
  style.id = "lamset-photo-sprite-styles";
  style.textContent = window.LAMSET_SPRITE_DATA.map((src, n) =>
    ".item-photo-review.sheet-" + n + "{background-image:url(\\"" + src + "\");}"
  ).join("\n");
  document.head.appendChild(style);
}
function reviewPhotoIndex(category, itemIndex) {
  let i = 0;
  for (const cat of DATA) {
    if (cat === category) return i + itemIndex;
    i += cat.items.length;
  }
  return -1;
}

function renderSectionItems(filter = "") {
  if (!active) return;
  const query = normalizeSearch(filter);
  const visible = active.items.map((item, index) => ({item,index})).filter(({item}) => !query || normalizeSearch(item.ar).includes(query));
  $("items").innerHTML = visible.map(({item,index}, pos) => {
    const src = itemPhoto(active, item);
    const globalIndex = reviewPhotoIndex(active, index);
    const group = Math.floor(globalIndex / 40);
    const posWithinGroup = globalIndex % 40;
    const hasReviewPhoto = globalIndex >= 0 && Boolean(window.LAMSET_SPRITE_DATA?.[group]);
    const reviewPhoto = hasReviewPhoto
      ? `<span class="item-photo-review sheet-${group}" role="img" aria-label="صورة توضيحية لـ${escapeHtml(item.ar)}" style="background-position:${((posWithinGroup % 8) / 7 * 100).toFixed(5)}% ${(Math.floor(posWithinGroup / 8) / 4 * 100).toFixed(5)}%"></span><span class="item-photo-number">#${String(globalIndex+1).padStart(3, "0")}</span>`
      : "";
    const spriteIdx = window.LAMSET_PHOTO_SPRITE_INDEX?.[active.ar + "|" + item.ar];
    const photoTile = Number.isInteger(spriteIdx) && spriteIdx >= 0
      && !hasReviewPhoto ? `<span class="item-photo-sprite" role="img" aria-label="صورة توضيحية لـ${escapeHtml(item.ar)}" style="background-position:${((spriteIdx % 8) / 7 * 100).toFixed(5)}% ${(Math.floor(spriteIdx / 8) / 7 * 100).toFixed(5)}%"></span>`
      : "";
    return `<article class="item${cartQuantity(active, item) ? " item-has-quantity" : ""}" data-item-index="${index}" style="animation-delay:${Math.min(pos, 15) * 20}ms">
      <div class="item-media"><span class="item-placeholder" aria-hidden="true">${sectionIcon(active.ar)}</span>
        ${!hasReviewPhoto && src ? `<img class="item-photo" src="${escapeHtml(src)}" alt="${escapeHtml(item.ar)}" loading="lazy" decoding="async">` : ""}
        ${reviewPhoto}
        ${photoTile}
      </div>
      <div class="item-main">
        <div class="item-copy"><div class="name">${escapeHtml(item.ar)}</div>
          ${item.desc ? `<div class="desc">${escapeHtml(item.desc)}</div>` : ""}
          <div class="price">${money(numericPrice(item.price))}</div>
        </div>
        ${renderItemQuantityControl(active, item, index)}
      </div>
    </article>`;
  }).join("");
  $("items").querySelectorAll("img.item-photo").forEach(img => img.addEventListener("error", () => img.remove(), {once:true}));
  syncVisibleItemControls();
  $("empty").hidden = visible.length > 0;
  $("empty").textContent = query ? "ماكو صنف مطابق للبحث." : "لا توجد أصناف بهذا القسم حالياً.";
}

function openCategory(name) {
  const category = DATA.find(c => c.ar === name);
  if (!category) return;
  active = category;
  $("home").hidden = true;
  $("page").hidden = false;
  $("sectionImageImg").src = category.img;
  $("sectionImageImg").alt = category.ar;
  $("sectionTitle").textContent = category.ar;
  $("sectionText").textContent = "اختار من أصناف " + category.ar + " وأضف اللي يعجبك للسلة.";
  $("sectionSearchInput").value = "";
  renderSectionItems();
  window.scrollTo({top:0,behavior:"instant"});
}

function backHome() {
  active = null;
  $("page").hidden = true;
  $("home").hidden = false;
  $("search").value = "";
  renderHome();
  window.scrollTo({top:0,behavior:"instant"});
}

function addToCart(category,index) {
  const item = category.items[index];
  if (!item) return;
  const key = `${category.ar}|${item.ar}`;
  const found = cart.find(x => x.key === key);
  if (found) found.qty += 1;
  else cart.push({key, section: category.ar, name: item.ar, price: numericPrice(item.price), qty:1});
  updateCartUI();
  showToast("انضاف للسلة ✓");
}

function updateCartUI() {
  const count = cart.reduce((total,item) => total + item.qty,0);
  const sum = cart.reduce((total,item) => total + item.qty*item.price,0);
  $("cartSummary").textContent = "العدد: " + count.toLocaleString("en-US") + " • " + money(sum);
  $("cartBadge").textContent = count.toLocaleString("en-US");
  $("cartTotal").textContent = money(sum);
  $("checkoutSubmit").disabled = cart.length === 0;
  syncVisibleItemControls();
  $("cartRows").innerHTML = cart.length ? cart.map((item,index) => `
    <div class="cart-row">
      <div><div class="cart-row-name">${escapeHtml(item.name)}</div>
        <div class="cart-row-price">${money(item.price)} للصنف</div>
      </div>
      <div class="cart-row-right">
        <div class="cart-row-subtotal">${money(item.price*item.qty)}</div>
        <div class="qty-controls">
          <button type="button" data-qty="${index}" data-delta="-1" aria-label="تقليل كمية ${escapeHtml(item.name)}">−</button>
          <span>${item.qty.toLocaleString("en-US")}</span>
          <button type="button" data-qty="${index}" data-delta="1" aria-label="زيادة كمية ${escapeHtml(item.name)}">+</button>
        </div>
      </div>
    </div>
  `).join("") : `<p class="empty-message">السلة فارغة حالياً. ضيف صنف يعجبك من المنيو.</p>`;
  $("cartRows").querySelectorAll("[data-qty]").forEach(button => button.addEventListener("click", () => {
    changeQty(Number(button.dataset.qty), Number(button.dataset.delta));
  }));
}

function changeQty(index,delta) {
  const item = cart[index];
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart.splice(index,1);
  updateCartUI();
}

function openCart() {
  $("cartModal").hidden = false;
  $("cartModal").setAttribute("aria-hidden","false");
  document.body.classList.add("modal-open");
  updateCartUI();
  $("cartClose").focus({preventScroll:true});
}

function closeCart() {
  $("cartModal").hidden = true;
  $("cartModal").setAttribute("aria-hidden","true");
  document.body.classList.remove("modal-open");
  $("viewCart").focus({preventScroll:true});
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 1450);
}

function sendOrder(event) {
  event.preventDefault();
  if (cart.length === 0) { showToast("السلة فارغة"); return; }
  if (!$("checkoutForm").reportValidity()) return;
  const name = $("customerName").value.trim(), phone = $("customerPhone").value.trim(),
        address = $("customerAddress").value.trim(), notes = $("customerNotes").value.trim();
  const normalizedPhone = phone.replace(/[\s()\-]/g, "");
  if (!/^(?:\+?964|0)?7\d{9}$/.test(normalizedPhone)) {
    $("customerPhone").setCustomValidity("أدخل رقم موبايل عراقي صحيح، مثال 07765570707");
    $("customerPhone").reportValidity();
    return;
  }
  const lines = cart.map((item,index) =>
    `${index + 1}. ${item.name} (${item.section})\n   ${item.qty} × ${money(item.price)} = ${money(item.qty * item.price)}`
  );
  const total = cart.reduce((acc,item) => acc + item.qty*item.price,0);
  const message = [
    "🍽️ *طلب جديد | مطعم وكافيه لمسة الروح*", "",
    "👤 الاسم الكامل: " + name,
    "📞 رقم الهاتف: " + phone,
    "📍 العنوان: " + address, "",
    "🧾 *تفاصيل الطلب*", ...lines, "",
    "💰 *مجموع الأصناف: " + money(total) + "*",
    "🛵 أجور التوصيل: حسب المنطقة وتُحدد من المطعم",
    "📦 *المجموع قبل أجور التوصيل: " + money(total) + "*",
    notes ? "📝 ملاحظات: " + notes : ""
  ].filter(Boolean).join("\n");
  // Only the customer initiates WhatsApp. This preview never submits or sends orders automatically.
  window.open("https://wa.me/9647765570707?text=" + encodeURIComponent(message), "_blank", "noopener,noreferrer");
}

function init() {
  installReviewPhotoSprites();
  $("search").addEventListener("input", event => renderHome(event.target.value));
  $("sectionSearchInput").addEventListener("input", event => renderSectionItems(event.target.value));
  $("items").addEventListener("click", event => {
    const button = event.target.closest("button[data-item-delta]");
    if (!button || !active) return;
    const container = button.closest(".item-quantity-controls");
    if (!container) return;
    changeItemQuantity(active, Number(container.dataset.itemIndex), Number(button.dataset.itemDelta));
  });
  $("backBtn").addEventListener("click", backHome);
  $("viewCart").addEventListener("click", openCart);
  $("cartClose").addEventListener("click", closeCart);
  $("checkoutForm").addEventListener("submit",sendOrder);
  $("customerPhone").addEventListener("input", () => $("customerPhone").setCustomValidity(""));
  $("cartModal").addEventListener("click", event => {
    if (event.target === $("cartModal")) closeCart();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !$("cartModal").hidden) closeCart();
  });
  renderHome();
  updateCartUI();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init); else init();
