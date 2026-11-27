import {
  addToCart, back, forward, goCart, goShop, initialState, nextStep, openCheckout, pay, removeFromCart,
  type ProductId, type SimState, type Version,
} from "./simulator-model.ts";

export type Action =
  | { type: "add"; id: ProductId }
  | { type: "remove"; id: ProductId }
  | { type: "goShop" }
  | { type: "goCart" }
  | { type: "checkout" }
  | { type: "back" }
  | { type: "forward" }
  | { type: "pay" }
  | { type: "next" }
  | { type: "reset" }
  | { type: "setVersion"; version: Version };

export function simulatorReducer(state: SimState, action: Action): SimState {
  switch (action.type) {
    case "add": return addToCart(state, action.id);
    case "remove": return removeFromCart(state, action.id);
    case "goShop": return goShop(state);
    case "goCart": return goCart(state);
    case "checkout": return openCheckout(state);
    case "back": return back(state);
    case "forward": return forward(state);
    case "pay": return pay(state);
    case "next": return nextStep(state);
    case "reset": return initialState(state.version);
    // Switching versions starts a clean world so no payment state leaks between implementations.
    case "setVersion": return initialState(action.version);
  }
}
