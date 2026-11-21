# Corner Store: product brief

Build a tiny online store as a single Node.js file with no dependencies (`node:http` only). State lives in memory.

## Pages
- **Shop** (`/`): three products: Harbor Mug $49.00, Field Notebook $12.00, Canvas Tote $28.00. Each has an "Add to cart" button.
- **Cart** (`/cart`): the lines, quantities, and a total. A "Continue to checkout" button.
- **Checkout** (`/checkout`): guest checkout. An email field and a card-number field (test card `4242 4242 4242 4242`; no real payments, nothing is validated beyond "not empty"). A "Pay" button.
- **Confirmation** (`/orders/<id>`): says "Order confirmed", with the order number.
- **Orders** (`/orders`): a table of every order with its id, total, time and the amount charged.

## Behaviour
- Paying creates an order and a charge, empties the cart, and redirects to the confirmation page. The fake payment provider takes a moment to answer.
- `POST /admin/reset` restores the seed data. `GET /__state` returns the current state as JSON. `GET /health` returns `{"ok":true}`.
- Port from `PORT`, default 3000.

## Style
Warm off-white background, white cards, one dark-green button colour, system font. Plain and clean.
