import InventoryModel from "./Inventory_model.js";

const inventoryModel = new InventoryModel();

export default class InventoryService {
  async getProducts({ page, limit, search, filters, grouped } = {}) {
    try {
      return await inventoryModel.getProducts({
        page,
        limit,
        search,
        filters,
        grouped,
      });
    } catch (error) {
      console.error("Error in InventoryService", error);
      throw error;
    }
  }

  async getProductsById(product_id) {
    try {
      return await inventoryModel.getProductsById(product_id);
    } catch (error) {
      console.error("Error in InventoryService", error);
      throw error;
    }
  }

  async getProductBatches(product_name) {
    try {
      return await inventoryModel.getProductBatches(product_name);
    } catch (error) {
      console.error("Error in InventoryService", error);
      throw error;
    }
  }

  async addProduct({
    created_by,
    product_image,
    product_name,
    product_quantity,
    product_expiry_date,
    product_price,
  }) {
    try {
      const newProduct = await inventoryModel.addProduct({
        created_by,
        product_image,
        product_name,
        product_quantity,
        product_expiry_date,
        product_price,
      });
      return newProduct;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async updateProduct({
    updated_by,
    product_image,
    product_name,
    product_quantity,
    product_expiry_date,
    product_price,
    product_id,
  }) {
    try {
      const updateProduct = await inventoryModel.updateProduct({
        updated_by,
        product_image,
        product_name,
        product_quantity,
        product_expiry_date,
        product_price,
        product_id,
      });
      return updateProduct;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async addQuantity({
    product_id,
    quantity,
    product_price,
    product_expiry_date,
    updated_by,
  }) {
    try {
      return await inventoryModel.addQuantity({
        product_id,
        quantity,
        product_price,
        product_expiry_date,
        updated_by,
      });
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async deleteProductById({ product_id, deleted_by }) {
    try {
      const deleteProductById = await inventoryModel.deleteProductById({
        product_id,
        deleted_by,
      });
      return deleteProductById;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async pullExpiredProducts({ deleted_by }) {
    try {
      return await inventoryModel.pullExpiredProducts({ deleted_by });
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
}
