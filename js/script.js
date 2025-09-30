// Sistema principal de la aplicación
class RestoControlApp {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentSort = { field: 'nombre', direction: 'asc' };
        this.currentProductId = null;
        this.isEditing = false;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadInitialData();
        this.setupRealTimeSearch();
    }

    bindEvents() {
        // Botones principales
        document.getElementById('btnNuevoProducto')?.addEventListener('click', () => this.showProductForm());
        document.getElementById('btnCancelar')?.addEventListener('click', () => this.hideProductForm());
        document.getElementById('btnCloseModal')?.addEventListener('click', () => this.hideProductForm());
        document.getElementById('btnExport')?.addEventListener('click', () => this.exportData());

        // Formulario
        document.getElementById('productForm')?.addEventListener('submit', (e) => this.handleFormSubmit(e));

        // Modal de confirmación
        document.getElementById('btnConfirmCancel')?.addEventListener('click', () => this.hideConfirmModal());
        
        // Cerrar modal al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideProductForm();
                this.hideConfirmModal();
            }
        });

        // Ordenamiento de tabla
        document.querySelectorAll('th[data-sort]').forEach(th => {
            th.addEventListener('click', () => this.handleSort(th.dataset.sort));
        });
    }

    loadInitialData() {
        this.showLoading();
        
        // Simular carga de datos
        setTimeout(() => {
            this.renderDashboard();
            this.renderProductTable();
            this.populateSelects();
            this.hideLoading();
        }, 1500);
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

    renderDashboard() {
        const stats = storage.obtenerEstadisticas();
        
        document.getElementById('totalProductos').textContent = stats.totalProductos;
        document.getElementById('stockBajo').textContent = stats.stockBajo;
        document.getElementById('stockAgotado').textContent = stats.stockAgotado;
        document.getElementById('totalCategorias').textContent = stats.totalCategorias;
    }

    renderProductTable(productos = null) {
        this.showTableLoading();
        
        setTimeout(() => {
            const tablaBody = document.getElementById('tablaProductos');
            const tableEmpty = document.getElementById('tableEmpty');
            
            if (!tablaBody) return;

            const productosToRender = productos || storage.getProductos();
            const startIndex = (this.currentPage - 1) * this.itemsPerPage;
            const endIndex = startIndex + this.itemsPerPage;
            const paginatedProducts = productosToRender.slice(startIndex, endIndex);

            tablaBody.innerHTML = '';

            if (paginatedProducts.length === 0) {
                tableEmpty.style.display = 'block';
                this.renderPagination(0);
                this.hideTableLoading();
                return;
            }

            tableEmpty.style.display = 'none';

            paginatedProducts.forEach(producto => {
                const estado = this.getStockStatus(producto.stock, producto.stockMinimo);
                
                const fila = document.createElement('tr');
                fila.innerHTML = `
                    <td>${this.escapeHtml(producto.nombre)}</td>
                    <td>${this.getCategoryName(producto.categoria)}</td>
                    <td>$${producto.precio.toFixed(2)}</td>
                    <td>${producto.stock}</td>
                    <td><span class="status ${estado.clase}">${estado.texto}</span></td>
                    <td class="actions">
                        <button class="btn btn-sm btn-primary" onclick="app.editarProducto(${producto.id})">Editar</button>
                        <button class="btn btn-sm btn-danger" onclick="app.confirmarEliminacion(${producto.id})">Eliminar</button>
                    </td>
                `;
                tablaBody.appendChild(fila);
            });

            this.renderPagination(productosToRender.length);
            this.hideTableLoading();
        }, 500);
    }

    getStockStatus(stock, stockMinimo) {
        if (stock === 0) {
            return { texto: 'Agotado', clase: 'out-of-stock' };
        } else if (stock <= stockMinimo) {
            return { texto: 'Stock Bajo', clase: 'low-stock' };
        } else {
            return { texto: 'En Stock', clase: 'in-stock' };
        }
    }

    getCategoryName(categoryId) {
        const categorias = storage.getCategorias();
        const categoria = categorias.find(c => c.id == categoryId);
        return categoria ? categoria.nombre : categoryId;
    }

    renderPagination(totalItems) {
        const pagination = document.getElementById('pagination');
        if (!pagination) return;

        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHTML = '';
        
        // Botón anterior
        paginationHTML += `<button class="page-btn ${this.currentPage === 1 ? 'disabled' : ''}" 
            ${this.currentPage === 1 ? 'disabled' : ''} onclick="app.changePage(${this.currentPage - 1})">« Anterior</button>`;
        
        // Páginas
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                paginationHTML += `<button class="page-btn ${i === this.currentPage ? 'active' : ''}" 
                    onclick="app.changePage(${i})">${i}</button>`;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                paginationHTML += '<span class="page-dots">...</span>';
            }
        }
        
        // Botón siguiente
        paginationHTML += `<button class="page-btn ${this.currentPage === totalPages ? 'disabled' : ''}" 
            ${this.currentPage === totalPages ? 'disabled' : ''} onclick="app.changePage(${this.currentPage + 1})">Siguiente »</button>`;
        
        pagination.innerHTML = paginationHTML;
    }

    changePage(page) {
        const totalPages = Math.ceil(storage.getProductos().length / this.itemsPerPage);
        if (page < 1 || page > totalPages) return;
        
        this.currentPage = page;
        this.renderProductTable();
        
        // Scroll suave hacia la tabla
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

        const productos = storage.getProductos();
        const sortedProductos = this.sortProductos(productos, this.currentSort.field, this.currentSort.direction);
        this.renderProductTable(sortedProductos);
        
        // Actualizar indicador visual en el header
        document.querySelectorAll('th[data-sort]').forEach(th => {
            th.innerHTML = th.innerHTML.replace(' ↗', '').replace(' ↘', '');
            if (th.dataset.sort === field) {
                th.innerHTML += this.currentSort.direction === 'asc' ? ' ↗' : ' ↘';
            }
        });
    }

    sortProductos(productos, field, direction) {
        return [...productos].sort((a, b) => {
            let aValue = a[field];
            let bValue = b[field];
            
            if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }
            
            if (aValue < bValue) return direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    setupRealTimeSearch() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.handleSearch(e.target.value);
                }, 300);
            });
        }
    }

    handleSearch(termino) {
        this.currentPage = 1;
        const productosFiltrados = storage.buscarProductos(termino);
        this.renderProductTable(productosFiltrados);
    }

    populateSelects() {
        this.populateCategorias();
        this.populateProveedores();
    }

    populateCategorias() {
        const select = document.getElementById('categoria');
        if (!select) return;

        const categorias = storage.getCategorias();
        select.innerHTML = '<option value="">Seleccione una categoría</option>';
        
        categorias.forEach(categoria => {
            const option = document.createElement('option');
            option.value = categoria.id;
            option.textContent = categoria.nombre;
            select.appendChild(option);
        });
    }

    populateProveedores() {
        const select = document.getElementById('proveedor');
        if (!select) return;

        const proveedores = storage.getProveedores();
        select.innerHTML = '<option value="">Seleccione un proveedor</option>';
        
        proveedores.forEach(proveedor => {
            const option = document.createElement('option');
            option.value = proveedor.id;
            option.textContent = proveedor.nombre;
            select.appendChild(option);
        });
    }

    showProductForm(producto = null) {
        this.isEditing = !!producto;
        this.currentProductId = producto ? producto.id : null;
        
        const modal = document.getElementById('modalProducto');
        const title = document.getElementById('modalTitle');
        const form = document.getElementById('productForm');
        
        if (producto) {
            title.textContent = 'Editar Producto';
            this.populateForm(producto);
        } else {
            title.textContent = 'Nuevo Producto';
            form.reset();
            document.getElementById('descripcionCounter').textContent = '0';
        }
        
        validator.clearFieldErrors(form);
        modal.classList.add('show');
        
        // Configurar validación en tiempo real
        validator.setupRealTimeValidation(form);
    }

    hideProductForm() {
        const modal = document.getElementById('modalProducto');
        modal.classList.remove('show');
        this.isEditing = false;
        this.currentProductId = null;
    }

    populateForm(producto) {
        document.getElementById('nombre').value = producto.nombre || '';
        document.getElementById('categoria').value = producto.categoria || '';
        document.getElementById('precio').value = producto.precio || '';
        document.getElementById('stock').value = producto.stock || '';
        document.getElementById('stockMinimo').value = producto.stockMinimo || '';
        document.getElementById('proveedor').value = producto.proveedor || '';
        document.getElementById('descripcion').value = producto.descripcion || '';
        document.getElementById('descripcionCounter').textContent = (producto.descripcion || '').length;
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const productoData = Object.fromEntries(formData.entries());
        
        // Convertir tipos numéricos
        productoData.precio = parseFloat(productoData.precio);
        productoData.stock = parseInt(productoData.stock);
        productoData.stockMinimo = parseInt(productoData.stockMinimo);
        
        if (this.isEditing) {
            productoData.id = this.currentProductId;
        }

        // Validar
        const validation = validator.validateProducto(productoData);
        if (!validation.isValid) {
            validator.showFieldErrors(form, validation.errors);
            this.showNotification('Por favor corrige los errores en el formulario', 'error');
            return;
        }

        // Mostrar loading en el botón
        this.setFormLoading(true);

        try {
            // Simular delay de red
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            let resultado;
            if (this.isEditing) {
                resultado = storage.actualizarProducto(this.currentProductId, productoData);
            } else {
                resultado = storage.agregarProducto(productoData);
            }

            if (resultado) {
                this.showNotification(
                    `Producto ${this.isEditing ? 'actualizado' : 'agregado'} correctamente`,
                    'success'
                );
                this.hideProductForm();
                this.renderDashboard();
                this.renderProductTable();
            } else {
                throw new Error('Error al guardar el producto');
            }
        } catch (error) {
            this.showNotification('Error al guardar el producto: ' + error.message, 'error');
        } finally {
            this.setFormLoading(false);
        }
    }

    setFormLoading(loading) {
        const btnSubmit = document.getElementById('btnSubmit');
        const btnLoading = document.getElementById('btnLoading');
        const btnText = document.getElementById('btnText');
        
        if (loading) {
            btnSubmit.disabled = true;
            btnLoading.style.display = 'inline-block';
            btnText.textContent = this.isEditing ? 'Actualizando...' : 'Guardando...';
        } else {
            btnSubmit.disabled = false;
            btnLoading.style.display = 'none';
            btnText.textContent = this.isEditing ? 'Actualizar Producto' : 'Guardar Producto';
        }
    }

    editarProducto(id) {
        const productos = storage.getProductos();
        const producto = productos.find(p => p.id === id);
        if (producto) {
            this.showProductForm(producto);
        }
    }

    confirmarEliminacion(id) {
        const productos = storage.getProductos();
        const producto = productos.find(p => p.id === id);
        
        if (!producto) return;

        const modal = document.getElementById('modalConfirm');
        const message = document.getElementById('confirmMessage');
        const btnAccept = document.getElementById('btnConfirmAccept');
        
        message.textContent = `¿Está seguro de que desea eliminar el producto "${producto.nombre}"? Esta acción no se puede deshacer.`;
        
        // Remover event listeners previos
        const newBtnAccept = btnAccept.cloneNode(true);
        btnAccept.parentNode.replaceChild(newBtnAccept, btnAccept);
        
        newBtnAccept.addEventListener('click', () => this.eliminarProducto(id));
        modal.classList.add('show');
    }

    hideConfirmModal() {
        const modal = document.getElementById('modalConfirm');
        modal.classList.remove('show');
    }

    async eliminarProducto(id) {
        this.hideConfirmModal();
        
        try {
            // Simular delay de red
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const resultado = storage.eliminarProducto(id);
            
            if (resultado) {
                this.showNotification('Producto eliminado correctamente', 'success');
                this.renderDashboard();
                this.renderProductTable();
            } else {
                throw new Error('Error al eliminar el producto');
            }
        } catch (error) {
            this.showNotification('Error al eliminar el producto: ' + error.message, 'error');
        }
    }

    exportData() {
        const productos = storage.getProductos();
        const csvContent = this.convertToCSV(productos);
        this.downloadCSV(csvContent, 'productos_restocontrol.csv');
        this.showNotification('Datos exportados correctamente', 'success');
    }

    convertToCSV(data) {
        if (data.length === 0) return '';
        
        const headers = ['Nombre', 'Categoría', 'Precio', 'Stock', 'Stock Mínimo', 'Proveedor', 'Estado'];
        const csvRows = [headers.join(',')];
        
        data.forEach(item => {
            const estado = this.getStockStatus(item.stock, item.stockMinimo);
            const row = [
                `"${item.nombre}"`,
                `"${this.getCategoryName(item.categoria)}"`,
                item.precio,
                item.stock,
                item.stockMinimo,
                `"${item.proveedor || ''}"`,
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
            <button class="btn-close btn-close-sm" onclick="this.parentElement.remove()">&times;</button>
        `;
        
        container.appendChild(notification);
        
        // Auto-remover después de 5 segundos
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

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Inicializar la aplicación cuando el DOM esté listo
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new RestoControlApp();
});