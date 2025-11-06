// Sistema principal de la aplicación
class SushiHouseApp {
    static getInstance() {
        if (!window.app) {
            window.app = new SushiHouseApp();
        }
        return window.app;
    }
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentSort = { field: 'nombre', direction: 'asc' };
        this.currentProductId = null;
        this.isEditing = false;
        this.api = apiClient;
        this.productos = [];
        this.categorias = [];
        this.proveedores = [];
        this.init();

        // Escuchar eventos de refresh de token
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
        // Asignar this a una variable para usar en los event listeners
        const self = this;

        const elements = {
            btnNuevoProducto: document.getElementById('btnNuevoProducto'),
            btnCancelar: document.getElementById('btnCancelar'),
            btnCloseModal: document.getElementById('btnCloseModal'),
            btnExport: document.getElementById('btnExport'),
            productForm: document.getElementById('productForm'),
            btnConfirmCancel: document.getElementById('btnConfirmCancel')
        };

        // Asignar event listeners usando la referencia guardada
        elements.btnNuevoProducto?.addEventListener('click', () => self.showProductForm());
        elements.btnCancelar?.addEventListener('click', () => self.hideProductForm());
        elements.btnCloseModal?.addEventListener('click', () => self.hideProductForm());
        elements.btnExport?.addEventListener('click', () => self.exportData());
        elements.productForm?.addEventListener('submit', (e) => self.handleFormSubmit(e));
        elements.btnConfirmCancel?.addEventListener('click', () => self.hideConfirmModal());

        document.addEventListener('click', (e) => {
            // cerrar modals al hacer click en el fondo (delegación)
            if (e.target && e.target.classList && e.target.classList.contains('modal')) {
                this.hideProductForm();
                this.hideConfirmModal();
            }
        });

        // Sort headers (si existen)
        document.querySelectorAll('th[data-sort]').forEach(th => {
            th.addEventListener('click', () => this.handleSort(th.dataset.sort));
        });

        // Delegación para tabla de productos: maneja botones creados dinámicamente
        const tableContainer = document.querySelector('#tablaProductos, #tablaProductosBody, .table-container');
        if (tableContainer) {
            tableContainer.addEventListener('click', (ev) => {
                const btn = ev.target.closest('button');
                if (!btn) return;
                const id = btn.dataset?.id;
                if (!id) return;
                if (btn.classList.contains('btn-editar')) {
                    this.editarProducto(id);
                } else if (btn.classList.contains('btn-eliminar')) {
                    this.confirmarEliminacion(id);
                }
            });
        }
    }

    async loadInitialData() {
        Loading.show();
        console.log('Cargando datos iniciales...');

        try {
            // Asegurarse de que window.app esté disponible
            window.app = this;

            await this.renderDashboard();
            console.log('Dashboard renderizado');

            await this.renderProductTable();
            console.log('Tabla de productos renderizada');

            await this.populateSelects();
            console.log('Selectores populados');

            // Verificar que los event listeners estén correctamente asignados
            this.verifyEventListeners();

            Loading.hide();
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showNotification('Error al cargar los datos: ' + (error.message || error), 'error');
            Loading.hide();
        }
    }

    verifyEventListeners() {
        // Verificar que window.app esté disponible
        if (!window.app) {
            console.error('window.app no está definido');
            window.app = this;
        }

        // Verificar los botones de la tabla (solo como comprobación adicional)
        const tablaProductosCandidates = [
            document.getElementById('tablaProductos'),
            document.getElementById('tablaProductosBody'),
            document.querySelector('#tablaProductos tbody')
        ];
        const tablaProductos = tablaProductosCandidates.find(x => x);
        if (tablaProductos) {
            const buttons = tablaProductos.querySelectorAll('button');
            buttons.forEach(button => {
                if (!button.onclick) {
                    const id = button.dataset.id;
                    if (!id) return;
                    if (button.classList.contains('btn-editar')) {
                        button.addEventListener('click', () => this.editarProducto(id));
                    } else if (button.classList.contains('btn-eliminar')) {
                        button.addEventListener('click', () => this.confirmarEliminacion(id));
                    }
                }
            });
        }
    }

    showLoading() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
        }
    }

    hideLoading() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.add('fade-out');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
                loadingScreen.classList.remove('fade-out');
            }, 500);
        }
    }

    showTableLoading() {
        const tableLoading = document.getElementById('tableLoading');
        if (tableLoading) {
            tableLoading.style.display = 'flex';
        }
    }

    hideTableLoading() {
        const tableLoading = document.getElementById('tableLoading');
        if (tableLoading) {
            tableLoading.style.display = 'none';
        }
    }

    async renderDashboard() {
        if (this._dashboardUpdateInProgress) return;
        this._dashboardUpdateInProgress = true;

        try {
            const stats = await this.api.get('/dashboard/estadisticas/');

            const elements = {
                totalProductos: document.getElementById('totalProductos'),
                stockBajo: document.getElementById('stockBajo'),
                stockAgotado: document.getElementById('stockAgotado'),
                totalCategorias: document.getElementById('totalCategorias')
            };

            if (stats) {
                elements.totalProductos && (elements.totalProductos.textContent = stats.total_productos || '0');
                elements.stockBajo && (elements.stockBajo.textContent = stats.stock_bajo || '0');
                elements.stockAgotado && (elements.stockAgotado.textContent = stats.stock_agotado || '0');
                elements.totalCategorias && (elements.totalCategorias.textContent = stats.total_categorias || '0');
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
            // Fallback: calcular estadísticas localmente si la llamada falla
            try {
                const [productos, categorias] = await Promise.all([
                    this.api.get('/productos/').catch(()=>[]),
                    this.api.get('/categorias/').catch(()=>[])
                ]);

                const total = Array.isArray(productos) ? productos.length : 0;
                const bajoStock = Array.isArray(productos) ? productos.filter(p => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= (p.stock_minimo ?? 0)).length : 0;
                const agotados = Array.isArray(productos) ? productos.filter(p => (p.stock ?? 0) === 0).length : 0;

                document.getElementById('totalProductos') && (document.getElementById('totalProductos').textContent = total);
                document.getElementById('stockBajo') && (document.getElementById('stockBajo').textContent = bajoStock);
                document.getElementById('stockAgotado') && (document.getElementById('stockAgotado').textContent = agotados);
                document.getElementById('totalCategorias') && (document.getElementById('totalCategorias').textContent = (Array.isArray(categorias) ? categorias.length : 0));
            } catch (fallbackError) {
                console.error('Error in dashboard fallback:', fallbackError);
            }
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
            let tablaBody = document.getElementById('tablaProductos');
            if (!tablaBody) tablaBody = document.getElementById('tablaProductosBody');
            if (!tablaBody) {
                const tableEl = document.querySelector('table#tablaProductos');
                if (tableEl) tablaBody = tableEl.querySelector('tbody') || tableEl;
            }
            const tableEmpty = document.getElementById('tableEmpty');

            if (!tablaBody) {
                console.error('No se encontró el elemento tablaProductos / tablaProductosBody');
                this.hideTableLoading();
                return;
            }

            const totalItems = Array.isArray(productosToRender) ? productosToRender.length : 0;
            const startIndex = (this.currentPage - 1) * this.itemsPerPage;
            const endIndex = startIndex + this.itemsPerPage;
            const paginatedProducts = (productosToRender || []).slice(startIndex, endIndex);

            // Si tablaBody es <table> o <tbody>, limpiar apropiadamente
            if (tablaBody.tagName && tablaBody.tagName.toLowerCase() === 'table') {
                // limpiar tbody si existe
                const tb = tablaBody.querySelector('tbody');
                if (tb) tb.innerHTML = '';
                tablaBody = tb || tablaBody;
            } else {
                tablaBody.innerHTML = '';
            }

            if (paginatedProducts.length === 0) {
                if (tableEmpty) tableEmpty.style.display = 'block';
                this.renderPagination(totalItems);
                this.hideTableLoading();
                return;
            }

            if (tableEmpty) tableEmpty.style.display = 'none';

            for (const producto of paginatedProducts) {
                const estado = this.getStockStatus(producto.stock, producto.stock_minimo);
                const categoria = await this.getCategoryName(producto.categoria);

                const fila = document.createElement('tr');
                const productoId = producto.id;
                fila.innerHTML = `
                    <td>${this.escapeHtml(String(producto.nombre || ''))}</td>
                    <td>${this.escapeHtml(String(categoria || ''))}</td>
                    <td>$${(producto.precio != null) ? parseFloat(producto.precio).toFixed(2) : '0.00'}</td>
                    <td>${producto.stock ?? 0}</td>
                    <td><span class="status ${estado.clase}">${estado.texto}</span></td>
                    <td class="actions">
                        <button class="btn btn-sm btn-primary btn-editar" data-id="${productoId}">Editar</button>
                        <button class="btn btn-sm btn-danger btn-eliminar" data-id="${productoId}">Eliminar</button>
                    </td>
                `;

                // Adjuntar botones (si tablaBody es <tbody> esto funcionará)
                tablaBody.appendChild(fila);
            }

            this.renderPagination(totalItems);
            this.hideTableLoading();
        } catch (error) {
            console.error('Error loading products:', error);
            this.hideTableLoading();
        }
    }

    getStockStatus(stock, stockMinimo) {
        stock = stock ?? 0;
        stockMinimo = stockMinimo ?? 0;
        if (stock === 0) {
            return { texto: 'Agotado', clase: 'out-of-stock' };
        } else if (stock <= stockMinimo) {
            return { texto: 'Stock Bajo', clase: 'low-stock' };
        } else {
            return { texto: 'En Stock', clase: 'in-stock' };
        }
    }

    async getCategoryName(categoryId) {
        if (!categoryId) return 'Sin categoría';
        try {
            const categoria = await this.api.get(`/categorias/${categoryId}/`);
            // Puede devolver objeto directo o array; normalizar:
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

        paginationHTML += `<button class="page-btn ${this.currentPage === 1 ? 'disabled' : ''}" 
            ${this.currentPage === 1 ? 'disabled' : ''} data-page="${this.currentPage - 1}">« Anterior</button>`;

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                paginationHTML += `<button class="page-btn ${i === this.currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                paginationHTML += '<span class="page-dots">...</span>';
            }
        }

        paginationHTML += `<button class="page-btn ${this.currentPage === totalPages ? 'disabled' : ''}" 
            ${this.currentPage === totalPages ? 'disabled' : ''} data-page="${this.currentPage + 1}">Siguiente »</button>`;

        pagination.innerHTML = paginationHTML;

        // Delegación para clicks en paginación
        pagination.querySelectorAll('button.page-btn').forEach(btn => {
            btn.removeEventListener('click', this._paginationClickHandler);
            this._paginationClickHandler = (ev) => {
                const page = parseInt(ev.currentTarget.dataset.page);
                if (!isNaN(page)) this.changePage(page);
            };
            btn.addEventListener('click', this._paginationClickHandler);
        });
    }

    changePage(page) {
        if (page < 1) return;
        this.currentPage = page;
        this.renderProductTable();
        document.querySelector('.table-container')?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }

    handleSort(field) {
        if (this.currentSort.field === field) {
            this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort.field = field;
            this.currentSort.direction = 'asc';
        }

        this.renderProductTable();

        document.querySelectorAll('th[data-sort]').forEach(th => {
            th.textContent = th.textContent.replace(' ↗', '').replace(' ↘', '');
            if (th.dataset.sort === field) {
                th.textContent += this.currentSort.direction === 'asc' ? ' ↗' : ' ↘';
            }
        });
    }

    setupRealTimeSearch() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            let searchTimeout;
            let lastValue = '';
            searchInput.addEventListener('input', (e) => {
                const currentValue = e.target.value;
                if (currentValue === lastValue) return;
                lastValue = currentValue;

                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.handleSearch(currentValue);
                }, 500);
            });
        }
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

        if (form) validator.clearFieldErrors(form);
        modal && modal.classList.add('show');

        if (form) validator.setupRealTimeValidation(form);
    }

    hideProductForm() {
        const modal = document.getElementById('modalProducto');
        modal && modal.classList.remove('show');
        this.isEditing = false;
        this.currentProductId = null;
    }

    populateForm(producto) {
        document.getElementById('nombre') && (document.getElementById('nombre').value = producto.nombre || '');
        document.getElementById('categoria') && (document.getElementById('categoria').value = producto.categoria || '');
        document.getElementById('precio') && (document.getElementById('precio').value = producto.precio || '');
        document.getElementById('stock') && (document.getElementById('stock').value = producto.stock || '');
        document.getElementById('stockMinimo') && (document.getElementById('stockMinimo').value = producto.stock_minimo || '');
        document.getElementById('proveedor') && (document.getElementById('proveedor').value = producto.proveedor || '');
        document.getElementById('descripcion') && (document.getElementById('descripcion').value = producto.descripcion || '');
        const descCounter = document.getElementById('descripcionCounter');
        if (descCounter) descCounter.textContent = (producto.descripcion || '').length;
    }

    async handleFormSubmit(e) {
        e.preventDefault();

        const form = e.target;
        const formData = new FormData(form);
        const productoData = Object.fromEntries(formData.entries());

        // Convertir campos numéricos
        productoData.precio = parseFloat(productoData.precio) || 0;
        productoData.stock = parseInt(productoData.stock) || 0;
        productoData.stock_minimo = parseInt(productoData.stockMinimo) || 0;

        // Manejar campos de relación
        productoData.categoria = productoData.categoria || null;
        productoData.proveedor = productoData.proveedor || null;

        if (this.isEditing) {
            productoData.id = this.currentProductId;
        }

        const validation = validator.validateProducto(productoData);
        if (!validation.isValid) {
            validator.showFieldErrors(form, validation.errors);
            this.showNotification('Por favor corrige los errores en el formulario', 'error');
            return;
        }

        this.setFormLoading(true);

        try {
            let resultado;
            if (this.isEditing) {
                resultado = await this.api.put(`/productos/${this.currentProductId}/`, productoData);
            } else {
                resultado = await this.api.post('/productos/', productoData);
            }

            if (resultado) {
                this.showNotification(
                    `Producto ${this.isEditing ? 'actualizado' : 'agregado'} correctamente`,
                    'success'
                );
                this.hideProductForm();
                await this.renderDashboard();
                await this.renderProductTable();
            } else {
                throw new Error('Error al guardar el producto');
            }
        } catch (error) {
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
        Loading.show();

        try {
            const producto = await this.api.get(`/productos/${id}/`);
            console.log('Producto obtenido:', producto);

            if (producto) {
                this.showProductForm(producto);
            } else {
                throw new Error('No se pudo obtener el producto');
            }
        } catch (error) {
            console.error('Error al editar producto:', error);
            this.showNotification('Error al cargar el producto: ' + (error.message || error), 'error');
        } finally {
            Loading.hide();
        }
    }

    confirmarEliminacion(id) {
        if (!window.app) {
            console.error('app no está definido');
            return;
        }

        console.log('Confirmando eliminación:', id);
        this.showConfirmModal(
            `¿Está seguro de que desea eliminar este producto? Esta acción no se puede deshacer.`,
            () => this.eliminarProducto(id)
        );
    }

    hideConfirmModal() {
        const modal = document.getElementById('modalConfirm');
        modal && modal.classList.remove('show');
    }

    async eliminarProducto(id) {
        if (!id) {
            this.showNotification('ID de producto no válido', 'error');
            return;
        }

        this.hideConfirmModal();
        Loading.show();

        try {
            await this.api.delete(`/productos/${id}/`);
            this.showNotification('Producto eliminado correctamente', 'success');
            await this.renderDashboard();
            await this.renderProductTable();
        } catch (error) {
            console.error('Error al eliminar producto:', error);
            this.showNotification('Error al eliminar el producto: ' + (error.message || 'Error desconocido'), 'error');
        } finally {
            Loading.hide();
        }
    }

    async exportData() {
        try {
            const productos = await this.api.get('/productos/');
            const csvContent = this.convertToCSV(productos || []);
            this.downloadCSV(csvContent, 'productos_sushihouse.csv');
            this.showNotification('Datos exportados correctamente', 'success');
        } catch (error) {
            this.showNotification('Error al exportar datos: ' + (error.message || error), 'error');
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
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <span class="notification-icon">${this.getNotificationIcon(type)}</span>
            <span class="notification-message">${message}</span>
            <button class="btn-close btn-close-sm" aria-label="Cerrar">&times;</button>
        `;

        container.appendChild(notification);

        // Cerrar con botón (delegación en la notificación misma)
        notification.querySelector('.btn-close')?.addEventListener('click', () => {
            notification.remove();
        });

        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    getNotificationIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || 'ℹ️';
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

