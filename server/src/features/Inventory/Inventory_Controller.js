import InventoryService from "./Inventory_Service.js";
import { sendError } from "../../../utils/errorResponse.js";

const inventoryService = new InventoryService();

export default class InventoryController {
  async getProducts(req, res) {
    try {
      const {
        page,
        limit,
        search,
        status_name,
        is_expired,
        category_name,
        grouped,
      } = req.query;
      const filters = { status_name, is_expired, category_name };

      const { rows, pagination } = await inventoryService.getProducts({
        page,
        limit,
        search,
        filters,
        grouped: grouped === "true",
      });
      return res.status(200).json({ rows, pagination });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Failed to fetch inventory." });
    }
  }

  async getProductsById(req, res) {
    try {
      const { product_id } = req.params;
      const inventory = await inventoryService.getProductsById(product_id);
      return res.status(200).json(inventory);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Failed to fetch inventory." });
    }
  }

  async getProductHistory(req, res) {
    try {
      const history = await inventoryService.getProductHistory(req.params.product_name);
      return res.status(200).json(history);
    } catch (error) {
      return sendError(res, error, "Failed to fetch product history.");
    }
  }

  async getProductBatches(req, res) {
    try {
      const { product_name } = req.params;
      const batches = await inventoryService.getProductBatches(product_name);
      return res.status(200).json(batches);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ message: "Failed to fetch product batches." });
    }
  }

  async addProduct(req, res) {
    try {
      console.log("req.file:", req.file);
      const product = await inventoryService.addProduct({
        ...req.body,
        created_by: req.session.user.name,
        product_image: req.file ? req.file.path : null,
      });

      return res.status(201).json(product);
    } catch (error) {
      return sendError(res, error, "Failed to add product.");
    }
  }

  async updateProduct(req, res) {
    try {
      let product_image = req.file?.path;

      if (!product_image) {
        const existing = await inventoryService.getProductsById(
          req.params.product_id,
        );
        product_image = existing?.product_image ?? null;
      }

      const product = await inventoryService.updateProduct({
        ...req.body,
        product_id: req.params.product_id,
        updated_by: req.session.user.name, // consistent with created_by
        product_image,
      });

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      return res.status(200).json(product);
    } catch (error) {
      return sendError(res, error, "Failed to update product.");
    }
  }

  async addQuantity(req, res) {
    try {
      const { quantity, product_price, product_expiry_date } = req.body;
      const product = await inventoryService.addQuantity({
        product_id: req.params.product_id,
        quantity,
        product_price,
        product_expiry_date,
        updated_by: req.session.user.name,
      });
      return res.status(200).json(product);
    } catch (error) {
      return sendError(res, error, "Failed to add quantity.");
    }
  }

  async getProductCategories(req, res) {
    try {
      const categories = await inventoryService.getProductCategories();
      return res.status(200).json(categories);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ message: "Failed to fetch product categories." });
    }
  }

  async addProductCategory(req, res) {
    try {
      const { category_name } = req.body;
      const category = await inventoryService.addProductCategory({
        category_name,
        created_by: req.session.user.name,
      });
      return res.status(201).json(category);
    } catch (error) {
      return sendError(res, error, "Failed to add category.");
    }
  }

  async getArchivedProducts(req, res) {
    try {
      const { page, limit, search } = req.query;
      const { rows, pagination } = await inventoryService.getArchivedProducts({
        page,
        limit,
        search,
      });
      return res.status(200).json({ rows, pagination });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ message: "Failed to fetch archived products." });
    }
  }

  async restoreProduct(req, res) {
    try {
      const restored = await inventoryService.restoreProduct({
        product_id: req.params.product_id,
        updated_by: req.session.user.name,
      });
      if (!restored) {
        return res.status(404).json({ message: "Archived product not found" });
      }
      return res.status(200).json(restored);
    } catch (error) {
      return sendError(res, error, "Failed to restore product.");
    }
  }

  async permanentlyDeleteProduct(req, res) {
    try {
      const deleted = await inventoryService.permanentlyDeleteProduct({
        product_id: req.params.product_id,
      });
      if (!deleted) {
        return res
          .status(404)
          .json({ message: "Archived product not found" });
      }
      return res.status(200).json(deleted);
    } catch (error) {
      return sendError(res, error, "Failed to permanently delete product.");
    }
  }

  async deleteProductById(req, res) {
    try {
      const deleteProductById = await inventoryService.deleteProductById({
        product_id: req.params.product_id,
        deleted_by: req.session.user.name,
      });
      if (!deleteProductById) {
        return res.status(404).json({ message: "Product not found" });
      }
      return res.status(200).json(deleteProductById);
    } catch (error) {
      return sendError(res, error, "Failed to delete product.");
    }
  }

  async pullExpiredProducts(req, res) {
    try {
      const removed = await inventoryService.pullExpiredProducts({
        deleted_by: req.session.user.name,
      });
      return res.status(200).json({ removed });
    } catch (error) {
      return sendError(res, error, "Failed to remove expired products.");
    }
  }
}
