/* Lamset Alroh menu behavior — kept separate from markup and styling. */
"use strict";

const DATA = window.LAMSET_MENU_DATA;
let lang = "ar";
let active = null;
let cart = [];

const $ = (id) => document.getElementById(id);

function escapeHtml(value) {
  const entities = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };
  return String(value).replace(/[&<>"']/g, (character) => entities[character]);
}

function normalizeSearch(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\u0640\s]+/g, " ");
}

function renderHome(filter = "") {
  const query = normalizeSearch(filter);
  const categoryMatches = DATA.filter((category) =>
    !query || normalizeSearch(category.ar + " " + category.en).includes(query)
  );
  const itemMatches = [];

  if (query) {
    DATA.forEach((category) => {
      category.items.forEach((item, index) => {
        if (normalizeSearch(item.ar).includes(query)) {
          itemMatches.push({ category, item, index });
        }
      });
    });
  }

  const referenceTileMap = Array.from({ length: 20 }, (_, index) => index);

  $("categories").innerHTML = categoryMatches.map((category) => {
    const categoryIndex = DATA.indexOf(category);
    const tileIndex = category.ar === "عروض لمسة الروح"
      ? 3
      : (referenceTileMap[categoryIndex > 4 ? categoryIndex - 1 : categoryIndex] ?? categoryIndex);
    const row = Math.floor(tileIndex / 4);
    const column = tileIndex % 4;

    return `
      <button class="cat" data-cat="${escapeHtml(category.ar)}" type="button">
        <span class="cat-arrow" aria-hidden="true">‹</span>
        <span class="cat-photo" style="--ref-col:${column};--ref-row:${row}"></span>
        <div class="caption">
          <div class="ar">${escapeHtml(lang === "ar" ? category.ar : category.en)}</div>
          <div class="en">${escapeHtml(lang === "ar" ? category.en : category.ar)}</div>
        </div>
      </button>`;
  }).join("");

  document.querySelectorAll("[data-cat]").forEach((button) => {
    button.addEventListener("click", () => openCategory(button.dataset.cat));
    if (button.dataset.cat === "حلا بارد") button.classList.add("featured-cat");
  });

  const resultsBox = $("searchResults");
  const resultList = $("searchResultList");
  const empty = $("searchEmpty");

  if (query) {
    resultsBox.classList.add("show");
    resultList.innerHTML = itemMatches.map(({ category, item }) => `
      <button class="search-result" type="button" data-search-cat="${escapeHtml(category.ar)}">
        <div class="search-result-copy">
          <div class="search-result-name">${escapeHtml(item.ar)}</div>
          <div class="search-result-cat">${escapeHtml(category.ar)}</div>
        </div>
        <div class="search-result-price">${escapeHtml(item.price)} د.ع</div>
      </button>`).join("");

    empty.classList.toggle("show", itemMatches.length === 0);
    resultList.querySelectorAll("[data-search-cat]").forEach((button) => {
      button.addEventListener("click", () => openCategory(button.dataset.searchCat));
    });
  } else {
    resultsBox.classList.remove("show");
    resultList.innerHTML = "";
    empty.classList.remove("show");
  }
}

function renderSectionItems(filter = "") {
  if (!active) return;

  const query = normalizeSearch(filter);
  const items = active.items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !query || normalizeSearch(item.ar).includes(query));

  $("items").innerHTML = items.map(({ item, index }) => `
    <div class="item">
      <div class="item-main">
        <button class="add-to-cart" type="button" data-add="${index}" aria-label="إضافة إلى السلة">+</button>
        <div class="item-copy">
          <div class="name">${escapeHtml(item.ar)}</div>
          ${item.desc ? `<div class="desc">${escapeHtml(item.desc)}</div>` : ""}
          <div class="price">${escapeHtml(item.price)} د.ع</div>
        </div>
      </div>
    </div>`).join("");

  $("items").querySelectorAll("[data-add]").forEach((button) => {
    button.addEventListener("click", () => addToCart(active, Number(button.dataset.add)));
  });

  $("empty").style.display = items.length ? "none" : "block";
  $("empty").textContent = query
    ? (lang === "ar" ? "ماكو صنف مطابق للبحث." : "No matching item found.")
    : (lang === "ar"
      ? "لا توجد أصناف مضافة لهذا القسم حالياً."
      : "No items have been added to this section yet.");
}

function openCategory(name) {
  active = DATA.find((category) => category.ar === name);
  if (!active) return;

  $("home").style.display = "none";
  $("page").classList.add("show");
  $("search").value = "";
  $("sectionSearchInput").value = "";
  $("sectionImageImg").src = active.img;
  $("sectionImageImg").alt = active.ar;
  $("sectionTitle").textContent = lang === "ar" ? active.ar : active.en;
  $("sectionText").textContent = lang === "ar"
    ? `اختيارات مميزة من ${active.ar} في منيو لمسة الروح.`
    : `Featured ${active.en} selections from Lamset Alroh.`;
  $("sectionLangBtn").textContent = lang === "ar" ? "EN / العربية" : "العربية / EN";

  renderSectionItems("");
  window.scrollTo(0, 0);
}

function addToCart(section, index) {
  const item = section.items[index];
  if (!item) return;

  const key = `${section.ar}|${item.ar}`;
  const existing = cart.find((entry) => entry.key === key);

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      key,
      section: section.ar,
      name: item.ar,
      price: Number(String(item.price).replace(/,/g, "")),
      qty: 1
    });
  }

  updateCartUI();
}

function updateCartUI() {
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  $("cartSummary").textContent = `${count} أصناف • ${total.toLocaleString("en-US")} د.ع`;
  $("cartTotal").textContent = `${total.toLocaleString("en-US")} د.ع`;

  $("cartRows").innerHTML = cart.length
    ? cart.map((item) => `
      <div class="cart-row">
        <div>
          <div style="font-weight:800">${escapeHtml(item.name)}</div>
          <div class="qty">${item.qty} × ${item.price.toLocaleString("en-US")} د.ع</div>
        </div>
        <div style="font-weight:900;color:var(--gold2)">
          ${(item.price * item.qty).toLocaleString("en-US")} د.ع
        </div>
      </div>`).join("")
    : `<div class="empty" style="margin-top:0">السلة فارغة حالياً.</div>`;
}

function openCart() {
  $("cartModal").classList.add("show");
  $("cartModal").setAttribute("aria-hidden", "false");
  updateCartUI();
}

function closeCart() {
  $("cartModal").classList.remove("show");
  $("cartModal").setAttribute("aria-hidden", "true");
}

function sendOrder(event) {
  event.preventDefault();

  if (!cart.length) {
    alert("السلة فارغة، أضف الأصناف أولاً.");
    return;
  }

  const name = $("customerName").value.trim();
  const phone = $("customerPhone").value.trim();
  const address = $("customerAddress").value.trim();
  const notes = $("customerNotes").value.trim();

  if (!name || !phone || !address) {
    alert("يرجى إكمال الاسم ورقم الهاتف والعنوان.");
    return;
  }

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const orderLines = cart.map((item, index) =>
    `${index + 1}) ${item.name} — الكمية: ${item.qty} × ${item.price.toLocaleString("en-US")} د.ع = ${(item.price * item.qty).toLocaleString("en-US")} د.ع`
  );

  const message = [
    "🍽️ *طلب جديد — مطعم وكافيه لمسة الروح*",
    "",
    "👤 الاسم: " + name,
    "📞 هاتف الزبون: " + phone,
    "📍 العنوان: " + address,
    "",
    "🧾 *تفاصيل الطلب*",
    ...orderLines,
    "",
    "💰 *مجموع الأصناف: " + total.toLocaleString("en-US") + " د.ع*",
    "🛵 أجور التوصيل: تُحدد حسب المنطقة بالتنسيق مع المطعم",
    "📦 المجموع النهائي قبل التوصيل: " + total.toLocaleString("en-US") + " د.ع",
    notes ? "📝 ملاحظات: " + notes : ""
  ].filter(Boolean).join("\n");

  const url = "https://wa.me/9647765570707?text=" + encodeURIComponent(message);
  window.open(url, "_blank", "noopener,noreferrer");
}

function backHome() {
  active = null;
  $("page").classList.remove("show");
  $("home").style.display = "block";
  $("search").value = "";
  renderHome("");
  window.scrollTo(0, 0);
}

$("checkoutForm").addEventListener("submit", sendOrder);
$("viewCart").addEventListener("click", openCart);
$("cartClose").addEventListener("click", closeCart);
$("cartModal").addEventListener("click", (event) => {
  if (event.target.id === "cartModal") closeCart();
});
$("backBtn").addEventListener("click", backHome);
$("sectionSearchInput").addEventListener("input", (event) => renderSectionItems(event.target.value));

$("sectionLangBtn").addEventListener("click", () => {
  lang = lang === "ar" ? "en" : "ar";
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";

  if (active) openCategory(active.ar);
  else renderHome($("search").value);
});

$("search").addEventListener("input", (event) => {
  if (!active) renderHome(event.target.value);
});

if ($("langBtn")) {
  $("langBtn").addEventListener("click", () => {
    lang = lang === "ar" ? "en" : "ar";
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    $("langBtn").textContent = lang === "ar" ? "EN / العربية" : "العربية / EN";
    $("choose").textContent = lang === "ar" ? "اختر القسم الذي تريده" : "Choose Your Section";
    $("chooseEn").textContent = lang === "ar" ? "Choose Your Section" : "اختر القسم الذي تريده";
    $("footer").textContent = lang === "ar"
      ? "أكثر من مجرد وجبة .. إنها لمسة روح"
      : "More than a meal .. it is a touch of soul";

    if (active) openCategory(active.ar);
    else renderHome($("search").value);
  });
}

renderHome();
