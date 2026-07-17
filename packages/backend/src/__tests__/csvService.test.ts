import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EolProductDetailResult, EolProductSummary } from "@eol-tracker/shared";

const PRODUCTS: EolProductSummary[] = [
  { name: "ubuntu", aliases: ["ubuntu-linux"], label: "Ubuntu", category: "os", tags: ["os"], uri: "" },
  { name: "nodejs", aliases: ["node"], label: "Node.js", category: "lang", tags: ["lang"], uri: "" },
  { name: "postgresql", aliases: ["postgres"], label: "PostgreSQL", category: "database", tags: ["database"], uri: "" },
];

const PRODUCT_DETAILS: Record<string, EolProductDetailResult> = {
  ubuntu: {
    name: "ubuntu",
    aliases: ["ubuntu-linux"],
    label: "Ubuntu",
    category: "os",
    tags: ["os"],
    releases: [
      { name: "22.04", label: "22.04", isEol: false },
      { name: "24.04", label: "24.04", isEol: false },
    ],
  },
  nodejs: {
    name: "nodejs",
    aliases: ["node"],
    label: "Node.js",
    category: "lang",
    tags: ["lang"],
    releases: [
      { name: "18", label: "18", isEol: false },
      { name: "20", label: "20", isEol: false },
    ],
  },
  postgresql: {
    name: "postgresql",
    aliases: ["postgres"],
    label: "PostgreSQL",
    category: "database",
    tags: ["database"],
    releases: [{ name: "14", label: "14", isEol: false }],
  },
};

vi.mock("../eol/eolService.js", () => ({
  getAllProducts: vi.fn(async () => PRODUCTS),
  productExists: vi.fn(async (slug: string) => PRODUCTS.some((p) => p.name === slug)),
  getProductDetail: vi.fn(async (slug: string) => {
    const detail = PRODUCT_DETAILS[slug];
    if (!detail) throw new Error(`unknown product ${slug}`);
    return detail;
  }),
  findCycle: (product: EolProductDetailResult, cycleName: string) => product.releases.find((r) => r.name === cycleName),
}));

const upsertMock = vi.fn(async (args: { create: Record<string, unknown> }) => ({
  id: `id-${args.create.product}-${args.create.cycle}-${args.create.environment}`,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...args.create,
}));
const transactionMock = vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops));

vi.mock("../db/client.js", () => ({
  prisma: {
    stackItem: { upsert: (...args: unknown[]) => upsertMock(...(args as [never])) },
    $transaction: (...args: unknown[]) => transactionMock(...(args as [never])),
  },
}));

const { buildExportCsv, buildTemplateCsv, commitRows, CsvCommitBlockedError, parseCsv, validateRows } = await import(
  "../services/csvService.js"
);

beforeEach(() => {
  upsertMock.mockClear();
  transactionMock.mockClear();
});

describe("parseCsv", () => {
  it("parses a well-formed CSV into rows", () => {
    const csv = "product,cycle,environment,owner,notes,source\nubuntu,22.04,prod,platform-team,,manual\n";
    const rows = parseCsv(csv);
    expect(rows).toEqual([
      { product: "ubuntu", cycle: "22.04", environment: "prod", owner: "platform-team", notes: "", source: "manual" },
    ]);
  });
});

describe("validateRows", () => {
  it("accepts a fully valid set of rows", async () => {
    const rows = parseCsv(
      "product,cycle,environment,owner,notes,source\n" +
        "ubuntu,22.04,prod,platform-team,,manual\n" +
        "nodejs,18,prod,web-team,,manual\n"
    );
    const report = await validateRows(rows);
    expect(report.valid).toBe(true);
    expect(report.rows.every((r) => r.errors.length === 0)).toBe(true);
  });

  it("flags a missing product as required", async () => {
    const rows = parseCsv("product,cycle\n,22.04\n");
    const report = await validateRows(rows);
    expect(report.valid).toBe(false);
    expect(report.rows[0].errors).toContainEqual({ field: "product", message: "product is required" });
  });

  it("flags a missing cycle as required", async () => {
    const rows = parseCsv("product,cycle\nubuntu,\n");
    const report = await validateRows(rows);
    expect(report.valid).toBe(false);
    expect(report.rows[0].errors).toContainEqual({ field: "cycle", message: "cycle is required" });
  });

  it("flags an unknown product and suggests the closest match", async () => {
    const rows = parseCsv("product,cycle\npostgres,14\n");
    const report = await validateRows(rows);
    expect(report.valid).toBe(false);
    const error = report.rows[0].errors.find((e) => e.field === "product");
    expect(error?.message).toContain("not found");
    expect(error?.suggestion).toBe("postgresql");
  });

  it("flags a cycle that doesn't exist for an otherwise-valid product", async () => {
    const rows = parseCsv("product,cycle\nubuntu,15.2\n");
    const report = await validateRows(rows);
    expect(report.valid).toBe(false);
    const error = report.rows[0].errors.find((e) => e.field === "cycle");
    expect(error?.message).toContain("not valid");
  });

  it("flags an invalid source value", async () => {
    const rows = parseCsv("product,cycle,source\nubuntu,22.04,scanner\n");
    const report = await validateRows(rows);
    expect(report.valid).toBe(false);
    expect(report.rows[0].errors).toContainEqual({
      field: "source",
      message: "source must be one of manual, github, azure, gcp",
    });
  });

  it("numbers rows 1-indexed by data row, not counting the header", async () => {
    const rows = parseCsv(
      "product,cycle\n" + "ubuntu,22.04\n" + "nodejs,18\n" + "postgres,14\n" // row 3 is bad
    );
    const report = await validateRows(rows);
    const badRow = report.rows.find((r) => r.errors.length > 0);
    expect(badRow?.rowNumber).toBe(3);
  });

  it("treats an empty CSV (no data rows) as invalid rather than an empty success", async () => {
    const report = await validateRows([]);
    expect(report.valid).toBe(false);
    expect(report.totalRows).toBe(0);
  });
});

describe("commitRows", () => {
  it("does not write anything when validation fails (all-or-nothing)", async () => {
    const rows = parseCsv("product,cycle\npostgres,14\n");
    await expect(commitRows(rows)).rejects.toBeInstanceOf(CsvCommitBlockedError);
    expect(transactionMock).not.toHaveBeenCalled();
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("attaches the validation report to the thrown error", async () => {
    const rows = parseCsv("product,cycle\npostgres,14\n");
    try {
      await commitRows(rows);
      expect.fail("expected commitRows to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(CsvCommitBlockedError);
      expect((err as InstanceType<typeof CsvCommitBlockedError>).report.valid).toBe(false);
    }
  });

  it("writes every row in a single transaction when all rows are valid", async () => {
    const rows = parseCsv(
      "product,cycle,environment,owner,notes,source\n" +
        "ubuntu,22.04,prod,platform-team,,manual\n" +
        "nodejs,18,prod,web-team,,manual\n"
    );
    const created = await commitRows(rows);
    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(upsertMock).toHaveBeenCalledTimes(2);
    expect(created).toHaveLength(2);
    expect(created[0]).toMatchObject({ product: "ubuntu", cycle: "22.04", source: "manual" });
  });

  it("normalizes product to lowercase and defaults environment/source", async () => {
    const rows = parseCsv("product,cycle\nUBUNTU,22.04\n");
    await commitRows(rows);
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ product: "ubuntu", environment: "unspecified", source: "manual" }),
      })
    );
  });
});

describe("template/export CSV symmetry", () => {
  it("template CSV has exactly the documented headers", () => {
    const template = buildTemplateCsv().trim();
    expect(template).toBe("product,cycle,environment,owner,notes,source");
  });

  it("export CSV round-trips through parseCsv with the same field values", () => {
    const items = [
      {
        id: "1",
        product: "ubuntu",
        cycle: "22.04",
        environment: "prod",
        owner: "platform-team",
        notes: null,
        source: "manual",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    const csv = buildExportCsv(items);
    const [header] = csv.trim().split("\n");
    expect(header).toBe("product,cycle,environment,owner,notes,source");

    const parsed = parseCsv(csv);
    expect(parsed).toEqual([
      { product: "ubuntu", cycle: "22.04", environment: "prod", owner: "platform-team", notes: "", source: "manual" },
    ]);
  });
});
