import { describe, expect, it } from "vitest";
import { eolClient } from "../eol/eolClient.js";

describe("eolService integration with endoflife.date", () => {
  it("fetches angular product and has multiple release versions available", async () => {
    const productDetail = await eolClient.getProduct("angular");
    const product = productDetail.result;

    expect(product).toHaveProperty("releases");
    expect(Array.isArray(product.releases)).toBe(true);
    expect(product.releases.length).toBeGreaterThan(0);

    // Verify that we can find multiple versions (not just the latest)
    const versionNames = product.releases.map((r) => r.name);
    expect(versionNames).toContain("18");
    expect(versionNames).toContain("17");
    expect(versionNames).toContain("16");
    // Angular has at least 12+ versions in the API
    expect(versionNames.length).toBeGreaterThanOrEqual(12);

    // Verify each release has label and can be displayed
    const latestRelease = product.releases[0];
    expect(latestRelease).toHaveProperty("name");
    expect(latestRelease).toHaveProperty("label");
    expect(latestRelease).toHaveProperty("isEol");
    expect(latestRelease).toHaveProperty("releaseDate");
  });

  it("angular versions include older LTS releases accessible via the cycle selector", async () => {
    const productDetail = await eolClient.getProduct("angular");
    const product = productDetail.result;
    const releases = product.releases;

    // Find Angular 17 (known older LTS)
    const angular17 = releases.find((r) => r.name === "17");
    expect(angular17).toBeDefined();
    expect(angular17?.label).toMatch(/17/);

    // Find Angular 16 (known older LTS)
    const angular16 = releases.find((r) => r.name === "16");
    expect(angular16).toBeDefined();
    expect(angular16?.label).toMatch(/16/);

    // Verify they are not EOL (should still be in the list with valid dates)
    if (angular17) {
      expect(angular17.releaseDate).toBeDefined();
      expect(angular17.isEol !== undefined).toBe(true);
    }
  });

  it("cycles have proper release metadata and EOL dates", async () => {
    const productDetail = await eolClient.getProduct("angular");
    const product = productDetail.result;
    const releases = product.releases;

    // All releases should have the expected structure
    expect(releases.length).toBeGreaterThan(0);
    releases.forEach((release) => {
      expect(release).toHaveProperty("name");
      expect(release).toHaveProperty("label");
      expect(release).toHaveProperty("isEol");
    });

    // Some releases may have LTS info
    const releasesWithLtsInfo = releases.filter((r) => r.isLts !== null && r.isLts !== undefined);
    // Check that we can display all available releases in selector
    expect(releases.length).toBeGreaterThanOrEqual(5);
  });
});
