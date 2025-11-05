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