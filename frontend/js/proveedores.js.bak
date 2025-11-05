// Sistema de gestión de proveedores - CONECTADO AL BACKEND
class ProveedoresManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentSort = { field: 'nombre', direction: 'asc' };
        this.currentProveedorId = null;
        this.isEditing = false;
        this.api = apiClient;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadInitialData();
        this.setupRealTimeSearch();
    }

    bindEvents() {
        // Botones principales
        document.getElementById('btnNuevoProveedor')?.addEventListener('click', () => this.showProveedorForm());
        document.getElementById('btnCancelarProveedor')?.addEventListener('click', () => this.hideProveedorForm());
        document.getElementById('btnCloseModalProveedor')?.addEventListener('click', () => this.hideProveedorForm());
        document.getElementById('btnExportProveedores')?.addEventListener('click', () => this.exportData());
        document.getElementById('btnCerrarDetalles')?.addEventListener('click', () => this.hideDetallesModal());

        // Formulario
        document.getElementById('proveedorForm')?.addEventListener('submit', (e) => this.handleFormSubmit(e));

        // Modal de confirmación
        document.getElementById('btnConfirmCancel')?.addEventListener('click', () => this.hideConfirmModal());
        
        // Cerrar modales al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideProveedorForm();
                this.hideDetallesModal();
                this.hideConfirmModal();
            }
        });

        // Ordenamiento de tabla
        document.querySelectorAll('th[data-sort]').forEach(th => {
            th.addEventListener('click', () => this.handleSort(th.dataset.sort));
        });
    }

    async loadInitialData() {
        this.showLoading();
        
        try {
            // usar allSettled para evitar que una promesa lenta bloquee todo
            const results = await Promise.allSettled([
                this.renderDashboard(),
                this.renderProveedoresTable(),
                this.populateCategoriasSelect()
            ]);
            results.forEach((r, idx) => {
                if (r.status === 'rejected') {
                    console.error(`loadInitialData: task ${idx} failed:`, r.reason);
                }
            });
        } catch (error) {
            console.error('Error cargando datos iniciales:', error);
            this.showNotification('Error cargando datos del servidor', 'error');
        } finally {
            // Garantizamos siempre ocultar el loading global
            this.hideLoading();
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
        const tableLoading = document.getElementById('tableLoadingProveedores');
        if (tableLoading) {
            tableLoading.style.display = 'flex';
        }
    }

    hideTableLoading() {
        const tableLoading = document.getElementById('tableLoadingProveedores');
        if (tableLoading) {
            tableLoading.style.display = 'none';
        }
    }

    async renderDashboard() {
        try {
            const [proveedores, productos, estadisticas] = await Promise.all([
                this.api.get('/proveedores/'),
                this.api.get('/productos/'),
                this.api.get('/dashboard/estadisticas/')
            ]);
            
            const totalProveedores = proveedores.length;
            const totalProductosProveedores = productos.length;
            const proveedoresDestacados = estadisticas.proveedoresDestacados || 0;
            const pedidosPendientes = estadisticas.pedidosPendientes || 0;

            document.getElementById('totalProveedores').textContent = totalProveedores;
            document.getElementById('totalProductosProveedores').textContent = totalProductosProveedores;
            document.getElementById('proveedoresDestacados').textContent = proveedoresDestacados;
            document.getElementById('pedidosPendientes').textContent = pedidosPendientes;
        } catch (error) {
            console.error('Error renderizando dashboard:', error);
        }
    }

    async renderProveedoresTable(proveedores = null) {
        this.showTableLoading();
        
        try {
            const proveedoresToRender = proveedores || await this.api.get('/proveedores/');
            const tablaBody = document.getElementById('tablaProveedores');
            const tableEmpty = document.getElementById('tableEmptyProveedores');
            
            if (!tablaBody) return;

            const startIndex = (this.currentPage - 1) * this.itemsPerPage;
            const endIndex = startIndex + this.itemsPerPage;
            const paginatedProveedores = proveedoresToRender.slice(startIndex, endIndex);

            tablaBody.innerHTML = '';

            if (paginatedProveedores.length === 0) {
                if (tableEmpty) tableEmpty.style.display = 'block';
                this.renderPagination(0);
                this.hideTableLoading();
                return;
            }

            if (tableEmpty) tableEmpty.style.display = 'none';

            for (const proveedor of paginatedProveedores) {
                const productosCount = await this.getProductosCountByProveedor(proveedor.id);
                const estado = proveedor.estado || 'activo';
                
                const fila = document.createElement('tr');
                fila.innerHTML = `
                    <td>
                        <strong>${this.escapeHtml(proveedor.nombre)}</strong>
                    </td>
                    <td>${this.escapeHtml(proveedor.contacto)}</td>
                    <td>${proveedor.telefono}</td>
                    <td>${proveedor.email}</td>
                    <td>${productosCount}</td>
                    <td><span class="status ${estado === 'activo' ? 'in-stock' : 'out-of-stock'}">${estado === 'activo' ? 'Activo' : 'Inactivo'}</span></td>
                    <td class="actions">
                        <button class="btn btn-sm btn-primary" onclick="proveedoresManager.verDetalles(${proveedor.id})">Ver</button>
                        <button class="btn btn-sm btn-warning" onclick="proveedoresManager.editarProveedor(${proveedor.id})">Editar</button>
                        <button class="btn btn-sm btn-danger" onclick="proveedoresManager.confirmarEliminacion(${proveedor.id})">Eliminar</button>
                    </td>
                `;
                tablaBody.appendChild(fila);
            }

            this.renderPagination(proveedoresToRender.length);
        } catch (error) {
            console.error('Error renderizando tabla:', error);
            this.showNotification('Error cargando proveedores', 'error');
        } finally {
            this.hideTableLoading();
        }
    }

    async getProductosCountByProveedor(proveedorId) {
        try {
            const productos = await this.api.get(`/productos/?proveedor=${proveedorId}`);
            return productos.length;
        } catch (error) {
            console.error('Error contando productos:', error);
            return 0;
        }
    }

    renderPagination(totalItems) {
        const pagination = document.getElementById('paginationProveedores');
        if (!pagination) return;

        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHTML = '';
        
        // Botón anterior
        paginationHTML += `<button class="page-btn ${this.currentPage === 1 ? 'disabled' : ''}" 
            ${this.currentPage === 1 ? 'disabled' : ''} onclick="proveedoresManager.changePage(${this.currentPage - 1})">« Anterior</button>`;
        
        // Páginas
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                paginationHTML += `<button class="page-btn ${i === this.currentPage ? 'active' : ''}" 
                    onclick="proveedoresManager.changePage(${i})">${i}</button>`;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                paginationHTML += '<span class="page-dots">...</span>';
            }
        }
        
        // Botón siguiente
        paginationHTML += `<button class="page-btn ${this.currentPage === totalPages ? 'disabled' : ''}" 
            ${this.currentPage === totalPages ? 'disabled' : ''} onclick="proveedoresManager.changePage(${this.currentPage + 1})">Siguiente »</button>`;
        
        pagination.innerHTML = paginationHTML;
    }

    changePage(page) {
        this.currentPage = page;
        this.renderProveedoresTable();
    }

    handleSort(field) {
        if (this.currentSort.field === field) {
            this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort.field = field;
            this.currentSort.direction = 'asc';
        }

        // En una implementación real, esto se haría en el backend
        this.renderProveedoresTable();
        
        // Actualizar indicador visual en el header
        document.querySelectorAll('th[data-sort]').forEach(th => {
            th.innerHTML = th.innerHTML.replace(' ↗', '').replace(' ↘', '');
            if (th.dataset.sort === field) {
                th.innerHTML += this.currentSort.direction === 'asc' ? ' ↗' : ' ↘';
            }
        });
    }

    setupRealTimeSearch() {
        const searchInput = document.getElementById('searchInputProveedores');
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

    async handleSearch(termino) {
        this.currentPage = 1;
        try {
            const proveedoresFiltrados = await this.api.get(`/proveedores/?search=${encodeURIComponent(termino)}`);
            this.renderProveedoresTable(proveedoresFiltrados);
        } catch (error) {
            console.error('Error buscando proveedores:', error);
        }
    }

    async populateCategoriasSelect() {
        const select = document.getElementById('categoriasProveedor');
        if (!select) return;

        try {
            const categorias = await this.api.get('/categorias/');
            select.innerHTML = '';
            
            categorias.forEach(categoria => {
                const option = document.createElement('option');
                option.value = categoria.id;
                option.textContent = categoria.nombre;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error cargando categorías:', error);
        }
    }

    showProveedorForm(proveedor = null) {
        this.isEditing = !!proveedor;
        this.currentProveedorId = proveedor ? proveedor.id : null;
        
        const modal = document.getElementById('modalProveedor');
        const title = document.getElementById('modalTitleProveedor');
        const form = document.getElementById('proveedorForm');
        
        if (proveedor) {
            title.textContent = 'Editar Proveedor';
            this.populateForm(proveedor);
        } else {
            title.textContent = 'Nuevo Proveedor';
            form.reset();
            document.getElementById('direccionCounter').textContent = '0';
            document.getElementById('notasCounter').textContent = '0';
        }
        
        validator.clearFieldErrors(form);
        modal.classList.add('show');
        
        // Configurar validación en tiempo real
        validator.setupRealTimeValidation(form);
    }

    hideProveedorForm() {
        const modal = document.getElementById('modalProveedor');
        modal.classList.remove('show');
        this.isEditing = false;
        this.currentProveedorId = null;
    }

    populateForm(proveedor) {
        document.getElementById('nombreProveedor').value = proveedor.nombre || '';
        document.getElementById('contactoProveedor').value = proveedor.contacto || '';
        document.getElementById('telefonoProveedor').value = proveedor.telefono || '';
        document.getElementById('emailProveedor').value = proveedor.email || '';
        document.getElementById('direccionProveedor').value = proveedor.direccion || '';
        document.getElementById('estadoProveedor').value = proveedor.estado || 'activo';
        document.getElementById('notasProveedor').value = proveedor.notas || '';
        
        document.getElementById('direccionCounter').textContent = (proveedor.direccion || '').length;
        document.getElementById('notasCounter').textContent = (proveedor.notas || '').length;
        
        // Seleccionar categorías (si tu backend soporta categorías en proveedores)
        if (proveedor.categorias) {
            const categoriasSelect = document.getElementById('categoriasProveedor');
            Array.from(categoriasSelect.options).forEach(option => {
                option.selected = proveedor.categorias.includes(parseInt(option.value));
            });
        }
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        let proveedorData = Object.fromEntries(formData.entries());
        
        // Procesar categorías múltiples
        const categoriasSelect = document.getElementById('categoriasProveedor');
        proveedorData.categorias = Array.from(categoriasSelect.selectedOptions).map(option => parseInt(option.value));
        
        if (this.isEditing) {
            proveedorData.id = this.currentProveedorId;
        }

        // Validar
        const validation = this.validateProveedor(proveedorData);
        if (!validation.isValid) {
            validator.showFieldErrors(form, validation.errors);
            this.showNotification('Por favor corrige los errores en el formulario', 'error');
            return;
        }

        // Mostrar loading en el botón
        this.setFormLoading(true);

        try {
            let resultado;
            if (this.isEditing) {
                resultado = await this.api.put(`/proveedores/${this.currentProveedorId}/`, proveedorData);
            } else {
                resultado = await this.api.post('/proveedores/', proveedorData);
            }

            if (resultado) {
                this.showNotification(
                    `Proveedor ${this.isEditing ? 'actualizado' : 'agregado'} correctamente`,
                    'success'
                );
                this.hideProveedorForm();
                await this.renderDashboard();
                await this.renderProveedoresTable();
            } else {
                throw new Error('Error al guardar el proveedor');
            }
        } catch (error) {
            console.error('Error guardando proveedor:', error);
            this.showNotification('Error al guardar el proveedor: ' + error.message, 'error');
        } finally {
            this.setFormLoading(false);
        }
    }

    validateProveedor(proveedor) {
        const errors = {};
        let isValid = true;

        // Validación básica de campos requeridos
        if (!proveedor.nombre || proveedor.nombre.trim() === '') {
            errors.nombre = 'El nombre del proveedor es requerido';
            isValid = false;
        }

        if (!proveedor.contacto || proveedor.contacto.trim() === '') {
            errors.contacto = 'El contacto es requerido';
            isValid = false;
        }

        if (!proveedor.telefono || proveedor.telefono.trim() === '') {
            errors.telefono = 'El teléfono es requerido';
            isValid = false;
        }

        if (!proveedor.email || proveedor.email.trim() === '') {
            errors.email = 'El email es requerido';
            isValid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(proveedor.email)) {
            errors.email = 'Por favor ingrese un email válido';
            isValid = false;
        }

        return { isValid, errors };
    }

    setFormLoading(loading) {
        const btnSubmit = document.getElementById('btnSubmitProveedor');
        const btnLoading = document.getElementById('btnLoadingProveedor');
        const btnText = document.getElementById('btnTextProveedor');
        
        if (loading) {
            btnSubmit.disabled = true;
            btnLoading.style.display = 'inline-block';
            btnText.textContent = this.isEditing ? 'Actualizando...' : 'Guardando...';
        } else {
            btnSubmit.disabled = false;
            btnLoading.style.display = 'none';
            btnText.textContent = this.isEditing ? 'Actualizar Proveedor' : 'Guardar Proveedor';
        }
    }

    async editarProveedor(id) {
        try {
            const proveedor = await this.api.get(`/proveedores/${id}/`);
            if (proveedor) {
                this.showProveedorForm(proveedor);
            }
        } catch (error) {
            console.error('Error cargando proveedor:', error);
            this.showNotification('Error cargando proveedor', 'error');
        }
    }

    async verDetalles(id) {
        try {
            const [proveedor, productos] = await Promise.all([
                this.api.get(`/proveedores/${id}/`),
                this.api.get(`/productos/?proveedor=${id}`)
            ]);
            
            if (!proveedor) return;

            const modal = document.getElementById('modalDetallesProveedor');
            const title = document.getElementById('modalTitleDetalles');
            const content = document.getElementById('detallesProveedorContent');
            
            title.textContent = `Detalles: ${proveedor.nombre}`;
            
            content.innerHTML = `
                <div class="detalles-grid">
                    <div class="detalle-item">
                        <label>Nombre:</label>
                        <span>${this.escapeHtml(proveedor.nombre)}</span>
                    </div>
                    <div class="detalle-item">
                        <label>Contacto:</label>
                        <span>${this.escapeHtml(proveedor.contacto)}</span>
                    </div>
                    <div class="detalle-item">
                        <label>Teléfono:</label>
                        <span>${proveedor.telefono}</span>
                    </div>
                    <div class="detalle-item">
                        <label>Email:</label>
                        <span>${proveedor.email}</span>
                    </div>
                    <div class="detalle-item">
                        <label>Dirección:</label>
                        <span>${proveedor.direccion || 'No especificada'}</span>
                    </div>
                    <div class="detalle-item">
                        <label>Estado:</label>
                        <span class="status ${proveedor.estado === 'activo' ? 'in-stock' : 'out-of-stock'}">${proveedor.estado === 'activo' ? 'Activo' : 'Inactivo'}</span>
                    </div>
                    <div class="detalle-item full-width">
                        <label>Notas:</label>
                        <span>${proveedor.notas || 'No hay notas adicionales'}</span>
                    </div>
                </div>
                
                <div class="productos-proveedor" style="margin-top: 20px;">
                    <h4>Productos suministrados (${productos.length})</h4>
                    ${productos.length > 0 ? `
                        <ul>
                            ${productos.map(p => `<li>${this.escapeHtml(p.nombre)} - Stock: ${p.stock}</li>`).join('')}
                        </ul>
                    ` : '<p>Este proveedor no tiene productos asociados.</p>'}
                </div>
            `;
            
            modal.classList.add('show');
        } catch (error) {
            console.error('Error cargando detalles:', error);
            this.showNotification('Error cargando detalles del proveedor', 'error');
        }
    }

    hideDetallesModal() {
        const modal = document.getElementById('modalDetallesProveedor');
        modal.classList.remove('show');
    }

    confirmarEliminacion(id) {
        const modal = document.getElementById('modalConfirm');
        const message = document.getElementById('confirmMessage');
        const btnAccept = document.getElementById('btnConfirmAccept');
        
        let mensaje = `¿Está seguro de que desea eliminar este proveedor?`;
        
        message.textContent = mensaje;
        
        // Remover event listeners previos
        const newBtnAccept = btnAccept.cloneNode(true);
        btnAccept.parentNode.replaceChild(newBtnAccept, btnAccept);
        
        newBtnAccept.addEventListener('click', () => this.eliminarProveedor(id));
        modal.classList.add('show');
    }

    hideConfirmModal() {
        const modal = document.getElementById('modalConfirm');
        modal.classList.remove('show');
    }

    async eliminarProveedor(id) {
        this.hideConfirmModal();
        
        try {
            await this.api.delete(`/proveedores/${id}/`);
            
            this.showNotification('Proveedor eliminado correctamente', 'success');
            await this.renderDashboard();
            await this.renderProveedoresTable();
        } catch (error) {
            console.error('Error eliminando proveedor:', error);
            this.showNotification('Error al eliminar el proveedor: ' + error.message, 'error');
        }
    }

    async exportData() {
        try {
            const proveedores = await this.api.get('/proveedores/');
            const csvContent = this.convertToCSV(proveedores);
            this.downloadCSV(csvContent, 'proveedores_sushihouse.csv');
            this.showNotification('Datos exportados correctamente', 'success');
        } catch (error) {
            console.error('Error exportando datos:', error);
            this.showNotification('Error exportando datos', 'error');
        }
    }

    convertToCSV(data) {
        if (data.length === 0) return '';
        
        const headers = ['Nombre', 'Contacto', 'Teléfono', 'Email', 'Dirección', 'Estado', 'Productos'];
        const csvRows = [headers.join(',')];
        
        data.forEach(item => {
            const row = [
                `"${item.nombre}"`,
                `"${item.contacto}"`,
                `"${item.telefono}"`,
                `"${item.email}"`,
                `"${item.direccion || ''}"`,
                `"${item.estado}"`,
                '0' // Se podría obtener el count real
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
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Inicializar el manager de proveedores
let proveedoresManager;
document.addEventListener('DOMContentLoaded', () => {
    proveedoresManager = new ProveedoresManager();
});
