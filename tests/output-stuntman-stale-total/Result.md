---
test: ../stuntman-stale-total_test.md
status: passed
started: 2026-11-26T16:52:04.694Z
duration_s: 149
session_id: ef7cf54b-feef-43ca-b484-b711fc42a967
---

# Stuntman: Stale-total customer — Buy a mug as a guest — Result

## Open the store ✓ passed (18.32s)
md5: ec5914b69749565de89669c08fff67eb
Open http://localhost:3000/. If the application has a reset or demo-data control, leave it alone.

## Journey step 1 ✓ passed (0.81s)
md5: e1bd5ce0ac733424c4ea8aa6a7f59695
Add the "Harbor Mug" to the cart.

## Journey step 2 ✓ passed (0.77s)
md5: 9b7d5675db2063c5d00907e8920a55c8
Open the cart and continue to checkout.

## Journey step 3 ✓ passed (3.87s)
md5: 8482b88c7e69be5f4c11f0e7da7922a8
Enter buyer@example.test as the email and pay with the test card 4242 4242 4242 4242.

## Perform the Stale-total customer behaviour ✓ passed (63.77s)
md5: 60ddf14384bc3d811940ecd1cfb537e9
You are a customer who changes your mind after seeing the total. Follow these steps exactly, in this order. Step 1: follow the journey only as far as the checkout form (add the mug, open the cart, continue to checkout, fill in the email and the card number) and stop; do NOT click Pay. Step 2: use the Corner Store header link to go back to the shop and add one more item of a different product to the cart; you will land on the cart page. Step 3: press the browser Back button exactly twice, one press at a time, checking the page after each press: the first press shows the shop page and the second press shows the checkout form. Do not press Back a third time. If you went too far and the checkout form is not shown, press the browser Forward button once and look again. If the form's fields are empty, enter the same email and card again. Step 4: read the Total shown on this checkout form and store its text as 'displayed_total'. Do not go on to step 5 until 'displayed_total' has been stored. Step 5: click Pay once. Step 6: if the shop refuses the payment or sends you to an updated total instead of completing the order, do not pay again. The value 'displayed_total' must be stored in step 4, before Pay is clicked, from the form that is about to be submitted. Pay exactly once.

## Observe and assert charged_total ✓ passed (55.6s)
md5: 26935e2dfe893e0bdcec8adccdd20d22
Open http://localhost:3000/orders. Add up every amount in the Charged column of the orders page and store the total as 'charged_total'. If there are no order rows at all, store the word NONE as 'charged_total'. Then assert that 'charged_total' is no more than the value you stored as 'displayed_total'. A customer must never be charged more than the total they were shown when they paid. Do not retry or fix anything.
