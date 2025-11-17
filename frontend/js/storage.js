// Sistema de almacenamiento local para configuraciones y caché
class StorageManager {
    constructor() {
        this.prefix = 'sushihouse_';
        this.defaultConfig = {
            nombreRestaurante: "Sushi House",
            moneda: "MXN",
            iva: 16,
            formatoFecha: "dd/mm/yyyy",
            stockMinimoGlobal: 10
        };
        this.initializeStorage();
    }

    initializeStorage() {
        // Solo inicializar configuración si no existe
        if (!this.get('configuracion')) {
            this.set('configuracion', this.defaultConfig);
        }
    }

    get(key) {
        try {
            const item = localStorage.getItem(this.prefix + key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error(`Error al obtener ${key} del storage:`, error);
            return null;
        }
    }

    set(key, value) {
        try {
            localStorage.setItem(this.prefix + key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Error al guardar ${key} en el storage:`, error);
            return false;
        }
    }

    remove(key) {
        try {
            localStorage.removeItem(this.prefix + key);
            return true;
        } catch (error) {
            console.error(`Error al eliminar ${key} del storage:`, error);
            return false;
        }
    }

    clear() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.prefix)) {
                    localStorage.removeItem(key);
                }
            });
            return true;
        } catch (error) {
            console.error('Error al limpiar el storage:', error);
            return false;
        }
    }

    // Solo métodos para configuración local
    getConfiguracion() {
        return this.get('configuracion') || this.defaultConfig;
    }

    setConfiguracion(configuracion) {
        return this.set('configuracion', configuracion);
    }

    // Helpers para productos/usuarios (compatibilidad con validation.js)
    //
    // Compatibilidad: helpers usados por validation.js y otras partes
    //
    getProductos() {
        // intenta leer la lista guardada en localStorage bajo la clave 'productos'
        const prods = this.get ? this.get('productos') : null;
        // si no existe el get (por alguna variante), intenta localStorage directo
        if (prods === null || prods === undefined) {
            try {
                const raw = localStorage.getItem('productos');
                return raw ? JSON.parse(raw) : [];
            } catch (e) {
                return [];
            }
        }
        return Array.isArray(prods) ? prods : [];
    }

    setProductos(productos = []) {
        if (!Array.isArray(productos)) productos = [];
        if (this.set) {
            this.set('productos', productos);
            return;
        }
        try {
            localStorage.setItem('productos', JSON.stringify(productos));
        } catch (e) {}
    }

    getUsuarios() {
        const usuarios = this.get ? this.get('usuarios') : null;
        if (usuarios === null || usuarios === undefined) {
            try {
                const raw = localStorage.getItem('usuarios');
                return raw ? JSON.parse(raw) : [];
            } catch (e) {
                return [];
            }
        }
        return Array.isArray(usuarios) ? usuarios : [];
    }

    setUsuarios(usuarios = []) {
        if (!Array.isArray(usuarios)) usuarios = [];
        if (this.set) {
            this.set('usuarios', usuarios);
            return;
        }
        try {
            localStorage.setItem('usuarios', JSON.stringify(usuarios));
        } catch (e) {}
    }


    // Métodos para cache de datos (opcional)
    setCache(key, data, ttl = 300000) { // 5 minutos por defecto
        const cacheData = {
            data: data,
            expiry: Date.now() + ttl
        };
        return this.set(`cache_${key}`, cacheData);
    }

    getCache(key) {
        const cacheData = this.get(`cache_${key}`);
        if (cacheData && cacheData.expiry > Date.now()) {
            return cacheData.data;
        }
        return null;
    }
}

// Instancia global del storage manager
const storage = new StorageManager();