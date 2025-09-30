// Sistema de almacenamiento local mejorado
class StorageManager {
    constructor() {
        this.prefix = 'restocontrol_';
        this.defaultData = {
            productos: [
                { id: 1, nombre: "Filete de Res", categoria: "carnes", precio: 25.50, stock: 45, stockMinimo: 10, proveedor: "Carnicería Premium", descripcion: "Filete de res premium para parrilla" },
                { id: 2, nombre: "Salmón Fresco", categoria: "pescados", precio: 32.75, stock: 22, stockMinimo: 5, proveedor: "Pescadería del Mar", descripcion: "Salmón fresco del Atlántico" },
                { id: 3, nombre: "Lechuga Romana", categoria: "verduras", precio: 3.20, stock: 80, stockMinimo: 20, proveedor: "Verduras Frescas S.A.", descripcion: "Lechuga romana orgánica" },
                { id: 4, nombre: "Queso Parmesano", categoria: "lacteos", precio: 18.90, stock: 15, stockMinimo: 8, proveedor: "Lácteos Italianos", descripcion: "Queso parmesano añejado 24 meses" },
                { id: 5, nombre: "Vino Tinto Reserva", categoria: "bebidas", precio: 42.00, stock: 3, stockMinimo: 5, proveedor: "Bodegas Selectas", descripcion: "Vino tinto reserva 2018" },
                { id: 6, nombre: "Pechuga de Pollo", categoria: "carnes", precio: 12.80, stock: 60, stockMinimo: 15, proveedor: "Avícola San José", descripcion: "Pechuga de pollo sin hueso" },
                { id: 7, nombre: "Atún en Lata", categoria: "pescados", precio: 8.50, stock: 0, stockMinimo: 10, proveedor: "Conservas Marinas", descripcion: "Atún en lata en aceite de oliva" },
                { id: 8, nombre: "Tomates", categoria: "verduras", precio: 4.30, stock: 5, stockMinimo: 15, proveedor: "Verduras Frescas S.A.", descripcion: "Tomates maduros orgánicos" }
            ],
            categorias: [
                { id: 1, nombre: "Carnes", descripcion: "Productos cárnicos y avícolas", estado: "activa" },
                { id: 2, nombre: "Pescados", descripcion: "Pescados y mariscos frescos", estado: "activa" },
                { id: 3, nombre: "Verduras", descripcion: "Verduras y hortalizas frescas", estado: "activa" },
                { id: 4, nombre: "Lácteos", descripcion: "Productos lácteos y derivados", estado: "activa" },
                { id: 5, nombre: "Bebidas", descripcion: "Bebidas alcohólicas y no alcohólicas", estado: "activa" }
            ],
            proveedores: [
                { id: 1, nombre: "Carnicería Premium", contacto: "Juan Pérez", telefono: "+34 600 123 456", email: "juan@carniceriapremium.com", direccion: "Calle Carnicería 123, Madrid" },
                { id: 2, nombre: "Pescadería del Mar", contacto: "María García", telefono: "+34 600 234 567", email: "maria@pescaderiadelmar.com", direccion: "Avenida del Puerto 45, Barcelona" },
                { id: 3, nombre: "Verduras Frescas S.A.", contacto: "Carlos López", telefono: "+34 600 345 678", email: "carlos@verdurasfrescas.com", direccion: "Polígono Industrial Norte, Valencia" },
                { id: 4, nombre: "Lácteos Italianos", contacto: "Ana Rossi", telefono: "+34 600 456 789", email: "ana@lacteositalianos.com", direccion: "Calle Italia 67, Sevilla" },
                { id: 5, nombre: "Bodegas Selectas", contacto: "Pedro Martínez", telefono: "+34 600 567 890", email: "pedro@bodegasselectas.com", direccion: "Carretera del Vino km. 12, La Rioja" }
            ],
            usuarios: [
                { id: 1, nombre: "Admin Manager", email: "admin@restocontrol.com", rol: "admin", estado: "activo", ultimoAcceso: new Date().toISOString() },
                { id: 2, nombre: "María González", email: "maria@restaurant.com", rol: "usuario", estado: "activo", ultimoAcceso: new Date().toISOString() }
            ],
            configuracion: {
                nombreRestaurante: "Mi Restaurante",
                moneda: "MXN",
                iva: 16,
                notificacionesStockBajo: true,
                emailNotificaciones: "admin@restaurant.com"
            }
        };
        this.initializeStorage();
    }

    initializeStorage() {
        // Inicializar datos por defecto si no existen
        Object.keys(this.defaultData).forEach(key => {
            if (!this.get(key)) {
                this.set(key, this.defaultData[key]);
            }
        });
        if (!this.getUsuarios() || this.getUsuarios().length === 0) {
            this.setUsuarios([{
                id: 1,
                nombre: "Admin Manager",
                usuario: "admin",
                password: "admin123",
                rol: "admin",
                email: "admin@restocontrol.com",
                activo: true
            }]);
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

    // Métodos específicos para entidades
    getProductos() {
        return this.get('productos') || [];
    }

    setProductos(productos) {
        return this.set('productos', productos);
    }

    getCategorias() {
        return this.get('categorias') || [];
    }

    setCategorias(categorias) {
        return this.set('categorias', categorias);
    }

    getProveedores() {
        return this.get('proveedores') || [];
    }

    setProveedores(proveedores) {
        return this.set('proveedores', proveedores);
    }

    getUsuarios() {
        return this.get('usuarios') || [];
    }

    setUsuarios(usuarios) {
        return this.set('usuarios', usuarios);
    }

    getConfiguracion() {
        return this.get('configuracion') || this.defaultData.configuracion;
    }

    setConfiguracion(configuracion) {
        return this.set('configuracion', configuracion);
    }

    // Métodos para operaciones CRUD
    agregarProducto(producto) {
        const productos = this.getProductos();
        const nuevoId = productos.length > 0 ? Math.max(...productos.map(p => p.id)) + 1 : 1;
        producto.id = nuevoId;
        producto.fechaCreacion = new Date().toISOString();
        productos.push(producto);
        return this.setProductos(productos) ? producto : null;
    }

    actualizarProducto(id, datosActualizados) {
        const productos = this.getProductos();
        const index = productos.findIndex(p => p.id === id);
        if (index !== -1) {
            productos[index] = { ...productos[index], ...datosActualizados, fechaActualizacion: new Date().toISOString() };
            return this.setProductos(productos);
        }
        return false;
    }

    eliminarProducto(id) {
        const productos = this.getProductos();
        const nuevosProductos = productos.filter(p => p.id !== id);
        return this.setProductos(nuevosProductos);
    }

    // Métodos de búsqueda y filtrado
    buscarProductos(termino) {
        const productos = this.getProductos();
        if (!termino) return productos;
        
        return productos.filter(producto => 
            producto.nombre.toLowerCase().includes(termino.toLowerCase()) ||
            producto.categoria.toLowerCase().includes(termino.toLowerCase()) ||
            (producto.descripcion && producto.descripcion.toLowerCase().includes(termino.toLowerCase()))
        );
    }

    // Métodos para estadísticas
    obtenerEstadisticas() {
        const productos = this.getProductos();
        const total = productos.length;
        const bajoStock = productos.filter(p => p.stock > 0 && p.stock <= p.stockMinimo).length;
        const agotados = productos.filter(p => p.stock === 0).length;
        const categorias = this.getCategorias().length;

        return {
            totalProductos: total,
            stockBajo: bajoStock,
            stockAgotado: agotados,
            totalCategorias: categorias
        };
    }
}

// Instancia global del storage manager
const storage = new StorageManager();