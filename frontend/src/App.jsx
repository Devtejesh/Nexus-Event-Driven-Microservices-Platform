import { useEffect, useState } from "react";
import { loginUser, registerUser } from "./api";
import { messages } from "./messages";
import { products } from "./products";
import "./App.css";

const languages = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिन्दी" },
  { value: "te", label: "తెలుగు" },
];

const demoRows = [
  { name: "CF-DEMO-1042", value: "₹355" },
  { name: "CF-DEMO-1041", value: "₹320" },
  { name: "CF-DEMO-1040", value: "₹240" },
  { name: "CF-DEMO-1039", value: "₹195" },
];

function readStorage(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function money(amount, language) {
  const locales = { en: "en-IN", hi: "hi-IN", te: "te-IN" };
  return new Intl.NumberFormat(locales[language] || "en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function weightLabel(grams, language) {
  const labels = {
    en: ["g", "kg"],
    hi: ["ग्राम", "किग्रा"],
    te: ["గ్రా", "కిలో"],
  };
  const [gram, kilo] = labels[language] || labels.en;
  return grams >= 1000 ? `${Number((grams / 1000).toFixed(2))} ${kilo}` : `${grams} ${gram}`;
}

function Icon({ name, size = 18 }) {
  const paths = {
    bag: <><path d="M5 8h14l1 13H4L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    minus: <path d="M5 12h14" />,
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m8 10 4 4 4-4" />,
    leaf: <><path d="M20 4c-8 0-14 3-14 10a6 6 0 0 0 6 6c7 0 10-6 8-16Z" /><path d="M4 21c3-5 7-8 12-11" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    box: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="M3 8v9l9 5 9-5V8" /><path d="M12 13v9" /></>,
    chart: <><path d="M4 19V5" /><path d="M4 19h17" /><path d="m7 15 4-4 3 2 5-6" /></>,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 5a3 3 0 0 1 0 6" /><path d="M18 14a5 5 0 0 1 3 5" /></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>,
    filter: <><path d="M4 6h16" /><path d="M7 12h10" /><path d="M10 18h4" /></>,
    logout: <><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name] || paths.leaf}</svg>;
}

function App() {
  const [language, setLanguage] = useState(() => localStorage.getItem("chickenfresh-language") || "en");
  const [screen, setScreen] = useState("home");
  const [cart, setCart] = useState(() => readStorage("chickenfresh-cart", []));
  const [selectedProductId, setSelectedProductId] = useState(products[0].id);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("featured");
  const [weightByProduct, setWeightByProduct] = useState({});
  const [customWeight, setCustomWeight] = useState(500);
  const [detailQuantity, setDetailQuantity] = useState(1);
  const [promoInput, setPromoInput] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [toast, setToast] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loggedIn, setLoggedIn] = useState(Boolean(localStorage.getItem("token")));
  const [adminSection, setAdminSection] = useState("overview");
  const [demoOrder, setDemoOrder] = useState(null);

  const text = (key) => messages[language]?.[key] || messages.en[key] || key;
  const selectedProduct = products.find((product) => product.id === selectedProductId) || products[0];
  const subtotal = cart.reduce((sum, item) => {
    const product = products.find((entry) => entry.id === item.productId);
    return sum + (product ? Math.round(product.pricePerKg * item.weightGrams / 1000) * item.quantity : 0);
  }, 0);
  const deliveryFee = subtotal === 0 || subtotal >= 500 ? 0 : 40;
  const discount = promoApplied && subtotal > 0 ? 50 : 0;
  const total = Math.max(0, subtotal + deliveryFee - discount);

  useEffect(() => localStorage.setItem("chickenfresh-cart", JSON.stringify(cart)), [cart]);
  useEffect(() => localStorage.setItem("chickenfresh-language", language), [language]);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function notify(message) {
    setToast(message);
  }

  function openProduct(productId) {
    setSelectedProductId(productId);
    setCustomWeight(500);
    setDetailQuantity(1);
    setScreen("details");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function addToCart(productId, weightGrams, quantity = 1) {
    const product = products.find((entry) => entry.id === productId);
    if (!product || weightGrams < 100 || weightGrams > 10000 || quantity < 1) return;
    const key = `${productId}-${weightGrams}`;
    setCart((current) => {
      const existing = current.find((item) => item.key === key);
      if (existing) return current.map((item) => item.key === key ? { ...item, quantity: item.quantity + quantity } : item);
      return [...current, { key, productId, weightGrams, quantity }];
    });
    notify(text("addedToCart"));
  }

  function changeCartQuantity(key, delta) {
    setCart((current) => current.map((item) => item.key === key ? { ...item, quantity: item.quantity + delta } : item).filter((item) => item.quantity > 0));
  }

  function applyPromo() {
    if (["FRESH50", "CHICKEN50"].includes(promoInput.trim().toUpperCase())) {
      setPromoApplied(true);
      notify(text("promoApplied"));
    } else {
      setPromoApplied(false);
      notify(text("promoInvalid"));
    }
  }

  async function submitAuth(event) {
    event.preventDefault();
    setAuthError("");
    setAuthMessage("");
    setAuthBusy(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    try {
      if (authMode === "register") {
        await registerUser({ name: String(form.get("name") || "").trim(), email, mobile: String(form.get("mobile") || "").trim(), password });
        setAuthMode("login");
        setAuthMessage(text("registerSuccess"));
      } else {
        const result = await loginUser({ email, password });
        if (!result.token) throw new Error(text("missingToken"));
        localStorage.setItem("token", result.token);
        setLoggedIn(true);
        setScreen("home");
        notify(text("loginSuccess"));
      }
    } catch (error) {
      setAuthError(error.message || text("requestFailed"));
    } finally {
      setAuthBusy(false);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    setLoggedIn(false);
    setScreen("home");
    notify(text("loggedOut"));
  }

  function submitDemoOrder(event) {
    event.preventDefault();
    if (!cart.length) return;
    const customer = String(new FormData(event.currentTarget).get("customer") || "").trim();
    setDemoOrder({ reference: `CF-DEMO-${Date.now().toString().slice(-6)}`, customer, total });
    setCart([]);
    setPromoApplied(false);
    setPromoInput("");
    setScreen("confirmation");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const visibleProducts = products
    .filter((product) => category === "all" || product.category === category)
    .filter((product) => `${text(product.nameKey)} ${text(product.categoryKey)}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sort === "price-low" ? a.pricePerKg - b.pricePerKg : sort === "price-high" ? b.pricePerKg - a.pricePerKg : a.id - b.id);

  function productCard(product) {
    const selectedWeight = weightByProduct[product.id] || product.defaultWeight;
    const itemPrice = Math.round(product.pricePerKg * selectedWeight / 1000);
    return <article className="product-card" key={product.id}>
      <button className="product-image-button" onClick={() => openProduct(product.id)} aria-label={`${text("viewDetails")}: ${text(product.nameKey)}`}>
        <img src={product.image} alt={text(product.nameKey)} loading="lazy" />
        <span className="product-tag">{text("sampleItem")}</span>
      </button>
      <div className="product-card-body"><div className="product-card-heading"><div><p className="eyebrow">{text(product.categoryKey)}</p><h3>{text(product.nameKey)}</h3></div><span className="rating" aria-label={`${product.rating} ${text("outOfFive")}`}>★ {product.rating}</span></div>
        <p className="unit-price">{money(product.pricePerKg, language)} <span>/ {text("perKg")}</span></p>
        <div className="product-buy-row"><label className="weight-select-label"><span className="sr-only">{text("weight")}</span><select aria-label={`${text("weightFor")} ${text(product.nameKey)}`} value={selectedWeight} onChange={(event) => setWeightByProduct((current) => ({ ...current, [product.id]: Number(event.target.value) }))}>{[250, 500, 750, 1000].map((weight) => <option value={weight} key={weight}>{weightLabel(weight, language)}</option>)}</select></label><button className="button button-primary button-small" onClick={() => addToCart(product.id, selectedWeight)}><Icon name="plus" size={15} /> <span>{money(itemPrice, language)}</span></button></div>
      </div>
    </article>;
  }

  function renderHome() {
    return <>
      <section className="hero content-width"><div className="hero-copy"><p className="hero-kicker"><span className="status-dot" />{text("heroKicker")}</p><h1>{text("heroTitleA")} <span>{text("heroTitleB")}</span></h1><p className="hero-description">{text("heroBody")}</p><div className="hero-actions"><button className="button button-primary" onClick={() => setScreen("shop")}>{text("shopNow")} <Icon name="arrow" /></button><span className="hero-note"><Icon name="clock" size={16} />{text("deliveryPromise")}</span></div><div className="trust-strip"><div><Icon name="leaf" /><span>{text("freshDaily")}</span></div><div><Icon name="shield" /><span>{text("carefullyPacked")}</span></div><div><Icon name="clock" /><span>{text("coldChain")}</span></div></div></div>
        <div className="hero-visual"><img src={products[0].image} alt={text("heroImageAlt")} /><div className="hero-image-caption"><span>{text("freshCutLabel")}</span><strong>0–4°C</strong></div><div className="hero-seal"><span>CF</span><small>{text("qualityMark")}</small></div></div></section>
      <section className="content-width section-block"><div className="section-heading"><div><p className="eyebrow">{text("shopBy")}</p><h2>{text("categoriesTitle")}</h2></div><button className="text-button" onClick={() => setScreen("shop")}>{text("viewCatalog")} <Icon name="arrow" size={16} /></button></div><div className="category-grid">{["boiler", "sontam", "pharam", "natukodi"].map((kind, index) => <button className={`category-tile category-tone-${index + 1}`} key={kind} onClick={() => { setCategory(kind); setScreen("shop"); }}><span className="category-number">0{index + 1}</span><span>{text(`category.${kind}`)}</span><Icon name="arrow" size={16} /></button>)}</div></section>
      <section className="content-width section-block"><div className="section-heading"><div><p className="eyebrow">{text("curatedForYou")}</p><h2>{text("popularCuts")}</h2></div><span className="demo-chip">{text("sampleCatalog")}</span></div><div className="product-grid product-grid-featured">{products.slice(0, 3).map(productCard)}</div></section>
      <section className="content-width promise-band"><div><p className="eyebrow">{text("ourPromise")}</p><h2>{text("promiseTitle")}</h2><p>{text("promiseBody")}</p></div><button className="button button-outline" onClick={() => setScreen("shop")}>{text("exploreCuts")} <Icon name="arrow" size={16} /></button></section>
    </>;
  }

  function renderShop() {
    const categories = [{ value: "all", key: "allCategories" }, ...["boiler", "sontam", "pharam", "natukodi"].map((value) => ({ value, key: `category.${value}` }))];
    return <main className="content-width page-content"><div className="page-title-row"><div><p className="eyebrow">{text("freshPicks")}</p><h1>{text("shopTitle")}</h1><p className="page-description">{text("shopDescription")}</p></div><span className="demo-chip">{text("sampleCatalog")}</span></div>
      <div className="shop-toolbar"><label className="search-field"><Icon name="search" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={text("searchPlaceholder")} /></label><label className="sort-field"><span>{text("sortBy")}</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="featured">{text("featured")}</option><option value="price-low">{text("priceLow")}</option><option value="price-high">{text("priceHigh")}</option></select></label></div>
      <div className="shop-layout"><aside className="filter-panel"><h2><Icon name="filter" size={17} />{text("filterBy")}</h2><div className="filter-group"><h3>{text("categoryLabel")}</h3>{categories.map((item) => <label className="filter-option" key={item.value}><input type="radio" name="category" checked={category === item.value} onChange={() => setCategory(item.value)} /><span>{text(item.key)}</span></label>)}</div><div className="filter-note"><Icon name="shield" size={16} /><span>{text("demoDataNote")}</span></div></aside><div className="catalog-results"><div className="results-heading"><span>{text("showing")}: <strong>{visibleProducts.length}</strong></span><button className="text-button" onClick={() => { setCategory("all"); setSearch(""); setSort("featured"); }}>{text("resetFilters")}</button></div><div className="product-grid">{visibleProducts.length ? visibleProducts.map(productCard) : <div className="empty-state"><h2>{text("noProducts")}</h2><p>{text("tryDifferentSearch")}</p></div>}</div></div></div>
    </main>;
  }

  function renderDetails() {
    const lineTotal = Math.round(selectedProduct.pricePerKg * customWeight / 1000) * detailQuantity;
    return <main className="content-width page-content"><button className="back-button" onClick={() => setScreen("shop")}>← {text("backToShop")}</button><div className="detail-layout"><div className="detail-image"><img src={selectedProduct.image} alt={text(selectedProduct.nameKey)} /><span className="image-badge">{text("sampleCatalog")}</span></div><section className="detail-panel"><p className="eyebrow">{text(selectedProduct.categoryKey)}</p><h1>{text(selectedProduct.nameKey)}</h1><p className="detail-rating">★ {selectedProduct.rating} <span>·</span> {text("sampleRating")}</p><p className="detail-description">{text(selectedProduct.descriptionKey)}</p><div className="detail-price"><strong>{money(selectedProduct.pricePerKg, language)}</strong><span>/ {text("perKg")}</span></div><div className="weight-picker"><div className="label-row"><span>{text("chooseWeight")}</span><strong>{weightLabel(customWeight, language)}</strong></div><div className="weight-options">{[250, 500, 750, 1000].map((weight) => <button key={weight} className={customWeight === weight ? "weight-option selected" : "weight-option"} onClick={() => setCustomWeight(weight)}>{weightLabel(weight, language)}</button>)}</div><label className="custom-weight">{text("customWeight")}<span><input type="number" min="100" max="10000" step="50" value={customWeight} onChange={(event) => setCustomWeight(Math.max(100, Math.min(10000, Number(event.target.value) || 100)))} /> g</span></label></div><div className="detail-purchase"><div className="quantity-control"><button aria-label={text("decreaseQuantity")} onClick={() => setDetailQuantity((value) => Math.max(1, value - 1))}><Icon name="minus" size={15} /></button><span>{detailQuantity}</span><button aria-label={text("increaseQuantity")} onClick={() => setDetailQuantity((value) => Math.min(20, value + 1))}><Icon name="plus" size={15} /></button></div><button className="button button-primary" onClick={() => addToCart(selectedProduct.id, customWeight, detailQuantity)}>{text("addToCart")} · {money(lineTotal, language)}</button></div><p className="fine-print"><Icon name="shield" size={15} />{text("samplePriceNotice")}</p></section></div></main>;
  }

  function renderCart() {
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    return <main className="content-width page-content"><div className="page-title-row"><div><p className="eyebrow">{text("yourSelection")}</p><h1>{text("cartTitle")}</h1></div><span className="cart-count">{itemCount} {text("items")}</span></div>
      {!cart.length ? <div className="empty-cart"><div className="empty-cart-icon"><Icon name="bag" size={25} /></div><h2>{text("emptyCart")}</h2><p>{text("emptyCartBody")}</p><button className="button button-primary" onClick={() => setScreen("shop")}>{text("browseCuts")} <Icon name="arrow" size={16} /></button></div> : <div className="cart-layout"><section className="cart-items-panel"><div className="cart-panel-heading"><h2>{text("cartItems")}</h2><button className="text-button danger-link" onClick={() => { setCart([]); setPromoApplied(false); }}>{text("clearCart")}</button></div><div className="cart-items">{cart.map((item) => { const product = products.find((entry) => entry.id === item.productId); if (!product) return null; const itemTotal = Math.round(product.pricePerKg * item.weightGrams / 1000) * item.quantity; return <article className="cart-item" key={item.key}><img src={product.image} alt="" /><div className="cart-item-info"><h3>{text(product.nameKey)}</h3><p>{weightLabel(item.weightGrams, language)} · {money(itemTotal, language)}</p><button className="text-button remove-link" onClick={() => setCart((current) => current.filter((entry) => entry.key !== item.key))}>{text("remove")}</button></div><div className="quantity-control compact"><button aria-label={text("decreaseQuantity")} onClick={() => changeCartQuantity(item.key, -1)}><Icon name="minus" size={14} /></button><span>{item.quantity}</span><button aria-label={text("increaseQuantity")} onClick={() => changeCartQuantity(item.key, 1)}><Icon name="plus" size={14} /></button></div></article>; })}</div><form className="promo-form" onSubmit={(event) => { event.preventDefault(); applyPromo(); }}><label htmlFor="promo-code">{text("promoCode")}</label><div><input id="promo-code" value={promoInput} onChange={(event) => setPromoInput(event.target.value)} placeholder="FRESH50" /><button className="button button-outline button-small" type="submit">{text("apply")}</button></div><p>{text("promoHint")}</p></form></section>
        <aside className="order-summary"><h2>{text("orderSummary")}</h2><div className="summary-line"><span>{text("subtotal")}</span><strong>{money(subtotal, language)}</strong></div><div className="summary-line"><span>{text("deliveryFee")}</span><strong className={deliveryFee === 0 ? "free-label" : ""}>{deliveryFee ? money(deliveryFee, language) : text("free")}</strong></div>{discount > 0 && <div className="summary-line discount-line"><span>{text("promoDiscount")}</span><strong>−{money(discount, language)}</strong></div>}<div className="summary-total"><span>{text("total")}</span><strong>{money(total, language)}</strong></div><div className="shipping-progress"><div><span>{subtotal >= 500 ? text("freeDeliveryUnlocked") : text("freeDeliveryRemaining").replace("{amount}", money(500 - subtotal, language))}</span><span>{Math.min(100, Math.round(subtotal / 500 * 100))}%</span></div><div className="progress-track"><span style={{ width: `${Math.min(100, subtotal / 500 * 100)}%` }} /></div></div><button className="button button-primary checkout-button" onClick={() => document.getElementById("delivery-details")?.scrollIntoView({ behavior: "smooth", block: "center" })}>{text("continueCheckout")} <Icon name="arrow" size={16} /></button><p className="checkout-disclaimer"><Icon name="lock" size={14} />{text("demoCheckoutNotice")}</p></aside>
        <form id="delivery-details" className="delivery-form" onSubmit={submitDemoOrder}><div className="form-heading"><p className="eyebrow">{text("delivery")}</p><h2>{text("deliveryDetails")}</h2></div><div className="delivery-fields"><label>{text("fullName")}<input name="customer" required autoComplete="name" /></label><label>{text("email")}<input name="email" type="email" required autoComplete="email" /></label><label>{text("phone")}<input name="phone" type="tel" required autoComplete="tel" /></label><label>{text("address")}<input name="address" required autoComplete="street-address" /></label></div><button type="submit" className="button button-primary" disabled={!cart.length}>{text("placeDemoOrder")} <Icon name="arrow" size={16} /></button><p className="fine-print">{text("noPaymentProcessed")}</p></form></div>}
    </main>;
  }

  function renderAdmin() {
    const sections = ["overview", "products", "orders", "customers", "inventory", "analytics"];
    const labels = { overview: "adminOverview", products: "adminProducts", orders: "adminOrders", customers: "adminCustomers", inventory: "adminInventory", analytics: "adminAnalytics" };
    return <main className="content-width page-content admin-page"><div className="admin-heading"><div><p className="eyebrow">{text("operations")}</p><h1>{text("adminTitle")}</h1></div><span className="demo-chip"><span className="status-dot" />{text("demoData")}</span></div><div className="admin-layout"><aside className="admin-sidebar" aria-label={text("adminNavigation")}>{sections.map((section) => <button key={section} className={adminSection === section ? "admin-nav active" : "admin-nav"} onClick={() => setAdminSection(section)}><Icon name={section === "overview" ? "grid" : section === "products" || section === "inventory" ? "box" : section === "customers" ? "users" : "chart"} size={16} />{text(labels[section])}</button>)}<p className="admin-sidebar-note">{text("demoDataNote")}</p></aside><section className="admin-workspace"><div className="admin-workspace-heading"><div><p className="eyebrow">{text(labels[adminSection])}</p><h2>{text("adminWorkspace")}</h2></div><span className="data-stamp">{text("illustrativeData")}</span></div>
      {adminSection === "overview" || adminSection === "analytics" ? <><div className="kpi-grid">{[["kpiOrders", "1,248", "+12%"], ["kpiSales", "₹3,45,230", "+18%"], ["kpiCustomers", "8,560", "+15%"], ["kpiProducts", "6", text("sampleOnly")]].map(([label, value, delta]) => <article className="kpi-card" key={label}><span>{text(label)}</span><strong>{value}</strong><small>{delta}</small></article>)}</div><div className="analytics-grid"><section className="chart-panel"><div className="panel-title"><div><h3>{text("salesOverview")}</h3><p>{text("illustrativeData")}</p></div><select aria-label={text("chartPeriod")}><option>7 {text("days")}</option><option>30 {text("days")}</option><option>90 {text("days")}</option></select></div><div className="bar-chart" role="img" aria-label={text("sampleSalesChart")}>{[44, 60, 48, 77, 62, 88, 70, 96, 72, 83, 58, 91].map((height, index) => <span key={index} style={{ height: `${height}%` }} />)}</div><div className="chart-axis"><span>{text("lastWeek")}</span><span>{text("sampleData")}</span><span>{text("today")}</span></div></section><section className="top-products"><h3>{text("topProducts")}</h3>{products.slice(0, 4).map((product, index) => <div className="top-product-row" key={product.id}><span>{text(product.nameKey)}</span><div><span style={{ width: `${78 - index * 12}%` }} /></div><strong>{[34, 28, 22, 16][index]}%</strong></div>)}</section></div></> : <section className="admin-table-wrap"><div className="admin-table-title"><h3>{text(labels[adminSection])}</h3><span>{text("demoData")}</span></div><table><thead><tr><th>{text(adminSection === "customers" ? "customer" : adminSection === "orders" ? "order" : "product")}</th><th>{text("status")}</th><th>{text("value")}</th></tr></thead><tbody>{(adminSection === "products" || adminSection === "inventory" ? products : demoRows).slice(0, 6).map((row, index) => { const name = row.nameKey ? text(row.nameKey) : row.name; return <tr key={row.id || name}><td>{name}</td><td><span className="table-status">{text(index % 2 ? "sampleActive" : "samplePending")}</span></td><td>{row.pricePerKg ? `${money(row.pricePerKg, language)} / ${text("perKg")}` : row.value}</td></tr>; })}</tbody></table><p className="table-footnote">{text("demoTableNote")}</p></section>}
    </section></div></main>;
  }

  function renderAuth() {
    return <main className="content-width page-content auth-page"><div className="auth-visual"><img src={products[3].image} alt="" /><div><p className="eyebrow">{text("memberPerks")}</p><h1>{text("authTitle")}</h1><p>{text("authBody")}</p></div></div><section className="auth-panel"><p className="eyebrow">{text("account")}</p><h2>{authMode === "login" ? text("loginTitle") : text("registerTitle")}</h2><div className="auth-tabs" role="tablist"><button role="tab" aria-selected={authMode === "login"} className={authMode === "login" ? "active" : ""} onClick={() => { setAuthMode("login"); setAuthError(""); setAuthMessage(""); }}>{text("login")}</button><button role="tab" aria-selected={authMode === "register"} className={authMode === "register" ? "active" : ""} onClick={() => { setAuthMode("register"); setAuthError(""); setAuthMessage(""); }}>{text("register")}</button></div><form onSubmit={submitAuth} className="auth-form">{authMode === "register" && <><label>{text("fullName")}<input name="name" required autoComplete="name" minLength="2" /></label><label>{text("phone")}<input name="mobile" type="tel" autoComplete="tel" /></label></>}<label>{text("email")}<input name="email" type="email" required autoComplete="email" /></label><label>{text("password")}<span className="password-field"><input name="password" type={showPassword ? "text" : "password"} required minLength="8" autoComplete={authMode === "login" ? "current-password" : "new-password"} /><button type="button" aria-label={showPassword ? text("hidePassword") : text("showPassword")} onClick={() => setShowPassword((value) => !value)}><Icon name="eye" size={17} /></button></span></label>{authError && <p className="form-alert error" role="alert">{authError}</p>}{authMessage && <p className="form-alert success" role="status">{authMessage}</p>}<button className="button button-primary auth-submit" type="submit" disabled={authBusy}>{authBusy ? text("working") : authMode === "login" ? text("login") : text("createAccount")}</button></form><p className="auth-footnote"><Icon name="lock" size={14} />{text("authServiceNote")}</p></section></main>;
  }

  function renderConfirmation() {
    return <main className="content-width page-content confirmation-page"><div className="confirmation-mark"><Icon name="check" size={30} /></div><p className="eyebrow">{text("demoConfirmation")}</p><h1>{text("orderReceived")}</h1><p>{text("demoOrderReference").replace("{reference}", demoOrder?.reference || "CF-DEMO")}</p><strong>{money(demoOrder?.total || 0, language)}</strong><div className="demo-alert"><Icon name="shield" size={17} /><span>{text("noPaymentProcessed")}</span></div><button className="button button-primary" onClick={() => setScreen("shop")}>{text("continueShopping")}</button></main>;
  }

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  return <div className="app-shell"><div className="utility-bar"><div className="content-width utility-inner"><p><span className="status-dot" />{text("serviceMessage")}</p><div className="utility-right"><span>{text("demoStore")}</span><label className="language-select"><span className="sr-only">{text("chooseLanguage")}</span><select value={language} onChange={(event) => setLanguage(event.target.value)}>{languages.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><Icon name="chevron" size={13} /></label></div></div></div>
    <header className="site-header"><div className="content-width header-inner"><button className="brand-mark" onClick={() => setScreen("home")} aria-label={text("goHome")}><span className="brand-symbol"><Icon name="leaf" size={21} /></span><span className="brand-name">Chicken<span>Fresh</span><small>{text("brandTagline")}</small></span></button><nav className="main-nav" aria-label={text("mainNavigation")}><button className={screen === "home" ? "active" : ""} onClick={() => setScreen("home")}>{text("home")}</button><button className={screen === "shop" || screen === "details" ? "active" : ""} onClick={() => setScreen("shop")}>{text("shop")}</button><button className={screen === "admin" ? "active" : ""} onClick={() => setScreen("admin")}>{text("merchant")}</button></nav><div className="header-actions"><button className="icon-button account-button" onClick={() => setScreen("auth")} aria-label={loggedIn ? text("account") : text("signIn")} title={loggedIn ? text("account") : text("signIn")}><Icon name="user" /><span>{loggedIn ? text("account") : text("signIn")}</span></button>{loggedIn && <button className="icon-button logout-button" onClick={logout} aria-label={text("logout")} title={text("logout")}><Icon name="logout" /></button>}<button className="cart-button" onClick={() => setScreen("cart")}><Icon name="bag" size={17} /><span>{text("cart")}</span><b>{cartCount}</b></button></div></div></header>
    <div className="screen-content" key={screen}>{screen === "home" ? renderHome() : screen === "shop" ? renderShop() : screen === "details" ? renderDetails() : screen === "cart" ? renderCart() : screen === "admin" ? renderAdmin() : screen === "auth" ? renderAuth() : renderConfirmation()}</div>
    <footer className="site-footer"><div className="content-width footer-main"><div className="footer-brand"><span className="brand-symbol"><Icon name="leaf" size={20} /></span><div><strong>ChickenFresh</strong><p>{text("brandTagline")}</p></div></div><p className="footer-note">{text("demoFooter")}</p><div className="footer-links"><button onClick={() => setScreen("shop")}>{text("shop")}</button><button onClick={() => setScreen("auth")}>{text("account")}</button><button onClick={() => setScreen("admin")}>{text("merchant")}</button></div></div><div className="content-width footer-bottom"><span>© {new Date().getFullYear()} ChickenFresh</span><span>{text("demoData")}</span></div></footer>
    {toast && <div className="toast" role="status" aria-live="polite"><Icon name="check" size={16} />{toast}</div>}</div>;
}

export default App;
