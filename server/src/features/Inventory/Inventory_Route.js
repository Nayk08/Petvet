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

// Registered before /inventory/:product_id — otherwise Express would try to
// match "batches" itself as the :product_id param and fail validation.
router.get(
  "/inventory/batches/:product_name",
  hasPermission("INVENTORY", "can_view"),
  (req, res) => inventoryController.getProductBatches(req, res),
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

// Bulk-removes every batch already past its expiry date — no :product_id
// collision since that route only matches GET, not DELETE.
router.delete(
  "/inventory/pull-expired",
  hasPermission("INVENTORY", "can_delete"),
  (req, res) => inventoryController.pullExpiredProducts(req, res),
);

export default router;
