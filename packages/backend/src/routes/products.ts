import { Router } from "express";
import { getCategories, getProductDetail, getTags, searchProducts } from "../eol/eolService.js";

export const productsRouter = Router();

productsRouter.get("/products", async (req, res, next) => {
  try {
    const { q, category, tag } = req.query;
    const results = await searchProducts({
      q: typeof q === "string" ? q : undefined,
      category: typeof category === "string" ? category : undefined,
      tag: typeof tag === "string" ? tag : undefined,
    });
    res.json({ result: results });
  } catch (err) {
    next(err);
  }
});

productsRouter.get("/products/:slug", async (req, res, next) => {
  try {
    const detail = await getProductDetail(req.params.slug);
    res.json({ result: detail });
  } catch (err) {
    next(err);
  }
});

productsRouter.get("/categories", async (_req, res, next) => {
  try {
    res.json({ result: await getCategories() });
  } catch (err) {
    next(err);
  }
});

productsRouter.get("/tags", async (_req, res, next) => {
  try {
    res.json({ result: await getTags() });
  } catch (err) {
    next(err);
  }
});
