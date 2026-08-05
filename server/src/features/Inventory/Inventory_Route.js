import express from "express";
import InventoryController from "./Inventory_Controller.js";
import isAuth from "../../middleware/is-auth.js";
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

router.get(
  "/inventory",

  hasPermission("INVENTORY", "can_view"),
  (req, res) => inventoryController.getProducts(req, res),
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
  inventoryController.addProduct,
);

router.put(
  "/inventory/edit-product/:product_id",

  hasPermission("INVENTORY", "can_view", "can_edit"),
  upload.single("product_image"),
  validateImage({ required: false }),
  validateParams(productIdParamSchema),
  validateBody(updateProductSchema),
  inventoryController.updateProduct,
);

router.put(
  "/inventory/delete-product/:product_id",

  hasPermission("INVENTORY", "can_view", "can_delete"),
  validateParams(productIdParamSchema),
  inventoryController.deleteProductById,
);

export default router;
