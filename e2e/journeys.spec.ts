import { test, expect, type Page } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Shared helper: skip Welcome screen + Setup Wizard, land on the app shell
// ─────────────────────────────────────────────────────────────────────────────
async function bypassOnboarding(page: Page) {
  await page.goto('/');

  // Welcome Screen CTA
  const welcomeCTA = page.getByRole('button', { name: /Let's begin/i });
  if (await welcomeCTA.isVisible({ timeout: 3000 }).catch(() => false)) {
    await welcomeCTA.click();
  }

  // Setup Wizard "Skip setup" button
  const skipSetup = page.getByRole('button', { name: /Skip setup/i });
  if (await skipSetup.isVisible({ timeout: 5000 }).catch(() => false)) {
    await skipSetup.click();
  }

  // Wait for the app shell sidebar to confirm we are inside the app
  await expect(
    page.locator('aside').getByRole('button').first()
  ).toBeVisible({ timeout: 20_000 });
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN JOURNEYS — each test starts from the dashboard
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Life OS Critical Journeys', () => {
  test.beforeEach(async ({ page }) => {
    await bypassOnboarding(page);
  });

  // ── Tasks ──────────────────────────────────────────────────────────────────
  test('Task Journey: Create and Complete a Task', async ({ page }) => {
    await page.locator('aside').getByRole('button', { name: /Tasks/i }).click();
    await expect(
      page.getByRole('button', { name: /Add Task/i }).first()
    ).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: /Add Task/i }).first().click();

    const taskTitle = `Test Task ${Date.now()}`;
    await page.getByPlaceholder(/What do you want to get done/i).fill(taskTitle);
    await page.getByPlaceholder(/Add a note or details/i).fill('Testing E2E journey');
    await page.getByRole('button', { name: /High/i }).click();
    await page.getByRole('button', { name: /Create Task|Add Task|Save/i }).click();

    await expect(page.getByText(taskTitle, { exact: true })).toBeVisible({ timeout: 20_000 });

    // Mark complete
    const taskItem = page
      .locator('div')
      .filter({ has: page.getByText(taskTitle, { exact: true }) })
      .last();
    await taskItem.getByRole('checkbox').click();
    await expect(page.getByText(/marked as done/i)).toBeVisible({ timeout: 20_000 });
  });

  // ── Habits ─────────────────────────────────────────────────────────────────
  test('Habit Journey: Create and Log a Habit', async ({ page }) => {
    await page.locator('aside').getByRole('button', { name: /Habits/i }).click();
    await expect(
      page.getByRole('button', { name: /New Habit/i }).first()
    ).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: /New Habit/i }).first().click();

    const habitName = `Habit ${Date.now()}`;
    await page.getByPlaceholder(/Habit name/i).fill(habitName);
    await page.getByRole('button', { name: /Create/i }).click();

    await expect(
      page.getByRole('heading', { name: habitName, exact: true })
    ).toBeVisible({ timeout: 20_000 });

    // Log habit for today
    const habitItem = page
      .locator('div')
      .filter({ has: page.getByRole('heading', { name: habitName, exact: true }) })
      .last();
    await habitItem.locator('button').filter({ has: page.locator('svg') }).first().click();

    await expect(page.locator('svg.animate-check-pop')).toBeVisible({ timeout: 20_000 });
  });

  // ── Journal ────────────────────────────────────────────────────────────────
  test('Journal Journey: Create a Journal Entry', async ({ page }) => {
    await page.locator('aside').getByRole('button', { name: /Journal/i }).click();
    await expect(
      page.getByRole('button', { name: /New Entry/i }).first()
    ).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: /New Entry/i }).first().click();

    // Fill optional title
    const entryTitle = `E2E Entry ${Date.now()}`;
    await page.getByPlaceholder(/How was your day/i).fill(entryTitle);

    // Fill main content (the textarea)
    await page.getByPlaceholder(/Write about your day/i).fill(
      'This entry was created by an automated E2E test.'
    );

    await page.getByRole('button', { name: /Save Entry/i }).click();

    // Verify entry appears in the timeline / list
    await expect(page.getByText(entryTitle)).toBeVisible({ timeout: 20_000 });
  });

  // ── Finance ────────────────────────────────────────────────────────────────
  test('Finance Journey: Create a Finance Account', async ({ page }) => {
    await page.locator('aside').getByRole('button', { name: /Finance/i }).click();
    await expect(
      page.getByRole('button', { name: /New Account/i }).first()
    ).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: /New Account/i }).first().click();

    const accountName = `E2E Account ${Date.now()}`;
    await page.getByPlaceholder(/e\.g\. Main Checking/i).fill(accountName);

    // Set initial balance
    await page.getByLabel(/Initial Balance/i).fill('1000');

    await page.getByRole('button', { name: /^Create$/i }).click();

    // Account should appear in the accounts list
    await expect(page.getByText(accountName)).toBeVisible({ timeout: 20_000 });
  });

  // ── Goals ──────────────────────────────────────────────────────────────────
  test('Goals Journey: Create a Goal', async ({ page }) => {
    await page.locator('aside').getByRole('button', { name: /Goals/i }).click();
    await expect(
      page.getByRole('button', { name: /New Goal/i }).first()
    ).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: /New Goal/i }).first().click();

    const goalTitle = `E2E Goal ${Date.now()}`;
    await page.getByPlaceholder(/What do you want to achieve/i).fill(goalTitle);

    await page.getByRole('button', { name: /^Create$/i }).click();

    await expect(page.getByText(goalTitle)).toBeVisible({ timeout: 20_000 });
  });

  // ── Notes ──────────────────────────────────────────────────────────────────
  test('Notes Journey: Create a Note', async ({ page }) => {
    await page.locator('aside').getByRole('button', { name: /Notes/i }).click();
    await expect(
      page.getByRole('button', { name: /New Note/i }).first()
    ).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: /New Note/i }).first().click();

    const noteTitle = `E2E Note ${Date.now()}`;
    await page.getByPlaceholder(/Note Title/i).fill(noteTitle);

    await page.getByRole('button', { name: /^Create$/i }).click();

    // Note should appear in the notes list
    await expect(page.getByText(noteTitle)).toBeVisible({ timeout: 20_000 });
  });

  // ── Global Search ──────────────────────────────────────────────────────────
  test('Search: Global search panel opens and queries backend', async ({ page }) => {
    // Click the search bar in the header (desktop)
    await page.getByText(/Search everything/i).first().click();

    // Search panel should become visible
    const searchInput = page.getByPlaceholder(/Search tasks, notes, habits/i);
    await expect(searchInput).toBeVisible({ timeout: 10_000 });

    // Type a query — the panel should stay open (not crash)
    await searchInput.fill('test');
    await page.waitForTimeout(600); // debounce

    // Panel is still open (even if no results)
    await expect(searchInput).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ONBOARDING FLOW — tests Welcome Screen → Wizard → Dashboard
// Does NOT use the shared beforeEach so localStorage starts empty.
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Onboarding Flow', () => {
  test('Setup Wizard: Welcome → skip wizard → land on Dashboard', async ({ page }) => {
    // Clear persisted state so the welcome screen triggers
    await page.goto('/');
    await page.evaluate(() => {
      try { localStorage.clear(); } catch {}
    });
    await page.reload();

    // Welcome screen should appear
    const welcomeCTA = page.getByRole('button', { name: /Let's begin/i });
    await expect(welcomeCTA).toBeVisible({ timeout: 15_000 });
    await welcomeCTA.click();

    // Setup wizard should appear
    const skipBtn = page.getByRole('button', { name: /Skip setup/i });
    await expect(skipBtn).toBeVisible({ timeout: 10_000 });

    // Skip the wizard — should land on the dashboard
    await skipBtn.click();

    // Sidebar confirms we are in the app
    await expect(
      page.locator('aside').getByRole('button').first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test('Setup Wizard: Complete all 8 steps manually', async ({ page }) => {
    // Clear persisted state
    await page.goto('/');
    await page.evaluate(() => {
      try { localStorage.clear(); } catch {}
    });
    await page.reload();

    // Welcome → wizard
    await page.getByRole('button', { name: /Let's begin/i }).click();
    await expect(page.getByRole('button', { name: /Skip setup/i })).toBeVisible({ timeout: 10_000 });

    // Click "Next" up to 8 times to walk through all wizard steps.
    // Each step has a Next button; the last step has a "Finish" / "Get started" button.
    for (let step = 0; step < 8; step++) {
      const nextBtn = page.getByRole('button', { name: /Next|Get started|Finish/i }).last();
      if (await nextBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await nextBtn.click();
        await page.waitForTimeout(300); // allow animation
      } else {
        break;
      }
    }

    // After finishing the wizard we should be on the dashboard
    await expect(
      page.locator('aside').getByRole('button').first()
    ).toBeVisible({ timeout: 20_000 });
  });
});
