// Sistema de gestión de proveedores
class ProveedoresManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentSort = { field: 'nombre', direction: 'asc' };
        this.currentProveedorId = null;
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

    loadInitialData() {
        this.showLoading();
        
        // Simular carga de datos
        setTimeout(() => {
            this.renderDashboard();
            this.renderProveedoresTable();
            this.populateCategoriasSelect();
            this.hideLoading();
        }, 1000);
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

    renderDashboard() {
        const proveedores = storage.getProveedores();
        const productos = storage.getProductos();
        
        const totalProveedores = proveedores.length;
        const totalProductosProveedores = productos.length;
        
        // Calcular proveedores destacados (con más productos)
        const proveedoresConProductos = {};
        productos.forEach(producto => {
            if (producto.proveedor) {
                proveedoresConProductos[producto.proveedor] = (proveedoresConProductos[producto.proveedor] || 0) + 1;
            }
        });
        
        const proveedoresDestacados = Object.keys(proveedoresConProductos).length;
        const pedidosPendientes = 0; // Esto vendría de un sistema de pedidos

        document.getElementById('totalProveedores').textContent = totalProveedores;
        document.getElementById('totalProductosProveedores').textContent = totalProductosProveedores;
        document.getElementById('proveedoresDestacados').textContent = proveedoresDestacados;
        document.getElementById('pedidosPendientes').textContent = pedidosPendientes;
    }

    renderProveedoresTable(proveedores = null) {
        this.showTableLoading();
        
        setTimeout(() => {
            const tablaBody = document.getElementById('tablaProveedores');
            const tableEmpty = document.getElementById('tableEmptyProveedores');
            
            if (!tablaBody) return;

            const proveedoresToRender = proveedores || storage.getProveedores();
            const startIndex = (this.currentPage - 1) * this.itemsPerPage;
            const endIndex = startIndex + this.itemsPerPage;
            const paginatedProveedores = proveedoresToRender.slice(startIndex, endIndex);

            tablaBody.innerHTML = '';

            if (paginatedProveedores.length === 0) {
                tableEmpty.style.display = 'block';
                this.renderPagination(0);
                this.hideTableLoading();
                return;
            }

            tableEmpty.style.display = 'none';

            paginatedProveedores.forEach(proveedor => {
                const productosCount = this.getProductosCountByProveedor(proveedor.id);
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
            });

            this.renderPagination(proveedoresToRender.length);
            this.hideTableLoading();
        }, 500);
    }

    getProductosCountByProveedor(proveedorId) {
        const productos = storage.getProductos();
        return productos.filter(p => p.proveedor == proveedorId).length;
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
        const totalPages = Math.ceil(storage.getProveedores().length / this.itemsPerPage);
        if (page < 1 || page > totalPages) return;
        
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

        const proveedores = storage.getProveedores();
        const sortedProveedores = this.sortProveedores(proveedores, this.currentSort.field, this.currentSort.direction);
        this.renderProveedoresTable(sortedProveedores);
        
        // Actualizar indicador visual en el header
        document.querySelectorAll('th[data-sort]').forEach(th => {
            th.innerHTML = th.innerHTML.replace(' ↗', '').replace(' ↘', '');
            if (th.dataset.sort === field) {
                th.innerHTML += this.currentSort.direction === 'asc' ? ' ↗' : ' ↘';
            }
        });
    }

    sortProveedores(proveedores, field, direction) {
        return [...proveedores].sort((a, b) => {
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

    handleSearch(termino) {
        this.currentPage = 1;
        const proveedores = storage.getProveedores();
        const proveedoresFiltrados = proveedores.filter(proveedor => 
            proveedor.nombre.toLowerCase().includes(termino.toLowerCase()) ||
            proveedor.contacto.toLowerCase().includes(termino.toLowerCase()) ||
            proveedor.email.toLowerCase().includes(termino.toLowerCase()) ||
            proveedor.telefono.includes(termino)
        );
        this.renderProveedoresTable(proveedoresFiltrados);
    }

    populateCategoriasSelect() {
        const select = document.getElementById('categoriasProveedor');
        if (!select) return;

        const categorias = storage.getCategorias();
        select.innerHTML = '';
        
        categorias.forEach(categoria => {
            const option = document.createElement('option');
            option.value = categoria.id;
            option.textContent = categoria.nombre;
            select.appendChild(option);
        });
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
        
        // Seleccionar categorías
        if (proveedor.categorias) {
            const categoriasSelect = document.getElementById('categoriasProveedor');
            Array.from(categoriasSelect.options).forEach(option => {
                option.selected = proveedor.categorias.includes(option.value);
            });
        }
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const proveedorData = Object.fromEntries(formData.entries());
        
        // Procesar categorías múltiples
        const categoriasSelect = document.getElementById('categoriasProveedor');
        proveedorData.categorias = Array.from(categoriasSelect.selectedOptions).map(option => option.value);
        
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
            // Simular delay de red
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            let resultado;
            if (this.isEditing) {
                resultado = this.actualizarProveedor(this.currentProveedorId, proveedorData);
            } else {
                resultado = this.agregarProveedor(proveedorData);
            }

            if (resultado) {
                this.showNotification(
                    `Proveedor ${this.isEditing ? 'actualizado' : 'agregado'} correctamente`,
                    'success'
                );
                this.hideProveedorForm();
                this.renderDashboard();
                this.renderProveedoresTable();
            } else {
                throw new Error('Error al guardar el proveedor');
            }
        } catch (error) {
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

        // Validación de nombre único
        const proveedores = storage.getProveedores();
        const nombreExiste = proveedores.some(p => 
            p.nombre.toLowerCase() === proveedor.nombre.toLowerCase() && 
            p.id !== (proveedor.id || null)
        );

        if (nombreExiste) {
            errors.nombre = 'Ya existe un proveedor con este nombre';
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

    agregarProveedor(proveedorData) {
        const proveedores = storage.getProveedores();
        const nuevoId = proveedores.length > 0 ? Math.max(...proveedores.map(p => p.id)) + 1 : 1;
        
        const nuevoProveedor = {
            id: nuevoId,
            ...proveedorData,
            fechaCreacion: new Date().toISOString()
        };
        
        proveedores.push(nuevoProveedor);
        return storage.setProveedores(proveedores) ? nuevoProveedor : null;
    }

    actualizarProveedor(id, datosActualizados) {
        const proveedores = storage.getProveedores();
        const index = proveedores.findIndex(p => p.id === id);
        if (index !== -1) {
            proveedores[index] = { 
                ...proveedores[index], 
                ...datosActualizados, 
                fechaActualizacion: new Date().toISOString() 
            };
            return storage.setProveedores(proveedores);
        }
        return false;
    }

    editarProveedor(id) {
        const proveedores = storage.getProveedores();
        const proveedor = proveedores.find(p => p.id === id);
        if (proveedor) {
            this.showProveedorForm(proveedor);
        }
    }

    verDetalles(id) {
        const proveedores = storage.getProveedores();
        const proveedor = proveedores.find(p => p.id === id);
        const productos = storage.getProductos();
        const productosProveedor = productos.filter(p => p.proveedor == id);
        
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
                <h4>Productos suministrados (${productosProveedor.length})</h4>
                ${productosProveedor.length > 0 ? `
                    <ul>
                        ${productosProveedor.map(p => `<li>${this.escapeHtml(p.nombre)} - Stock: ${p.stock}</li>`).join('')}
                    </ul>
                ` : '<p>Este proveedor no tiene productos asociados.</p>'}
            </div>
        `;
        
        modal.classList.add('show');
    }

    hideDetallesModal() {
        const modal = document.getElementById('modalDetallesProveedor');
        modal.classList.remove('show');
    }

    confirmarEliminacion(id) {
        const proveedores = storage.getProveedores();
        const proveedor = proveedores.find(p => p.id === id);
        const productos = storage.getProductos();
        const productosAsociados = productos.filter(p => p.proveedor == id);
        
        if (!proveedor) return;

        const modal = document.getElementById('modalConfirm');
        const message = document.getElementById('confirmMessage');
        const btnAccept = document.getElementById('btnConfirmAccept');
        
        let mensaje = `¿Está seguro de que desea eliminar el proveedor "${proveedor.nombre}"?`;
        
        if (productosAsociados.length > 0) {
            mensaje += `\n\nADVERTENCIA: Este proveedor tiene ${productosAsociados.length} producto(s) asociado(s). Al eliminar el proveedor, estos productos quedarán sin proveedor asignado.`;
        }
        
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
            // Simular delay de red
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const resultado = this.eliminarProveedorStorage(id);
            
            if (resultado) {
                this.showNotification('Proveedor eliminado correctamente', 'success');
                this.renderDashboard();
                this.renderProveedoresTable();
            } else {
                throw new Error('Error al eliminar el proveedor');
            }
        } catch (error) {
            this.showNotification('Error al eliminar el proveedor: ' + error.message, 'error');
        }
    }

    eliminarProveedorStorage(id) {
        const proveedores = storage.getProveedores();
        const nuevosProveedores = proveedores.filter(p => p.id !== id);
        
        // Actualizar productos que tenían este proveedor
        const productos = storage.getProductos();
        productos.forEach(producto => {
            if (producto.proveedor == id) {
                producto.proveedor = null;
            }
        });
        storage.setProductos(productos);
        
        return storage.setProveedores(nuevosProveedores);
    }

    exportData() {
        const proveedores = storage.getProveedores();
        const csvContent = this.convertToCSV(proveedores);
        this.downloadCSV(csvContent, 'proveedores_restocontrol.csv');
        this.showNotification('Datos exportados correctamente', 'success');
    }

    convertToCSV(data) {
        if (data.length === 0) return '';
        
        const headers = ['Nombre', 'Contacto', 'Teléfono', 'Email', 'Dirección', 'Estado', 'Productos'];
        const csvRows = [headers.join(',')];
        
        data.forEach(item => {
            const productosCount = this.getProductosCountByProveedor(item.id);
            const row = [
                `"${item.nombre}"`,
                `"${item.contacto}"`,
                `"${item.telefono}"`,
                `"${item.email}"`,
                `"${item.direccion || ''}"`,
                `"${item.estado}"`,
                productosCount
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