// src/services/api.ts
const API_BASE_URL = "http://localhost:8000/api/v1";

export const api = {
  async getItems() {
    const res = await fetch(`${API_BASE_URL}/items`);
    return res.json();
  },

  async createItem(item: any) {
    const res = await fetch(`${API_BASE_URL}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    return res.json();
  },

  async updateItem(id: number, data: any) {
    const res = await fetch(`${API_BASE_URL}/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteItem(id: number) {
    await fetch(`${API_BASE_URL}/items/${id}`, {
      method: "DELETE",
    });
  },

  async getRecipes() {
    const res = await fetch(`${API_BASE_URL}/recipes`);
    return res.json();
  },
};
