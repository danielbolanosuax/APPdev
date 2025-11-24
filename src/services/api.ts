// src/services/api.ts
const API_BASE_URL = "http://localhost:8000/api/v1";

export const api = {
  // Items endpoints
  async getItems() {
    const res = await fetch(`${API_BASE_URL}/items`);
    if (!res.ok) throw new Error("Failed to fetch items");
    return res.json();
  },

  async createItem(item: {
    name: string;
    category: string;
    quantity: number;
    unit: string;
    expiration_date?: string;
    barcode?: string;
  }) {
    const res = await fetch(`${API_BASE_URL}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    if (!res.ok) throw new Error("Failed to create item");
    return res.json();
  },

  async updateItem(
    id: number,
    data: Partial<{
      name: string;
      category: string;
      quantity: number;
      unit: string;
      expiration_date?: string;
    }>,
  ) {
    const res = await fetch(`${API_BASE_URL}/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update item");
    return res.json();
  },

  async deleteItem(id: number) {
    const res = await fetch(`${API_BASE_URL}/items/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete item");
  },

  // Recipes endpoints
  async getRecipes() {
    const res = await fetch(`${API_BASE_URL}/recipes`);
    if (!res.ok) throw new Error("Failed to fetch recipes");
    return res.json();
  },

  async getAIRecipeSuggestions() {
    const res = await fetch(`${API_BASE_URL}/recipes/ai-suggestions`);
    if (!res.ok) throw new Error("Failed to fetch AI suggestions");
    return res.json();
  },

  // Users endpoints
  async getCurrentUser() {
    const res = await fetch(`${API_BASE_URL}/users/me`);
    if (!res.ok) throw new Error("Failed to fetch user");
    return res.json();
  },

  async createUser(userData: { email: string; password: string; family_size: number }) {
    const res = await fetch(`${API_BASE_URL}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });
    if (!res.ok) throw new Error("Failed to create user");
    return res.json();
  },
};
