const API_BASE_URL = 
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:8000/api/v1"
    : `http://${window.location.hostname}:8000/api/v1`;

console.log('API URL:', API_BASE_URL);

// Helper para obtener headers con token
function getHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    console.log('Token encontrado:', token.substring(0, 20) + '...');
  } else {
    console.warn('No hay token en localStorage');
  }
  
  return headers;
}

async function handleResponse(response: Response) {
  if (!response.ok) {
    if (response.status === 401) {
      console.error('401 Unauthorized - Token inválido o expirado');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      throw new Error('Sesión expirada');
    }
    const error = await response.json().catch(() => ({ detail: 'Error desconocido' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  return response.json();
}

export const api = {
  async login(email: string, password: string) {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    return handleResponse(res);
  },
  
  async register(email: string, password: string, family_size: number) {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, family_size })
    });
    return handleResponse(res);
  },
  
  async getItems() {
    console.log('Llamando a getItems...');
    const headers = getHeaders();
    console.log('Headers:', headers);
    
    const res = await fetch(`${API_BASE_URL}/items/`, {
      method: 'GET',
      headers: headers
    });
    return handleResponse(res);
  },
  
  async createItem(item: any) {
    const res = await fetch(`${API_BASE_URL}/items/`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(item)
    });
    return handleResponse(res);
  },
  
  async updateItem(id: number, data: any) {
    const res = await fetch(`${API_BASE_URL}/items/${id}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  
  async deleteItem(id: number) {
    const res = await fetch(`${API_BASE_URL}/items/${id}`, {
      method: "DELETE",
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Error al eliminar item');
  },
  
  async getRecipes() {
    const res = await fetch(`${API_BASE_URL}/recipes/`, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse(res);
  }
};