(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const money = n => '$' + n.toFixed(2);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- icons ---------- */
const MI = {
  ShoppingBag: 'M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-2c1.1 0 2 .9 2 2h-4c0-1.1.9-2 2-2zm6 16H6V8h2v2c0 .55.45 1 1 1s1-.45 1-1V8h4v2c0 .55.45 1 1 1s1-.45 1-1V8h2v12z',
  ArrowBack: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',
  Add: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  Remove: 'M19 13H5v-2h14v2z',
  ChevronRight: 'M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z',
  FavoriteBorder: 'M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z',
  Search: 'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
  MoreVert: 'M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
  Close: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  Home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  Star: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
};
const mi = (n, s = 24) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true"><path fill="currentColor" d="${MI[n] || MI.Star}"/></svg>`;
const iconKt = n => n === 'ArrowBack' ? 'Icons.AutoMirrored.Rounded.ArrowBack' : `Icons.Rounded.${n}`;
const UIP = {
  column: '<rect x="4" y="4" width="16" height="4" rx="1"/><rect x="4" y="10" width="16" height="4" rx="1"/><rect x="4" y="16" width="16" height="4" rx="1"/>',
  row: '<rect x="4" y="4" width="4" height="16" rx="1"/><rect x="10" y="4" width="4" height="16" rx="1"/><rect x="16" y="4" width="4" height="16" rx="1"/>',
  box: '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6" rx="1"/>',
  card: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M7 10h7M7 14h4"/>',
  text: '<path d="M5 6V5h14v1M12 5v14M9 19h6"/>',
  button: '<rect x="3" y="8" width="18" height="8" rx="4"/><path d="M9 12h6"/>',
  iconbtn: '<circle cx="12" cy="12" r="8"/><path d="M12 9v6M9 12h6"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 17l-5-5-9 8"/>',
  spacer: '<path d="M12 4v16M8 8l4-4 4 4M8 16l4 4 4-4"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="5" cy="6" r="1"/><circle cx="5" cy="12" r="1"/><circle cx="5" cy="18" r="1"/>',
  bolt: '<path d="M13 3L5 14h6l-1 7 8-11h-6l1-7z"/>',
  play: '<path d="M7 5v14l12-7z"/>',
  cursor: '<path d="M5 3l14 7-6 2-2 6z"/>',
  code: '<path d="M9 8l-4 4 4 4M15 8l4 4-4 4"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  chev: '<path d="M9 6l6 6-6 6"/>',
  flow: '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.5 6H14a4 4 0 0 1 4 4v5.5"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1 0 1.5-.7 1.5-1.5 0-1.2-1-1.5-1-2.5s.8-1.5 2-1.5H17a4 4 0 0 0 4-4c0-4.4-4-8.5-9-8.5z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',
  phone: '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  motion: '<path d="M3 17c4 0 5-10 9-10s5 10 9 10"/>',
  warn: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.5"/>',
  fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  reset: '<path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 4v5h5"/>',
  dup: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>', down: '<path d="M12 5v14M18 13l-6 6-6-6"/>',
  gap: '<path d="M4 4v16M20 4v16M9 12h6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.5"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  props: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
};
const ui = (n, s = 16) => `<svg class="u" viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${UIP[n] || ''}</svg>`;
const TYPEICON = { Column: 'column', Row: 'row', Box: 'box', Card: 'card', Text: 'text', Button: 'button', IconButton: 'iconbtn', Image: 'image', Spacer: 'spacer', List: 'list' };

/* ---------- design tokens of the app being built ---------- */
const COLOR_KEYS = ['primary', 'onPrimary', 'primaryContainer', 'onPrimaryContainer', 'secondaryContainer', 'onSecondaryContainer', 'surface', 'surfaceContainer', 'onSurface', 'onSurfaceVariant', 'outline', 'error', 'onError'];
const ON = { primary: 'onPrimary', primaryContainer: 'onPrimaryContainer', secondaryContainer: 'onSecondaryContainer', surface: 'onSurface', surfaceContainer: 'onSurface', error: 'onError' };
const FILL_TOKENS = ['surface', 'surfaceContainer', 'primary', 'primaryContainer', 'secondaryContainer', 'error'];
const TEXT_TOKENS = ['onSurface', 'onSurfaceVariant', 'primary', 'onPrimary', 'onPrimaryContainer', 'onSecondaryContainer', 'error'];
const TYPE = {
  displaySmall: { size: 36, lh: 44, w: 400, role: 'display' },
  headlineMedium: { size: 28, lh: 36, w: 500, role: 'display' },
  headlineSmall: { size: 24, lh: 32, w: 500, role: 'display' },
  titleLarge: { size: 22, lh: 28, w: 500, role: 'display' },
  titleMedium: { size: 16, lh: 24, w: 600, role: 'body' },
  titleSmall: { size: 14, lh: 20, w: 600, role: 'body' },
  bodyLarge: { size: 16, lh: 24, w: 400, role: 'body' },
  bodyMedium: { size: 14, lh: 20, w: 400, role: 'body' },
  bodySmall: { size: 12, lh: 16, w: 400, role: 'body' },
  labelLarge: { size: 14, lh: 20, w: 600, role: 'body' },
  labelMedium: { size: 12, lh: 16, w: 600, role: 'body' },
};
const FONTS = { 'Fraunces': "'Fraunces', Georgia, serif", 'Space Grotesk': "'Space Grotesk', system-ui, sans-serif", 'Outfit': "'Outfit', system-ui, sans-serif", 'DM Sans': "'DM Sans', system-ui, sans-serif", 'Inter': "'Inter', system-ui, sans-serif" };
const DISPLAY_FONTS = ['Fraunces', 'Space Grotesk', 'Outfit', 'DM Sans'];
const BODY_FONTS = ['DM Sans', 'Inter', 'Outfit'];
const DEVICES = { compact: { w: 360, h: 760, label: 'Compact · 360 dp' }, medium: { w: 412, h: 860, label: 'Pixel 9 · 412 dp' } };
const EASE_CSS = { Emphasized: 'cubic-bezier(0.05, 0.7, 0.1, 1)', Standard: 'cubic-bezier(0.4, 0, 0.2, 1)', Linear: 'linear', Spring: 'cubic-bezier(0.34, 1.45, 0.64, 1)' };
const EASE_KT = { Emphasized: 'CubicBezierEasing(0.05f, 0.7f, 0.1f, 1f)', Standard: 'FastOutSlowInEasing', Linear: 'LinearEasing' };
const TRANS = { none: 'None', fade: 'Fade', slide: 'Slide horizontal', slideUp: 'Slide up', scale: 'Scale + fade' };
const BOXAL = [['TopStart', 'TopCenter', 'TopEnd'], ['CenterStart', 'Center', 'CenterEnd'], ['BottomStart', 'BottomCenter', 'BottomEnd']];

/* ---------- sample data (preview state) ---------- */
const DRINKS = [
  { id: 'maple-oat', name: 'Maple Oat Latte', notes: 'Espresso · maple · oat milk', price: 5.4, art: { c1: '#C58A52', c2: '#7A4520', foam: '#F3E0C5' } },
  { id: 'flat-white', name: 'Flat White', notes: 'Double ristretto · whole milk', price: 4.2, art: { c1: '#AE774A', c2: '#5C3318', foam: '#F6E8D4' } },
  { id: 'cold-brew', name: 'Cold Brew Tonic', notes: '18-hour steep · tonic · orange', price: 4.8, art: { c1: '#4B2B17', c2: '#26140A', foam: '#E89A52' } },
  { id: 'matcha', name: 'Iced Matcha', notes: 'Ceremonial grade · oat milk', price: 5.0, art: { c1: '#9DBA6A', c2: '#5B7A32', foam: '#EEF3DC' } },
];
const freshApp = () => ({ userName: 'Ana', selectedId: 'maple-oat', quantity: 1, cart: [{ id: 'flat-white', q: 1 }, { id: 'cold-brew', q: 2 }] });
let app = freshApp();
function view() {
  const drinks = DRINKS.map(d => ({ id: d.id, name: d.name, notes: d.notes, price: money(d.price), imageUrl: `https://cdn.brew.dev/${d.id}.jpg`, _n: d.price, _art: d.art }));
  const selected = drinks.find(d => d.id === app.selectedId) || drinks[0];
  const cart = app.cart.map(c => ({ drink: drinks.find(d => d.id === c.id), quantity: c.q })).filter(c => c.drink);
  const cartCount = cart.reduce((a, c) => a + c.quantity, 0);
  const cartSum = cart.reduce((a, c) => a + c.quantity * c.drink._n, 0);
  return { userName: app.userName, drinks, selected, quantity: app.quantity, total: money(selected._n * app.quantity), cart, cartCount, cartTotal: money(cartSum) };
}
const cupBg = a => [
  `radial-gradient(circle closest-side at 50% 50%, ${a.foam} 0 17%, ${a.c1} 18% 21%, ${a.foam} 22% 27%, transparent 28%)`,
  `radial-gradient(circle closest-side at 50% 50%, ${a.c1} 0 50%, ${a.c2} 51% 57%, #F8F2EA 58% 71%, rgba(0,0,0,.12) 72% 74%, transparent 75%)`,
  `radial-gradient(circle closest-side at 50% 50%, #EDE3D7 0 90%, rgba(0,0,0,.10) 91% 94%, transparent 95%)`,
  `linear-gradient(140deg, ${a.c1}66, ${a.c2}AA)`].join(',');

/* ---------- document (the canvas = projection of Kotlin source) ---------- */
let uid = 0;
const CONTAINERS = new Set(['Column', 'Row', 'Box', 'Card', 'List']);
const N = (type, name, props = {}, children) => { const n = { id: 'n' + (++uid), type, name: name || type, props }; if (CONTAINERS.has(type)) n.children = children || []; return n; };

const doc = {
  screens: {
    home: { name: 'Home', fn: 'HomeScreen', file: 'HomeScreen.kt', pkg: 'home', route: 'Home', routeArgs: '', enter: { type: 'fade', dur: 250, ease: 'Standard' },
      root: N('Column', 'HomeScreen', { w: 'fill', h: 'fill', bg: 'surface', pad: { x: 20, y: 12 }, gap: 18 }, [
        N('Row', 'TopBar', { w: 'fill', arr: 'between', align: 'center' }, [
          N('Column', 'Greeting', { gap: 2 }, [
            N('Text', 'Eyebrow', { text: 'Good morning', style: 'labelLarge', color: 'onSurfaceVariant' }),
            N('Text', 'UserName', { text: '{state.userName}', style: 'headlineSmall' }),
          ]),
          N('IconButton', 'CartButton', { icon: 'ShoppingBag', desc: 'Cart', badge: '{state.cartCount}', actions: [{ kind: 'navigate', to: 'cart' }] }),
        ]),
        N('Card', 'FeaturedCard', { w: 'fill', bg: 'primaryContainer', radius: 28, pad: { x: 20, y: 20 }, gap: 8, animateSize: true }, [
          N('Text', 'Kicker', { text: 'Seasonal pick', style: 'labelLarge' }),
          N('Text', 'FeaturedName', { text: 'Maple Oat Latte', style: 'headlineMedium' }),
          N('Text', 'FeaturedNotes', { text: 'Espresso, maple syrup and steamed oat milk.', style: 'bodyMedium' }),
          N('Button', 'OrderNow', { text: 'Order now', variant: 'filled', actions: [{ kind: 'event', event: 'OnDrinkClick', arg: '"maple-oat"' }, { kind: 'navigate', to: 'detail', arg: '"maple-oat"' }] }),
        ]),
        N('Row', 'SectionHeader', { w: 'fill', arr: 'between', align: 'center' }, [
          N('Text', 'MenuTitle', { text: 'Menu', style: 'titleLarge' }),
          N('Button', 'SeeAll', { text: 'See all', variant: 'text', actions: [] }),
        ]),
        N('List', 'DrinkList', { w: 'fill', weight: 1, gap: 8, items: 'state.drinks', item: 'drink' }, [
          N('Row', 'DrinkRow', { w: 'fill', align: 'center', gap: 14, pad: { x: 12, y: 10 }, radius: 20, bg: 'surfaceContainer', animateItem: true, actions: [{ kind: 'event', event: 'OnDrinkClick', arg: 'drink.id' }, { kind: 'navigate', to: 'detail', arg: 'drink.id' }] }, [
            N('Image', 'Thumb', { w: 52, h: 52, radius: 16, src: 'drink.imageUrl' }),
            N('Column', 'Info', { weight: 1, gap: 2 }, [
              N('Text', 'Name', { text: '{drink.name}', style: 'titleMedium' }),
              N('Text', 'Notes', { text: '{drink.notes}', style: 'bodySmall', color: 'onSurfaceVariant' }),
            ]),
            N('Text', 'Price', { text: '{drink.price}', style: 'labelLarge', color: 'primary' }),
          ]),
        ]),
      ]) },
    detail: { name: 'Detail', fn: 'DetailScreen', file: 'DetailScreen.kt', pkg: 'detail', route: 'Detail', routeArgs: 'drinkId: String', enter: { type: 'slide', dur: 400, ease: 'Emphasized' },
      root: N('Column', 'DetailScreen', { w: 'fill', h: 'fill', bg: 'surface', pad: { x: 20, y: 12 }, gap: 16 }, [
        N('Row', 'TopBar', { w: 'fill', arr: 'between', align: 'center' }, [
          N('IconButton', 'Back', { icon: 'ArrowBack', desc: 'Back', actions: [{ kind: 'back' }] }),
          N('IconButton', 'Favorite', { icon: 'FavoriteBorder', desc: 'Save', actions: [] }),
        ]),
        N('Image', 'Hero', { w: 'fill', h: 240, radius: 32, src: 'state.selected.imageUrl', shared: true }),
        N('Column', 'Header', { w: 'fill', gap: 6 }, [
          N('Text', 'Title', { text: '{state.selected.name}', style: 'headlineMedium' }),
          N('Text', 'Notes', { text: '{state.selected.notes}', style: 'bodyLarge', color: 'onSurfaceVariant' }),
        ]),
        N('Row', 'Quantity', { align: 'center', gap: 12, bg: 'surfaceContainer', radius: 28, pad: { x: 6, y: 6 }, animateSize: true }, [
          N('IconButton', 'Decrease', { icon: 'Remove', desc: 'Decrease', actions: [{ kind: 'event', event: 'OnQuantityChange', arg: '-1' }] }),
          N('Text', 'Count', { text: '{state.quantity}', style: 'titleLarge' }),
          N('IconButton', 'Increase', { icon: 'Add', desc: 'Increase', actions: [{ kind: 'event', event: 'OnQuantityChange', arg: '1' }] }),
        ]),
        N('Spacer', 'Push', { weight: 1 }),
        N('Button', 'AddToCart', { text: 'Add to cart · {state.total}', variant: 'filled', w: 'fill', h: 56, actions: [{ kind: 'event', event: 'OnAddToCart' }, { kind: 'navigate', to: 'cart' }] }),
      ]) },
    cart: { name: 'Cart', fn: 'CartScreen', file: 'CartScreen.kt', pkg: 'cart', route: 'Cart', routeArgs: '', enter: { type: 'slideUp', dur: 450, ease: 'Emphasized' },
      root: N('Column', 'CartScreen', { w: 'fill', h: 'fill', bg: 'surface', pad: { x: 20, y: 12 }, gap: 16 }, [
        N('Row', 'TopBar', { w: 'fill', align: 'center', gap: 8 }, [
          N('IconButton', 'Back', { icon: 'ArrowBack', desc: 'Back', actions: [{ kind: 'back' }] }),
          N('Text', 'Title', { text: 'Your order', style: 'titleLarge' }),
        ]),
        N('List', 'CartList', { w: 'fill', gap: 8, items: 'state.cart', item: 'item' }, [
          N('Row', 'CartRow', { w: 'fill', align: 'center', gap: 12, pad: { x: 12, y: 12 }, radius: 20, bg: 'surfaceContainer', animateItem: true }, [
            N('Image', 'Thumb', { w: 44, h: 44, radius: 14, src: 'item.drink.imageUrl' }),
            N('Column', 'Info', { weight: 1, gap: 2 }, [
              N('Text', 'Name', { text: '{item.drink.name}', style: 'titleSmall' }),
              N('Text', 'Qty', { text: 'Qty {item.quantity}', style: 'bodySmall', color: 'onSurfaceVariant' }),
            ]),
            N('Text', 'Price', { text: '{item.drink.price}', style: 'labelLarge' }),
          ]),
        ]),
        N('Spacer', 'Push', { weight: 1 }),
        N('Row', 'Total', { w: 'fill', arr: 'between', align: 'center' }, [
          N('Text', 'TotalLabel', { text: 'Total', style: 'titleMedium', color: 'onSurfaceVariant' }),
          N('Text', 'TotalValue', { text: '{state.cartTotal}', style: 'headlineSmall' }),
        ]),
        N('Button', 'Checkout', { text: 'Checkout', variant: 'filled', w: 'fill', h: 56, actions: [{ kind: 'event', event: 'OnCheckout' }, { kind: 'navigate', to: 'home' }] }),
      ]) },
  },
  theme: {
    mode: 'light', display: 'Fraunces', body: 'DM Sans',
    light: { primary: '#7A4A22', onPrimary: '#FFFFFF', primaryContainer: '#FFDCC2', onPrimaryContainer: '#2E1500', secondaryContainer: '#F4DED0', onSecondaryContainer: '#2B1A10', surface: '#FFF8F4', surfaceContainer: '#F7EBE3', onSurface: '#221A15', onSurfaceVariant: '#54443A', outline: '#86736A', error: '#BA1A1A', onError: '#FFFFFF' },
    dark: { primary: '#F4BA8A', onPrimary: '#4A2706', primaryContainer: '#653B16', onPrimaryContainer: '#FFDCC2', secondaryContainer: '#3F2E24', onSecondaryContainer: '#F4DED0', surface: '#19120D', surfaceContainer: '#271E18', onSurface: '#F0DFD6', onSurfaceVariant: '#D8C2B6', outline: '#A08D83', error: '#FFB4AB', onError: '#690005' },
  },
};
const ORDER = ['home', 'detail', 'cart'];

/* ---------- MenuViewModel.kt (hand-written backend) ---------- */
const VM_DEFAULT = `package dev.brew.ui.menu

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class Drink(
    val id: String,
    val name: String,
    val notes: String,
    val price: String,
    val imageUrl: String,
)

data class CartItem(
    val drink: Drink,
    val quantity: Int,
)

data class MenuUiState(
    val userName: String = "",
    val drinks: List<Drink> = emptyList(),
    val selected: Drink? = null,
    val quantity: Int = 1,
    val total: String = "",
    val cart: List<CartItem> = emptyList(),
    val cartCount: Int = 0,
    val cartTotal: String = "",
) {
    companion object {
        val preview = MenuUiState(userName = "Ana", quantity = 1)
    }
}

sealed interface MenuEvent {
    data class OnDrinkClick(val id: String) : MenuEvent
    data class OnQuantityChange(val delta: Int) : MenuEvent
    data object OnAddToCart : MenuEvent
    data object OnCheckout : MenuEvent
}

@HiltViewModel
class MenuViewModel @Inject constructor(
    private val repository: MenuRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(MenuUiState())
    val state: StateFlow<MenuUiState> = _state.asStateFlow()

    init {
        repository.drinks()
            .onEach { drinks -> _state.update { it.copy(drinks = drinks) } }
            .launchIn(viewModelScope)
    }

    fun onEvent(event: MenuEvent) {
        when (event) {
            is MenuEvent.OnDrinkClick -> _state.update { s ->
                s.copy(selected = s.drinks.first { it.id == event.id }, quantity = 1)
            }
            is MenuEvent.OnQuantityChange -> _state.update { s ->
                s.copy(quantity = (s.quantity + event.delta).coerceIn(1, 9))
            }
            MenuEvent.OnAddToCart -> _state.update { s ->
                val drink = s.selected ?: return@update s
                s.copy(cart = s.cart.add(drink, s.quantity))
            }
            MenuEvent.OnCheckout -> viewModelScope.launch {
                repository.placeOrder(_state.value.cart)
                _state.update { it.copy(cart = emptyList()) }
            }
        }
    }
}

private fun List<CartItem>.add(drink: Drink, quantity: Int): List<CartItem> {
    val existing = firstOrNull { it.drink.id == drink.id } ?: return this + CartItem(drink, quantity)
    return map { if (it === existing) it.copy(quantity = it.quantity + quantity) else it }
}
`;
let vmSrc = VM_DEFAULT, vmDirty = false;

function lineOf(src, idx) { return src.slice(0, idx).split('\n').length; }
function matchBrace(src, open) { let d = 0; for (let i = open; i < src.length; i++) { if (src[i] === '{') d++; else if (src[i] === '}') { d--; if (!d) return i; } } return src.length; }
function parseVM(src) {
  const classes = {}; const reHead = /data\s+class\s+(\w+)\s*\(/g; let m;
  while ((m = reHead.exec(src))) {
    let i = reHead.lastIndex, d = 1; const s = i;
    while (i < src.length && d) { if (src[i] === '(') d++; else if (src[i] === ')') d--; i++; }
    const fields = []; src.slice(s, i - 1).replace(/val\s+(\w+)\s*:\s*([\w.]+(?:<[\w.?, ]+>)?\??)/g, (_, n, t) => { fields.push({ name: n, type: t }); return _; });
    classes[m[1]] = fields;
  }
  const out = { classes, iface: 'MenuEvent', events: [], handled: new Set(), handledLine: {}, whenLine: 0, ifaceLine: 0, all: false };
  const si = src.match(/sealed\s+interface\s+(\w+)\s*\{/);
  if (si) {
    out.iface = si[1]; const open = si.index + si[0].length - 1, close = matchBrace(src, open); out.ifaceLine = lineOf(src, si.index);
    const body = src.slice(open + 1, close); const re = /(?:data\s+class\s+(\w+)|(?:data\s+)?object\s+(\w+))/g; let e;
    while ((e = re.exec(body))) { const name = e[1] || e[2]; out.events.push({ name, params: e[1] ? (classes[name] || []) : [], line: lineOf(src, open + 1 + e.index) }); }
  }
  const w = src.match(/when\s*\(\s*event\s*\)\s*\{/);
  if (w) {
    const open = w.index + w[0].length - 1, close = matchBrace(src, open); out.whenLine = lineOf(src, w.index);
    const body = src.slice(open + 1, close); const re = /(?:is\s+)?\w+\.(\w+)\s*->/g; let h;
    while ((h = re.exec(body))) { out.handled.add(h[1]); out.handledLine[h[1]] = lineOf(src, open + 1 + h.index); }
    if (/\belse\s*->/.test(body)) out.all = true;
  }
  return out;
}
let model = parseVM(vmSrc);
const isHandled = name => model.all || model.handled.has(name);

/* ---------- UI state ---------- */
const st = { screen: 'home', sel: null, inst: 0, hover: null, tool: 'design', view: 'screen', zoom: 'fit', z: 1, device: 'compact', file: 'screen:home', leftTab: 'layers', collapsed: new Set(), mode: 'split', mtab: 'canvas', ctab: 'log' };
let navStack = ['home'], animating = false, problems = [], logs = [], scopes = {}, scopeSeq = 0, flashVm = -1;
const undoStack = [], redoStack = []; let lastKey = null, lastT = 0;

/* ---------- tree helpers ---------- */
function walk(n, fn, parent = null) { fn(n, parent); (n.children || []).forEach(c => walk(c, fn, n)); }
function find(id) {
  if (!id) return null;
  for (const k of ORDER) { let r = null; walk(doc.screens[k].root, (n, p) => { if (!r && n.id === id) r = { node: n, parent: p, screen: k }; }); if (r) return r; }
  return null;
}
function pathTo(id) { const f = find(id); if (!f) return []; const out = []; (function rec(n, acc) { acc = [...acc, n]; if (n.id === id) { out.push(...acc); return true; } return (n.children || []).some(c => rec(c, acc)); })(doc.screens[f.screen].root, []); return out; }
const selNode = () => find(st.sel)?.node;
function elemType(listType) { return ((listType || '').match(/List<(\w+)>/) || [])[1]; }
function typeOf(path, vars = {}) {
  const segs = String(path).split('.'); let t = segs[0] === 'state' ? 'MenuUiState' : vars[segs[0]]; if (!t) return null;
  for (let i = 1; i < segs.length; i++) { const cls = model.classes[t.replace('?', '')]; if (!cls) return null; const f = cls.find(x => x.name === segs[i]); if (!f) return null; t = f.type; }
  return t;
}
function varsFor(id) { const vars = {}; pathTo(id).forEach(n => { if (n.type === 'List' && n.id !== id) { const el = elemType(typeOf(n.props.items, vars)); if (el) vars[n.props.item] = el; } }); return vars; }
function bindingPaths(vars) {
  const out = []; const simple = t => /^(String|Int)\??$/.test(t);
  const add = (prefix, cls, depth) => (model.classes[cls] || []).forEach(f => { const t = f.type.replace('?', ''); if (simple(f.type)) out.push({ path: `${prefix}.${f.name}`, type: f.type }); else if (depth < 1 && model.classes[t]) add(`${prefix}.${f.name}`, t, depth + 1); });
  Object.entries(vars).forEach(([v, cls]) => add(v, cls, 0));
  add('state', 'MenuUiState', 0);
  return out;
}
function cloneNode(n) { const c = JSON.parse(JSON.stringify(n)); walk(c, x => { x.id = 'n' + (++uid); }); return c; }
function setPath(o, path, v) { const k = path.split('.'); let t = o; for (let i = 0; i < k.length - 1; i++) t = (t[k[i]] ??= {}); if (v === undefined || v === null) delete t[k[k.length - 1]]; else t[k[k.length - 1]] = v; }
function resolve(path, scope) { const s = String(path).split('.'); let v = scope[s[0]]; for (let i = 1; i < s.length && v != null; i++) v = v[s[i]]; return v; }
function fmt(str, scope) { return String(str ?? '').replace(/\{([\w.]+)\}/g, (_, p) => { const v = resolve(p, scope); return v == null ? '{' + p + '}' : String(v); }); }

/* ---------- undo / mutate ---------- */
const snap = () => JSON.stringify({ screens: doc.screens, theme: doc.theme });
function mutate(fn, key, opts = {}) {
  const now = Date.now();
  if (!(key && key === lastKey && now - lastT < 1500)) { undoStack.push(snap()); if (undoStack.length > 150) undoStack.shift(); redoStack.length = 0; }
  lastKey = key; lastT = now; fn(); refresh(opts); markDirty();
}
function restore(s) { const o = JSON.parse(s); doc.screens = o.screens; doc.theme = o.theme; if (!find(st.sel)) st.sel = null; lastKey = null; refresh(); }
function doUndo() { if (!undoStack.length) return toast('Nothing to undo'); redoStack.push(snap()); restore(undoStack.pop()); markDirty(); toast('Undo'); }
function doRedo() { if (!redoStack.length) return toast('Nothing to redo'); undoStack.push(snap()); restore(redoStack.pop()); markDirty(); toast('Redo'); }

/* ---------- element refs ---------- */
const appEl = $('#app'), viewport = $('#viewport'), stage = $('#stage'), ov = $('#ov'), treeEl = $('#tree'), inspEl = $('#insp'), codeView = $('#codeView'),
  vmEd = $('#vmEd'), vmPre = $('#vmPre'), vmGut = $('#vmGut'), vmTa = $('#vmTa'), vmScroll = $('#vmScroll'), conBody = $('#conBody');

/* ---------- theme ---------- */
$('#typeCss').textContent = Object.entries(TYPE).map(([k, v]) => `.ts-${k}{font-family:var(--m-${v.role});font-size:${v.size}px;line-height:${v.lh}px;font-weight:${v.w};letter-spacing:${v.role === 'display' ? '-0.01em' : k.startsWith('label') ? '0.01em' : '0'}}`).join('');
function applyTheme() { const t = doc.theme, pal = t[t.mode]; COLOR_KEYS.forEach(k => appEl.style.setProperty('--m-' + k, pal[k])); appEl.style.setProperty('--m-display', FONTS[t.display]); appEl.style.setProperty('--m-body', FONTS[t.body]); }

/* ---------- renderer: node tree → DOM (what Compose would draw) ---------- */
function layoutCss(n, parent, css) {
  const p = n.props;
  if (!parent) { css.push('width:100%', 'height:100%'); return; }
  const pt = parent.type;
  if (pt === 'Box') { css.push('grid-area:1/1'); if (p.w === 'fill') css.push('width:100%'); else if (typeof p.w === 'number') css.push(`width:${p.w}px`); if (p.h === 'fill') css.push('height:100%'); else if (typeof p.h === 'number') css.push(`height:${p.h}px`); return; }
  const col = pt !== 'Row'; const main = col ? 'h' : 'w', cross = col ? 'w' : 'h', mainCss = col ? 'height' : 'width', crossCss = col ? 'width' : 'height';
  if (p.weight) css.push(`flex:${p.weight} 1 0`, `min-${mainCss}:0`);
  else if (p[main] === 'fill') css.push('flex:1 1 0', `min-${mainCss}:0`);
  else { css.push(n.type === 'Text' && !col ? 'flex-shrink:1' : (n.type === 'List' ? 'flex-shrink:1;min-height:0' : 'flex-shrink:0')); if (typeof p[main] === 'number') css.push(`${mainCss}:${p[main]}px`); }
  if (p[cross] === 'fill') css.push('align-self:stretch'); else if (typeof p[cross] === 'number') css.push(`${crossCss}:${p[cross]}px`);
}
function flexCss(n, css) {
  const p = n.props, J = { start: 'flex-start', center: 'center', end: 'flex-end', between: 'space-between' }, A = { start: 'flex-start', center: 'center', end: 'flex-end' };
  if (p.gap) css.push(`gap:${p.gap}px`);
  css.push(`justify-content:${J[p.arr || 'start']}`, `align-items:${A[p.align || 'start']}`);
}
function renderNode(n, scope, parent, inst, design, sk) {
  const p = n.props, css = [], cls = ['m', 'm-' + n.type];
  layoutCss(n, parent, css);
  if (p.radius && n.type !== 'Button') css.push(`border-radius:${p.radius}px`);
  if (p.bg && n.type !== 'Button') { css.push(`background:var(--m-${p.bg})`); if (ON[p.bg]) css.push(`color:var(--m-${ON[p.bg]})`); }
  if (p.pad && (p.pad.x || p.pad.y) && n.type !== 'Button') css.push(`padding:${p.pad.y || 0}px ${p.pad.x || 0}px`);
  if ((p.actions || []).length) cls.push('clickable');
  let attrs = `data-id="${n.id}" data-inst="${inst}" data-scope="${sk}"`;
  if (p.animateItem && parent?.type === 'List') { attrs += ' data-animitem'; css.push(`--i:${inst}`); }
  const kids = () => n.children.length ? n.children.map(c => renderNode(c, scope, n, inst, design, sk)).join('') : (design ? `<div class="m-empty">Empty ${n.type} · insert a component</div>` : '');
  let inner = '';
  switch (n.type) {
    case 'Column': case 'Card': css.push('display:flex', 'flex-direction:column'); flexCss(n, css); inner = kids(); break;
    case 'Row': css.push('display:flex', 'flex-direction:row'); flexCss(n, css); inner = kids(); break;
    case 'Box': { css.push('display:grid'); let r = 0, c = 0; BOXAL.forEach((row, ri) => row.forEach((v, ci) => { if (v === (p.balign || 'TopStart')) { r = ri; c = ci; } })); const S = ['start', 'center', 'end']; css.push(`place-items:${S[r]} ${S[c]}`); inner = kids(); break; }
    case 'List': {
      css.push('display:flex', 'flex-direction:column', 'overflow:hidden'); flexCss(n, css);
      const items = resolve(p.items, scope);
      if (!Array.isArray(items) || !items.length) inner = design ? `<div class="m-empty">items(${esc(p.items)}) is empty</div>` : '';
      else inner = items.map((it, i) => { const k = 's' + (++scopeSeq); scopes[k] = { ...scope, [p.item]: it }; return n.children.map(c => renderNode(c, scopes[k], n, i, design, k)).join(''); }).join('');
      break;
    }
    case 'Text': cls.push('ts-' + (p.style || 'bodyLarge')); if (p.color) css.push(`color:var(--m-${p.color})`); inner = esc(fmt(p.text, scope)); break;
    case 'Button': cls.push('m-btn', 'btn-' + (p.variant || 'filled'), 'ts-labelLarge'); if (p.w === 'fill') css.push('display:flex'); inner = `<span>${esc(fmt(p.text, scope))}</span>`; break;
    case 'IconButton': { cls.push('m-iconbtn'); const b = p.badge ? fmt(p.badge, scope) : ''; inner = mi(p.icon) + (b && b !== '0' ? `<span class="m-badge">${esc(b)}</span>` : ''); break; }
    case 'Image': { const src = p.src ? resolve(p.src.split('.').slice(0, -1).join('.'), scope) : null; if (src && src._art) css.push(`background:${cupBg(src._art)}`); else cls.push('m-img-ph'); if (p.w == null) css.push('width:96px'); if (p.h == null) css.push('height:96px'); break; }
    case 'Spacer': if (!p.weight && p.h == null && p.w == null) css.push('height:8px'); break;
  }
  return `<div class="${cls.join(' ')}" ${attrs} style="${css.join(';')}">${inner}</div>`;
}
function screenHTML(key, design) { const v = view(); scopes.s0 = { state: v }; return renderNode(doc.screens[key].root, scopes.s0, null, 0, design, 's0'); }
const sbar = () => `<div class="sbar"><span>9:41</span><svg width="46" height="12" viewBox="0 0 46 12" aria-hidden="true"><path d="M1 11h2V8H1zm4 0h2V6H5zm4 0h2V4H9zm4 0h2V1h-2z" fill="currentColor"/><path d="M24 3.5a9 9 0 0 1 6 2.3l-1.3 1.4A7 7 0 0 0 24 5.5a7 7 0 0 0-4.7 1.7L18 5.8a9 9 0 0 1 6-2.3zm0 4a5 5 0 0 1 3.2 1.2L24 11.5l-3.2-2.8A5 5 0 0 1 24 7.5z" fill="currentColor"/><rect x="34.5" y="2.5" width="9" height="7" rx="1.5" fill="none" stroke="currentColor"/><rect x="36" y="4" width="5" height="4" rx=".5" fill="currentColor"/><rect x="44" y="5" width="1.2" height="2" fill="currentColor"/></svg></div>`;

function renderCanvas() {
  if (animating) return;
  if (st.view === 'flow' && st.tool !== 'play') return renderFlow();
  const D = DEVICES[st.device], fw = D.w + 20, fh = D.h + 20;
  const vw = viewport.clientWidth, vh = viewport.clientHeight;
  const z = st.zoom === 'fit' ? clamp(Math.min((vw - 80) / fw, (vh - 122) / fh), 0.3, 1.25) : st.zoom;
  st.z = z; scopes = {}; scopeSeq = 0;
  stage.style.width = fw * z + 'px'; stage.style.height = fh * z + 'px';
  stage.innerHTML = `<div class="device" style="width:${fw}px;height:${fh}px;transform:scale(${z})"><div class="screen ${st.tool === 'play' ? 'play' : 'design'}" style="width:${D.w}px;height:${D.h}px">${sbar()}<div class="content" id="content"><div class="layer">${screenHTML(st.screen, st.tool !== 'play')}</div></div><div class="gbar"><span></span></div></div></div>`;
  renderCanvasTools(); renderHint(); drawOverlay();
}
function rerenderTop() { const l = $('#content .layer:last-child'); if (l) l.innerHTML = screenHTML(st.screen, false); }

/* ---------- selection overlay ---------- */
let drag = null, dropInd = null, resizing = null;
function drawOverlay() {
  if (st.tool === 'play' || st.view === 'flow') { ov.innerHTML = ''; return; }
  const content = $('#content'); if (!content) { ov.innerHTML = ''; return; }
  const vr = viewport.getBoundingClientRect(), sl = viewport.scrollLeft, stp = viewport.scrollTop;
  const R = el => { const r = el.getBoundingClientRect(); return { x: r.left - vr.left + sl, y: r.top - vr.top + stp, w: r.width, h: r.height }; };
  const box = (r, c, inner = '') => `<div class="ov-box ${c}" style="left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px">${inner}</div>`;
  let h = '';
  if (st.hover && st.hover !== st.sel) { const el = content.querySelector(`[data-id="${st.hover}"]`); if (el) h += box(R(el), 'ov-hover'); }
  const f = find(st.sel);
  if (f && f.screen === st.screen) {
    const els = $$(`[data-id="${st.sel}"]`, content);
    if (f.parent) { const pe = content.querySelector(`[data-id="${f.parent.id}"][data-inst="${st.inst}"]`) || content.querySelector(`[data-id="${f.parent.id}"]`); if (pe) h += box(R(pe), 'ov-parent'); }
    els.forEach(el => { if (+el.dataset.inst !== st.inst) h += box(R(el), 'ov-inst'); });
    const main = els.find(el => +el.dataset.inst === st.inst) || els[0];
    if (main) {
      const r = R(main), z = st.z, p = f.node.props; let inner = '';
      if (p.pad && (p.pad.x || p.pad.y) && f.node.type !== 'Button') { const px = (p.pad.x || 0) * z, py = (p.pad.y || 0) * z; inner += `<i class="ov-pad" style="left:0;top:0;right:0;height:${py}px"></i><i class="ov-pad" style="left:0;bottom:0;right:0;height:${py}px"></i><i class="ov-pad" style="left:0;top:${py}px;bottom:${py}px;width:${px}px"></i><i class="ov-pad" style="right:0;top:${py}px;bottom:${py}px;width:${px}px"></i>`; }
      inner += ['tl', 'tr', 'bl', 'br'].map(c => `<i class="ov-h ${c}"></i>`).join('');
      if (f.parent) inner += `<i class="ov-res ex" data-axis="x" title="Drag to set a fixed width"></i><i class="ov-res ey" data-axis="y" title="Drag to set a fixed height"></i>`;
      inner += `<span class="ov-tag">${esc(f.node.name)}${els.length > 1 ? ` · ×${els.length}` : ''}</span><span class="ov-size">${Math.round(r.w / z)} × ${Math.round(r.h / z)}</span>`;
      h += box(r, 'ov-sel', inner);
    }
  }
  if (dropInd) h += `<div class="ov-drop" style="left:${dropInd.x}px;top:${dropInd.y}px;width:${dropInd.w}px;height:${dropInd.h}px"></div>`;
  ov.innerHTML = h;
}

/* ---------- flow (prototype links) view ---------- */
function renderFlow() {
  const D = DEVICES[st.device]; scopes = {}; scopeSeq = 0;
  const fs = clamp(Math.min((viewport.clientWidth - 80 - 200) / (3 * D.w), (viewport.clientHeight - 260) / D.h), 0.22, 0.6);
  stage.style.width = ''; stage.style.height = '';
  stage.innerHTML = `<div class="flow" id="flow"><svg class="flow-svg" id="flowSvg"></svg>${ORDER.map((k, i) => { const s = doc.screens[k]; return `<div class="ab" data-screen="${k}" title="Open ${esc(s.fn)}"><div class="ab-label">${i === 0 ? '<span class="start">Start</span>' : ''}<b>${esc(s.name)}</b><span>Route.${esc(s.route)}</span></div><div class="ab-frame" style="width:${D.w * fs}px;height:${D.h * fs}px"><div class="ab-scale" style="width:${D.w}px;height:${D.h}px;transform:scale(${fs})">${sbar()}<div class="content" style="flex:1;position:relative;overflow:hidden"><div class="layer">${screenHTML(k, false)}</div></div><div class="gbar"><span></span></div></div></div></div>`; }).join('')}</div>`;
  ov.innerHTML = ''; renderCanvasTools(); renderHint();
  requestAnimationFrame(drawFlowArrows);
}
function drawFlowArrows() {
  const flow = $('#flow'), svg = $('#flowSvg'); if (!flow || !svg) return;
  const fr = flow.getBoundingClientRect(); svg.setAttribute('width', flow.scrollWidth); svg.setAttribute('height', flow.scrollHeight);
  const rel = r => ({ x: r.left - fr.left, y: r.top - fr.top, w: r.width, h: r.height });
  const NS = 'http://www.w3.org/2000/svg'; svg.innerHTML = '<defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="ah" d="M0 0L10 5L0 10z"/></marker></defs>';
  const incoming = {}; const labels = [];
  ORDER.forEach((k, si) => walk(doc.screens[k].root, n => (n.props.actions || []).forEach(a => {
    if (a.kind !== 'navigate' || !doc.screens[a.to] || a.to === k) return;
    const src = flow.querySelector(`.ab[data-screen="${k}"] [data-id="${n.id}"]`), dst = flow.querySelector(`.ab[data-screen="${a.to}"] .ab-frame`); if (!src || !dst) return;
    src.classList.add('flow-src');
    const s = rel(src.getBoundingClientRect()), d = rel(dst.getBoundingClientRect()), ti = ORDER.indexOf(a.to); incoming[a.to] = (incoming[a.to] || 0) + 1;
    let dpath, x1, y1, back = false;
    if (ti > si) { x1 = s.x + s.w; y1 = s.y + s.h / 2; const x2 = d.x - 4, y2 = d.y + Math.min(40 + incoming[a.to] * 34, d.h / 2), dx = Math.max(40, (x2 - x1) / 2); dpath = `M${x1} ${y1} C${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`; }
    else { back = true; x1 = s.x + s.w / 2; y1 = s.y + s.h; const x2 = d.x + d.w / 2, y2 = d.y + d.h + 4, by = Math.max(y1, y2) + 70; dpath = `M${x1} ${y1} C${x1} ${by}, ${x2} ${by}, ${x2} ${y2}`; }
    const path = document.createElementNS(NS, 'path'); path.setAttribute('d', dpath); path.setAttribute('class', 'fa' + (back ? ' back' : '')); path.setAttribute('marker-end', 'url(#ah)'); svg.appendChild(path);
    const dot = document.createElementNS(NS, 'circle'); dot.setAttribute('cx', x1); dot.setAttribute('cy', y1); dot.setAttribute('r', 3.5); dot.setAttribute('class', 'fd'); svg.appendChild(dot);
    const e = doc.screens[a.to].enter; labels.push({ path, text: `${TRANS[e.type]} · ${e.ease === 'Spring' ? 'spring' : e.dur + 'ms'}` });
  })));
  labels.forEach(({ path, text }) => {
    const L = path.getTotalLength(), pt = path.getPointAtLength(L / 2), g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'fl');
    const t = document.createElementNS(NS, 'text'); t.textContent = text; t.setAttribute('x', pt.x); t.setAttribute('y', pt.y + 3.5); t.setAttribute('text-anchor', 'middle');
    const r = document.createElementNS(NS, 'rect'); g.appendChild(r); g.appendChild(t); svg.appendChild(g);
    const w = t.getComputedTextLength() + 14; r.setAttribute('x', pt.x - w / 2); r.setAttribute('y', pt.y - 9); r.setAttribute('width', w); r.setAttribute('height', 18); r.setAttribute('rx', 9);
  });
}

/* ---------- chrome renders ---------- */
function renderTop() {
  $('#screenTabs').innerHTML = ORDER.map(k => `<button role="tab" data-screen="${k}" class="${st.view === 'screen' && st.screen === k ? 'on' : ''}">${esc(doc.screens[k].name)}</button>`).join('') + `<button data-flow class="${st.view === 'flow' ? 'on' : ''}" ${st.tool === 'play' ? 'disabled' : ''}>${ui('flow', 13)}Flow</button>`;
  $('#toolTabs').innerHTML = `<button data-tool="design" class="${st.tool === 'design' ? 'on' : ''}" title="Design (Esc)">${ui('cursor', 13)}<span class="tl">Design</span></button><button data-tool="play" class="${st.tool === 'play' ? 'on' : ''}" title="Prototype (P)">${ui('play', 13)}<span class="tl">Prototype</span></button>`;
  $('#layTabs').innerHTML = ['design', 'split', 'code'].map(m => `<button data-mode="${m}" class="${st.mode === m ? 'on' : ''}">${m[0].toUpperCase() + m.slice(1)}</button>`).join('');
  $('#device').innerHTML = Object.entries(DEVICES).map(([k, d]) => `<option value="${k}" ${st.device === k ? 'selected' : ''}>${d.label}</option>`).join('');
  $('#leftTabs').innerHTML = `<button data-ltab="layers" class="${st.leftTab === 'layers' ? 'on' : ''}">${ui('layers', 13)}Layers</button><button data-ltab="theme" class="${st.leftTab === 'theme' ? 'on' : ''}">${ui('palette', 13)}Theme</button>`;
  $('#mtabs').innerHTML = [['layers', 'layers', 'Layers'], ['canvas', 'phone', 'Canvas'], ['inspect', 'props', 'Properties'], ['code', 'code', 'Code']].map(([k, ic, l]) => `<button data-mtab="${k}" class="${st.mtab === k ? 'on' : ''}">${ui(ic, 16)}${l}</button>`).join('');
  appEl.dataset.mode = st.mode; appEl.dataset.mtab = st.mtab;
}
function renderCanvasTools() {
  $('#cvTL').innerHTML = `<button data-cv="undo" title="Undo (⌘Z)" ${undoStack.length ? '' : 'disabled'}>${ui('undo', 15)}</button><button data-cv="redo" title="Redo (⇧⌘Z)" ${redoStack.length ? '' : 'disabled'}>${ui('redo', 15)}</button><span class="sep"></span><button data-cv="theme" title="Toggle app light/dark preview">${ui('palette', 15)}</button>`;
  $('#cvTR').innerHTML = st.view === 'flow' && st.tool !== 'play' ? `<span class="zl">${ui('flow', 13)}</span>` : `<button data-cv="out" title="Zoom out">${ui('minus', 15)}</button><span class="zl">${Math.round(st.z * 100)}%</span><button data-cv="in" title="Zoom in">${ui('plus', 15)}</button><span class="sep"></span><button data-cv="fit" title="Zoom to fit">${ui('fit', 15)}</button>`;
}
function renderHint() {
  const h = $('#cvHint');
  if (st.tool === 'play') { h.className = 'cv-hint play'; h.innerHTML = `${ui('play', 12)}<b>Prototype</b> · ${navStack.map(k => esc(doc.screens[k].name)).join(' › ')} · <kbd>Esc</kbd> to exit`; }
  else if (st.view === 'flow') { h.className = 'cv-hint'; h.innerHTML = `${ui('flow', 12)} Navigation links from Interactions · click a screen to edit it`; }
  else { h.className = 'cv-hint'; h.innerHTML = `Click to select · drag to reorder · <kbd>⌫</kbd> delete · <kbd>⌘D</kbd> duplicate · <kbd>Esc</kbd> parent · <kbd>P</kbd> prototype`; }
}

/* ---------- layers ---------- */
function renderLeft() {
  $('#leftLayers').hidden = st.leftTab !== 'layers'; $('#leftTheme').hidden = st.leftTab !== 'theme';
  if (st.leftTab === 'theme') renderThemePanel(); else renderLayers();
}
function renderLayers() {
  const s = doc.screens[st.screen]; $('#treeHead').innerHTML = `${esc(s.fn)} <em>${esc(s.file)}</em>`;
  const rows = [];
  (function rec(n, d) {
    const has = n.children && n.children.length, coll = st.collapsed.has(n.id), p = n.props;
    const bound = /\{/.test((p.text || '') + (p.badge || '')) || p.src;
    rows.push(`<div class="lr ${st.sel === n.id ? 'sel' : ''}" role="treeitem" data-id="${n.id}" draggable="${d > 0}" style="--d:${d}"><button class="lr-caret ${has ? '' : 'none'} ${coll ? 'coll' : ''}" data-caret="${n.id}" tabindex="-1" aria-label="Toggle">${ui('chev', 11)}</button><span class="lr-ic">${ui(TYPEICON[n.type], 14)}</span><span class="lr-name">${esc(n.name)}</span>${n.type === 'List' ? `<span class="lr-meta">${esc(p.items)}</span>` : ''}${bound ? `<span class="lr-b" title="Bound to state">${ui('link', 12)}</span>` : ''}${(p.actions || []).length ? `<span class="lr-b fl" title="${p.actions.length} click action(s)">${ui('bolt', 12)}</span>` : ''}</div>`);
    if (has && !coll) n.children.forEach(c => rec(c, d + 1));
  })(s.root, 0);
  treeEl.innerHTML = rows.join('');
}
$('#palette').innerHTML = ['Column', 'Row', 'Box', 'Card', 'Text', 'Button', 'IconButton', 'Image', 'Spacer'].map(t => `<button data-insert="${t}" title="Insert ${t}">${ui(TYPEICON[t], 16)}${t === 'IconButton' ? 'Icon btn' : t}</button>`).join('');
function renderThemePanel() {
  const t = doc.theme, pal = t[t.mode];
  $('#leftTheme').innerHTML = `<section class="sec"><h3>Preview scheme</h3><div class="seg"><button data-thmode="light" class="${t.mode === 'light' ? 'on' : ''}">Light</button><button data-thmode="dark" class="${t.mode === 'dark' ? 'on' : ''}">Dark</button></div><p class="hint">Edits write to <code>${t.mode === 'light' ? 'LightColors' : 'DarkColors'}</code> in Theme.kt.</p></section>
  <section class="sec"><h3>Color scheme <em>Material 3</em></h3><div class="toks">${COLOR_KEYS.map(k => `<label class="tok"><span class="tok-sw" style="background:${pal[k]}"><input type="color" data-color="${k}" value="${pal[k].toLowerCase()}" aria-label="${k}"></span><span class="tok-n">${k}</span><code>${pal[k].toUpperCase()}</code></label>`).join('')}</div></section>
  <section class="sec"><h3>Typography</h3><div class="size-row"><span class="nl">Display</span><select data-font="display" aria-label="Display font">${DISPLAY_FONTS.map(f => `<option ${f === t.display ? 'selected' : ''}>${f}</option>`).join('')}</select></div><div class="size-row"><span class="nl">Body</span><select data-font="body" aria-label="Body font">${BODY_FONTS.map(f => `<option ${f === t.body ? 'selected' : ''}>${f}</option>`).join('')}</select></div>
  <div class="tscale">${Object.entries(TYPE).map(([k, v]) => `<button class="ts-row" data-applystyle="${k}" title="Apply to selected text"><span class="ts-${k} ts-sample">Aa</span><span class="ts-n">${k}</span><span class="ts-m">${v.size}/${v.lh}</span></button>`).join('')}</div><p class="hint">Select a Text layer, then click a style to apply it.</p></section>`;
}

/* ---------- inspector ---------- */
const sec = (title, body, c = '') => `<section class="sec ${c}"><h3>${title}</h3>${body}</section>`;
const numIn = (path, val, o = {}) => `<label class="num ${o.dis ? 'dis' : ''}">${o.label ? `<span class="nl">${o.label}</span>` : ''}<input type="number" data-p="${path}" data-kind="num" value="${val ?? ''}" ${o.min != null ? `min="${o.min}"` : ''} ${o.step ? `step="${o.step}"` : ''} placeholder="${o.ph || ''}" ${o.dis ? 'disabled' : ''} aria-label="${esc(o.aria || path)}">${o.unit ? `<span class="nu">${o.unit}</span>` : ''}</label>`;
const toggle = (path, on, label, hint) => `<label class="tg"><input type="checkbox" data-p="${path}" ${on ? 'checked' : ''}><span class="tg-ui"></span><span class="tg-l">${label}${hint ? `<small>${hint}</small>` : ''}</span></label>`;
const selectEl = (attrs, opts, val) => `<select ${attrs}>${opts.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${v === val ? 'selected' : ''}>${esc(l)}</option>`; }).join('')}</select>`;
function sampleScope(id) { const el = $(`#content [data-id="${id}"][data-inst="${st.inst}"]`) || $(`#content [data-id="${id}"]`); return scopes[el?.dataset.scope] || scopes.s0 || { state: view() }; }

function renderInspector() {
  if (st.tool === 'play') { inspEl.innerHTML = playPanel(); return; }
  const scr = doc.screens[st.screen], f = find(st.sel);
  if (!f) { inspEl.innerHTML = `<div class="empty-ins"><b>${esc(scr.fn)}</b><span>Select a layer on the canvas, in the layer tree, or click a line of code.</span></div>` + screenSection(st.screen); return; }
  const n = f.node, p = n.props, parent = f.parent, path = pathTo(n.id);
  let h = `<div class="ins-head"><div class="crumbs-i">${path.slice(0, -1).map(x => `<button data-crumb="${x.id}">${esc(x.name)}</button>${ui('chev', 10)}`).join('')}</div>
    <div class="ins-title"><span class="ins-ic">${ui(TYPEICON[n.type], 15)}</span><input class="ins-name" data-name value="${esc(n.name)}" aria-label="Layer name"><span class="chip">${n.type === 'List' ? 'LazyColumn' : n.type}</span></div>
    <div class="ins-tools"><button class="tbtn" data-cmd="code" title="Reveal in code">${ui('code', 13)}Code</button><button class="tbtn icon" data-cmd="up" title="Move up (⌥↑)" ${parent ? '' : 'disabled'}>${ui('up', 13)}</button><button class="tbtn icon" data-cmd="down" title="Move down (⌥↓)" ${parent ? '' : 'disabled'}>${ui('down', 13)}</button><button class="tbtn icon" data-cmd="dup" title="Duplicate (⌘D)" ${parent && parent.type !== 'List' ? '' : 'disabled'}>${ui('dup', 13)}</button><button class="tbtn icon" data-cmd="del" title="Delete (⌫)" ${parent ? '' : 'disabled'}>${ui('trash', 13)}</button></div>`;
  const listAnc = path.slice(0, -1).reverse().find(x => x.type === 'List');
  if (listAnc) { const cnt = (resolve(listAnc.props.items, { state: view() }) || []).length; h += `<div class="note">${ui('list', 13)}<span>Inside the item template of <code>items(${esc(listAnc.props.items)})</code>. Edits apply to all ${cnt} rows.</span></div>`; }
  h += '</div>';
  if (!parent) h += screenSection(st.screen);
  if (n.type === 'List') h += listSection(n);
  else if (CONTAINERS.has(n.type)) h += layoutSection(n);
  h += sizeSection(n, parent);
  if (n.type === 'Text' || n.type === 'Button') h += textSection(n);
  if (n.type === 'IconButton') h += iconSection(n);
  if (n.type === 'Image') h += imageSection(n);
  if (['Column', 'Row', 'Box', 'Card', 'Image'].includes(n.type)) h += appearanceSection(n);
  if (['Button', 'IconButton', 'Row', 'Column', 'Box', 'Card', 'Image'].includes(n.type)) h += interactionSection(n);
  h += motionSection(n, parent);
  inspEl.innerHTML = h;
}
function screenSection(key) {
  const s = doc.screens[key], c = s.enter;
  return sec(`${ui('phone', 13)} Screen · navigation`, `<div class="size-row"><span class="nl">Route</span><code>Route.${esc(s.route)}${s.routeArgs ? `(${esc(s.routeArgs)})` : ''}</code></div>
  <div class="flabel">Enter transition (pop reverses it)</div>${selectEl(`data-enter="type" data-scr="${key}" aria-label="Enter transition"`, Object.entries(TRANS), c.type)}
  <div class="f2"><label class="num ${c.ease === 'Spring' ? 'dis' : ''}"><input type="number" data-enter="dur" data-scr="${key}" value="${c.dur}" min="50" step="50" ${c.ease === 'Spring' ? 'disabled' : ''} aria-label="Duration"><span class="nu">ms</span></label>${selectEl(`data-enter="ease" data-scr="${key}" aria-label="Easing"`, Object.keys(EASE_CSS), c.ease)}</div>
  <div class="curve-box">${curveSvg(c.ease)}<div class="mini-col"><div class="mini" id="mini-${key}"><i></i></div><button class="chipbtn" data-replay="${key}">${ui('play', 11)}Preview</button></div></div>`);
}
function curveSvg(ease) {
  const W = 118, H = 76, P = 10; let d;
  if (ease === 'Spring') { const pts = []; for (let i = 0; i <= 48; i++) { const t = i / 48, y = 1 - Math.exp(-5 * t) * Math.cos(9 * t); pts.push(`${P + t * (W - 2 * P)} ${H - P - y * (H - 2 * P) * .82}`); } d = 'M' + pts.join(' L'); }
  else { const b = { Emphasized: [.05, .7, .1, 1], Standard: [.4, 0, .2, 1], Linear: [0, 0, 1, 1] }[ease]; const X = v => P + v * (W - 2 * P), Y = v => H - P - v * (H - 2 * P) * .82; d = `M${X(0)} ${Y(0)} C${X(b[0])} ${Y(b[1])}, ${X(b[2])} ${Y(b[3])}, ${X(1)} ${Y(1)}`; }
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-label="${ease} easing curve"><path class="cg" d="M${P} ${H - P}H${W - P}M${P} ${H - P - (H - 2 * P) * .82}H${W - P}"/><path class="cp" d="${d}"/></svg>`;
}
function layoutSection(n) {
  const p = n.props, t = n.type;
  const typeSeg = t === 'Card' ? '' : `<div class="seg">${['Column', 'Row', 'Box'].map(x => `<button data-settype="${x}" class="${t === x ? 'on' : ''}">${ui(TYPEICON[x], 13)}${x}</button>`).join('')}</div>`;
  let grid = '<div class="al-grid" role="group" aria-label="Alignment">';
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    let on = false, part = false;
    if (t === 'Box') on = BOXAL[r][c] === (p.balign || 'TopStart');
    else { const isCol = t !== 'Row', V = ['start', 'center', 'end'], mainV = V[isCol ? r : c], crossV = V[isCol ? c : r], crossOn = (p.align || 'start') === crossV; if (p.arr === 'between') part = crossOn; else on = (p.arr || 'start') === mainV && crossOn; }
    grid += `<button data-al="${r},${c}" class="${on ? 'on' : ''} ${part ? 'part' : ''}" aria-label="Align row ${r + 1} column ${c + 1}"><i></i></button>`;
  }
  grid += '</div>';
  const side = t === 'Box' ? `<p class="hint">Children stack. The grid sets <code>contentAlignment</code>.</p>` : `${numIn('gap', p.gap || 0, { label: ui('gap', 13), unit: 'dp', min: 0, aria: 'Gap' })}<button class="chipbtn ${p.arr === 'between' ? 'on' : ''}" data-between>Space between</button>`;
  return sec('Auto layout', `${typeSeg}<div class="al-wrap">${grid}<div class="al-side">${side}</div></div><div class="flabel">Padding</div><div class="f2">${numIn('pad.x', p.pad?.x || 0, { label: 'H', unit: 'dp', min: 0, aria: 'Horizontal padding' })}${numIn('pad.y', p.pad?.y || 0, { label: 'V', unit: 'dp', min: 0, aria: 'Vertical padding' })}</div>`);
}
function listSection(n) {
  const p = n.props, lists = (model.classes.MenuUiState || []).filter(f => /^List</.test(f.type)).map(f => [`state.${f.name}`, `state.${f.name} : ${f.type}`]);
  return sec(`${ui('list', 13)} Lazy list`, `<div class="flabel">Items</div>${selectEl('data-p="items" aria-label="Items"', lists, p.items)}<div class="f2"><label class="num"><span class="nl">as</span><input data-p="item" value="${esc(p.item)}" aria-label="Item name"></label>${numIn('gap', p.gap || 0, { label: ui('gap', 13), unit: 'dp', min: 0, aria: 'Gap' })}</div><p class="hint">Design the row once. <code>LazyColumn</code> renders it for every item and binds <code>${esc(p.item)}</code>.</p>`);
}
function sizeSection(n, parent) {
  if (!parent) return sec('Size', `<p class="hint">The screen root fills the window: <code>Modifier.fillMaxSize()</code>.</p>`);
  const p = n.props;
  const row = (ax, lab) => { const v = p[ax], mode = v === 'fill' ? 'fill' : typeof v === 'number' ? 'fixed' : 'wrap'; return `<div class="size-row"><span class="nl">${lab}</span>${selectEl(`data-size="${ax}" aria-label="${lab} sizing"`, [['fill', 'Fill'], ['wrap', 'Wrap'], ['fixed', 'Fixed']], mode)}${numIn(ax, typeof v === 'number' ? v : '', { unit: 'dp', min: 0, dis: mode !== 'fixed', ph: '–', aria: lab + ' in dp' })}</div>`; };
  const wt = ['Row', 'Column', 'Card'].includes(parent.type) ? `<div class="size-row"><span class="nl">Weight</span>${numIn('weight', p.weight || '', { min: 0, step: 0.5, ph: 'none', aria: 'Weight' })}<span class="hint">share of free space</span></div>` : '';
  return sec('Size', row('w', 'Width') + row('h', 'Height') + wt);
}
function appearanceSection(n) {
  const p = n.props;
  return sec('Fill & shape', `<div class="swatches"><button data-token="" class="sw none ${!p.bg ? 'on' : ''}" title="No fill">${ui('x', 12)}</button>${FILL_TOKENS.map(k => `<button data-token="${k}" class="sw ${p.bg === k ? 'on' : ''}" style="background:var(--m-${k})" title="${k}" aria-label="${k}"></button>`).join('')}</div><div class="tokname">${p.bg ? `colorScheme.<b>${p.bg}</b>` : 'No fill'}</div>
  <div class="size-row"><span class="nl">Radius</span><input type="range" min="0" max="40" step="1" data-p="radius" data-kind="num" value="${p.radius || 0}" aria-label="Corner radius">${numIn('radius', p.radius || 0, { unit: 'dp', min: 0, aria: 'Corner radius dp' })}</div>`);
}
function textSection(n) {
  const p = n.props, vars = varsFor(n.id), opts = [['', `${'Bind to state…'}`], ...bindingPaths(vars).map(b => [b.path, `${b.path} : ${b.type}`])];
  const hasBind = /\{[\w.]+\}/.test(p.text || '');
  let h = `<div class="txt"><input class="txtin" data-p="text" data-kind="str" value="${esc(p.text || '')}" aria-label="Text content">${selectEl('data-bind="text" aria-label="Insert a state binding"', opts, '')}${hasBind ? `<div class="resolved">${ui('link', 12)}Preview <span>“${esc(fmt(p.text, sampleScope(n.id)))}”</span></div>` : ''}</div>`;
  if (n.type === 'Text') {
    h += `<div class="size-row"><span class="nl">Style</span>${selectEl('data-p="style" aria-label="Text style"', Object.keys(TYPE).map(k => [k, `${k} · ${TYPE[k].size}sp`]), p.style || 'bodyLarge')}</div>`;
    h += `<div class="flabel">Color</div><div class="swatches"><button data-tcolor="" class="sw none ${!p.color ? 'on' : ''}" title="Inherit LocalContentColor">${ui('x', 12)}</button>${TEXT_TOKENS.map(k => `<button data-tcolor="${k}" class="sw ${p.color === k ? 'on' : ''}" style="background:var(--m-${k})" title="${k}" aria-label="${k}"></button>`).join('')}</div><div class="tokname">${p.color ? `colorScheme.<b>${p.color}</b>` : 'Inherits content color'}</div>`;
  } else {
    h += `<div class="flabel">Variant</div><div class="seg">${[['filled', 'Filled'], ['tonal', 'Tonal'], ['outlined', 'Outlined'], ['text', 'Text']].map(([v, l]) => `<button data-pset="variant" data-v="${v}" class="${(p.variant || 'filled') === v ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  }
  return sec(n.type === 'Text' ? 'Text' : 'Button', h);
}
function iconSection(n) {
  const p = n.props, opts = [['', 'No badge'], ...bindingPaths(varsFor(n.id)).filter(b => /^Int/.test(b.type)).map(b => [`{${b.path}}`, b.path])];
  return sec('Icon', `<div class="size-row"><span class="nl">Icon</span>${selectEl('data-p="icon" aria-label="Icon"', Object.keys(MI), p.icon)}</div><div class="size-row"><span class="nl">Label</span><input class="txtin" data-p="desc" data-kind="str" value="${esc(p.desc || '')}" placeholder="contentDescription" aria-label="Content description"></div><div class="size-row"><span class="nl">Badge</span>${selectEl('data-p="badge" aria-label="Badge binding"', opts, p.badge || '')}</div>`);
}
function imageSection(n) {
  const p = n.props, opts = [['', 'Placeholder drawable'], ...bindingPaths(varsFor(n.id)).filter(b => b.path.endsWith('imageUrl')).map(b => [b.path, b.path])];
  return sec(`${ui('image', 13)} Image`, `<div class="flabel">Source · Coil <code>AsyncImage</code></div>${selectEl('data-p="src" aria-label="Image source"', opts, p.src || '')}`);
}
function actKt(a, vars = {}) {
  if (a.kind === 'event') { const ev = model.events.find(e => e.name === a.event); const has = ev ? ev.params.length > 0 : !!a.arg; return `onEvent(${model.iface}.${a.event || '?'}${has ? `(${ktPath(a.arg || '')})` : ''})`; }
  if (a.kind === 'navigate') { const t = doc.screens[a.to]; if (!t) return 'onNavigate(/* pick a screen */)'; const pn = t.routeArgs ? t.routeArgs.split(':')[0].trim() : null; return `onNavigate(Route.${t.route}${pn ? `(${pn} = ${ktArg(a.arg || '""', vars)})` : ''})`; }
  return 'onBack()';
}
function interactionSection(n) {
  const acts = n.props.actions || [], vars = varsFor(n.id), sugg = bindingPaths(vars).map(b => b.path);
  const cards = acts.map((a, i) => {
    let body = '', bad = false;
    if (a.kind === 'event') {
      const ev = model.events.find(e => e.name === a.event); bad = !ev;
      const opts = model.events.map(e => [e.name, `${model.iface}.${e.name}${e.params.length ? `(${e.params.map(x => x.name).join(', ')})` : ''}`]); if (bad) opts.unshift([a.event, `${a.event}  (unresolved)`]);
      body = selectEl(`data-actf="event" data-ai="${i}" aria-label="Event"`, opts, a.event);
      if (ev?.params.length) body += `<div class="act-arg"><span>${esc(ev.params[0].name)}: ${esc(ev.params[0].type)} =</span><input class="txtin mono" data-actf="arg" data-ai="${i}" value="${esc(a.arg || '')}" list="dl-args" placeholder="value or binding" aria-label="Argument"></div>`;
      if (bad) body += `<div class="act-err">Unresolved reference '${esc(a.event)}'. Declare it in ${model.iface} in MenuViewModel.kt.</div>`;
      else if (!isHandled(a.event)) body += `<div class="act-err">${model.iface}.${esc(a.event)} has no branch in onEvent's when.</div>`;
      if (ev && isHandled(a.event)) body += `<button class="act-link" data-jump="${esc(a.event)}">${ui('code', 12)}Open handler in MenuViewModel.kt</button>`;
    } else if (a.kind === 'navigate') {
      const t = doc.screens[a.to];
      body = selectEl(`data-actf="to" data-ai="${i}" aria-label="Destination"`, ORDER.filter(k => k !== st.screen || a.to === k).map(k => [k, `Route.${doc.screens[k].route}`]), a.to);
      if (t?.routeArgs) body += `<div class="act-arg"><span>${esc(t.routeArgs.split(':')[0])} =</span><input class="txtin mono" data-actf="arg" data-ai="${i}" value="${esc(a.arg || '')}" list="dl-args" aria-label="Route argument"></div>`;
      if (t) body += `<div class="f2">${selectEl(`data-enter="type" data-scr="${a.to}" aria-label="Transition"`, Object.entries(TRANS), t.enter.type)}<label class="num ${t.enter.ease === 'Spring' ? 'dis' : ''}"><input type="number" data-enter="dur" data-scr="${a.to}" value="${t.enter.dur}" min="50" step="50" ${t.enter.ease === 'Spring' ? 'disabled' : ''} aria-label="Duration"><span class="nu">ms</span></label></div>`;
    } else body = `<p class="hint">Pops the back stack: <code>navController.popBackStack()</code>.</p>`;
    const label = { event: 'Send event', navigate: 'Navigate to', back: 'Navigate back' }[a.kind];
    return `<div class="act ${bad ? 'bad' : ''}"><div class="act-top"><span class="act-n">${i + 1}</span><span class="act-kind">${label}</span><button class="act-x" data-delact="${i}" title="Remove action" aria-label="Remove action">${ui('x', 12)}</button></div>${body}<div class="act-code">${hl(actKt(a, vars))}</div></div>`;
  }).join('');
  return sec(`${ui('bolt', 13)} Interactions <em>onClick</em>`, (cards || `<p class="hint">No actions. Clicks do nothing yet.</p>`) + `<div class="add-act"><button data-addact="event">+ Event</button><button data-addact="navigate">+ Navigate</button><button data-addact="back">+ Back</button></div><datalist id="dl-args">${sugg.map(s => `<option value="${esc(s)}">`).join('')}</datalist>`, 'sec-flow');
}
function motionSection(n, parent) {
  const p = n.props; let b = '';
  if (CONTAINERS.has(n.type) && n.type !== 'List' || n.type === 'Text') b += toggle('animateSize', p.animateSize, 'Animate size changes', '.animateContentSize()');
  if (parent?.type === 'List') b += toggle('animateItem', p.animateItem, 'Animate item placement', '.animateItem()');
  if (n.type === 'Image') b += toggle('shared', p.shared, 'Shared element', 'morphs across navigation');
  return b ? sec(`${ui('motion', 13)} Motion`, b) : '';
}
function playPanel() {
  const v = view(), rows = [['userName', v.userName], ['selected', v.selected?.name], ['quantity', v.quantity], ['total', v.total], ['cart.size', v.cart.length], ['cartCount', v.cartCount], ['cartTotal', v.cartTotal]];
  return `<div class="ins-head"><div class="ins-title"><span class="ins-ic fl">${ui('play', 14)}</span><b style="font-size:14px;flex:1">Prototype</b><span class="chip fl">live state</span></div><p class="hint">Tap the device. Events go to <code>MenuViewModel.onEvent</code> and the UI recomposes from the new state.</p></div>
  ${sec('Back stack', `<div class="stack">${navStack.map((k, i) => `<span class="chip ${i === navStack.length - 1 ? 'top' : ''}">Route.${esc(doc.screens[k].route)}</span>`).join(ui('chev', 10))}</div>`)}
  ${sec('MenuUiState', `<table class="kv">${rows.map(([k, val]) => `<tr class="${changedKeys.has(k) ? 'chg' : ''}"><td>${k}</td><td>${esc(val)}</td></tr>`).join('')}</table>`)}
  ${sec('Session', `<div class="f2"><button class="tbtn" data-cmd="reset">${ui('reset', 13)}Reset state</button><button class="tbtn pri" data-cmd="stop">${ui('cursor', 13)}Design</button></div>`)}`;
}

/* ---------- Kotlin codegen (canvas → source) ---------- */
const ktPath = p => String(p).replace(/\bstate\.selected\./g, 'state.selected?.');
const ktArg = (a, vars) => { const s = String(a); if (/^state\.selected\./.test(s) && typeOf(s, vars) === 'String') return ktPath(s) + '.orEmpty()'; return ktPath(s); };
function ktExpr(str, vars) {
  const whole = String(str).match(/^\{([\w.]+)\}$/);
  if (whole) { const t = typeOf(whole[1], vars), e = ktPath(whole[1]); if (t === 'String') return whole[1].startsWith('state.selected.') ? e + '.orEmpty()' : e; return '"${' + e + '}"'; }
  let s = String(str).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$');
  s = s.replace(/\{([\w.]+)\}/g, (_, x) => '${' + ktPath(x) + '}');
  return '"' + s + '"';
}
const padStr = pd => { const x = pd.x || 0, y = pd.y || 0; if (x === y) return `padding(${x}.dp)`; if (!y) return `padding(horizontal = ${x}.dp)`; if (!x) return `padding(vertical = ${y}.dp)`; return `padding(horizontal = ${x}.dp, vertical = ${y}.dp)`; };
function modParts(n, parent) {
  const p = n.props, m = [];
  if (p.animateItem && parent?.type === 'List') m.push('animateItem()');
  if (p.weight && parent && ['Row', 'Column', 'Card'].includes(parent.type)) m.push(`weight(${p.weight}f)`);
  const W = p.w, H = p.h;
  if (W === 'fill' && H === 'fill') m.push('fillMaxSize()');
  else if (typeof W === 'number' && W === H) m.push(`size(${W}.dp)`);
  else { if (W === 'fill') m.push('fillMaxWidth()'); else if (typeof W === 'number') m.push(`width(${W}.dp)`); if (H === 'fill') m.push('fillMaxHeight()'); else if (typeof H === 'number') m.push(`height(${H}.dp)`); }
  if (p.shared) m.push('sharedElement(rememberSharedContentState("drink-image"), animatedVisibilityScope)');
  if (p.radius && !['Card', 'Button'].includes(n.type)) m.push(`clip(RoundedCornerShape(${p.radius}.dp))`);
  if (p.bg && !['Card', 'Button'].includes(n.type)) m.push(`background(MaterialTheme.colorScheme.${p.bg})`);
  if ((p.actions || []).length && ['Row', 'Column', 'Box', 'Image'].includes(n.type)) m.push({ click: p.actions });
  if (p.animateSize) m.push('animateContentSize()');
  if (p.pad && (p.pad.x || p.pad.y) && !['Card', 'Button'].includes(n.type)) m.push(padStr(p.pad));
  return m;
}
function layoutArgs(n) {
  const p = n.props, a = [];
  if (n.type === 'Box') { if (p.balign && p.balign !== 'TopStart') a.push(`contentAlignment = Alignment.${p.balign}`); return a; }
  const col = n.type !== 'Row'; let arr = null;
  if (p.arr === 'between') arr = 'Arrangement.SpaceBetween';
  else if (p.gap) { const al = p.arr === 'center' ? (col ? 'Alignment.CenterVertically' : 'Alignment.CenterHorizontally') : p.arr === 'end' ? (col ? 'Alignment.Bottom' : 'Alignment.End') : ''; arr = `Arrangement.spacedBy(${p.gap}.dp${al ? ', ' + al : ''})`; }
  else if (p.arr === 'center') arr = 'Arrangement.Center';
  else if (p.arr === 'end') arr = col ? 'Arrangement.Bottom' : 'Arrangement.End';
  if (arr) a.push(`${col ? 'verticalArrangement' : 'horizontalArrangement'} = ${arr}`);
  const al = p.align === 'center' ? (col ? 'Alignment.CenterHorizontally' : 'Alignment.CenterVertically') : p.align === 'end' ? (col ? 'Alignment.End' : 'Alignment.Bottom') : null;
  if (al) a.push(`${col ? 'horizontalAlignment' : 'verticalAlignment'} = ${al}`);
  return a;
}
function emitMods(mods, I, P, vars) {
  if (!mods.length) return;
  if (mods.length === 1 && typeof mods[0] === 'string') { P(`${I}modifier = Modifier.${mods[0]},`); return; }
  P(`${I}modifier = Modifier`);
  mods.forEach((m, i) => { const c = i === mods.length - 1 ? ',' : '';
    if (typeof m === 'string') P(`${I}    .${m}${c}`);
    else if (m.click.length === 1) P(`${I}    .clickable { ${actKt(m.click[0], vars)} }${c}`);
    else { P(`${I}    .clickable {`); m.click.forEach(x => P(`${I}        ${actKt(x, vars)}`)); P(`${I}    }${c}`); } });
}
function emitLambda(name, acts, I, P, vars) {
  if (!acts.length) P(`${I}${name} = {},`);
  else if (acts.length === 1) P(`${I}${name} = { ${actKt(acts[0], vars)} },`);
  else { P(`${I}${name} = {`); acts.forEach(a => P(`${I}    ${actKt(a, vars)}`)); P(`${I}},`); }
}
function genNode(n, parent, d, vars, L, ranges) {
  const I = '    '.repeat(d), I1 = I + '    ', start = L.length, p = n.props, acts = p.actions || [];
  const P = t => L.push({ t, id: n.id });
  const mods = modParts(n, parent);
  const kids = (dd, v) => n.children.forEach(c => genNode(c, n, dd, v, L, ranges));
  if (parent && CONTAINERS.has(n.type) && n.name !== n.type) P(`${I}// ${n.name}`);
  switch (n.type) {
    case 'Column': case 'Row': case 'Box': {
      const args = layoutArgs(n);
      if (!mods.length && !args.length) P(`${I}${n.type} {`); else { P(`${I}${n.type}(`); emitMods(mods, I1, P, vars); args.forEach(a => P(`${I1}${a},`)); P(`${I}) {`); }
      kids(d + 1, vars); P(`${I}}`); break;
    }
    case 'Card': {
      P(`${I}Card(`); if (acts.length) emitLambda('onClick', acts, I1, P, vars); emitMods(mods, I1, P, vars);
      if (p.radius) P(`${I1}shape = RoundedCornerShape(${p.radius}.dp),`);
      if (p.bg) P(`${I1}colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.${p.bg}),`);
      P(`${I}) {`);
      const inner = p.pad && (p.pad.x || p.pad.y) ? [padStr(p.pad)] : [], la = layoutArgs({ ...n, type: 'Column' });
      if (!inner.length && !la.length) P(`${I1}Column {`); else { P(`${I1}Column(`); emitMods(inner, I1 + '    ', P, vars); la.forEach(a => P(`${I1}    ${a},`)); P(`${I1}) {`); }
      kids(d + 2, vars); P(`${I1}}`); P(`${I}}`); break;
    }
    case 'List': {
      const la = layoutArgs({ ...n, type: 'Column' });
      if (!mods.length && !la.length) P(`${I}LazyColumn {`); else { P(`${I}LazyColumn(`); emitMods(mods, I1, P, vars); la.forEach(a => P(`${I1}${a},`)); P(`${I}) {`); }
      const el = elemType(typeOf(p.items, vars)), fields = model.classes[el] || [];
      const key = fields.some(f => f.name === 'id') ? 'it.id' : (fields.find(f => (model.classes[f.type] || []).some(g => g.name === 'id')) ? `it.${fields.find(f => (model.classes[f.type] || []).some(g => g.name === 'id')).name}.id` : null);
      P(`${I1}items(${p.items}${key ? `, key = { ${key} }` : ''}) { ${p.item} ->`);
      n.children.forEach(c => genNode(c, n, d + 2, { ...vars, [p.item]: el }, L, ranges));
      P(`${I1}}`); P(`${I}}`); break;
    }
    case 'Text':
      P(`${I}Text(`); P(`${I1}text = ${ktExpr(p.text || '', vars)},`); P(`${I1}style = MaterialTheme.typography.${p.style || 'bodyLarge'},`);
      if (p.color) P(`${I1}color = MaterialTheme.colorScheme.${p.color},`); emitMods(mods, I1, P, vars); P(`${I})`); break;
    case 'Button': {
      const fn = { filled: 'Button', tonal: 'FilledTonalButton', outlined: 'OutlinedButton', text: 'TextButton' }[p.variant || 'filled'];
      P(`${I}${fn}(`); emitLambda('onClick', acts, I1, P, vars); emitMods(mods, I1, P, vars); P(`${I}) {`); P(`${I1}Text(${ktExpr(p.text || '', vars)})`); P(`${I}}`); break;
    }
    case 'IconButton': {
      if (acts.length <= 1 && !mods.length) P(`${I}IconButton(onClick = { ${acts[0] ? actKt(acts[0], vars) : ''} }) {`);
      else { P(`${I}IconButton(`); emitLambda('onClick', acts, I1, P, vars); emitMods(mods, I1, P, vars); P(`${I}) {`); }
      const ic = `Icon(${iconKt(p.icon)}, contentDescription = ${p.desc ? JSON.stringify(p.desc) : 'null'})`;
      if (p.badge) { P(`${I1}BadgedBox(badge = { Badge { Text(${ktExpr(p.badge, vars)}) } }) {`); P(`${I1}    ${ic}`); P(`${I1}}`); } else P(`${I1}${ic}`);
      P(`${I}}`); break;
    }
    case 'Image':
      if (p.src) { P(`${I}AsyncImage(`); P(`${I1}model = ${ktPath(p.src)},`); } else { P(`${I}Image(`); P(`${I1}painter = painterResource(R.drawable.placeholder),`); }
      P(`${I1}contentDescription = null,`); P(`${I1}contentScale = ContentScale.Crop,`); emitMods(mods, I1, P, vars); P(`${I})`); break;
    case 'Spacer': { const m = mods.filter(x => typeof x === 'string'); P(`${I}Spacer(Modifier${m.length ? '.' + m.join('.') : ''})`); break; }
  }
  ranges[n.id] = [start, L.length - 1];
}
function genScreen(key) {
  const s = doc.screens[key], L = [], ranges = {}, P = t => L.push({ t, id: null });
  P(`package dev.brew.ui.${s.pkg}`); P(''); P('import …'); P('');
  P('@Composable'); P(`fun ${s.fn}(`); P('    state: MenuUiState,'); P(`    onEvent: (${model.iface}) -> Unit,`); P('    onNavigate: (Route) -> Unit,'); P('    onBack: () -> Unit,'); P('    modifier: Modifier = Modifier,'); P(') {');
  genNode(s.root, null, 1, {}, L, ranges);
  P('}'); P(''); P('@Preview(showBackground = true)'); P('@Composable'); P(`private fun ${s.fn}Preview() {`); P('    BrewTheme {'); P(`        ${s.fn}(state = MenuUiState.preview, onEvent = {}, onNavigate = {}, onBack = {})`); P('    }'); P('}');
  return { lines: L, ranges };
}
function specKt(c) { return c.ease === 'Spring' ? 'spring(stiffness = Spring.StiffnessMediumLow)' : `tween(${c.dur}, easing = ${EASE_KT[c.ease]})`; }
function transKt(c) {
  const s = specKt(c);
  switch (c.type) {
    case 'fade': return [`fadeIn(${s})`, `fadeOut(${s})`];
    case 'slide': return [`slideIntoContainer(SlideDirection.Start, ${s})`, `slideOutOfContainer(SlideDirection.End, ${s})`];
    case 'slideUp': return [`slideIntoContainer(SlideDirection.Up, ${s})`, `slideOutOfContainer(SlideDirection.Down, ${s})`];
    case 'scale': return [`scaleIn(${s}, initialScale = 0.92f) + fadeIn()`, `scaleOut(${s}, targetScale = 0.92f) + fadeOut()`];
    default: return ['EnterTransition.None', 'ExitTransition.None'];
  }
}
function genNav() {
  const L = [], P = (t, id = null) => L.push({ t, id });
  P('package dev.brew.navigation'); P(''); P('import …'); P('');
  P('@Serializable'); P('sealed interface Route {');
  ORDER.forEach(k => { const s = doc.screens[k]; P(s.routeArgs ? `    @Serializable data class ${s.route}(val ${s.routeArgs}) : Route` : `    @Serializable data object ${s.route} : Route`); });
  P('}'); P(''); P('@Composable'); P('fun BrewNavHost('); P('    navController: NavHostController = rememberNavController(),'); P('    viewModel: MenuViewModel = hiltViewModel(),'); P(') {');
  P('    val state by viewModel.state.collectAsStateWithLifecycle()'); P('');
  P('    SharedTransitionLayout {'); P('        NavHost(navController = navController, startDestination = Route.Home) {');
  ORDER.forEach(k => { const s = doc.screens[k], [en, ex] = transKt(s.enter);
    P(`            composable<Route.${s.route}>(`); P(`                enterTransition = { ${en} },`); P(`                popExitTransition = { ${ex} },`); P('            ) {');
    P(`                ${s.fn}(`); P('                    state = state,'); P('                    onEvent = viewModel::onEvent,'); P('                    onNavigate = { route -> navController.navigate(route) { launchSingleTop = true } },'); P('                    onBack = { navController.popBackStack() },'); P('                )'); P('            }'); });
  P('        }'); P('    }'); P('}');
  return { lines: L, ranges: {} };
}
function genTheme() {
  const t = doc.theme, L = [], P = t2 => L.push({ t: t2, id: null }), WN = { 400: 'Normal', 500: 'Medium', 600: 'SemiBold' };
  P('package dev.brew.ui.theme'); P(''); P('import …'); P('');
  P('private val provider = GoogleFont.Provider('); P('    providerAuthority = "com.google.android.gms.fonts",'); P('    providerPackage = "com.google.android.gms",'); P('    certificates = R.array.com_google_android_gms_fonts_certs,'); P(')'); P('');
  P(`val DisplayFont = FontFamily(Font(GoogleFont("${t.display}"), provider))`); P(`val BodyFont = FontFamily(Font(GoogleFont("${t.body}"), provider))`); P('');
  [['LightColors', 'lightColorScheme', t.light], ['DarkColors', 'darkColorScheme', t.dark]].forEach(([n, f, pal]) => { P(`private val ${n} = ${f}(`); COLOR_KEYS.forEach(k => P(`    ${k} = Color(0xFF${pal[k].slice(1).toUpperCase()}),`)); P(')'); P(''); });
  P('private val BrewTypography = Typography(');
  Object.entries(TYPE).forEach(([k, v]) => P(`    ${k} = TextStyle(fontFamily = ${v.role === 'display' ? 'DisplayFont' : 'BodyFont'}, fontWeight = FontWeight.${WN[v.w]}, fontSize = ${v.size}.sp, lineHeight = ${v.lh}.sp),`));
  P(')'); P(''); P('@Composable'); P('fun BrewTheme('); P('    darkTheme: Boolean = isSystemInDarkTheme(),'); P('    content: @Composable () -> Unit,'); P(') {');
  P('    MaterialTheme('); P('        colorScheme = if (darkTheme) DarkColors else LightColors,'); P('        typography = BrewTypography,'); P('        content = content,'); P('    )'); P('}');
  return { lines: L, ranges: {} };
}

/* ---------- syntax highlight ---------- */
const KW = new Set('package import fun val var class data object sealed interface private override return if else when is in by true false null this constructor init companion internal const suspend'.split(' '));
const hlStr = s => esc(s).replace(/\$\{[^}]*\}/g, x => `<b class="tx">${x}</b>`);
function hl(line) {
  const re = /(\/\/.*$)|("(?:[^"\\]|\\.)*")|(@[A-Za-z]\w*)|(\b0x[0-9A-Fa-f]+\b|\b\d+(?:\.\d+)?f?\b)|([A-Za-z_]\w*)|([^\w"@/]+)|([\s\S])/g;
  let out = '', m;
  while ((m = re.exec(line)) !== null) {
    if (m[1]) out += `<i class="tc">${esc(m[1])}</i>`;
    else if (m[2]) out += `<i class="ts">${hlStr(m[2])}</i>`;
    else if (m[3]) out += `<i class="ta">${esc(m[3])}</i>`;
    else if (m[4]) out += `<i class="tn">${esc(m[4])}</i>`;
    else if (m[5]) {
      const w = m[5], next = line.slice(re.lastIndex), prev = line.slice(0, m.index);
      if (KW.has(w)) out += `<i class="tk">${w}</i>`;
      else if (/^[A-Z]/.test(w) && /^\s*[({<]/.test(next)) out += `<i class="tf">${w}</i>`;
      else if (/^[A-Z]/.test(w)) out += `<i class="tt">${w}</i>`;
      else if (/^\s*\(/.test(next) || (/^\s*\{/.test(next) && /\.\s*$/.test(prev))) out += `<i class="tm">${w}</i>`;
      else if (/^\s*=(?!=)/.test(next) && /[(,]\s*$|^\s*$/.test(prev)) out += `<i class="tp">${w}</i>`;
      else out += esc(w);
    } else out += esc(m[6] || m[7]);
  }
  return out;
}

/* ---------- code panel ---------- */
const codeCache = {};
const FILES = () => [...ORDER.map(k => ({ key: 'screen:' + k, label: doc.screens[k].file })), { key: 'vm', label: 'MenuViewModel.kt' }, { key: 'nav', label: 'NavGraph.kt' }, { key: 'theme', label: 'Theme.kt' }];
function renderCode(scrollSel) {
  $('#ftabs').innerHTML = FILES().map(f => `<button role="tab" class="ft ${st.file === f.key ? 'on' : ''}" data-file="${f.key}"><span class="kt ${f.key === 'vm' ? 'kvm' : ''}">K</span>${esc(f.label)}${f.key === 'vm' && vmDirty ? '<span class="dot" title="Edited"></span>' : ''}</button>`).join('');
  let path, badge;
  if (st.file.startsWith('screen:')) { const s = doc.screens[st.file.slice(7)]; path = `app › src/main › dev.brew.ui.${s.pkg} › ${s.file}`; badge = `<span class="badge" title="Canvas edits write here. Click a line to select its element.">${ui('layers', 11)} Synced with canvas</span>`; }
  else if (st.file === 'vm') { path = 'app › src/main › dev.brew.ui.menu › MenuViewModel.kt'; badge = `<span class="badge vm" title="Events and state you declare here appear in Interactions and bindings">${ui('bolt', 11)} Your code · feeds Interactions</span>`; }
  else if (st.file === 'nav') { path = 'app › src/main › dev.brew.navigation › NavGraph.kt'; badge = `<span class="badge">${ui('flow', 11)} From prototype links</span>`; }
  else { path = 'app › src/main › dev.brew.ui.theme › Theme.kt'; badge = `<span class="badge">${ui('palette', 11)} From Theme panel</span>`; }
  $('#crumbs').innerHTML = `<span class="path">${esc(path)}</span>${badge}`;
  if (st.file === 'vm') { codeView.hidden = true; vmEd.hidden = false; renderVmPre(); return; }
  vmEd.hidden = true; codeView.hidden = false;
  const res = st.file.startsWith('screen:') ? genScreen(st.file.slice(7)) : st.file === 'nav' ? genNav() : genTheme();
  const prev = codeCache[st.file], left = new Map(); (prev || []).forEach(t => left.set(t, (left.get(t) || 0) + 1));
  const range = res.ranges[st.sel];
  codeView.innerHTML = res.lines.map((l, i) => {
    let flash = false; if (prev) { const c = left.get(l.t); if (c) left.set(l.t, c - 1); else if (l.t.trim()) flash = true; }
    const sel = range && i >= range[0] && i <= range[1];
    let mk = ''; const cm = l.t.match(/Color\(0xFF([0-9A-F]{6})\)/);
    if (cm) mk = `<i class="mk-sw" style="background:#${cm[1]}"></i>`; else if (/\bon(Event|Navigate|Back)\(/.test(l.t) && /[{]/.test(l.t)) mk = `<i class="mk-ev">${ui('bolt', 11)}</i>`; else if (l.t.trim() === '@Composable') mk = '<i class="mk-c" title="Composable"></i>';
    const ct = l.t === 'import …' ? `<i class="tk">import</i> <span class="fold">…</span>` : hl(l.t);
    return `<div class="cl${sel ? ' sel' : ''}${flash ? ' flash' : ''}" ${l.id ? `data-id="${l.id}"` : ''}><span class="gn">${i + 1}</span><span class="gm">${mk}</span><span class="ct">${ct || ' '}</span></div>`;
  }).join('');
  codeCache[st.file] = res.lines.map(l => l.t);
  if (scrollSel && range) { const ln = codeView.querySelector('.cl.sel'); if (ln) { const top = ln.offsetTop, vis = codeView.scrollTop, h = codeView.clientHeight; if (top < vis + 20 || top > vis + h - 60) codeView.scrollTop = Math.max(0, top - 60); } }
}
function renderVmPre() {
  const lines = vmSrc.split('\n'), errs = new Set(problems.filter(p => p.vm).map(p => p.vm - 1));
  vmPre.innerHTML = lines.map((l, i) => `<div class="vl${errs.has(i) ? ' err' : ''}${flashVm === i ? ' hit' : ''}">${(l === 'import …' ? `<i class="tk">import</i> <span class="fold">…</span>` : hl(l)) || ' '}</div>`).join('');
  vmGut.innerHTML = lines.map((_, i) => `<div>${i + 1}</div>`).join('');
}
function jumpToVm(line, select = true) {
  st.file = 'vm'; if (st.mode === 'design') st.mode = 'split'; if (st.mtab !== 'code' && innerWidth <= 760) st.mtab = 'code';
  renderTop(); renderCode();
  const lines = vmSrc.split('\n'); let off = 0; for (let i = 0; i < line - 1; i++) off += lines[i].length + 1;
  requestAnimationFrame(() => { vmScroll.scrollTop = Math.max(0, (line - 4) * 20); if (select) { vmTa.focus({ preventScroll: true }); vmTa.setSelectionRange(off + (lines[line - 1].length - lines[line - 1].trimStart().length), off + lines[line - 1].length); } });
}

/* ---------- problems ---------- */
function computeProblems() {
  const P = [];
  model.events.forEach(ev => { if (!isHandled(ev.name)) P.push({ msg: `'when' expression must be exhaustive. Add the 'is ${model.iface}.${ev.name}' branch.`, file: 'MenuViewModel.kt', line: model.whenLine, vm: model.whenLine }); });
  ORDER.forEach(k => {
    (function rec(n, vars) {
      const p = n.props;
      (p.actions || []).forEach(a => { if (a.kind === 'event' && !model.events.some(e => e.name === a.event)) P.push({ msg: `Unresolved reference '${a.event}' in ${n.name}.onClick`, file: doc.screens[k].file, id: n.id, screen: k }); if (a.kind === 'navigate' && !doc.screens[a.to]) P.push({ msg: `${n.name} navigates to a missing destination`, file: doc.screens[k].file, id: n.id, screen: k }); });
      const paths = []; [p.text, p.badge].forEach(s => String(s || '').replace(/\{([\w.]+)\}/g, (_, x) => { paths.push(x); return _; })); if (p.src) paths.push(p.src); if (p.items) paths.push(p.items);
      paths.forEach(x => { if (!typeOf(x, vars)) P.push({ msg: `Unresolved reference '${x}' in ${n.name}`, file: doc.screens[k].file, id: n.id, screen: k }); });
      let v = vars; if (n.type === 'List') v = { ...vars, [p.item]: elemType(typeOf(p.items, vars)) };
      (n.children || []).forEach(c => rec(c, v));
    })(doc.screens[k].root, {});
  });
  problems = P; renderConsole(); renderStatus();
}
function renderConsole() {
  $('#conHead').innerHTML = `<button data-ctab="log" class="${st.ctab === 'log' ? 'on' : ''}">${ui('play', 12)}Run log</button><button data-ctab="problems" class="${st.ctab === 'problems' ? 'on' : ''}">${ui('warn', 12)}Problems <span class="cnt ${problems.length ? 'bad' : ''}">${problems.length}</span></button><span class="sp"></span><button data-cmd="reset" title="Reset preview state to MenuUiState.preview">${ui('reset', 12)}Reset state</button><button data-cmd="clearlog">Clear</button>`;
  if (st.ctab === 'problems') conBody.innerHTML = problems.length ? problems.map((p, i) => `<div class="pb" data-prob="${i}">${ui('warn', 13)}<span>${esc(p.msg)}</span><span class="loc">${esc(p.file)}${p.line ? ':' + p.line : ''}</span></div>`).join('') : `<div class="pb-empty">No problems. Every event is handled and every binding resolves.</div>`;
  else { conBody.innerHTML = logs.map(l => `<div class="lg ${l.kind}"><span class="tm">${l.ts}</span><span class="mg">${l.html}</span></div>`).join(''); conBody.scrollTop = conBody.scrollHeight; }
}
function logLine(kind, html) { const d = new Date(); logs.push({ kind, html, ts: d.toTimeString().slice(0, 8) + '.' + String(d.getMilliseconds()).padStart(3, '0') }); if (logs.length > 300) logs.shift(); if (st.ctab === 'log') renderConsole(); }
function renderStatus() {
  $('#statusbar').innerHTML = `<span><i class="okd"></i>Indexed · ${ORDER.length} screens · ${model.events.length} events</span><span class="probs ${problems.length ? 'bad' : ''}" data-ctab="problems">${ui('warn', 12)}${problems.length ? problems.length + ' problem' + (problems.length > 1 ? 's' : '') : 'No problems'}</span><span class="r">${DEVICES[st.device].label} · API 36</span><span>Kotlin 2.2 · Compose BOM 2025.10</span><span>UTF-8</span>`;
}
let syncT; function pulseSync(text) { const s = $('#sync'); s.classList.add('busy'); s.querySelector('span').textContent = text || `Writing ${st.file.startsWith('screen:') ? doc.screens[st.screen].file : 'source'}…`; clearTimeout(syncT); syncT = setTimeout(() => { s.classList.remove('busy'); s.querySelector('span').textContent = 'Synced with source'; }, 650); }
let toastT; function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 1600); }

function refresh(o = {}) {
  applyTheme(); renderTop(); renderCanvas();
  if (!o.keepLeft) renderLeft(); else if (st.leftTab === 'layers') renderLayers();
  if (!o.keepInspector) renderInspector();
  computeProblems(); renderCode(); pulseSync();
}
function select(id, inst = 0) {
  const f = find(id);
  if (f && f.screen !== st.screen) { st.screen = f.screen; st.view = 'screen'; if (st.file.startsWith('screen:')) st.file = 'screen:' + f.screen; st.sel = id; st.inst = inst; refresh(); }
  st.sel = f ? id : null; st.inst = inst;
  if (f) pathTo(id).forEach(n => st.collapsed.delete(n.id));
  if (st.leftTab === 'layers') renderLayers(); renderInspector(); renderCode(true); drawOverlay();
}

/* ---------- commands ---------- */
function makeNode(type) {
  switch (type) {
    case 'Column': return N('Column', null, { gap: 8 }, [N('Text', null, { text: 'Column item', style: 'bodyLarge' })]);
    case 'Row': return N('Row', null, { gap: 8, align: 'center' }, [N('Text', null, { text: 'Row item', style: 'bodyLarge' })]);
    case 'Box': return N('Box', null, { w: 120, h: 80, bg: 'surfaceContainer', radius: 12, balign: 'Center' }, [N('Text', null, { text: 'Box', style: 'labelLarge' })]);
    case 'Card': return N('Card', null, { w: 'fill', bg: 'secondaryContainer', radius: 20, pad: { x: 16, y: 16 }, gap: 6 }, [N('Text', null, { text: 'Card title', style: 'titleMedium' }), N('Text', null, { text: 'Supporting text', style: 'bodyMedium' })]);
    case 'Text': return N('Text', null, { text: 'New text', style: 'bodyLarge' });
    case 'Button': return N('Button', null, { text: 'Button', variant: 'tonal', actions: [] });
    case 'IconButton': return N('IconButton', null, { icon: 'FavoriteBorder', desc: 'Favorite', actions: [] });
    case 'Image': return N('Image', null, { w: 96, h: 96, radius: 16 });
    case 'Spacer': return N('Spacer', null, { h: 16 });
  }
}
function insert(type) {
  if (st.tool === 'play') return;
  if (st.view === 'flow') { st.view = 'screen'; }
  const node = makeNode(type), f = find(st.sel), root = doc.screens[st.screen].root;
  mutate(() => {
    if (f && f.screen === st.screen && CONTAINERS.has(f.node.type) && f.node.type !== 'List') f.node.children.push(node);
    else if (f && f.screen === st.screen && f.parent && f.parent.type !== 'List') f.parent.children.splice(f.parent.children.indexOf(f.node) + 1, 0, node);
    else root.children.push(node);
  });
  select(node.id); toast(`Inserted ${type} · wrote ${doc.screens[st.screen].file}`);
}
function cmd(c) {
  const f = find(st.sel);
  switch (c) {
    case 'del': if (!f?.parent) return toast('The screen root can’t be deleted'); mutate(() => f.parent.children.splice(f.parent.children.indexOf(f.node), 1)); toast(`Deleted ${f.node.name}`); select(f.parent.id, st.inst); break;
    case 'dup': { if (!f?.parent || f.parent.type === 'List') return; const c2 = cloneNode(f.node); mutate(() => f.parent.children.splice(f.parent.children.indexOf(f.node) + 1, 0, c2)); select(c2.id); toast(`Duplicated ${f.node.name}`); break; }
    case 'up': case 'down': { if (!f?.parent) return; const a = f.parent.children, i = a.indexOf(f.node), j = c === 'up' ? i - 1 : i + 1; if (j < 0 || j >= a.length) return; mutate(() => { a.splice(i, 1); a.splice(j, 0, f.node); }); break; }
    case 'code': st.file = 'screen:' + st.screen; if (st.mode === 'design') st.mode = 'split'; if (innerWidth <= 760) st.mtab = 'code'; else if (innerWidth <= 1180) st.mode = 'code'; renderTop(); renderCode(true); break;
    case 'reset': app = freshApp(); changedKeys = new Set(); logLine('sys', 'Preview state reset to MenuUiState.preview'); if (st.tool === 'play') { rerenderTop(); renderInspector(); } else renderCanvas(); break;
    case 'clearlog': logs = []; renderConsole(); break;
    case 'stop': setTool('design'); break;
  }
}

/* ---------- prototype runtime ---------- */
const REDUCERS = {
  OnDrinkClick: id => { if (DRINKS.some(d => d.id === id)) { app.selectedId = id; app.quantity = 1; } },
  OnQuantityChange: d => { app.quantity = clamp(app.quantity + (Number(d) || 0), 1, 9); },
  OnAddToCart: () => { const c = app.cart.find(x => x.id === app.selectedId); if (c) c.q += app.quantity; else app.cart.push({ id: app.selectedId, q: app.quantity }); },
  OnCheckout: () => { app.cart = []; },
};
let changedKeys = new Set();
const stateSnap = () => { const v = view(); return { selected: v.selected?.name, quantity: v.quantity, total: v.total, 'cart.size': v.cart.length, cartCount: v.cartCount, cartTotal: v.cartTotal }; };
function evalArg(arg, scope) { if (arg == null || arg === '') return undefined; const s = String(arg).trim(); if (/^".*"$/.test(s)) return s.slice(1, -1); if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s); return resolve(s, scope); }
function fireEvent(a, scope) {
  const ev = model.events.find(e => e.name === a.event);
  if (!ev) { logLine('err', `Unresolved reference '${esc(a.event)}'. Declare it in ${model.iface}.`); return false; }
  const arg = ev.params.length ? evalArg(a.arg, scope) : undefined;
  logLine('event', `onEvent(${model.iface}.${esc(ev.name)}${ev.params.length ? `(${esc(ev.params[0].name)} = ${esc(JSON.stringify(arg))})` : ''})`);
  if (!isHandled(ev.name)) { logLine('warn', `No branch for ${esc(ev.name)} in onEvent: the event is dropped`); return false; }
  const ln = model.handledLine[ev.name]; if (ln) { flashVm = ln - 1; if (st.file === 'vm') renderVmPre(); setTimeout(() => { flashVm = -1; if (st.file === 'vm') renderVmPre(); }, 900); }
  const red = REDUCERS[ev.name];
  if (!red) { logLine('sys', `${esc(ev.name)} reached MenuViewModel. This preview has no reducer for it, so state is unchanged.`); return false; }
  const before = stateSnap(); red(arg); const after = stateSnap(); changedKeys = new Set();
  Object.keys(after).forEach(k => { if (before[k] !== after[k]) { changedKeys.add(k); logLine('diff', `state.${k}  <s>${esc(before[k])}</s> → ${esc(after[k])}`); } });
  if (!changedKeys.size) logLine('sys', 'State unchanged');
  return changedKeys.size > 0;
}
function runActions(acts, scope, name) {
  if (!acts.length) { logLine('sys', `${esc(name)} has no click actions yet`); return; }
  let changed = false; acts.forEach(a => { if (a.kind === 'event') changed = fireEvent(a, scope) || changed; });
  if (changed) rerenderTop();
  const nav = acts.find(a => a.kind !== 'event');
  if (nav) { if (nav.kind === 'back') goBack(); else goTo(nav.to, evalArg(nav.arg, scope)); }
  renderInspector();
}
function goTo(to, arg) {
  const from = st.screen; if (!doc.screens[to] || to === from) return;
  const idx = navStack.indexOf(to), pop = idx >= 0;
  if (pop) navStack = navStack.slice(0, idx + 1); else navStack.push(to);
  const s = doc.screens[to], e = (pop ? doc.screens[from] : s).enter;
  logLine('nav', `navigate(Route.${s.route}${s.routeArgs ? `(${s.routeArgs.split(':')[0]} = ${esc(JSON.stringify(arg))})` : ''}) · ${TRANS[e.type]} ${e.ease === 'Spring' ? 'spring' : e.dur + 'ms'}`);
  swap(from, to, pop);
}
function goBack() {
  if (navStack.length < 2) { logLine('warn', 'popBackStack(): already at the start destination'); return; }
  const from = navStack.pop(), to = navStack[navStack.length - 1]; logLine('nav', `popBackStack() → Route.${doc.screens[to].route}`); swap(from, to, true);
}
function kf(type, pop) {
  const T = { slide: [['translateX(100%)', 'translateX(0)'], ['translateX(0)', 'translateX(-28%)']], slideUp: [['translateY(100%)', 'translateY(0)'], ['none', 'none']], fade: [null, null], scale: [['scale(.92)', 'scale(1)'], ['scale(1)', 'scale(1.04)']], none: [null, null] }[type] || [null, null];
  const fadeIn = type === 'fade' || type === 'scale', outFade = type === 'fade' || type === 'scale';
  const inK = [{ transform: T[0] ? T[0][0] : 'none', opacity: fadeIn ? 0 : 1 }, { transform: T[0] ? T[0][1] : 'none', opacity: 1 }];
  const outK = [{ transform: T[1] ? T[1][0] : 'none', opacity: 1, filter: 'brightness(1)' }, { transform: T[1] ? T[1][1] : 'none', opacity: outFade ? 0 : 1, filter: type === 'slideUp' || type === 'slide' ? 'brightness(.82)' : 'brightness(1)' }];
  return pop ? { top: [...inK].reverse(), under: [...outK].reverse() } : { top: inK, under: outK };
}
function swap(from, to, pop) {
  const content = $('#content'); const old = content?.querySelector('.layer'); st.screen = to;
  if (st.file.startsWith('screen:')) st.file = 'screen:' + to;
  const nl = document.createElement('div'); nl.className = 'layer enter'; nl.innerHTML = screenHTML(to, false);
  const cfg = (pop ? doc.screens[from] : doc.screens[to]).enter, dur = reduceMotion || cfg.type === 'none' ? 1 : (cfg.ease === 'Spring' ? 560 : cfg.dur), easing = EASE_CSS[cfg.ease], k = kf(cfg.type, pop);
  if (!old) { renderCanvas(); return; }
  animating = true;
  let topEl, underEl; if (pop) { content.insertBefore(nl, old); topEl = old; underEl = nl; } else { content.appendChild(nl); topEl = nl; underEl = old; }
  topEl.style.zIndex = 2; underEl.style.zIndex = 1;
  const a1 = topEl.animate(k.top, { duration: dur, easing, fill: 'both' }); underEl.animate(k.under, { duration: dur, easing, fill: 'both' });
  a1.finished.then(() => { old.remove(); nl.getAnimations().forEach(x => x.cancel()); nl.style.zIndex = ''; animating = false; setTimeout(() => nl.classList.remove('enter'), 900); });
  renderTop(); renderHint(); if (st.leftTab === 'layers') renderLayers(); renderInspector(); renderCode();
}
function setMode(m) { st.mode = m; renderTop(); requestAnimationFrame(() => { renderCanvas(); renderCode(true); }); }
function zoom(c) { if (st.view === 'flow') return; st.zoom = c === 'fit' ? 'fit' : clamp(Math.round((st.z * (c === 'in' ? 1.2 : 1 / 1.2)) * 20) / 20, 0.3, 2); renderCanvas(); }
function setTool(t) {
  if (t === st.tool) return;
  if (t === 'play') { st.tool = 'play'; st.view = 'screen'; navStack = st.screen === 'home' ? ['home'] : ['home', st.screen]; changedKeys = new Set(); logLine('sys', `Prototype started on ${doc.screens[st.screen].fn} with live MenuUiState`); }
  else { st.tool = 'design'; logLine('sys', 'Prototype stopped'); }
  refresh();
}

/* ---------- events: top bar ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('button,[data-ctab]'); if (!b) return;
  if (b.dataset.screen && b.closest('#screenTabs')) { const k = b.dataset.screen; if (st.tool === 'play') { navStack = k === 'home' ? ['home'] : ['home', k]; } st.screen = k; st.view = 'screen'; st.sel = null; if (st.file.startsWith('screen:')) st.file = 'screen:' + k; return refresh(); }
  if (b.hasAttribute('data-flow')) { st.view = 'flow'; st.sel = null; return refresh(); }
  if (b.dataset.tool) return setTool(b.dataset.tool);
  if (b.dataset.mode && b.closest('#layTabs')) return setMode(b.dataset.mode);
  if (b.dataset.mtab) { st.mtab = b.dataset.mtab; renderTop(); return requestAnimationFrame(() => { renderCanvas(); if (st.mtab === 'code') renderCode(true); }); }
  if (b.dataset.ltab) { st.leftTab = b.dataset.ltab; renderTop(); return renderLeft(); }
  if (b.dataset.ctab) { st.ctab = b.dataset.ctab; return renderConsole(); }
  if (b.dataset.file) { st.file = b.dataset.file; if (st.file.startsWith('screen:')) { const k = st.file.slice(7); if (k !== st.screen) { st.screen = k; st.sel = null; if (st.tool === 'play') navStack = k === 'home' ? ['home'] : ['home', k]; st.view = 'screen'; return refresh(); } } return renderCode(true); }
  if (b.dataset.cv) { const c = b.dataset.cv; if (c === 'undo') doUndo(); else if (c === 'redo') doRedo(); else if (c === 'theme') { doc.theme.mode = doc.theme.mode === 'light' ? 'dark' : 'light'; refresh({ keepInspector: true }); toast(`Previewing ${doc.theme.mode} scheme`); } else zoom(c); return; }
  if (b.dataset.cmd) return cmd(b.dataset.cmd);
  if (b.dataset.prob != null) { const p = problems[+b.dataset.prob]; if (p.vm) jumpToVm(p.vm); else if (p.id) { if (st.tool === 'play') setTool('design'); select(p.id); } return; }
});
$('#conBody').addEventListener('click', e => { const r = e.target.closest('[data-prob]'); if (!r) return; const p = problems[+r.dataset.prob]; if (p.vm) jumpToVm(p.vm); else if (p.id) { if (st.tool === 'play') setTool('design'); select(p.id); } });
$('#device').addEventListener('change', e => { st.device = e.target.value; refresh({ keepInspector: true }); });

/* ---------- events: left panel ---------- */
$('#palette').addEventListener('click', e => { const b = e.target.closest('[data-insert]'); if (b) insert(b.dataset.insert); });
treeEl.addEventListener('click', e => { const c = e.target.closest('[data-caret]'); if (c) { const id = c.dataset.caret; st.collapsed.has(id) ? st.collapsed.delete(id) : st.collapsed.add(id); return renderLayers(); } const r = e.target.closest('.lr'); if (r) { if (st.tool === 'play') setTool('design'); select(r.dataset.id); } });
treeEl.addEventListener('mouseover', e => { const r = e.target.closest('.lr'); const id = r?.dataset.id || null; if (id !== st.hover) { st.hover = id; drawOverlay(); } });
treeEl.addEventListener('mouseleave', () => { st.hover = null; drawOverlay(); });
let dragLayer = null;
treeEl.addEventListener('dragstart', e => { const r = e.target.closest('.lr'); if (!r) return; dragLayer = r.dataset.id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragLayer); });
function dropPos(e, r) { const f = find(r.dataset.id), rect = r.getBoundingClientRect(), y = (e.clientY - rect.top) / rect.height; const canIn = CONTAINERS.has(f.node.type) && f.node.type !== 'List'; if (!f.parent) return 'in'; if (canIn && y > .28 && y < .72) return 'in'; return y < .5 ? 'before' : 'after'; }
treeEl.addEventListener('dragover', e => { const r = e.target.closest('.lr'); if (!r || !dragLayer) return; e.preventDefault(); $$('.lr', treeEl).forEach(x => x.classList.remove('drop-in', 'drop-before', 'drop-after')); r.classList.add('drop-' + dropPos(e, r)); });
treeEl.addEventListener('dragleave', e => { if (!treeEl.contains(e.relatedTarget)) $$('.lr', treeEl).forEach(x => x.classList.remove('drop-in', 'drop-before', 'drop-after')); });
treeEl.addEventListener('drop', e => {
  e.preventDefault(); const r = e.target.closest('.lr'); const id = dragLayer; dragLayer = null; if (!r || !id || r.dataset.id === id) return renderLayers();
  const pos = dropPos(e, r), src = find(id), tgt = find(r.dataset.id);
  if (pathTo(tgt.node.id).some(n => n.id === id)) { toast('A layer can’t move inside itself'); return renderLayers(); }
  if (pos !== 'in' && tgt.parent?.type === 'List') { toast('A lazy list holds one item template'); return renderLayers(); }
  mutate(() => { src.parent.children.splice(src.parent.children.indexOf(src.node), 1); if (pos === 'in') tgt.node.children.push(src.node); else { const a = tgt.parent.children, i = a.indexOf(tgt.node); a.splice(pos === 'after' ? i + 1 : i, 0, src.node); } });
  select(id); toast(`Moved ${src.node.name}`);
});
treeEl.addEventListener('dragend', () => { dragLayer = null; $$('.lr', treeEl).forEach(x => x.classList.remove('drop-in', 'drop-before', 'drop-after')); });
$('#leftTheme').addEventListener('input', e => { const t = e.target; if (t.dataset.color) { const k = t.dataset.color, v = t.value.toUpperCase(); mutate(() => { doc.theme[doc.theme.mode][k] = v; }, 'color' + k, { keepLeft: true, keepInspector: true }); t.parentElement.style.background = v; t.closest('.tok').querySelector('code').textContent = v; } });
$('#leftTheme').addEventListener('change', e => { const t = e.target; if (t.dataset.font) { mutate(() => { doc.theme[t.dataset.font] = t.value; }); toast(`${t.dataset.font === 'display' ? 'DisplayFont' : 'BodyFont'} = GoogleFont("${t.value}")`); } });
$('#leftTheme').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.thmode) { doc.theme.mode = b.dataset.thmode; refresh({ keepInspector: true }); } else if (b.dataset.applystyle) { const n = selNode(); if (n?.type === 'Text') { mutate(() => { n.props.style = b.dataset.applystyle; }); toast(`${n.name} → typography.${b.dataset.applystyle}`); } else toast('Select a Text layer first'); } });

/* ---------- events: inspector ---------- */
function applyField(t, keep) {
  const n = selNode(); if (!n) return; const k = t.dataset.p; let v;
  if (t.type === 'checkbox') v = t.checked || undefined;
  else if (t.dataset.kind === 'num') { v = t.value === '' ? undefined : Number(t.value); if (v != null && t.min !== '' && v < +t.min) v = +t.min; if (k === 'weight' && !v) v = undefined; }
  else if (t.tagName === 'SELECT') v = t.value === '' ? undefined : t.value;
  else v = t.value;
  mutate(() => { setPath(n.props, k, v); if (k === 'weight' && v) { const f = find(n.id); const ax = f.parent?.type === 'Row' ? 'w' : 'h'; if (n.props[ax] === 'fill' || typeof n.props[ax] === 'number') delete n.props[ax]; } }, n.id + k, { keepInspector: keep, keepLeft: true });
  if (keep) $$(`[data-p="${k}"]`, inspEl).forEach(o => { if (o !== t && o.type !== 'checkbox') o.value = t.value; });
}
inspEl.addEventListener('input', e => {
  const t = e.target; if (t.tagName === 'SELECT' || t.type === 'checkbox') return;
  if (t.dataset.p) return applyField(t, true);
  if (t.hasAttribute('data-name')) { const n = selNode(); return mutate(() => { n.name = t.value.trim() || n.type; }, 'name' + n.id, { keepInspector: true }); }
  if (t.dataset.actf) { const n = selNode(), i = +t.dataset.ai; return mutate(() => { n.props.actions[i][t.dataset.actf] = t.value; }, n.id + 'act' + i, { keepInspector: true, keepLeft: true }); }
  if (t.dataset.enter) { const s = doc.screens[t.dataset.scr]; const v = Math.max(50, Number(t.value) || 50); return mutate(() => { s.enter.dur = v; }, 'enter' + t.dataset.scr, { keepInspector: true, keepLeft: true }); }
});
inspEl.addEventListener('change', e => {
  const t = e.target, n = selNode();
  if (t.dataset.p && (t.tagName === 'SELECT' || t.type === 'checkbox')) return applyField(t, false);
  if (t.dataset.size && n) { const ax = t.dataset.size, v = t.value; const el = $(`#content [data-id="${n.id}"]`); const measured = el ? Math.round((ax === 'w' ? el.getBoundingClientRect().width : el.getBoundingClientRect().height) / st.z) : 100; return mutate(() => { if (v === 'fill') n.props[ax] = 'fill'; else if (v === 'wrap') delete n.props[ax]; else n.props[ax] = measured; if (v !== 'wrap') { const f = find(n.id); if ((f.parent?.type === 'Row') === (ax === 'w')) delete n.props.weight; } }); }
  if (t.dataset.bind && n) { const path = t.value; if (!path) return; const cur = n.props.text || ''; return mutate(() => { n.props.text = !cur || /^\{[\w.]+\}$/.test(cur) ? `{${path}}` : `${cur} {${path}}`; }); }
  if (t.dataset.actf && t.tagName === 'SELECT' && n) { const i = +t.dataset.ai, f = t.dataset.actf; return mutate(() => { const a = n.props.actions[i]; a[f] = t.value; if (f === 'event') { const ev = model.events.find(x => x.name === t.value); if (!ev?.params.length) delete a.arg; else if (!a.arg) a.arg = defaultArg(n, ev.params[0]); } if (f === 'to') { const d = doc.screens[t.value]; if (d.routeArgs) a.arg ||= defaultArg(n, { name: 'id' }); else delete a.arg; } }); }
  if (t.dataset.enter && t.tagName === 'SELECT') { const s = doc.screens[t.dataset.scr]; return mutate(() => { s.enter[t.dataset.enter] = t.value; }); }
});
function defaultArg(n, param) { const vars = varsFor(n.id), v = Object.keys(vars)[0]; if (v) { const cls = vars[v]; if ((model.classes[cls] || []).some(f => f.name === 'id')) return `${v}.id`; if ((model.classes[cls] || []).some(f => f.name === 'drink')) return `${v}.drink.id`; } return /Int/.test(param.type || '') ? '1' : 'state.selected.id'; }
inspEl.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return; const n = selNode();
  if (b.dataset.crumb) return select(b.dataset.crumb, st.inst);
  if (b.dataset.replay) return replay(b.dataset.replay);
  if (b.dataset.jump) { const ln = model.handledLine[b.dataset.jump]; if (ln) jumpToVm(ln); return; }
  if (!n) return;
  if (b.dataset.al) { const [r, c] = b.dataset.al.split(',').map(Number), V = ['start', 'center', 'end']; return mutate(() => { if (n.type === 'Box') n.props.balign = BOXAL[r][c]; else if (n.type === 'Row') { n.props.align = V[r]; if (n.props.arr !== 'between') n.props.arr = V[c]; } else { n.props.align = V[c]; if (n.props.arr !== 'between') n.props.arr = V[r]; } }); }
  if (b.hasAttribute('data-between')) return mutate(() => { n.props.arr = n.props.arr === 'between' ? 'start' : 'between'; });
  if (b.dataset.settype) { const t = b.dataset.settype; if (t === n.type) return; return mutate(() => { n.type = t; if (n.name === 'Column' || n.name === 'Row' || n.name === 'Box') n.name = t; }); }
  if (b.dataset.token != null) return mutate(() => setPath(n.props, 'bg', b.dataset.token || undefined));
  if (b.dataset.tcolor != null) return mutate(() => setPath(n.props, 'color', b.dataset.tcolor || undefined));
  if (b.dataset.pset) return mutate(() => { n.props[b.dataset.pset] = b.dataset.v; });
  if (b.dataset.delact != null) return mutate(() => n.props.actions.splice(+b.dataset.delact, 1));
  if (b.dataset.addact) {
    const k = b.dataset.addact; let a;
    if (k === 'event') { const ev = model.events[0]; a = { kind: 'event', event: ev?.name || 'OnClick' }; if (ev?.params.length) a.arg = defaultArg(n, ev.params[0]); }
    else if (k === 'navigate') { const to = ORDER.find(x => x !== st.screen); a = { kind: 'navigate', to }; if (doc.screens[to].routeArgs) a.arg = defaultArg(n, { name: 'id' }); }
    else a = { kind: 'back' };
    return mutate(() => { (n.props.actions ||= []).push(a); });
  }
  if (b.dataset.cmd) return cmd(b.dataset.cmd);
});
function replay(key) {
  const box = $('#mini-' + key); if (!box) return; const i = box.querySelector('i'), c = doc.screens[key].enter, k = kf(c.type, false);
  i.animate(k.top, { duration: reduceMotion ? 1 : (c.ease === 'Spring' ? 560 : c.dur), easing: EASE_CSS[c.ease], fill: 'none' });
}

/* ---------- events: canvas ---------- */
viewport.addEventListener('pointerdown', e => {
  const res = e.target.closest('.ov-res');
  if (res) { const n = selNode(), el = $(`#content [data-id="${n.id}"][data-inst="${st.inst}"]`) || $(`#content [data-id="${n.id}"]`); if (!el) return; const r = el.getBoundingClientRect(); e.preventDefault(); resizing = { axis: res.dataset.axis, x: e.clientX, y: e.clientY, v0: Math.round((res.dataset.axis === 'x' ? r.width : r.height) / st.z), id: n.id }; return; }
  if (st.tool === 'play') return;
  if (st.view === 'flow') { const ab = e.target.closest('.ab'); if (ab) { st.screen = ab.dataset.screen; st.view = 'screen'; st.sel = null; if (st.file.startsWith('screen:')) st.file = 'screen:' + st.screen; refresh(); } return; }
  const content = $('#content'), el = e.target.closest('[data-id]');
  if (!el || !content?.contains(el)) { if (!e.target.closest('.cv-tools')) select(null); return; }
  e.preventDefault(); const id = el.dataset.id; select(id, +el.dataset.inst);
  const f = find(id); if (!f?.parent || f.parent.type === 'List') return;
  drag = { id, el, x: e.clientX, y: e.clientY, on: false, parent: f.parent };
});
window.addEventListener('pointermove', e => {
  if (resizing) { const z = st.z, d = resizing.axis === 'x' ? e.clientX - resizing.x : e.clientY - resizing.y, v = Math.max(8, Math.round((resizing.v0 + d / z) / 4) * 4), n = find(resizing.id)?.node; if (!n) return; const k = resizing.axis === 'x' ? 'w' : 'h'; if (n.props[k] === v) return; mutate(() => { n.props[k] = v; const f = find(n.id); if ((f.parent?.type === 'Row') === (k === 'w')) delete n.props.weight; }, 'resize' + n.id + k, { keepLeft: true }); return; }
  if (!drag) return;
  if (!drag.on && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 5) return;
  drag.on = true; const el = drag.el; el.classList.add('dragging');
  const pe = el.parentElement, horiz = drag.parent.type === 'Row', sibs = [...pe.children].filter(c => c.dataset.id && c !== el);
  let idx = sibs.length; for (let i = 0; i < sibs.length; i++) { const r = sibs[i].getBoundingClientRect(), mid = horiz ? r.left + r.width / 2 : r.top + r.height / 2; if ((horiz ? e.clientX : e.clientY) < mid) { idx = i; break; } }
  drag.idx = idx;
  const vr = viewport.getBoundingClientRect(), pr = pe.getBoundingClientRect(), ox = viewport.scrollLeft - vr.left, oy = viewport.scrollTop - vr.top;
  let pos; if (!sibs.length) pos = horiz ? pr.left : pr.top; else if (idx < sibs.length) { const r = sibs[idx].getBoundingClientRect(); pos = (horiz ? r.left : r.top) - 3; } else { const r = sibs[sibs.length - 1].getBoundingClientRect(); pos = (horiz ? r.right : r.bottom) + 1; }
  dropInd = horiz ? { x: pos + ox, y: pr.top + oy, w: 3, h: pr.height } : { x: pr.left + ox, y: pos + oy, w: pr.width, h: 3 };
  drawOverlay();
});
window.addEventListener('pointerup', () => {
  if (resizing) { resizing = null; return; }
  if (!drag) return; const d = drag; drag = null; dropInd = null; d.el.classList.remove('dragging');
  if (d.on && d.idx != null) { const f = find(d.id), a = f.parent.children, from = a.indexOf(f.node); if (d.idx === from) return drawOverlay(); mutate(() => { a.splice(from, 1); a.splice(d.idx, 0, f.node); }); toast(`Moved ${f.node.name} · reordered children in ${doc.screens[st.screen].file}`); }
  else drawOverlay();
});
viewport.addEventListener('pointerover', e => { if (st.tool === 'play' || drag || st.view === 'flow') return; const el = e.target.closest('#content [data-id]'); const id = el?.dataset.id || null; if (id !== st.hover) { st.hover = id; drawOverlay(); } });
viewport.addEventListener('pointerleave', () => { if (st.hover) { st.hover = null; drawOverlay(); } });
viewport.addEventListener('scroll', () => drawOverlay(), { passive: true });
viewport.addEventListener('click', e => {
  if (st.tool !== 'play' || animating) return; const el = e.target.closest('#content .clickable'); if (!el) return; const f = find(el.dataset.id); if (!f) return;
  runActions(f.node.props.actions || [], scopes[el.dataset.scope] || scopes.s0, f.node.name);
});
viewport.addEventListener('wheel', e => { if (!(e.ctrlKey || e.metaKey) || st.view === 'flow') return; e.preventDefault(); st.zoom = clamp(st.z * (e.deltaY < 0 ? 1.08 : 1 / 1.08), 0.3, 2); renderCanvas(); }, { passive: false });

/* ---------- events: code ---------- */
codeView.addEventListener('click', e => { const l = e.target.closest('.cl[data-id]'); if (!l) return; if (st.tool === 'play') setTool('design'); select(l.dataset.id, st.inst); });
codeView.addEventListener('mousemove', e => { const l = e.target.closest('.cl[data-id]'); const id = l?.dataset.id || null; if (id !== st.hover) { st.hover = id; drawOverlay(); } });
codeView.addEventListener('mouseleave', () => { st.hover = null; drawOverlay(); });
let vmT;
function ensureCaret() { const line = vmTa.value.slice(0, vmTa.selectionStart).split('\n').length - 1, y = 8 + line * 20; if (y < vmScroll.scrollTop + 8) vmScroll.scrollTop = y - 8; else if (y + 28 > vmScroll.scrollTop + vmScroll.clientHeight) vmScroll.scrollTop = y + 28 - vmScroll.clientHeight; }
vmTa.addEventListener('input', () => {
  vmSrc = vmTa.value; markDirty(); if (!vmDirty) { vmDirty = true; renderCode(); } renderVmPre(); ensureCaret();
  clearTimeout(vmT); vmT = setTimeout(() => {
    const before = model.events.map(e => e.name).join(); model = parseVM(vmSrc); computeProblems(); renderVmPre(); renderInspector();
    const after = model.events.map(e => e.name).join(); if (before !== after) logLine('sys', `Indexed ${model.iface}: ${model.events.map(e => esc(e.name)).join(', ')}`);
    pulseSync('Indexing MenuViewModel.kt…');
  }, 320);
});
vmTa.addEventListener('keyup', ensureCaret); vmTa.addEventListener('click', ensureCaret);
function insertText(t) { if (!document.execCommand('insertText', false, t)) { vmTa.setRangeText(t, vmTa.selectionStart, vmTa.selectionEnd, 'end'); vmTa.dispatchEvent(new Event('input')); } }
vmTa.addEventListener('keydown', e => {
  if (e.key === 'Tab') { e.preventDefault(); insertText('    '); }
  else if (e.key === 'Enter' && !e.isComposing) { const v = vmTa.value, s = vmTa.selectionStart, ls = v.lastIndexOf('\n', s - 1) + 1, cur = v.slice(ls, s); let ind = cur.match(/^\s*/)[0]; if (/[{(]\s*$/.test(cur)) ind += '    '; e.preventDefault(); insertText('\n' + ind); }
});

/* ---------- keyboard ---------- */
document.addEventListener('keydown', e => {
  const tag = e.target.tagName, typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable, mod = e.metaKey || e.ctrlKey;
  if (mod && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); return e.shiftKey ? doRedo() : doUndo(); }
  if (mod && e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); return doRedo(); }
  if (typing) return;
  if (e.key === 'Escape') { if (st.tool === 'play') return setTool('design'); const f = find(st.sel); return f?.parent ? select(f.parent.id, st.inst) : select(null); }
  if (st.tool === 'play') return;
  if ((e.key === 'Delete' || e.key === 'Backspace') && st.sel) { e.preventDefault(); cmd('del'); }
  else if (mod && e.key.toLowerCase() === 'd' && st.sel) { e.preventDefault(); cmd('dup'); }
  else if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && st.sel) { e.preventDefault(); cmd(e.key === 'ArrowUp' ? 'up' : 'down'); }
  else if (e.key.toLowerCase() === 'p' && !mod && !e.altKey) setTool('play');
});

/* ---------- splitter ---------- */
$('#splitter').addEventListener('pointerdown', e => {
  e.preventDefault(); const ws = $('#workspace'), r = ws.getBoundingClientRect();
  const mv = ev => { const w = clamp(ev.clientX - r.left, 560, r.width - 340); ws.style.setProperty('--split', w + 'px'); renderCanvas(); };
  const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); };
  window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
});
let roT; new ResizeObserver(() => { clearTimeout(roT); roT = setTimeout(() => { if (st.view === 'flow') renderFlow(); else renderCanvas(); }, 40); }).observe(viewport);

/* ---------- project files, export, macOS bridge ---------- */
const bridge = window.facet || null;
let dirty = false, docName = null;
function markDirty() { if (!dirty) { dirty = true; bridge?.setDirty(true); renderProj(); } }
function setClean() { dirty = false; bridge?.setDirty(false); renderProj(); }
function renderProj() { const el = $('#proj'); if (!el) return; el.innerHTML = docName ? `${esc(docName.replace(/\.facet$/, ''))}${dirty ? ' <span class="ed">— Edited</span>' : ''}` : `Brew <span>/ sample</span>${dirty ? ' <span class="ed">— Edited</span>' : ''}`; }
function getProject() { return { format: 'facet-project', version: 1, savedAt: new Date().toISOString(), screens: doc.screens, theme: doc.theme, viewModel: vmSrc }; }
function loadProject(p) {
  if (!p || p.format !== 'facet-project' || !p.theme || !ORDER.every(k => p.screens?.[k]?.root)) throw new Error('This file is not a Facet project.');
  doc.screens = p.screens; doc.theme = p.theme; vmSrc = String(p.viewModel ?? VM_DEFAULT); vmTa.value = vmSrc; model = parseVM(vmSrc);
  let max = 0; ORDER.forEach(k => walk(doc.screens[k].root, n => { const m = Number(String(n.id).slice(1)); if (m > max) max = m; })); uid = Math.max(uid, max);
  undoStack.length = 0; redoStack.length = 0; lastKey = null; Object.keys(codeCache).forEach(k => delete codeCache[k]);
  Object.assign(st, { sel: null, screen: 'home', view: 'screen', tool: 'design', file: 'screen:home' }); app = freshApp(); vmDirty = false; navStack = ['home'];
  refresh(); setClean(); logLine('sys', `Opened ${esc(docName || 'project')}`);
}
const IMPORTS = {
  screen: ['androidx.compose.animation.animateContentSize', 'androidx.compose.foundation.Image', 'androidx.compose.foundation.background', 'androidx.compose.foundation.clickable', 'androidx.compose.foundation.layout.*',
    'androidx.compose.foundation.lazy.LazyColumn', 'androidx.compose.foundation.lazy.items', 'androidx.compose.foundation.shape.RoundedCornerShape', 'androidx.compose.material.icons.Icons',
    'androidx.compose.material.icons.automirrored.rounded.ArrowBack', 'androidx.compose.material.icons.rounded.*', 'androidx.compose.material3.*', 'androidx.compose.runtime.Composable',
    'androidx.compose.ui.Alignment', 'androidx.compose.ui.Modifier', 'androidx.compose.ui.draw.clip', 'androidx.compose.ui.layout.ContentScale', 'androidx.compose.ui.res.painterResource',
    'androidx.compose.ui.tooling.preview.Preview', 'androidx.compose.ui.unit.dp', 'coil3.compose.AsyncImage', 'dev.brew.R', 'dev.brew.navigation.Route', 'dev.brew.ui.menu.MenuEvent',
    'dev.brew.ui.menu.MenuUiState', 'dev.brew.ui.theme.BrewTheme'],
  nav: ['androidx.compose.animation.*', 'androidx.compose.animation.AnimatedContentTransitionScope.SlideDirection', 'androidx.compose.animation.core.*', 'androidx.compose.runtime.Composable',
    'androidx.compose.runtime.getValue', 'androidx.hilt.navigation.compose.hiltViewModel', 'androidx.lifecycle.compose.collectAsStateWithLifecycle', 'androidx.navigation.NavHostController',
    'androidx.navigation.compose.NavHost', 'androidx.navigation.compose.composable', 'androidx.navigation.compose.rememberNavController', 'dev.brew.ui.cart.CartScreen',
    'dev.brew.ui.detail.DetailScreen', 'dev.brew.ui.home.HomeScreen', 'dev.brew.ui.menu.MenuViewModel', 'kotlinx.serialization.Serializable'],
  theme: ['androidx.compose.foundation.isSystemInDarkTheme', 'androidx.compose.material3.MaterialTheme', 'androidx.compose.material3.Typography', 'androidx.compose.material3.darkColorScheme',
    'androidx.compose.material3.lightColorScheme', 'androidx.compose.runtime.Composable', 'androidx.compose.ui.graphics.Color', 'androidx.compose.ui.text.TextStyle',
    'androidx.compose.ui.text.font.FontFamily', 'androidx.compose.ui.text.font.FontWeight', 'androidx.compose.ui.text.googlefonts.Font', 'androidx.compose.ui.text.googlefonts.GoogleFont',
    'androidx.compose.ui.unit.sp', 'dev.brew.R'],
};
function exportFiles() {
  const out = {}, src = (lines, kind) => lines.map(l => l.t === 'import …' ? IMPORTS[kind].map(i => 'import ' + i).join('\n') : l.t).join('\n') + '\n';
  ORDER.forEach(k => { const s = doc.screens[k]; out[`app/src/main/java/dev/brew/ui/${s.pkg}/${s.file}`] = src(genScreen(k).lines, 'screen'); });
  out['app/src/main/java/dev/brew/ui/menu/MenuViewModel.kt'] = vmSrc.endsWith('\n') ? vmSrc : vmSrc + '\n';
  out['app/src/main/java/dev/brew/navigation/NavGraph.kt'] = src(genNav().lines, 'nav');
  out['app/src/main/java/dev/brew/ui/theme/Theme.kt'] = src(genTheme().lines, 'theme');
  return out;
}
async function saveProject(as) {
  if (!bridge) { toast('Saving needs the Facet desktop app'); return false; }
  const r = await bridge.saveProject(JSON.stringify(getProject(), null, 2), as);
  if (r?.ok) { docName = r.name; setClean(); toast(`Saved ${r.name}`); return true; }
  if (r?.error) toast(`Couldn’t save: ${r.error}`);
  return false;
}
async function exportKotlin() {
  if (!bridge) { toast('Export needs the Facet desktop app'); return; }
  if (problems.length) logLine('warn', `Exporting with ${problems.length} problem(s). Fix them in the Problems tab before building.`);
  const r = await bridge.exportKotlin(exportFiles());
  if (r?.ok) { toast(`Exported ${r.count} Kotlin files`); logLine('sys', `Exported ${r.count} files to ${esc(r.dir)}`); }
  else if (r?.error) toast(`Export failed: ${r.error}`);
}
const isTyping = () => { const a = document.activeElement; return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable); };
const modal = $('#shortcuts');
function showShortcuts(on = true) { modal.hidden = !on; if (on) modal.querySelector('[data-close-modal]').focus(); }
modal.addEventListener('click', e => { if (e.target === modal || e.target.closest('[data-close-modal]')) showShortcuts(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) { e.stopImmediatePropagation(); showShortcuts(false); } }, true);
const MENU = {
  undo: () => isTyping() ? document.execCommand('undo') : doUndo(),
  redo: () => isTyping() ? document.execCommand('redo') : doRedo(),
  duplicate: () => { if (!isTyping() && st.sel && st.tool === 'design') cmd('dup'); },
  delete: () => { if (!isTyping() && st.sel && st.tool === 'design') cmd('del'); },
  'mode-design': () => setMode('design'), 'mode-split': () => setMode('split'), 'mode-code': () => setMode('code'),
  flow: () => { if (st.tool === 'play') st.tool = 'design'; st.view = 'flow'; st.sel = null; refresh(); },
  'zoom-in': () => zoom('in'), 'zoom-out': () => zoom('out'), 'zoom-fit': () => zoom('fit'),
  'toggle-dark': () => { doc.theme.mode = doc.theme.mode === 'light' ? 'dark' : 'light'; refresh({ keepInspector: true }); toast(`Previewing ${doc.theme.mode} scheme`); },
  play: () => setTool(st.tool === 'play' ? 'design' : 'play'),
  'reset-state': () => cmd('reset'),
  save: () => saveProject(false), 'save-as': () => saveProject(true),
  'save-and-close': async () => { if (await saveProject(false)) bridge.closeWindow(); },
  export: () => exportKotlin(),
  shortcuts: () => showShortcuts(true),
};
if (bridge) {
  document.documentElement.classList.add('desktop');
  bridge.onMenu((c, arg) => {
    if (c === 'insert') return insert(arg);
    if (c === 'screen') { if (st.tool === 'play') navStack = arg === 'home' ? ['home'] : ['home', arg]; st.screen = arg; st.view = 'screen'; st.sel = null; if (st.file.startsWith('screen:')) st.file = 'screen:' + arg; return refresh(); }
    MENU[c]?.();
  });
  bridge.onLoadProject((data, name) => { docName = name; try { loadProject(data); } catch (e) { toast(e.message); } });
  bridge.onFile(name => { docName = name; renderProj(); });
  bridge.onFullscreen(on => document.documentElement.classList.toggle('fullscreen', on));
}

/* ---------- boot ---------- */
vmTa.value = vmSrc;
let dr = null; walk(doc.screens.home.root, n => { if (n.name === 'DrinkRow') dr = n; });
st.sel = dr.id;
logLine('sys', 'Indexed MenuViewModel.kt · 4 events · MenuUiState has 8 fields');
logLine('sys', 'Preview state loaded: 4 drinks, 2 items in cart');
logLine('sys', 'Press <b>P</b> or Prototype to tap through the app with live state');
refresh();
requestAnimationFrame(() => { renderCode(true); drawOverlay(); });
document.fonts?.ready.then(() => { renderCanvas(); });
})();
