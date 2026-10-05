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

  async getProductHistory(product_name) {
    return inventoryModel.getProductHistory(product_name);
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
    category_id,
  }) {
    try {
      const newProduct = await inventoryModel.addProduct({
        created_by,
        product_image,
        product_name,
        product_quantity,
        product_expiry_date,
        product_price,
        category_id,
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
    category_id,
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
        category_id,
      });
      return updateProduct;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async getProductCategories() {
    try {
      return await inventoryModel.getProductCategories();
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async addProductCategory({ category_name, created_by }) {
    try {
      return await inventoryModel.addProductCategory({
        category_name,
        created_by,
      });
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

  async getArchivedProducts({ page, limit, search } = {}) {
    try {
      return await inventoryModel.getArchivedProducts({ page, limit, search });
    } catch (error) {
      console.error("Error in InventoryService", error);
      throw error;
    }
  }

  async restoreProduct({ product_id, updated_by }) {
    try {
      return await inventoryModel.restoreProduct({ product_id, updated_by });
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async permanentlyDeleteProduct({ product_id }) {
    try {
      return await inventoryModel.permanentlyDeleteProduct({ product_id });
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
