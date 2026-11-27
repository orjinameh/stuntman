// Pure simulation of the Corner Store checkout hazard (F-001). No React, no DOM, no I/O.
// Money is integer cents everywhere. This is a SIMULATION: it mirrors the behaviour documented in
// demo/baseline/server.mjs, demo/fixed/server.mjs and the Repair B description in
// examples/opencode-heal/. It is not the real server and processes no payments.

export type Version = "original" | "repairA" | "repairB";
export type ProductId = "mug" | "notebook" | "tote";

export interface Product {
  id: ProductId;
  name: string;
  cents: number;
}

export const PRODUCTS: readonly Product[] = [
  { id: "mug", name: "Harbor Mug", cents: 4900 },
  { id: "notebook", name: "Field Notebook", cents: 1200 },
  { id: "tote", name: "Canvas Tote", cents: 2800 },
];

export const VERSIONS: readonly { id: Version; label: string; short: string }[] = [
  { id: "original", label: "Original (vulnerable)", short: "Original" },
  { id: "repairA", label: "Repair A: reject stale checkout", short: "Repair A" },
  { id: "repairB", label: "Repair B: snapshot checkout", short: "Repair B" },
];

export type Cart = Partial<Record<ProductId, number>>;

export interface CartLine {
  id: ProductId;
  name: string;
  unitCents: number;
  qty: number;
  lineCents: number;
}

/** What a rendered checkout page carries. Repair A adds expectedCents, Repair B adds a draft token. */
export interface CheckoutForm {
  id: string;
  displayedCents: number;
  expectedCents?: number;
  token?: string;
}

/** Repair B server-side draft: the exact lines and total shown to the customer. */
export interface Draft {
  token: string;
  lines: CartLine[];
  totalCents: number;
  orderId: number | null;
}

export interface Order {
  id: number;
  token?: string;
  items: CartLine[];
  displayedCents: number;
  chargedCents: number;
}

export type PageEntry =
  | { page: "shop" }
  | { page: "cart" }
  | { page: "checkout"; formId: string }
  | { page: "order"; orderId: number };

export type PaymentKind = "none" | "charged" | "rejected" | "replayed" | "refused";

export interface Payment {
  kind: PaymentKind;
  displayedCents: number | null;
  chargedCents: number;
  message: string;
}

export interface SimState {
  version: Version;
  cart: Cart;
  history: PageEntry[];
  index: number;
  forms: Record<string, CheckoutForm>;
  drafts: Record<string, Draft>;
  orders: Order[];
  payment: Payment;
  notice: string | null;
  nextForm: number;
  nextOrder: number;
  step: number;
}

const NO_PAYMENT: Payment = { kind: "none", displayedCents: null, chargedCents: 0, message: "No payment attempted yet." };

export function initialState(version: Version = "original"): SimState {
  return {
    version,
    cart: {},
    history: [{ page: "shop" }],
    index: 0,
    forms: {},
    drafts: {},
    orders: [],
    payment: NO_PAYMENT,
    notice: null,
    nextForm: 1,
    nextOrder: 1,
    step: 0,
  };
}

export const money = (cents: number): string => "$" + (cents / 100).toFixed(2);

export function productById(id: ProductId): Product {
  const p = PRODUCTS.find((x) => x.id === id);
  if (!p) throw new Error("unknown product " + id);
  return p;
}

export function cartLines(cart: Cart): CartLine[] {
  const out: CartLine[] = [];
  for (const p of PRODUCTS) {
    const qty = cart[p.id] ?? 0;
    if (qty > 0) out.push({ id: p.id, name: p.name, unitCents: p.cents, qty, lineCents: p.cents * qty });
  }
  return out;
}

export const linesTotal = (lines: readonly CartLine[]): number => lines.reduce((a, l) => a + l.lineCents, 0);
export const cartTotal = (cart: Cart): number => linesTotal(cartLines(cart));
export const cartCount = (cart: Cart): number => cartLines(cart).reduce((a, l) => a + l.qty, 0);
export const totalCharged = (s: SimState): number => s.orders.reduce((a, o) => a + o.chargedCents, 0);

export const currentEntry = (s: SimState): PageEntry => s.history[s.index];

export function currentForm(s: SimState): CheckoutForm | null {
  const e = currentEntry(s);
  return e.page === "checkout" ? s.forms[e.formId] ?? null : null;
}

function navigate(s: SimState, entry: PageEntry): SimState {
  const history = [...s.history.slice(0, s.index + 1), entry];
  return { ...s, history, index: history.length - 1 };
}

export function goShop(s: SimState): SimState {
  return navigate({ ...s, notice: null }, { page: "shop" });
}

export function goCart(s: SimState): SimState {
  return navigate({ ...s, notice: null }, { page: "cart" });
}

export const canBack = (s: SimState): boolean => s.index > 0;
export const canForward = (s: SimState): boolean => s.index < s.history.length - 1;

export function back(s: SimState): SimState {
  return canBack(s) ? { ...s, index: s.index - 1, notice: null } : s;
}

export function forward(s: SimState): SimState {
  return canForward(s) ? { ...s, index: s.index + 1, notice: null } : s;
}

/** Add to cart (POST on the shop) then land on the cart page, like the real store. */
export function addToCart(s: SimState, id: ProductId): SimState {
  const cart: Cart = { ...s.cart, [id]: (s.cart[id] ?? 0) + 1 };
  return navigate({ ...s, cart, notice: null }, { page: "cart" });
}

export function removeFromCart(s: SimState, id: ProductId): SimState {
  const qty = (s.cart[id] ?? 0) - 1;
  const cart: Cart = { ...s.cart };
  if (qty > 0) cart[id] = qty;
  else delete cart[id];
  return { ...s, cart, notice: null };
}

/** GET /checkout: renders a new checkout form from the cart as it is right now. */
export function openCheckout(s: SimState): SimState {
  const lines = cartLines(s.cart);
  if (lines.length === 0) {
    return { ...s, notice: "Your cart is empty. Add something before checking out." };
  }
  const total = linesTotal(lines);
  const formId = "form-" + s.nextForm;
  const form: CheckoutForm = { id: formId, displayedCents: total };
  let drafts = s.drafts;
  if (s.version === "repairA") form.expectedCents = total;
  if (s.version === "repairB") {
    const token = "draft-" + s.nextForm;
    form.token = token;
    drafts = { ...drafts, [token]: { token, lines, totalCents: total, orderId: null } };
  }
  const base: SimState = { ...s, forms: { ...s.forms, [formId]: form }, drafts, nextForm: s.nextForm + 1, notice: null };
  return navigate(base, { page: "checkout", formId });
}

function finishOrder(s: SimState, order: Order, cart: Cart, drafts: Record<string, Draft>): SimState {
  const next: SimState = {
    ...s,
    cart,
    drafts,
    orders: [...s.orders, order],
    nextOrder: s.nextOrder + 1,
    payment: {
      kind: "charged",
      displayedCents: order.displayedCents,
      chargedCents: order.chargedCents,
      message:
        order.chargedCents === order.displayedCents
          ? `Charged ${money(order.chargedCents)}, the total shown.`
          : `Shown ${money(order.displayedCents)} but charged ${money(order.chargedCents)}.`,
    },
    notice: null,
  };
  return navigate(next, { page: "order", orderId: order.id });
}

/** POST /checkout from the checkout form currently on screen. */
export function pay(s: SimState): SimState {
  const form = currentForm(s);
  if (!form) return { ...s, notice: "Open a checkout page before paying." };

  if (s.version === "original") {
    // Baseline server: recalculates from the live cart, empties it, charges the recalculated sum.
    const lines = cartLines(s.cart);
    if (lines.length === 0) {
      return {
        ...s,
        payment: { kind: "refused", displayedCents: form.displayedCents, chargedCents: 0, message: "Cart is empty, nothing to charge. No payment processed." },
        notice: null,
      };
    }
    const order: Order = { id: s.nextOrder, items: lines, displayedCents: form.displayedCents, chargedCents: linesTotal(lines) };
    return finishOrder(s, order, {}, s.drafts);
  }

  if (s.version === "repairA") {
    const lines = cartLines(s.cart);
    if (lines.length === 0) {
      return {
        ...s,
        payment: { kind: "refused", displayedCents: form.displayedCents, chargedCents: 0, message: "Cart is empty, nothing to charge. No payment processed." },
        notice: null,
      };
    }
    const live = linesTotal(lines);
    if (form.expectedCents !== live) {
      return {
        ...s,
        payment: {
          kind: "rejected",
          displayedCents: form.displayedCents,
          chargedCents: 0,
          message: `Rejected: this checkout showed ${money(form.displayedCents)} but the cart is now ${money(live)}. No payment processed. Start a fresh checkout.`,
        },
        notice: null,
      };
    }
    const order: Order = { id: s.nextOrder, items: lines, displayedCents: form.displayedCents, chargedCents: live };
    return finishOrder(s, order, {}, s.drafts);
  }

  // Repair B: charge the saved draft snapshot, consume only its lines, idempotent on the token.
  const token = form.token;
  const draft = token ? s.drafts[token] : undefined;
  if (!draft) {
    return {
      ...s,
      payment: { kind: "refused", displayedCents: form.displayedCents, chargedCents: 0, message: "Unknown checkout token. No payment processed." },
      notice: null,
    };
  }
  if (draft.orderId !== null) {
    return {
      ...s,
      payment: {
        kind: "replayed",
        displayedCents: draft.totalCents,
        chargedCents: 0,
        message: `Replay of ${draft.token}: order #${draft.orderId} already exists. No second charge.`,
      },
      notice: null,
    };
  }
  const cart: Cart = { ...s.cart };
  for (const l of draft.lines) {
    const left = (cart[l.id] ?? 0) - l.qty;
    if (left > 0) cart[l.id] = left;
    else delete cart[l.id];
  }
  const order: Order = { id: s.nextOrder, token: draft.token, items: draft.lines, displayedCents: draft.totalCents, chargedCents: draft.totalCents };
  const drafts = { ...s.drafts, [draft.token]: { ...draft, orderId: order.id } };
  return finishOrder(s, order, cart, drafts);
}

/** True when the last payment charged a different amount from the one displayed. */
export function isMismatch(p: Payment): boolean {
  return p.kind === "charged" && p.displayedCents !== null && p.chargedCents !== p.displayedCents;
}

export type Verdict = "idle" | "vulnerable" | "safe";
export function verdict(s: SimState): Verdict {
  if (isMismatch(s.payment)) return "vulnerable";
  if (s.payment.kind === "none") return "idle";
  return "safe";
}

// ---- Scripted walkthrough -------------------------------------------------------------------

export type ScenarioAction =
  | { type: "add"; id: ProductId }
  | { type: "goShop" }
  | { type: "goCart" }
  | { type: "checkout" }
  | { type: "back" }
  | { type: "pay" };

export interface ScenarioStep {
  title: string;
  detail: string;
  action: ScenarioAction;
}

export function scenarioSteps(version: Version): ScenarioStep[] {
  const common: ScenarioStep[] = [
    { title: "Add the Harbor Mug", detail: "The customer adds the $49 mug and lands on the cart.", action: { type: "add", id: "mug" } },
    { title: "Continue to checkout", detail: "The checkout form renders and shows a total of $49.00.", action: { type: "checkout" } },
    { title: "Go back to the shop", detail: "The customer uses the header link to return to the shop.", action: { type: "goShop" } },
    { title: "Add the Field Notebook", detail: "A $12 notebook goes into the cart. The cart is now $61.", action: { type: "add", id: "notebook" } },
    { title: "Press Back", detail: "Browser Back once: the shop page.", action: { type: "back" } },
    { title: "Press Back again", detail: "Browser Back twice: the old checkout page, still showing $49.00.", action: { type: "back" } },
    { title: "Click Pay", detail: "The customer pays on the stale $49.00 form.", action: { type: "pay" } },
  ];
  if (version === "repairA") {
    return [
      ...common,
      { title: "Start a fresh checkout", detail: "The customer opens checkout again and sees the real total.", action: { type: "checkout" } },
      { title: "Pay the fresh checkout", detail: "The fresh form shows $61.00 and charges $61.00.", action: { type: "pay" } },
    ];
  }
  if (version === "repairB") {
    return [
      ...common,
      { title: "Press Back to the checkout", detail: "The customer goes back to the same checkout form (same token).", action: { type: "back" } },
      { title: "Click Pay again", detail: "Replaying the same token must not create a second charge.", action: { type: "pay" } },
    ];
  }
  return common;
}

export function applyScenarioAction(s: SimState, a: ScenarioAction): SimState {
  switch (a.type) {
    case "add": return addToCart(s, a.id);
    case "goShop": return goShop(s);
    case "goCart": return goCart(s);
    case "checkout": return openCheckout(s);
    case "back": return back(s);
    case "pay": return pay(s);
  }
}

export function nextStep(s: SimState): SimState {
  const steps = scenarioSteps(s.version);
  if (s.step >= steps.length) return s;
  return { ...applyScenarioAction(s, steps[s.step].action), step: s.step + 1 };
}

export const stepsDone = (s: SimState): boolean => s.step >= scenarioSteps(s.version).length;
