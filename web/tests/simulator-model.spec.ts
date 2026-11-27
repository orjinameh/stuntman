// Named .spec.ts (not .test.ts) so the repository root `node --test` never collects it.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addToCart, back, cartLines, cartTotal, currentForm, initialState, nextStep, openCheckout, pay,
  scenarioSteps, stepsDone, totalCharged, verdict, type SimState, type Version,
} from "../lib/simulator-model.ts";
import { simulatorReducer } from "../lib/simulator-reducer.ts";

/** Runs the scripted steps 1..7 (through the first Pay). */
function runMainScenario(version: Version): SimState {
  let s = initialState(version);
  for (let i = 0; i < 7; i++) s = nextStep(s);
  return s;
}

test("1. an empty cart cannot be checked out", () => {
  for (const v of ["original", "repairA", "repairB"] as const) {
    const s = openCheckout(initialState(v));
    assert.equal(currentForm(s), null);
    assert.equal(s.history.length, 1);
    assert.match(s.notice ?? "", /empty/i);
  }
});

test("2. original: displayed 4900, charged 6100", () => {
  const s = runMainScenario("original");
  assert.equal(s.payment.kind, "charged");
  assert.equal(s.payment.displayedCents, 4900);
  assert.equal(s.payment.chargedCents, 6100);
  assert.equal(totalCharged(s), 6100);
  assert.equal(verdict(s), "vulnerable");
  assert.deepEqual(s.cart, {});
});

test("3. repair A rejects the stale checkout and charges 0", () => {
  const s = runMainScenario("repairA");
  assert.equal(s.payment.kind, "rejected");
  assert.equal(s.payment.chargedCents, 0);
  assert.equal(s.orders.length, 0);
  assert.equal(verdict(s), "safe");
  assert.equal(cartTotal(s.cart), 6100);
});

test("4. repair A: a fresh checkout shows 6100 and charges 6100", () => {
  let s = runMainScenario("repairA");
  s = nextStep(s); // fresh checkout
  assert.equal(currentForm(s)?.displayedCents, 6100);
  s = nextStep(s); // pay
  assert.equal(s.payment.kind, "charged");
  assert.equal(s.payment.displayedCents, 6100);
  assert.equal(s.payment.chargedCents, 6100);
  assert.equal(verdict(s), "safe");
  assert.equal(stepsDone(s), true);
});

test("5. repair B charges the saved 4900 snapshot", () => {
  const s = runMainScenario("repairB");
  assert.equal(s.payment.kind, "charged");
  assert.equal(s.payment.displayedCents, 4900);
  assert.equal(s.payment.chargedCents, 4900);
  assert.equal(verdict(s), "safe");
});

test("6. repair B leaves the later-added notebook in the cart", () => {
  const s = runMainScenario("repairB");
  assert.deepEqual(cartLines(s.cart).map((l) => [l.id, l.qty]), [["notebook", 1]]);
  assert.equal(cartTotal(s.cart), 1200);
});

test("7. replaying a repair B token creates no duplicate order or charge", () => {
  let s = runMainScenario("repairB");
  s = nextStep(s); // back to checkout form
  s = nextStep(s); // pay again
  assert.equal(s.payment.kind, "replayed");
  assert.equal(s.payment.chargedCents, 0);
  assert.equal(s.orders.length, 1);
  assert.equal(totalCharged(s), 4900);
  assert.deepEqual(cartLines(s.cart).map((l) => l.id), ["notebook"]);
});

test("8. different repair B tokens are independent", () => {
  let s = initialState("repairB");
  s = addToCart(s, "mug");
  s = openCheckout(s);
  const tokenA = currentForm(s)!.token!;
  s = pay(s);
  s = addToCart(s, "notebook");
  s = openCheckout(s);
  const tokenB = currentForm(s)!.token!;
  assert.notEqual(tokenA, tokenB);
  s = pay(s);
  assert.equal(s.orders.length, 2);
  assert.deepEqual(s.orders.map((o) => o.chargedCents), [4900, 1200]);
  assert.equal(s.drafts[tokenA].orderId, 1);
  assert.equal(s.drafts[tokenB].orderId, 2);
  // Going back to the first form and replaying it does not touch the second order.
  s = back(back(back(back(s))));
  assert.equal(currentForm(s)?.token, tokenA);
  s = pay(s);
  assert.equal(s.payment.kind, "replayed");
  assert.equal(s.orders.length, 2);
  assert.equal(totalCharged(s), 6100);
});

test("9. reset returns to the initial state (same version)", () => {
  for (const v of ["original", "repairA", "repairB"] as const) {
    const s = simulatorReducer(runMainScenario(v), { type: "reset" });
    assert.deepEqual(s, initialState(v));
  }
});

test("10. switching versions leaves no payment state behind", () => {
  const dirty = runMainScenario("original");
  assert.equal(dirty.orders.length, 1);
  const s = simulatorReducer(dirty, { type: "setVersion", version: "repairB" });
  assert.deepEqual(s, initialState("repairB"));
  assert.equal(s.payment.kind, "none");
  assert.equal(s.orders.length, 0);
  assert.deepEqual(s.cart, {});
  assert.equal(s.step, 0);
});

test("money is integer cents and cart arithmetic is exact", () => {
  let s = initialState();
  s = addToCart(s, "tote");
  s = addToCart(s, "notebook");
  s = addToCart(s, "notebook");
  assert.equal(cartTotal(s.cart), 2800 + 2400);
  assert.ok(Number.isInteger(cartTotal(s.cart)));
});

test("scenario step counts: 7 for original, 9 for repairs", () => {
  assert.equal(scenarioSteps("original").length, 7);
  assert.equal(scenarioSteps("repairA").length, 9);
  assert.equal(scenarioSteps("repairB").length, 9);
});
