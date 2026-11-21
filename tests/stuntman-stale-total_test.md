---
mode: testing
url: http://localhost:3000/
tags: [stuntman, stale-total, p1]
max_steps: 40
timeout: 300
code_export: false
---

# Stuntman: Stale-total customer — Buy a mug as a guest

## Open the store

Open http://localhost:3000/. If the application has a reset or demo-data control, leave it alone.

## Journey step 1

Add the "Harbor Mug" to the cart.

## Journey step 2

Open the cart and continue to checkout.

## Journey step 3

Enter buyer@example.test as the email and pay with the test card 4242 4242 4242 4242.

## Perform the Stale-total customer behaviour

You are a customer who changes your mind after seeing the total. IMPORTANT: do NOT click Pay yet. Follow the journey only as far as the checkout form (add the mug, open the cart, continue to checkout, fill in the email and the card number) and stop before clicking Pay. Read the Total shown on the checkout page and store its text as 'displayed_total'. Then use the Corner Store header link to go back to the shop and add one more item of a different product to the cart. Then press the browser Back button until you are on the checkout form again (it may still show the old total; if its fields are empty, enter the same email and card again). On that form, if it now shows an updated total, store the updated total as 'displayed_total' instead. Then click Pay once. Click Pay exactly once, on the old checkout form, and only after the steps above. If the shop refuses the payment or sends you to an updated total instead of completing the order, do not pay again; just record the observations.

## Observe and assert charged_total

Open http://localhost:3000/orders. Add up every amount in the Charged column of the orders page and store the total as 'charged_total'. Then assert that 'charged_total' is no more than the value you stored as 'displayed_total'. A customer must never be charged more than the total they were shown when they paid. Do not retry or fix anything.
