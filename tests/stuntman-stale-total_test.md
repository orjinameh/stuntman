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

You are a customer who changes your mind after seeing the total. Follow these steps exactly, in this order. Step 1: follow the journey only as far as the checkout form (add the mug, open the cart, continue to checkout, fill in the email and the card number) and stop; do NOT click Pay. Step 2: use the Corner Store header link to go back to the shop and add one more item of a different product to the cart; you will land on the cart page. Step 3: press the browser Back button exactly twice, one press at a time, checking the page after each press: the first press shows the shop page and the second press shows the checkout form. Do not press Back a third time. If you went too far and the checkout form is not shown, press the browser Forward button once and look again. If the form's fields are empty, enter the same email and card again. Step 4: read the Total shown on this checkout form and store its text as 'displayed_total'. Do not go on to step 5 until 'displayed_total' has been stored. Step 5: click Pay once. Step 6: if the shop refuses the payment or sends you to an updated total instead of completing the order, do not pay again. The value 'displayed_total' must be stored in step 4, before Pay is clicked, from the form that is about to be submitted. Pay exactly once.

## Observe and assert charged_total

Open http://localhost:3000/orders. Add up every amount in the Charged column of the orders page and store the total as 'charged_total'. If there are no order rows at all, store the word NONE as 'charged_total'. Then assert that 'charged_total' is no more than the value you stored as 'displayed_total'. A customer must never be charged more than the total they were shown when they paid. Do not retry or fix anything.
