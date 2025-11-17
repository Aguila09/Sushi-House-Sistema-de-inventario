// frontend/js/script.js
// Sistema principal de la aplicación (versión corregida y robusta)

///////////////////////////////////////////////////////////////////////////
// Fallback storage si no existe (compatibilidad con validation.js)
///////////////////////////////////////////////////////////////////////////
if (typeof window.storage === 'undefined' || typeof window.storage.getProductos !== 'function') {
    window.storage = {
        getProductos: async function() {
            try {
                if (typeof apiClient !== 'undefined' && apiClient.get) {
                    const res = await apiClient.get('/productos/');
                    if (Array.isArray(res)) return res;
                    if (res && res.results) return res.results;
                    return Array.isArray(res) ? res : [];
                }
            } catch (e) {
                console.warn('storage.getProductos fallback failed:', e);
            }
            return [];
        }
    };
}

///////////////////////////////////////////////////////////////////////////
// Clase principal
///////////////////////////////////////////////////////////////////////////
class SushiHouseApp {
    static getInstance() {
        if (!window.app) {
            window.app = new SushiHouseApp();
        }
        return window.app;
    }

    constructor() {
        // Estado
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentSort = { field: 'nombre', direction: 'asc' };
        this.currentProductId = null;
        this.isEditing = false;
        this.api = (typeof apiClient !== 'undefined') ? apiClient : { get: async ()=>[], post: async ()=>true, put: async ()=>true, delete: async ()=>true };
        this.productos = [];
        this.categorias = [];
        this.proveedores = [];

        // evitar doble-binding
        this._eventsBound = false;

        // bind de handlers importantes para asegurar contexto
        this._handleTableClick = this._handleTableClick.bind(this);
        this._handleSearchInput = this._handleSearchInput.bind(this);
        // handlers de modal para UX
        this._onProductModalKeydown = null;
        this._onProductModalOverlayClick = null;
        this._onConfirmKeydown = null;

        // inicialización
        this.init();

        // Escuchar eventos de refresh de token (si existen)
        window.addEventListener('tokenRefreshed', () => {
            this.loadInitialData();
        });
    }

    init() {
        this.bindEvents();
        this.loadInitialData();
        this.setupRealTimeSearch();
    }

    bindEvents() {
        // Evitar registrar listeners más de una vez
        if (this._eventsBound) return;
        this._eventsBound = true;

        // elementos esperados (varias variantes de id soportadas)
        const elements = {
            btnNuevoProducto: document.getElementById('btnNuevoProducto'),
            btnCancelar: document.getElementById('btnCancelar'),
            btnCloseModal: document.getElementById('btnCloseModal'),
            productForm: document.getElementById('productForm'),
            btnConfirmCancel: document.getElementById('btnConfirmCancel'),
            pagination: document.getElementById('pagination')
        };

        // botones principales
        elements.btnNuevoProducto?.addEventListener('click', () => this.showProductForm());
        elements.btnCancelar?.addEventListener('click', () => this.hideProductForm());
        elements.btnCloseModal?.addEventListener('click', () => this.hideProductForm());
        elements.productForm?.addEventListener('submit', (e) => this.handleFormSubmit(e));
        elements.btnConfirmCancel?.addEventListener('click', () => this.hideConfirmModal());

        // Nota: manejamos cierre de modal por overlay a nivel de cada modal, no global

        // Sort headers (si existen)
        document.querySelectorAll('th[data-sort]').forEach(th => {
            th.addEventListener('click', () => this.handleSort(th.dataset.sort));
        });

        // Delegación para tabla de productos: ligar sólo si existe la tabla de productos explícita
        const tablaProductosTbody = document.getElementById('tablaProductos') 
                                  || document.getElementById('tablaProductosBody')
                                  || (document.getElementById('tablaProductosTable') && document.getElementById('tablaProductosTable').querySelector('tbody'))
                                  || (document.querySelector('table#tablaProductos tbody') ? document.querySelector('table#tablaProductos tbody') : null);

        if (tablaProductosTbody) {
            // Usamos un handler único delegado sólo sobre la tabla concreta de productos
            tablaProductosTbody.removeEventListener('click', this._handleTableClick);
            tablaProductosTbody.addEventListener('click', this._handleTableClick);
        } else {
            // No ligar sobre '.table-container' global — previene colisiones con otras páginas (proveedores, categorias, etc.)
            console.debug('tabla de productos no encontrada en DOM: no se liga delegado de productos.');
        }

        // Buscador: varios ids posibles
        const buscador = document.getElementById('buscadorProductos') || document.getElementById('searchInputProductos') || document.getElementById('searchInput');
        if (buscador) {
            buscador.removeEventListener('input', this._handleSearchInput);
            buscador.addEventListener('input', this._handleSearchInput);
        }

        // Paginación (delegación)
        const pagination = elements.pagination;
        if (pagination) {
            pagination.addEventListener('click', (ev) => {
                const btn = ev.target.closest('button.page-btn');
                if (!btn) return;
                const page = parseInt(btn.dataset.page);
                if (!isNaN(page)) this.changePage(page);
            });
        }
    }

    // Delegated click handler for products table container only
    _handleTableClick(ev) {
        const btn = ev.target.closest('button, [data-action]');
        if (!btn) return;

        // determine id: prefer data-id on button, then row data-id
        let id = btn.dataset?.id;
        if (!id) {
            const row = btn.closest('tr');
            if (row) id = row.dataset?.id;
        }

        // action detection: data-action attribute or classes
        const action = btn.dataset?.action || (btn.classList.contains('btn-editar') ? 'edit' : (btn.classList.contains('btn-eliminar') ? 'delete' : null));
        if (!action || !id) return;

        if (action === 'edit' || action === 'editar') {
            this.editarProducto(id);
        } else if (action === 'delete' || action === 'eliminar') {
            this.confirmarEliminacion(id);
        } else if (action === 'ver') {
            // placeholder: si alguna página usa data-action="ver" (no es producto)
            console.debug('Acción ver en tabla de productos (sin implementar). id:', id);
        }
    }

    async loadInitialData() {
        // Mostrar loading global si existe
        const loadingEl = document.getElementById('loadingScreen');
        if (loadingEl) loadingEl.style.display = 'flex';
        console.log('Cargando datos iniciales...');

        try {
            // Exponer app por si otros scripts lo consultan
            window.app = this;

            // Intentamos cargar lo mínimo en paralelo
            await Promise.allSettled([
                this.renderDashboard(),
                this.renderProductTable(),
                this.populateSelects()
            ]);

            // Verificar listeners (por si algo inicializó después)
            this.verifyEventListeners();
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showNotification('Error al cargar los datos: ' + (error.message || error), 'error');
        } finally {
            if (loadingEl) {
                loadingEl.classList.add('fade-out');
                setTimeout(() => {
                    loadingEl.style.display = 'none';
                    loadingEl.classList.remove('fade-out');
                }, 400);
            }
        }
    }

    verifyEventListeners() {
        if (this._eventsBound) return;
        this.bindEvents();
    }

    showTableLoading() {
        const tableLoading = document.getElementById('tableLoading') || document.getElementById('tableLoadingProveedores');
        if (tableLoading) tableLoading.style.display = 'flex';
    }

    hideTableLoading() {
        const tableLoading = document.getElementById('tableLoading') || document.getElementById('tableLoadingProveedores');
        if (tableLoading) tableLoading.style.display = 'none';
    }

    async renderDashboard() {
        if (this._dashboardUpdateInProgress) return;
        this._dashboardUpdateInProgress = true;

        try {
            let stats = null;
            try {
                stats = await this.api.get('/dashboard/estadisticas/');
            } catch (err) { stats = null; }

            const elTotal = document.getElementById('totalProductos') || document.getElementById('totalProductosCount') || document.getElementById('totalProductosValue');
            const elStockBajo = document.getElementById('productosStockBajo') || document.getElementById('stockBajo') || document.getElementById('stockBajoCount');
            const elCategorias = document.getElementById('categoriasActivas') || document.getElementById('totalCategorias');
            const elVencidos = document.getElementById('productosVencidos') || document.getElementById('productosVencidosCount');
            const elValorInventario = document.getElementById('valorTotalInventario') || document.getElementById('valorInventario');

            if (stats) {
                if (elTotal) elTotal.textContent = String(stats.total_productos ?? stats.total ?? 0);
                if (elStockBajo) elStockBajo.textContent = String(stats.stock_bajo ?? 0);
                if (elCategorias) elCategorias.textContent = String(stats.categorias_activas ?? stats.total_categorias ?? 0);
                if (elVencidos) elVencidos.textContent = String(stats.productos_vencidos ?? 0);
                if (elValorInventario) elValorInventario.textContent = (typeof stats.valor_inventario !== 'undefined') ? `$${Number(stats.valor_inventario).toFixed(2)}` : (stats.valor_total ? `$${Number(stats.valor_total).toFixed(2)}` : '$0.00');
            } else {
                const productosResp = await this.api.get('/productos/').catch(()=>[]);
                const prods = Array.isArray(productosResp) ? productosResp : (productosResp && productosResp.results ? productosResp.results : []);
                if (elTotal) elTotal.textContent = String(prods.length);
                if (elStockBajo) {
                    const sb = prods.filter(p => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= (p.stock_minimo ?? 0)).length;
                    const agotados = prods.filter(p => (p.stock ?? 0) === 0).length;
                    elStockBajo.textContent = String(sb + agotados);
                }
                if (elCategorias) {
                    const s = new Set(prods.map(p => (p.categoria_nombre || p.categoria || '').toString()).filter(Boolean));
                    elCategorias.textContent = String(s.size);
                }
                if (elVencidos) elVencidos.textContent = '0';
                if (elValorInventario) {
                    const valor = prods.reduce((acc, p) => acc + ((parseFloat(p.precio) || 0) * (p.stock || 0)), 0);
                    elValorInventario.textContent = `$${valor.toFixed(2)}`;
                }
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            this._dashboardUpdateInProgress = false;
        }
    }

    async renderProductTable(productos = null) {
        this.showTableLoading();
        console.log('Iniciando renderProductTable');

        try {
            let productosToRender;
            if (productos) {
                productosToRender = productos;
            } else {
                const response = await this.api.get('/productos/');
                productosToRender = Array.isArray(response) ? response : (response && response.results ? response.results : []);
            }

            console.log('Productos obtenidos:', productosToRender);

            // buscar el tbody de la tabla por varias opciones (compatibilidad)
            let tablaBody = document.getElementById('tablaProductos')
                         || document.getElementById('tablaProductosBody')
                         || (document.getElementById('tablaProductosTable') && document.getElementById('tablaProductosTable').querySelector('tbody'))
                         || document.querySelector('table#tablaProductos tbody')
                         || document.querySelector('table#tablaProductosTable tbody')
                         || null;
            const tableEmpty = document.getElementById('tableEmpty') || document.getElementById('tableEmptyProductos');

            if (!tablaBody) {
                // Si la página actual no tiene la tabla de productos, no rompemos la ejecución
                console.warn('renderProductTable: No se encontró el elemento tablaProductos / tablaProductosBody en esta página (abortando render).');
                this.hideTableLoading();
                return;
            }

            const allProducts = Array.isArray(productosToRender) ? productosToRender : (productosToRender && productosToRender.results ? productosToRender.results : []);
            const totalItems = allProducts.length;
            const startIndex = (this.currentPage - 1) * this.itemsPerPage;
            const endIndex = startIndex + this.itemsPerPage;
            const paginatedProducts = (allProducts || []).slice(startIndex, endIndex);

            // limpiar tbody (soportando que tablaBody pueda ser <tbody> o <table>)
            if (tablaBody.tagName && tablaBody.tagName.toLowerCase() === 'table') {
                const tb = tablaBody.querySelector('tbody');
                if (tb) tb.innerHTML = '';
                tablaBody = tb || tablaBody;
            } else {
                tablaBody.innerHTML = '';
            }

            if (!paginatedProducts || paginatedProducts.length === 0) {
                if (tableEmpty) tableEmpty.style.display = 'block';
                this.renderPagination(totalItems);
                this.hideTableLoading();
                return;
            }

            if (tableEmpty) tableEmpty.style.display = 'none';

            // Construir filas
            for (const producto of paginatedProducts) {
                const estado = this.getStockStatus(producto.stock, producto.stock_minimo);
                const categoriaNombre = producto.categoria_nombre || producto.categoria || (producto.categoria_id || '');
                const proveedorNombre = producto.proveedor_nombre || producto.proveedor || '';

                const fila = document.createElement('tr');
                fila.setAttribute('data-id', producto.id);
                if (typeof producto.stock !== 'undefined') fila.setAttribute('data-stock', String(producto.stock));
                if (typeof producto.stock_minimo !== 'undefined') fila.setAttribute('data-stock-min', String(producto.stock_minimo));
                if (producto.fecha_vencimiento) fila.setAttribute('data-fecha-vencimiento', producto.fecha_vencimiento);
                if (proveedorNombre) fila.setAttribute('data-proveedor', String(producto.proveedor));

                fila.innerHTML = `
                    <td class="td-nombre">${this.escapeHtml(String(producto.nombre || ''))}</td>
                    <td class="td-categoria">${this.escapeHtml(String(categoriaNombre || ''))}</td>
                    <td class="td-precio">${(producto.precio != null) ? parseFloat(producto.precio).toFixed(2) : '0.00'}</td>
                    <td class="td-stock" data-stock="${producto.stock ?? 0}" data-stock-min="${producto.stock_minimo ?? 0}">${producto.stock ?? 0}</td>
                    <td class="td-estado"><span class="status ${estado.clase}">${estado.texto}</span></td>
                    <td class="td-acciones">
                        <button class="btn btn-sm btn-primary btn-editar" data-action="edit" data-id="${producto.id}">Editar</button>
                        <button class="btn btn-sm btn-danger btn-eliminar" data-action="delete" data-id="${producto.id}">Eliminar</button>
                    </td>
                `;

                tablaBody.appendChild(fila);
            }

            this.renderPagination(totalItems);
        } catch (error) {
            console.error('Error loading products:', error);
        } finally {
            this.hideTableLoading();
            // actualizar dashboard sin bloquear la UI
            try { this.renderDashboard(); } catch(e){ console.warn(e); }
        }
    }

    getStockStatus(stock, stockMinimo) {
        stock = stock ?? 0;
        stockMinimo = stockMinimo ?? 0;
        if (stock === 0) return { texto: 'Agotado', clase: 'out-of-stock' };
        else if (stock <= stockMinimo) return { texto: 'Stock Bajo', clase: 'low-stock' };
        else return { texto: 'En Stock', clase: 'in-stock' };
    }

    async getCategoryName(categoryId) {
        if (!categoryId) return 'Sin categoría';
        try {
            const categoria = await this.api.get(`/categorias/${categoryId}/`);
            if (categoria && categoria.nombre) return categoria.nombre;
            return String(categoryId);
        } catch (error) {
            return String(categoryId);
        }
    }

    renderPagination(totalItems) {
        const pagination = document.getElementById('pagination');
        if (!pagination) return;

        const totalPages = Math.max(1, Math.ceil(totalItems / this.itemsPerPage));
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHTML = '';
        paginationHTML += `<button class="page-btn ${this.currentPage === 1 ? 'disabled' : ''}" ${this.currentPage === 1 ? 'disabled' : ''} data-page="${this.currentPage - 1}">« Anterior</button>`;

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                paginationHTML += `<button class="page-btn ${i === this.currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                paginationHTML += '<span class="page-dots">...</span>';
            }
        }

        paginationHTML += `<button class="page-btn ${this.currentPage === totalPages ? 'disabled' : ''}" ${this.currentPage === totalPages ? 'disabled' : ''} data-page="${this.currentPage + 1}">Siguiente »</button>`;

        pagination.innerHTML = paginationHTML;
    }

    _paginationClickHandler(ev) {
        const page = parseInt(ev.currentTarget.dataset.page);
        if (!isNaN(page)) this.changePage(page);
    }

    changePage(page) {
        if (page < 1) return;
        this.currentPage = page;
        this.renderProductTable();
        document.querySelector('.table-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    handleSort(field) {
        if (this.currentSort.field === field) this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        else { this.currentSort.field = field; this.currentSort.direction = 'asc'; }

        this.renderProductTable();

        document.querySelectorAll('th[data-sort]').forEach(th => {
            th.textContent = th.textContent.replace(' ↗', '').replace(' ↘', '');
            if (th.dataset.sort === field) th.textContent += this.currentSort.direction === 'asc' ? ' ↗' : ' ↘';
        });
    }

    setupRealTimeSearch() {
        // soporte para varios ids de input usados en distintos HTMLs
        const searchInput = document.getElementById('buscadorProductos') || document.getElementById('searchInputProductos') || document.getElementById('searchInput');
        if (searchInput) {
            searchInput.removeEventListener('input', this._handleSearchInput);
            searchInput.addEventListener('input', this._handleSearchInput);
        }
    }

    // Debounced handler
    _searchDebounceTimer = null;
    _handleSearchInput(e) {
        const currentValue = e.target.value;
        if (this._searchDebounceTimer) clearTimeout(this._searchDebounceTimer);
        this._searchDebounceTimer = setTimeout(() => {
            this.handleSearch(currentValue);
        }, 300);
    }

    async handleSearch(termino) {
        this.currentPage = 1;
        try {
            if (!termino || termino.trim() === '') {
                const productos = await this.api.get('/productos/');
                this.renderProductTable(productos);
                return;
            }
            const productos = await this.api.get(`/productos/?search=${encodeURIComponent(termino)}`);
            this.renderProductTable(productos);
        } catch (error) {
            console.error('Error searching products:', error);
        }
    }

    async populateSelects() {
        await this.populateCategorias();
        await this.populateProveedores();
    }

    async populateCategorias() {
        try {
            const categorias = await this.api.get('/categorias/');
            const select = document.getElementById('categoria');
            if (!select) return;
            select.innerHTML = '<option value="">Seleccione una categoría</option>';
            (categorias || []).forEach(categoria => {
                const option = document.createElement('option');
                option.value = categoria.id;
                option.textContent = categoria.nombre;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    async populateProveedores() {
        try {
            const proveedores = await this.api.get('/proveedores/');
            const select = document.getElementById('proveedor');
            if (!select) return;
            select.innerHTML = '<option value="">Seleccione un proveedor</option>';
            (proveedores || []).forEach(proveedor => {
                const option = document.createElement('option');
                option.value = proveedor.id;
                option.textContent = proveedor.nombre;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading providers:', error);
        }
    }

    showProductForm(producto = null) {
        this.isEditing = !!producto;
        this.currentProductId = producto ? producto.id : null;

        const modal = document.getElementById('modalProducto');
        const title = document.getElementById('modalTitle');
        const form = document.getElementById('productForm');

        if (producto) {
            title && (title.textContent = 'Editar Producto');
            this.populateForm(producto);
        } else {
            title && (title.textContent = 'Nuevo Producto');
            form && form.reset();
            const counter = document.getElementById('descripcionCounter');
            if (counter) counter.textContent = '0';
        }

        // limpiar errores antes de abrir
        if (form && typeof validator !== 'undefined' && validator.clearFieldErrors) {
            try { validator.clearFieldErrors(form); } catch(e){ console.warn(e); }
        }

        if (modal) {
            // Abrir modal centrado, bloquear scroll, y habilitar cierre con ESC/overlay
            modal.classList.add('show');
            modal.setAttribute('aria-hidden', 'false');
            document.body.classList.add('modal-open');

            this._onProductModalOverlayClick = (ev) => {
                if (ev.target === modal) this.hideProductForm();
            };
            modal.addEventListener('click', this._onProductModalOverlayClick);

            this._onProductModalKeydown = (ev) => {
                if (ev.key === 'Escape') this.hideProductForm();
            };
            document.addEventListener('keydown', this._onProductModalKeydown);
        }

        if (form && typeof validator !== 'undefined' && validator.setupRealTimeValidation) {
            try { validator.setupRealTimeValidation(form); } catch(e){ console.warn(e); }
        }
    }

    hideProductForm() {
        const modal = document.getElementById('modalProducto');
        if (modal) {
            modal.classList.remove('show');
            modal.setAttribute('aria-hidden', 'true');
            if (this._onProductModalOverlayClick) {
                modal.removeEventListener('click', this._onProductModalOverlayClick);
                this._onProductModalOverlayClick = null;
            }
            if (this._onProductModalKeydown) {
                document.removeEventListener('keydown', this._onProductModalKeydown);
                this._onProductModalKeydown = null;
            }
        }
        document.body.classList.remove('modal-open');
        // limpiar bandera de edición
        this.isEditing = false;
        this.currentProductId = null;
    }

    populateForm(producto) {
        document.getElementById('nombre') && (document.getElementById('nombre').value = producto.nombre || '');
        document.getElementById('categoria') && (document.getElementById('categoria').value = producto.categoria || producto.categoria_id || '');
        document.getElementById('precio') && (document.getElementById('precio').value = producto.precio || '');
        document.getElementById('stock') && (document.getElementById('stock').value = producto.stock ?? '');
        document.getElementById('stockMinimo') && (document.getElementById('stockMinimo').value = producto.stock_minimo ?? producto.stockMin ?? '');
        document.getElementById('proveedor') && (document.getElementById('proveedor').value = producto.proveedor || producto.proveedor_id || '');
        document.getElementById('descripcion') && (document.getElementById('descripcion').value = producto.descripcion || '');
        const descCounter = document.getElementById('descripcionCounter');
        if (descCounter) descCounter.textContent = (producto.descripcion || '').length;
        if (producto.fecha_vencimiento && document.getElementById('fechaVencimiento')) {
            document.getElementById('fechaVencimiento').value = producto.fecha_vencimiento;
        }
    }

    async handleFormSubmit(e) {
        e.preventDefault();

        const form = e.target;
        const formData = new FormData(form);
        const productoData = Object.fromEntries(formData.entries());

        // --- Normalizar y convertir campos numéricos ---
        productoData.precio = (productoData.precio !== undefined && productoData.precio !== null && productoData.precio !== '') ? parseFloat(productoData.precio) : 0;
        if (Number.isNaN(productoData.precio)) productoData.precio = 0;

        let stockRaw = productoData.stock ?? productoData.stock_actual ?? productoData['stockActual'] ?? '';
        let stockParsed = parseInt(stockRaw);
        if (Number.isNaN(stockParsed)) stockParsed = 0;
        productoData.stock = stockParsed;
        productoData.stock_actual = stockParsed;

        let stockMinRaw = productoData.stockMinimo ?? productoData.stock_minimo ?? productoData.stockMin ?? productoData['stock_min'];
        let stockMinParsed = parseInt(stockMinRaw);
        if (Number.isNaN(stockMinParsed)) stockMinParsed = 0;
        productoData.stock_minimo = stockMinParsed;
        productoData.stockMinimo = stockMinParsed;

        productoData.categoria = productoData.categoria || null;
        productoData.proveedor = productoData.proveedor || null;

        if (this.isEditing) productoData.id = this.currentProductId;

        console.debug('Producto antes de validar (productoData):', productoData);

        // VALIDACIÓN (flexible con validateProducto síncrono/async)
        let validation = null;
        try {
            if (typeof validator !== 'undefined' && typeof validator.validateProducto === 'function') {
                validation = validator.validateProducto(productoData);
                if (validation && typeof validation.then === 'function') validation = await validation;
            } else {
                validation = { isValid: true, errors: {} };
            }
        } catch (err) {
            console.warn('validator.validateProducto lanzó excepción:', err);
            validation = { isValid: true, errors: {} };
        }

        console.debug('Resultado validator.validateProducto:', validation);

        // Normalizar resultado de validación
        let isValid = true;
        let errors = {};

        if (validation === true) { isValid = true; }
        else if (validation === false) { isValid = false; errors = { _general: 'Error de validación' }; }
        else if (Array.isArray(validation)) {
            isValid = validation.length === 0;
            if (!isValid) {
                errors = {};
                validation.forEach(it => {
                    const key = it.field || it.name || '_general';
                    errors[key] = it.message || it.msg || String(it);
                });
            }
        } else if (validation && typeof validation === 'object') {
            if (typeof validation.isValid !== 'undefined') isValid = !!validation.isValid;
            else if (typeof validation.valid !== 'undefined') isValid = !!validation.valid;
            else {
                isValid = true;
                if (validation.errors) {
                    if (Array.isArray(validation.errors)) {
                        isValid = validation.errors.length === 0;
                        validation.errors.forEach(it => {
                            const key = it.field || it.name || '_general';
                            errors[key] = it.message || it.msg || String(it);
                        });
                    } else if (typeof validation.errors === 'object') {
                        errors = validation.errors;
                        isValid = Object.keys(errors).length === 0;
                    } else if (typeof validation.errors === 'string') {
                        errors = { _general: validation.errors };
                        isValid = false;
                    }
                } else if (validation.message) {
                    errors = { _general: validation.message };
                    isValid = false;
                }
            }
        }

        if (!isValid) {
            // intentar mostrar errores en campos (usa validator.showFieldErrors si existe)
            try {
                if (typeof validator !== 'undefined' && typeof validator.showFieldErrors === 'function') {
                    await validator.showFieldErrors(form, errors || {});
                } else {
                    Object.keys(errors || {}).forEach(field => {
                        if (field === '_general') return;
                        const input = form.querySelector(`[name="${field}"]`);
                        if (input) {
                            input.classList.add('field-error');
                            input.setAttribute('title', errors[field]);
                            let note = input.parentElement?.querySelector('.field-error-msg');
                            if (!note) {
                                note = document.createElement('div');
                                note.className = 'field-error-msg';
                                note.style.color = '#b91c1c';
                                note.style.fontSize = '12px';
                                note.style.marginTop = '4px';
                                input.parentElement && input.parentElement.appendChild(note);
                            }
                            note.textContent = errors[field];
                        }
                    });
                }
            } catch (err) {
                console.warn('Error mostrando errores de campo:', err);
            }

            this.showNotification('❌ Por favor corrige los errores en el formulario', 'error');
            console.warn('Validación fallida - errores normalizados:', errors);
            return;
        }

        // Guardar
        this.setFormLoading(true);

        try {
            let resultado;
            if (this.isEditing) {
                resultado = await this.api.put(`/productos/${this.currentProductId}/`, productoData);
            } else {
                resultado = await this.api.post('/productos/', productoData);
            }

            const ok = !!resultado && (typeof resultado === 'object' || resultado === true);

            if (ok) {
                if (this.isEditing) {
                    this.showNotification('✅ Producto actualizado correctamente', 'success');
                } else {
                    this.showNotification('✅ Producto agregado correctamente', 'success');
                }

                this.hideProductForm();

                // refrescar datos
                await this.renderDashboard();
                await this.renderProductTable();
            } else {
                throw new Error('Error al guardar el producto');
            }
        } catch (error) {
            console.error('Error al guardar producto:', error);
            this.showNotification('Error al guardar el producto: ' + (error.message || error), 'error');
        } finally {
            this.setFormLoading(false);
        }
    }

    setFormLoading(loading) {
        const btnSubmit = document.getElementById('btnSubmit');
        const btnLoading = document.getElementById('btnLoading');
        const btnText = document.getElementById('btnText');

        if (loading) {
            if (btnSubmit) btnSubmit.disabled = true;
            if (btnLoading) btnLoading.style.display = 'inline-block';
            if (btnText) btnText.textContent = this.isEditing ? 'Actualizando...' : 'Guardando...';
        } else {
            if (btnSubmit) btnSubmit.disabled = false;
            if (btnLoading) btnLoading.style.display = 'none';
            if (btnText) btnText.textContent = this.isEditing ? 'Actualizar Producto' : 'Guardar Producto';
        }
    }

    async editarProducto(id) {
        if (!window.app) {
            console.error('app no está definido');
            return;
        }

        console.log('Editando producto:', id);

        try {
            const producto = await this.api.get(`/productos/${id}/`);
            console.log('Producto obtenido:', producto);

            if (producto) {
                // NO mostramos overlay de cargando: abrimos modal directamente
                this.showProductForm(producto);
            } else {
                throw new Error('No se pudo obtener el producto');
            }
        } catch (error) {
            console.error('Error al editar producto:', error);
            this.showNotification('Error al cargar el producto: ' + (error.message || error), 'error');
        }
    }

    async confirmarEliminacion(id) {
        if (!window.app) {
            console.error('app no está definido');
            return;
        }

        console.log('Confirmando eliminación:', id);
        
        // Usar sistema de confirmación global
        const confirmed = await (window.confirmCriticalAction 
            ? window.confirmCriticalAction('¿Está seguro de que desea eliminar este producto? Esta acción no se puede deshacer.')
            : confirm('¿Está seguro de que desea eliminar este producto?')
        );
        
        if (confirmed) {
            this.eliminarProducto(id);
        }
    }

    // Modal de confirmación reutilizable (limpio listeners antiguos correctamente)
    showConfirmModal(message = '¿Confirmar acción?', onAccept = () => {}, onCancel = () => {}) {
        const confirmModal = document.getElementById('modalConfirm');
        if (!confirmModal) {
            if (confirm(message)) onAccept();
            else onCancel();
            return;
        }

        const confirmMessage = confirmModal.querySelector('#confirmMessage');
        const btnAccept = confirmModal.querySelector('#btnConfirmAccept');
        const btnCancel = confirmModal.querySelector('#btnConfirmCancel');

        if (confirmMessage) confirmMessage.textContent = message;

        confirmModal.classList.add('show');
        confirmModal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');

        // Cerrar con ESC
        this._onConfirmKeydown = (ev) => {
            if (ev.key === 'Escape') this.hideConfirmModal();
        };
        document.addEventListener('keydown', this._onConfirmKeydown);

        // limpiar listeners previos reemplazando el nodo (safe)
        if (btnAccept && btnAccept.parentNode) {
            const newAccept = btnAccept.cloneNode(true);
            btnAccept.parentNode.replaceChild(newAccept, btnAccept);
            newAccept.addEventListener('click', function acceptHandler(ev) {
                try { confirmModal.classList.remove('show'); confirmModal.setAttribute('aria-hidden', 'true'); } catch(e){}
                try { onAccept(); } catch(e){ console.error(e); }
            });
        }
        if (btnCancel && btnCancel.parentNode) {
            const newCancel = btnCancel.cloneNode(true);
            btnCancel.parentNode.replaceChild(newCancel, btnCancel);
            newCancel.addEventListener('click', function cancelHandler(ev) {
                try { confirmModal.classList.remove('show'); confirmModal.setAttribute('aria-hidden', 'true'); } catch(e){}
                try { onCancel(); } catch(e){ console.error(e); }
            });
        }
    }

    hideConfirmModal() {
        const modal = document.getElementById('modalConfirm');
        if (modal) {
            modal.classList.remove('show');
            modal.setAttribute('aria-hidden', 'true');
        }
        if (this._onConfirmKeydown) {
            document.removeEventListener('keydown', this._onConfirmKeydown);
            this._onConfirmKeydown = null;
        }
        document.body.classList.remove('modal-open');
    }

    async eliminarProducto(id) {
        if (!id) {
            this.showNotification('ID de producto no válido', 'error');
            return;
        }

        this.hideConfirmModal();

        try {
            await this.api.delete(`/productos/${id}/`);
            this.showNotification('✅ Producto eliminado correctamente', 'success');

            // eliminar fila localmente para respuesta instantánea
            this.removeProductRowFromDOM(id);

            // refrescar estadísticas y tabla
            await this.renderDashboard();
            await this.renderProductTable();
        } catch (error) {
            console.error('Error al eliminar producto:', error);
            this.showNotification('Error al eliminar el producto: ' + (error.message || 'Error desconocido'), 'error');
        }
    }

    convertToCSV(data) {
        if (!Array.isArray(data) || data.length === 0) return '';

        const headers = ['Nombre', 'Categoría', 'Precio', 'Stock', 'Stock Mínimo', 'Proveedor', 'Estado'];
        const csvRows = [headers.join(',')];

        data.forEach(item => {
            const estado = this.getStockStatus(item.stock, item.stock_minimo);
            const row = [
                `"${(item.nombre || '').replace(/"/g, '""')}"`,
                `"${(item.categoria_nombre || '')}"`,
                item.precio,
                item.stock,
                item.stock_minimo,
                `"${(item.proveedor_nombre || '')}"`,
                `"${estado.texto}"`
            ];
            csvRows.push(row.join(','));
        });

        return csvRows.join('\n');
    }

    downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notifications');
        if (!container) {
            console.warn('Notifications container no encontrado:', message);
            return;
        }

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <span class="notification-icon">${this.getNotificationIcon(type)}</span>
            <span class="notification-message">${message}</span>
            <button class="btn-close btn-close-sm" aria-label="Cerrar">&times;</button>
        `;

        container.appendChild(notification);

        notification.querySelector('.btn-close')?.addEventListener('click', () => {
            notification.remove();
        });

        setTimeout(() => {
            if (notification.parentElement) notification.remove();
        }, 5000);
    }

    getNotificationIcon(type) {
        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
        return icons[type] || 'ℹ️';
    }

    // Helper: eliminar fila de tabla tras DELETE para respuesta instantánea
    removeProductRowFromDOM(id) {
        // reducir a la tabla de productos preferiblemente
        const productTbody = document.querySelector('table#tablaProductos tbody') || document.getElementById('tablaProductos') || document.getElementById('tablaProductosBody');
        if (productTbody) {
            const row = productTbody.querySelector(`tr[data-id="${id}"]`);
            if (row) return row.remove();
        }
        // fallback global
        const nodes = document.querySelectorAll(`tr[data-id="${id}"]`);
        nodes.forEach(n => n.remove());
    }

    escapeHtml(unsafe = '') {
        return String(unsafe)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Exponer la clase explícitamente en window para garantizar detección robusta
window.SushiHouseApp = SushiHouseApp;

// --- Instanciador seguro: garantiza que la app exista y tenga listeners ---
document.addEventListener('DOMContentLoaded', () => {
    try {
        if (!window.app) {
            if (typeof SushiHouseApp !== 'undefined' && SushiHouseApp.getInstance) {
                window.app = SushiHouseApp.getInstance();
                console.log('SushiHouseApp: instancia creada automáticamente.');
            } else {
                window.app = new SushiHouseApp();
                console.log('SushiHouseApp: instancia creada nueva.');
            }
        } else {
            if (typeof window.app.verifyEventListeners === 'function') window.app.verifyEventListeners();
        }
    } catch (err) {
        console.error('Error al crear o verificar SushiHouseApp en DOMContentLoaded:', err);
    }
});
