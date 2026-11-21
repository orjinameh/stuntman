---
mode: testing
url: http://localhost:3000/
tags: [stuntman, impatient, p0]
max_steps: 40
timeout: 180
code_export: false
---

# Stuntman: Impatient customer — Buy a mug as a guest

## Open the store

Open http://localhost:3000/. If the application has a reset or demo-data control, leave it alone.

## Journey step 1

Add the "Harbor Mug" to the cart.

## Journey step 2

Open the cart and continue to checkout.

## Journey step 3

Enter buyer@example.test as the email and pay with the test card 4242 4242 4242 4242.

## Perform the Impatient customer behaviour

You are an impatient customer. Click the Pay button once, then click it again within one second because the spinner makes you think the first click did not register. The second click happens while the first request is still in flight. Do not wait for the confirmation page before clicking again.

## Observe and assert order_count

Open http://localhost:3000/orders. Count the order rows on the orders page and store the number as 'order_count'. Then assert that 'order_count' equals 1. One purchase intent must create exactly one order. Do not retry or fix anything.
