import React from "react";
import DynamicGrid from "../../components/ui/DynamicGrid";

export default function Inventory() {
  // 1. These lists would be fetched directly from your API endpoints:
  const apiCategoryOptions = [
    { key: 1, value: "Hardware" },
    { key: 2, value: "Electronics" },
    { key: 3, value: "Food" },
  ];

  const apiStatusOptions = [
    { key: 1, value: "high stock" },
    { key: 2, value: "low stock" },
    { key: 3, value: "average stock" },
  ];

  // 2. Assemble your configuration object:
  const backendColumnsConfig = [
    { key: "sku", label: "SKU / Code" },
    { key: "name", label: "Product Title" },
    { key: "category", label: "Category", filterOptions: apiCategoryOptions }, // <-- Injected here
    {
      key: "status",
      label: "Inventory Status",
      filterOptions: apiStatusOptions,
    }, // <-- Injected here
  ];

  // 3. The dataset rows returned from your API:
  const backendRowsData = [
    {
      sku: "SKU-9021",
      name: "Laser Sensors",
      category: "Electronics",
      status: "high stock",
    },
    {
      sku: "SKU-4412",
      name: "Steel Brackets",
      category: "Hardware",
      status: "low stock",
    },
    {
      sku: "SKU-1092",
      name: "Pneumatic Valves",
      category: "Hydraulics",
      status: "average stock",
    },
    {
      sku: "SKU-7721",
      name: "Canned Beans",
      category: "Food",
      status: "high stock",
    },
  ];

  return (
    <DynamicGrid data={backendRowsData} columnsConfig={backendColumnsConfig} />
  );
}
