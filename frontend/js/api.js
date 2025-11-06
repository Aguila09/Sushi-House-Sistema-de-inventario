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
        // Ensure headers object exists and merge default Content-Type for JSON requests.
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {})
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

            // Manejo de 401 (intento refresh token)
            if (response.status === 401) {
                const refreshToken = localStorage.getItem('refreshToken');
                const now = Date.now();

                if (now - this._lastUnauthorizedAt < 2000) return; // throttle
                if (refreshToken && !this._isRefreshing) {
                    this._isRefreshing = true;
                    try {
                        const refreshResp = await this._fetchWithTimeout(`${this.baseURL}/token/refresh/`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ refresh: refreshToken })
                        }, 12000);

                        if (refreshResp.ok) {
                            const data = await refreshResp.json().catch(() => null);
                            if (data && data.access) {
                                localStorage.setItem('authToken', data.access);
                                this.token = data.access;
                                window.dispatchEvent(new CustomEvent('tokenRefreshed', { detail: { token: data.access } }));
                                // Reintentar la petición original con nuevo token
                                config.headers['Authorization'] = `Bearer ${this.token}`;
                                const retry = await this._fetchWithTimeout(url, config, 12000);
                                if (retry.status === 401) {
                                    this._lastUnauthorizedAt = Date.now();
                                    this._isRefreshing = false;
                                    this.handleUnauthorized();
                                    return;
                                }
                                if (!retry.ok) {
                                    let txt = await retry.text().catch(()=>null);
                                    throw new Error(`HTTP error! status: ${retry.status}${txt ? ' - ' + txt : ''}`);
                                }
                                // Procesar respuesta retry
                                const contentTypeRetry = retry.headers.get('content-type') || '';
                                if (contentTypeRetry.includes('application/json')) {
                                    const json = await retry.json().catch(()=>null);
                                    return this._unwrapPaginated(json);
                                } else {
                                    return await retry.text();
                                }
                            }
                        }
                        // si refresh falla
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

                // si no hay refreshToken o ya se está refrescando
                this._lastUnauthorizedAt = Date.now();
                this.handleUnauthorized();
                return;
            }

            if (!response.ok) {
                // Intentar leer cuerpo de respuesta para mensajes de error más útiles
                let errorBody = '';
                try {
                    errorBody = await response.text();
                } catch (e) {
                    errorBody = '';
                }
                const message = `HTTP error! status: ${response.status}${errorBody ? ' - ' + errorBody : ''}`;
                throw new Error(message);
            }

            // Manejo de respuestas sin body (204) y parsing seguro de JSON
            const contentType = response.headers.get('content-type') || '';
            if (!contentType) {
                // No content-type header -> intentar text
                const txt = await response.text().catch(()=>null);
                return txt;
            }

            if (contentType.includes('application/json')) {
                const data = await response.json().catch(()=>null);
                return this._unwrapPaginated(data);
            }

            // Fallback: devolver texto
            return await response.text();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Si DRF devuelve {count, next, previous, results}, devolver results[] (compatibilidad)
    // Pero mantener metadatos en results._pagination para quien necesite paginación.
    _unwrapPaginated(data) {
        if (data && typeof data === 'object' && Object.prototype.hasOwnProperty.call(data, 'results')) {
            const results = Array.isArray(data.results) ? data.results : [];
            // anexar metadatos sin romper la interfaz de array
            Object.defineProperty(results, '_pagination', {
                value: {
                    count: data.count,
                    next: data.next,
                    previous: data.previous
                },
                enumerable: false,
                configurable: true,
                writable: true
            });
            return results;
        }
        return data;
    }

    handleUnauthorized() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('currentUser');
        try {
            const pathname = window.location.pathname || '';
            const isLoginPage = pathname.includes('login.html');
            if (!isLoginPage) {
                window.location.replace('login.html');
            }
        } catch (e) {
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