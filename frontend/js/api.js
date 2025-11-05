// Sistema de comunicación con la API del backend
class ApiClient {
    constructor() {
        this.baseURL = 'http://localhost:8000/api';
        this.token = localStorage.getItem('authToken');
        // Timestamp of last handled unauthorized to avoid redirect loops
        this._lastUnauthorizedAt = 0;
        this._isRefreshing = false;
    }

    // Helper: fetch con timeout (ms)
    _fetchWithTimeout(url, options = {}, timeout = 12000) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error('Request timeout'));
            }, timeout);

            fetch(url, options).then(res => {
                clearTimeout(timer);
                resolve(res);
            }).catch(err => {
                clearTimeout(timer);
                reject(err);
            });
        });
    }

    async request(endpoint, options = {}) {
        console.log(`API Request: ${options.method || 'GET'} ${endpoint}`);
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // Obtener el token más reciente
        this.token = localStorage.getItem('authToken');
        
        if (this.token) {
            config.headers['Authorization'] = `Bearer ${this.token}`;
            console.log('Token incluido en la solicitud');
        } else {
            console.log('No hay token disponible');
        }

        try {
            // Usar fetch con timeout para evitar pendientes infinitos
            const response = await this._fetchWithTimeout(url, config, 12000);
            
            if (response.status === 401) {
                // Token expirado o no autorizado
                // Intentar usar refresh token antes de redirigir
                const refreshToken = localStorage.getItem('refreshToken');
                const now = Date.now();

                // Throttle: si ya manejamos recientemente, evitamos reintentos frecuentes
                if (now - this._lastUnauthorizedAt < 2000) return;

                if (refreshToken && !this._isRefreshing) {
                    this._isRefreshing = true;
                    try {
                        const refreshResp = await this._fetchWithTimeout(`${this.baseURL}/token/refresh/`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ refresh: refreshToken })
                        }, 12000);

                        if (refreshResp.ok) {
                            console.log('Token refrescado exitosamente');
                            const data = await refreshResp.json();
                            if (data.access) {
                                localStorage.setItem('authToken', data.access);
                                this.token = data.access;
                                
                                // Actualizar el token en el estado global
                                window.dispatchEvent(new CustomEvent('tokenRefreshed', { 
                                    detail: { token: data.access }
                                }));
                                
                                console.log('Reintentando petición original con nuevo token');
                                // Reintentar la petición original con el nuevo token
                                config.headers['Authorization'] = `Bearer ${this.token}`;
                                const retry = await this._fetchWithTimeout(url, config, 12000);
                                if (retry.status === 401) {
                                    this._lastUnauthorizedAt = Date.now();
                                    this._isRefreshing = false;
                                    this.handleUnauthorized();
                                    return;
                                }
                                if (!retry.ok) throw new Error(`HTTP error! status: ${retry.status}`);
                                this._isRefreshing = false;
                                return await retry.json();
                            }
                        }
                        // Si refresh falla, limpiar y redirigir
                        this._lastUnauthorizedAt = Date.now();
                        this._isRefreshing = false;
                        this.handleUnauthorized();
                        return;
                    } catch (e) {
                        this._lastUnauthorizedAt = Date.now();
                        this._isRefreshing = false;
                        this.handleUnauthorized();
                        return;
                    }
                }

                // Si no hay refresh token o ya se está refrescando, manejar como no autorizado
                this._lastUnauthorizedAt = Date.now();
                this.handleUnauthorized();
                return;
            }

            if (!response.ok) {
                // Intentar leer cuerpo de respuesta para dar mensajes de error más útiles
                let errorBody = '';
                try {
                    errorBody = await response.text();
                } catch (e) {
                    errorBody = '';
                }
                const message = `HTTP error! status: ${response.status}${errorBody ? ' - ' + errorBody : ''}`;
                throw new Error(message);
            }

            // Intentar parsear JSON, pero si no es JSON devolver el texto
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                return await response.json();
            }
            return await response.text();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    handleUnauthorized() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('currentUser');
        try {
            const pathname = window.location.pathname || '';
            const isLoginPage = pathname.includes('login.html');
            if (!isLoginPage) {
                // Use replace so it doesn't create extra history entries when redirecting repeatedly
                window.location.replace('login.html');
            }
        } catch (e) {
            // en entornos no-browser, ignorar
            console.error('Redirect to login failed:', e);
        }
    }

    // Métodos CRUD genéricos con mejor manejo de errores
    async get(endpoint) {
        try {
            const result = await this.request(endpoint);
            return result;
        } catch (error) {
            console.error(`GET request failed for ${endpoint}:`, error);
            throw error;
        }
    }

    async post(endpoint, data) {
        try {
            const result = await this.request(endpoint, {
                method: 'POST',
                body: JSON.stringify(data)
            });
            return result;
        } catch (error) {
            console.error(`POST request failed for ${endpoint}:`, error);
            throw error;
        }
    }

    async put(endpoint, data) {
        try {
            const result = await this.request(endpoint, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            return result;
        } catch (error) {
            console.error(`PUT request failed for ${endpoint}:`, error);
            throw error;
        }
    }

    async patch(endpoint, data) {
        return this.request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    }

    async delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE'
        });
    }
}

const apiClient = new ApiClient();

// Exponer para que index.html u otros scripts lo detecten
window.ApiClient = ApiClient;
window.apiClient = apiClient;
console.log('api.js cargado — ApiClient y apiClient expuestos en window.');
