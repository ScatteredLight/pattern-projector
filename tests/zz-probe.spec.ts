import { test, expect } from "@playwright/test";
import { home, makePattern, openApp, seedCalibration } from "./helpers";

const sizes = () => ({
  inner: [window.innerWidth, window.innerHeight],
  client: [
    document.documentElement.clientWidth,
    document.documentElement.clientHeight,
  ],
  scroll: [
    document.documentElement.scrollWidth,
    document.documentElement.scrollHeight,
  ],
  screen: [screen.width, screen.height],
  dpr: window.devicePixelRatio,
  fsEnabled: document.fullscreenEnabled,
  fs: document.fullscreenElement !== null,
});

test("probe", async ({ page }, testInfo) => {
  const log: string[] = [];
  page.on("console", (m) => log.push(`console.${m.type()}: ${m.text()}`));
  page.on("pageerror", (e) => log.push(`pageerror: ${e.message}`));
  await seedCalibration(page);
  await openApp(page);
  log.push("home " + JSON.stringify(await page.evaluate(sizes)));
  const path = testInfo.outputPath("Shirt.pdf");
  await makePattern(path, "Shirt");
  await page.locator("#pdfFile").setInputFiles(path);
  await page.waitForTimeout(2000);
  log.push(
    "after add: status=" +
      JSON.stringify(await home(page).getByRole("status").allInnerTexts()),
  );
  log.push(
    "dialogs=" + JSON.stringify(await page.getByRole("dialog").allInnerTexts()),
  );
  log.push(
    "alerts=" + JSON.stringify(await page.getByRole("alert").allInnerTexts()),
  );
  log.push(
    "projects=" +
      JSON.stringify(await page.getByTestId("project").allInnerTexts()),
  );
  const shirt = home(page).getByRole("button", { name: /^Shirt/ });
  if (await shirt.count()) {
    await shirt.click();
    await page.waitForTimeout(3000);
    log.push("projecting " + JSON.stringify(await page.evaluate(sizes)));
    log.push(
      "saved ctx " +
        (await page.evaluate(() => localStorage.getItem("calibrationContext"))),
    );
    log.push(
      "alerts=" + JSON.stringify(await page.getByRole("alert").allInnerTexts()),
    );
  }
  console.log(`PROBE ${testInfo.project.name}\n` + log.join("\n"));
});

test("probe guide", async ({ page }, testInfo) => {
  const log: string[] = [];
  await openApp(page);
  await home(page)
    .getByRole("button", { name: "Calibrate", exact: true })
    .click();
  const guide = page.getByTestId("calibration-guide");
  for (let i = 0; i < 4; i++) {
    const box = await guide.boundingBox();
    const parent = await guide.evaluate((el) => {
      const p = el.offsetParent as HTMLElement | null;
      const r = p?.getBoundingClientRect();
      return {
        tag: p?.tagName,
        cls: p?.className?.toString().slice(0, 80),
        rect: r && [r.x, r.y, r.width, r.height],
      };
    });
    log.push(
      `guide step ${i + 1} box=${JSON.stringify(box)} parent=${JSON.stringify(parent)} sizes=${JSON.stringify(await page.evaluate(sizes))}`,
    );
    if (i < 3)
      await page.getByRole("button", { name: "Next", exact: true }).click();
  }
  console.log(`PROBE ${testInfo.project.name}\n` + log.join("\n"));
});
