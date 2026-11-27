"use client";

import { useEffect, useReducer, useState } from "react";
import {
  PRODUCTS, VERSIONS, canBack, canForward, cartCount, cartLines, cartTotal, currentEntry, currentForm,
  initialState, money, scenarioSteps, stepsDone, totalCharged, verdict, type SimState, type Version,
} from "../lib/simulator-model.ts";
import { simulatorReducer } from "../lib/simulator-reducer.ts";

const OUTCOME: Record<Version, string> = {
  original:
    "The checkout page was rendered when the cart was $49. The server ignores that and recalculates from the live cart at payment time, so the customer is charged what they never saw.",
  repairA:
    "The form carries the total it displayed. At payment the server compares it with the live cart and refuses to charge when they differ. The customer must open a fresh checkout.",
  repairB:
    "Each checkout form carries a server-side draft token bound to the exact total shown. Paying charges that saved snapshot, consumes only its items, and replaying the token cannot charge twice.",
};

function urlFor(s: SimState): string {
  const e = currentEntry(s);
  switch (e.page) {
    case "shop": return "corner.store/";
    case "cart": return "corner.store/cart";
    case "checkout": return "corner.store/checkout";
    case "order": return `corner.store/orders/${e.orderId}`;
  }
}

function Viewport({ s, dispatch }: { s: SimState; dispatch: (a: Parameters<typeof simulatorReducer>[1]) => void }) {
  const e = currentEntry(s);
  const lines = cartLines(s.cart);
  if (e.page === "shop") {
    return (
      <div>
        <h3>Shop</h3>
        <ul className="plist">
          {PRODUCTS.map((p) => (
            <li key={p.id} className="prow">
              <span><strong>{p.name}</strong><br /><span className="muted">{money(p.cents)}</span></span>
              <button type="button" className="btn small" onClick={() => dispatch({ type: "add", id: p.id })} aria-label={`Add ${p.name} to cart`}>Add to cart</button>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (e.page === "cart") {
    return (
      <div>
        <h3>Cart</h3>
        {lines.length === 0 ? <p className="muted">Your cart is empty.</p> : (
          <table className="mini">
            <thead><tr><th>Item</th><th>Qty</th><th>Line</th><th><span className="sr">Remove</span></th></tr></thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.id}>
                  <td>{l.name}</td><td>{l.qty}</td><td>{money(l.lineCents)}</td>
                  <td><button type="button" className="link" onClick={() => dispatch({ type: "remove", id: l.id })} aria-label={`Remove one ${l.name}`}>remove</button></td>
                </tr>
              ))}
              <tr className="tot"><td colSpan={2}>Total</td><td colSpan={2}>{money(cartTotal(s.cart))}</td></tr>
            </tbody>
          </table>
        )}
        <div className="row-actions">
          <button type="button" className="btn small" onClick={() => dispatch({ type: "goShop" })}>Shop</button>
          <button type="button" className="btn small primary" onClick={() => dispatch({ type: "checkout" })}>Continue to checkout</button>
        </div>
      </div>
    );
  }
  if (e.page === "checkout") {
    const f = currentForm(s);
    return (
      <div>
        <h3>Checkout</h3>
        <p className="checkout-total">Total: <strong>{f ? money(f.displayedCents) : "?"}</strong></p>
        {f?.expectedCents !== undefined && <p className="chip">form carries expected total {money(f.expectedCents)}</p>}
        {f?.token && <p className="chip">draft token {f.token} (server snapshot {money(s.drafts[f.token]?.totalCents ?? 0)})</p>}
        <label className="field">Email<input value="buyer@example.test" readOnly /></label>
        <label className="field">Card number (test card, nothing is processed)<input value="4242 4242 4242 4242" readOnly /></label>
        <button type="button" className="btn primary" onClick={() => dispatch({ type: "pay" })}>Pay</button>
      </div>
    );
  }
  const order = s.orders.find((o) => o.id === e.orderId);
  return (
    <div>
      <h3>Order confirmed</h3>
      {order ? (
        <p>Order #{order.id}: {order.items.map((i) => `${i.qty} × ${i.name}`).join(", ")}. Charged <strong>{money(order.chargedCents)}</strong>.</p>
      ) : <p className="muted">Order not found.</p>}
      <div className="row-actions"><button type="button" className="btn small" onClick={() => dispatch({ type: "goShop" })}>Shop</button></div>
    </div>
  );
}

export function CheckoutSimulator() {
  const [s, dispatch] = useReducer(simulatorReducer, undefined, () => initialState("original"));
  const [playing, setPlaying] = useState(false);
  const steps = scenarioSteps(s.version);
  const done = stepsDone(s);
  const v = verdict(s);

  useEffect(() => {
    if (!playing) return;
    if (done) { setPlaying(false); return; }
    const t = setTimeout(() => dispatch({ type: "next" }), 1500);
    return () => clearTimeout(t);
  }, [playing, done, s.step]);

  const pay = s.payment;
  const chargedNow = totalCharged(s);

  return (
    <section id="demo" className="wrap section" aria-labelledby="demo-h">
      <h2 id="demo-h">Experience the bug</h2>
      <p className="banner-sim"><strong>Interactive simulation, no real payments are processed.</strong> It mirrors the documented behaviour of the three implementations; it is not the real server.</p>

      <div className="vsel" role="radiogroup" aria-label="Implementation">
        {VERSIONS.map((x) => (
          <button
            key={x.id}
            type="button"
            role="radio"
            aria-checked={s.version === x.id}
            className={"vbtn" + (s.version === x.id ? " on" : "")}
            onClick={() => { setPlaying(false); dispatch({ type: "setVersion", version: x.id }); }}
          >{x.label}</button>
        ))}
      </div>
      <p className="outcome-note">{OUTCOME[s.version]}</p>

      <div className="sim-grid">
        <div className="panel">
          <h3>Walkthrough <span className="muted">step {Math.min(s.step, steps.length)} of {steps.length}</span></h3>
          <ol className="steps">
            {steps.map((st, i) => (
              <li key={i} className={i < s.step ? "done" : i === s.step ? "next" : ""} aria-current={i === s.step ? "step" : undefined}>
                <strong>{st.title}</strong><span className="muted"> {st.detail}</span>
              </li>
            ))}
          </ol>
          <div className="row-actions">
            <button type="button" className="btn primary" disabled={done} onClick={() => dispatch({ type: "next" })}>Next step</button>
            <button type="button" className="btn" disabled={done && !playing} onClick={() => setPlaying((p) => !p)} aria-pressed={playing}>{playing ? "Pause" : "Autoplay"}</button>
            <button type="button" className="btn" onClick={() => { setPlaying(false); dispatch({ type: "reset" }); }}>Reset</button>
          </div>
          <p className="muted small">You can also click around the store yourself. Walkthrough steps assume the scripted order, so Reset before replaying it.</p>
        </div>

        <div className="browser" aria-label="Simulated store">
          <div className="toolbar">
            <button type="button" className="tbtn" onClick={() => dispatch({ type: "back" })} disabled={!canBack(s)} aria-label="Browser back">←</button>
            <button type="button" className="tbtn" onClick={() => dispatch({ type: "forward" })} disabled={!canForward(s)} aria-label="Browser forward">→</button>
            <div className="url" aria-label="Address">{urlFor(s)}</div>
            <button type="button" className="tbtn cartbtn" onClick={() => dispatch({ type: "goCart" })} aria-label={`Cart, ${cartCount(s.cart)} items`}>Cart ({cartCount(s.cart)})</button>
          </div>
          <div className="viewport"><Viewport s={s} dispatch={dispatch} /></div>
          {s.notice && <p className="notice" role="status">{s.notice}</p>}
        </div>
      </div>

      <div className={"ledger " + v} role="status" aria-live="polite">
        <div className="lcol"><span className="tile-label">Last checkout displayed</span><span className="tile-num">{pay.displayedCents === null ? "—" : money(pay.displayedCents)}</span></div>
        <div className="lcol"><span className="tile-label">Charged by the server</span><span className="tile-num">{pay.kind === "none" ? "—" : money(pay.chargedCents)}</span></div>
        <div className="lcol grow">
          <span className="badge">{v === "vulnerable" ? "FAIL: charged more than shown" : v === "safe" ? "PASS: invariant held" : "Waiting for a payment"}</span>
          <p>{pay.message}</p>
          <p className="muted small">Orders: {s.orders.length} · total charged {money(chargedNow)} · cart now {money(cartTotal(s.cart))}</p>
        </div>
      </div>
      <p className="muted small">Invariant Stuntman checks: a customer is never charged more than the total they were shown when they paid.</p>
    </section>
  );
}
