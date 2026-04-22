import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://localhost:3000/Login');
  await page.getByRole('textbox', { name: 'Email address' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('it23838802@my.sliit.lk');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('wwww@2222');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('link', { name: 'Foods' }).click();
  await page.getByRole('img', { name: 'Chef\'s Kitchen' }).click();
  await page.getByRole('button', { name: 'Write a Review' }).click();
  await page.getByRole('button', { name: '5 star' }).click();
  await page.getByRole('textbox', { name: 'Tell others about your' }).click();
  await page.getByRole('textbox', { name: 'Tell others about your' }).fill('test review');
  await page.getByRole('button', { name: 'Submit Review' }).click();
  await page.getByRole('button', { name: 'Edit review' }).first().click();
  await page.getByRole('button', { name: '3 star' }).click();
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await page.getByRole('button', { name: 'Edit review' }).first().click();
  await page.getByRole('button', { name: '1 star' }).click();
  await page.getByRole('textbox', { name: 'Tell others about your' }).click();
  await page.getByRole('textbox', { name: 'Tell others about your' }).fill('test review 2');
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await page.getByRole('button', { name: 'Delete review' }).first().click();
  await page.getByRole('button', { name: 'Yes, Delete' }).click();
});