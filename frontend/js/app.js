// app.js - ApiClient (versión segura, evita redeclaraciones y mejora manejo de 401)
(function(){

  // si ya existe, no redeclaramos
  if (window.ApiClient) {
    console.info('ApiClient ya está definido en window — se mantiene la instancia existente.');
    if (!window.apiClient) {
      try { window.apiClient = new window.ApiClient(); } catch(e){ console.warn('No fue posible crear una instancia nueva de ApiClient existente:', e); }
    }
    return;
  }

  class ApiClient {
    constructor(opts = {}) {
      this.baseURL = opts.baseURL || 'http://localhost:8000/api';
      this.token = localStorage.getItem('authToken') || null;
      this._lastUnauthorizedAt = 0;
      this._isRefreshing = false;
      this._defaultTimeout = opts.timeout || 12000;
    }

    _getCookie(name) {
      if (typeof document === 'undefined') return null;
      const m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
      return m ? m.pop() : null;
    }

    _fetchWithTimeout(url, options = {}, timeout = this._defaultTimeout) {
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

    _unwrapPaginated(json) {
      if (!json) return json;
      if (Array.isArray(json)) return json;
      if (Object.prototype.hasOwnProperty.call(json, 'results')) return json.results;
      return json;
    }

    handleUnauthorized() {
      console.warn('ApiClient.handleUnauthorized: limpiando tokens locales.');
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      // No forzamos redirección aquí; la UI debería detectar y mostrar login.
    }

    async _attemptRefresh(refreshToken) {
      if (!refreshToken) return false;
      if (this._isRefreshing) {
        // si ya está refrescando, esperar un pequeño lapso y leer token nuevo
        await new Promise(r => setTimeout(r, 500));
        this.token = localStorage.getItem('authToken');
        return !!this.token;
      }
      this._isRefreshing = true;
      try {
        const resp = await this._fetchWithTimeout(`${this.baseURL}/token/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh: refreshToken })
        }, this._defaultTimeout);

        if (!resp.ok) {
          console.warn('Refresh token request no OK:', resp.status);
          this._isRefreshing = false;
          return false;
        }
        const data = await resp.json().catch(()=>null);
        if (data && data.access) {
          localStorage.setItem('authToken', data.access);
          this.token = data.access;
          window.dispatchEvent(new Event('tokenRefreshed'));
          this._isRefreshing = false;
          return true;
        }
        this._isRefreshing = false;
        return false;
      } catch (e) {
        console.error('Error intentando refresh token:', e);
        this._isRefreshing = false;
        return false;
      }
    }

    async request(endpoint, options = {}) {
      const method = (options.method || 'GET').toUpperCase();
      console.log(`API Request: ${method} ${endpoint}`);

      const url = `${this.baseURL}${endpoint}`;

      const headers = Object.assign({
        'Content-Type': 'application/json'
      }, options.headers || {});

      // refrescar token localmente
      this.token = localStorage.getItem('authToken') || this.token;

      if (this.token && !headers['Authorization']) {
        headers['Authorization'] = `Bearer ${this.token}`;
        console.log('Token incluido en la solicitud');
      }

      // si no hay Authorization, intentar CSRF cookie (para django forms)
      try {
        const csrftok = this._getCookie('csrftoken');
        if (csrftok && !headers['X-CSRFToken'] && !headers['Authorization']) {
          headers['X-CSRFToken'] = csrftok;
        }
      } catch(e){ /* ignore */ }

      const config = Object.assign({}, options, { headers });

      try {
        const response = await this._fetchWithTimeout(url, config, this._defaultTimeout);

        // Manejo 401: intentar refresh token y reintentar una vez
        if (response.status === 401) {
          console.warn('Respuesta 401 recibida para', endpoint);
          const now = Date.now();
          if (now - this._lastUnauthorizedAt < 2000) {
            // throttling: evitar loops
            throw new Error('Unauthorized (throttled)');
          }

          const refreshToken = localStorage.getItem('refreshToken');
          const refreshed = await this._attemptRefresh(refreshToken);
          if (refreshed) {
            // reintentar la request original con nuevo token
            const newToken = localStorage.getItem('authToken');
            if (newToken) {
              config.headers = Object.assign({}, config.headers, { Authorization: `Bearer ${newToken}` });
            }
            const retry = await this._fetchWithTimeout(url, config, this._defaultTimeout);
            if (!retry.ok) {
              const text = await retry.text().catch(()=>null);
              throw new Error(text || `HTTP error ${retry.status}`);
            }
            const ct = (retry.headers && retry.headers.get) ? (retry.headers.get('content-type') || '') : '';
            if (ct.includes('application/json')) {
              const json = await retry.json().catch(()=>null);
              return this._unwrapPaginated(json);
            } else {
              return await retry.text();
            }
          } else {
            this._lastUnauthorizedAt = Date.now();
            this.handleUnauthorized();
            // Rechazamos la promesa para que el front lo maneje
            throw new Error('Unauthorized - token invalid or refresh failed');
          }
        }

        if (!response.ok) {
          const bodyText = await response.text().catch(()=>null);
          console.error(`API request failed: ${method} ${url} -> ${response.status}`, bodyText);
          throw new Error(bodyText || `HTTP error! status: ${response.status}`);
        }

        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const json = await response.json().catch(()=>null);
          return this._unwrapPaginated(json);
        } else {
          return await response.text();
        }
      } catch (err) {
        console.error(`Request to ${url} failed:`, err);
        // Siempre rechazar para que el caller pueda .catch() y actuar (mostrar login, mensaje, etc.)
        throw err;
      }
    }

    async get(endpoint) {
      return this.request(endpoint, { method: 'GET' });
    }
    async post(endpoint, data) {
      return this.request(endpoint, { method: 'POST', body: JSON.stringify(data) });
    }
    async put(endpoint, data) {
      return this.request(endpoint, { method: 'PUT', body: JSON.stringify(data) });
    }
    async delete(endpoint) {
      return this.request(endpoint, { method: 'DELETE' });
    }
  }

  // Exponer en window sin redeclarar
  window.ApiClient = ApiClient;
  if (!window.apiClient) {
    try {
      window.apiClient = new ApiClient();
    } catch(e){
      console.error('No fue posible instanciar apiClient automáticamente:', e);
    }
  }

  console.log('api.js cargado — ApiClient y apiClient expuestos en window.');

})();
