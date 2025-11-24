// FILE: playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:5173",
    trace: "on-first-retry",
    actionTimeout: 10_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});


// FILE: tests/e2e/ui.spec.ts
import { test, expect, Locator } from "@playwright/test";

/* Por qué: medimos paddings reales aplicados en runtime. */
async function readPx(page, selector: string, prop: string): Promise<number> {
  const val = await page.$eval(
    selector,
    (el, p) => getComputedStyle(el as Element).getPropertyValue(p),
    prop,
  );
  const n = parseFloat(String(val).replace("px", "").trim());
  return Number.isFinite(n) ? n : 0;
}

/* Por qué: garantiza que el botón no está cubierto por overlays/barras. */
async function centerHitIsSelf(button: Locator) {
  const res = await button.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const hit = document.elementFromPoint(cx, cy);
    if (!hit) return false;
    const owner = hit.closest("button,[role='button']");
    return owner === el;
  });
  expect(res).toBeTruthy();
}

test("layout: paddings compensan header y bottom-nav (sin solapes)", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const appbarH =
    (await page
      .$eval("header.appbar", (el) => el.getBoundingClientRect().height)
      .catch(() => 0)) ?? 0;
  const bottomNavH =
    (await page
      .$eval("nav.tabs-bar", (el) => el.getBoundingClientRect().height)
      .catch(() => 0)) ?? 0;

  const pt = await readPx(page, ".app-shell", "padding-top");
  const pb = await readPx(page, ".app-shell", "padding-bottom");

  expect(pt).toBeGreaterThanOrEqual(Math.max(44, Math.floor(appbarH) - 1));
  expect(pb).toBeGreaterThanOrEqual(Math.max(44, Math.floor(bottomNavH) - 1));

  const headerPos = await page.$eval("header.appbar", (el) => getComputedStyle(el).position);
  const navPos = await page.$eval("nav.tabs-bar", (el) => getComputedStyle(el).position);
  expect(headerPos).toBe("fixed");
  expect(navPos).toBe("fixed");
});

test("interactivos: visibles, ≥ 44×44 y sin cubrir", async ({ page }) => {
  await page.goto("/");
  const candidates = page.locator("button, [role='button'], .tab-pill, .tab-ghost");
  const count = await candidates.count();
  expect(count).toBeGreaterThan(0);

  for (let i = 0; i < count; i++) {
    const el = candidates.nth(i);
    await expect(el).toBeVisible();
    const box = await el.boundingBox();
    expect(box, "Elemento sin boundingBox (¿oculto?)").toBeTruthy();
    if (box) {
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    await centerHitIsSelf(el);
  }
});

test("toast no pisa el bottom-nav", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /settings/i }).click();
  const themeBtn = page.getByRole("button", { name: /system|light|dark/i }).first();
  await themeBtn.click();

  const toast = page.locator("text=/^Theme:\\s*(Light|Dark|System)$/").first();
  await expect(toast).toBeVisible();

  const [navTop, toastBottom] = await Promise.all([
    page.$eval("nav.tabs-bar", (el) => el.getBoundingClientRect().top),
    toast.evaluate((el) => el.getBoundingClientRect().bottom),
  ]);
  expect(toastBottom).toBeLessThanOrEqual(navTop - 1);

  const cont = page.locator("body > div[role='status']");
  await expect(cont).toBeVisible();
  const bottomPx = await cont.evaluate((el) => parseFloat(getComputedStyle(el).bottom));
  expect(bottomPx).toBeGreaterThanOrEqual(56); // tolerante
});

test("tabs navegables con teclado (Home/End y flechas)", async ({ page }) => {
  await page.goto("/");
  const tablist = page.getByRole("tablist");
  await expect(tablist).toBeVisible();
  const tabs = page.getByRole("tab");
  const total = await tabs.count();
  expect(total).toBeGreaterThan(1);

  await tablist.press("Home");
  await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");

  await tablist.press("ArrowRight");
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");

  await tablist.press("End");
  await expect(tabs.nth(total - 1)).toHaveAttribute("aria-selected", "true");
});


// FILE: tests/e2e/overflow.spec.ts
import { test, expect } from "@playwright/test";

/* Por qué: evita scroll horizontal fantasma por overflow-X. */
test("no hay scroll horizontal ni overflow ancho", async ({ page }) => {
  await page.goto("/");
  const hasHScroll = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHScroll).toBeFalsy();

  // Busca elementos que excedan el viewport (tolerancia 1px)
  const offenders = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth + 1;
    const bad: string[] = [];
    document.querySelectorAll<HTMLElement>("body *").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > vw) {
        const sel =
          el.id ? `#${el.id}` : el.className ? `.${String(el.className).split(" ").join(".")}` : el.tagName.toLowerCase();
        bad.push(`${sel} → ${Math.round(r.width)}px`);
      }
    });
    return bad.slice(0, 10);
  });
  expect(offenders, `Overflow detectado:\n${offenders.join("\n")}`).toHaveLength(0);
});
