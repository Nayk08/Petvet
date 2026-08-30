import InventoryService from "./Inventory_Service.js";

const inventoryService = new InventoryService();

export default class InventoryController {
  async getProducts(req, res) {
    try {
      const { page, limit, search, status_name, is_expired } = req.query;
      const filters = { status_name, is_expired };

      const { rows, pagination } = await inventoryService.getProducts({
        page,
        limit,
        search,
        filters,
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
      const status = error.status || 500;
      return res
        .status(status)
        .json({ message: error.message || "Something went wrong" });
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
      const status = error.status || 500;
      return res
        .status(status)
        .json({ message: error.message || "Something went wrong" });
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
      const status = error.status || 500;
      return res
        .status(status)
        .json({ message: error.message || "Something went wrong" });
    }
  }
}
