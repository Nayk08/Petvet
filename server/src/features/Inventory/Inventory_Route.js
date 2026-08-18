import express from "express";
import InventoryController from "./Inventory_Controller.js";
import hasPermission from "../../middleware/has-permission.js";
import upload from "../../middleware/upload.js";

import {
  validateBody,
  validateParams,
  validateImage,
} from "../../middleware/validate.js";
import {
  addProductSchema,
  updateProductSchema,
  productIdParamSchema,
} from "../../validators/productSchema.js";

const inventoryController = new InventoryController();
const router = express.Router();

router.get("/inventory", hasPermission("INVENTORY", "can_view"), (req, res) =>
  inventoryController.getProducts(req, res),
);

router.get(
  "/inventory/:product_id",
  hasPermission("INVENTORY", "can_view", "can_edit"),
  validateParams(productIdParamSchema),
  (req, res) => inventoryController.getProductsById(req, res),
);

router.post(
  "/inventory/add-product",
  hasPermission("INVENTORY", "can_view", "can_create"),
  upload.single("product_image"),
  validateImage({ required: true }),
  validateBody(addProductSchema),
  (req, res) => inventoryController.addProduct(req, res),
);

router.put(
  "/inventory/:product_id/edit-product",
  hasPermission("INVENTORY", "can_view", "can_edit"),
  upload.single("product_image"),
  validateImage({ required: false }),
  validateParams(productIdParamSchema),
  validateBody(updateProductSchema),
  (req, res) => inventoryController.updateProduct(req, res),
);

router.delete(
  "/inventory/:product_id/delete-product",
  hasPermission("INVENTORY", "can_view", "can_delete"),
  validateParams(productIdParamSchema),
  (req, res) => inventoryController.deleteProductById(req, res),
);

export default router;
