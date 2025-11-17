// Sistema de gestión de categorías
class CategoriasManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentSort = { field: 'nombre', direction: 'asc' };
        this.currentCategoriaId = null;
        this.isEditing = false;
        this.api = apiClient;
        // referencia para controlar listeners del confirm modal
        this._confirmHandlers = { accept: null, cancel: null };
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadInitialData();
        this.setupRealTimeSearch();
    }

    bindEvents() {
        document.getElementById('btnNuevaCategoria')?.addEventListener('click', () => this.showCategoriaForm());
        document.getElementById('btnCancelarCategoria')?.addEventListener('click', () => this.hideCategoriaForm());
        document.getElementById('btnCloseModalCategoria')?.addEventListener('click', () => this.hideCategoriaForm());
        document.getElementById('categoriaForm')?.addEventListener('submit', (e) => this.handleFormSubmit(e));
        document.getElementById('btnConfirmCancel')?.addEventListener('click', () => this.hideConfirmModal());
        
        // Cerrar modales al click en el overlay (si el objetivo tiene clase 'modal')
        document.addEventListener('click', (e) => {
            if (e.target && e.target.classList && e.target.classList.contains('modal')) {
                this.hideCategoriaForm();
                this.hideConfirmModal();
            }
        });

        // Sort headers
        document.querySelectorAll('th[data-sort]').forEach(th => {
            th.addEventListener('click', () => this.handleSort(th.dataset.sort));
        });
    }

    async loadInitialData() {
        Loading.show();
        try {
            await this.renderDashboard();
            await this.renderCategoriasTable();
            Loading.hide();
        } catch (error) {
            console.error('Error loading initial data:', error);
            Loading.hide();
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

    async renderDashboard() {
        try {
            const categorias = await this.api.get('/categorias/');
            const productos = await this.api.get('/productos/');
            
            const totalCategorias = Array.isArray(categorias) ? categorias.length : 0;
            const categoriasActivas = (categorias || []).filter(c => c && c.activo).length;
            const totalProductos = Array.isArray(productos) ? productos.length : 0;
            
            const elTotal = document.getElementById('totalCategorias');
            const elActivas = document.getElementById('categoriasActivas');
            const elProductos = document.getElementById('totalProductosCategorias');

            if (elTotal) elTotal.textContent = String(totalCategorias);
            if (elActivas) elActivas.textContent = String(categoriasActivas);
            if (elProductos) elProductos.textContent = String(totalProductos);
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    }

    async renderCategoriasTable(categorias = null) {
        try {
            const categoriasData = categorias || await this.api.get('/categorias/');
            const categoriasToRender = Array.isArray(categoriasData) ? categoriasData : (categoriasData && categoriasData.results ? categoriasData.results : []);
            const tablaBody = document.getElementById('tablaCategorias');
            const tableEmpty = document.getElementById('tableEmptyCategorias');
            
            if (!tablaBody) return;

            const startIndex = (this.currentPage - 1) * this.itemsPerPage;
            const endIndex = startIndex + this.itemsPerPage;
            const paginatedCategorias = (categoriasToRender || []).slice(startIndex, endIndex);

            tablaBody.innerHTML = '';

            if (!paginatedCategorias || paginatedCategorias.length === 0) {
                if (tableEmpty) tableEmpty.style.display = 'block';
                this.renderPagination(0);
                return;
            }

            if (tableEmpty) tableEmpty.style.display = 'none';

            for (const categoria of paginatedCategorias) {
                // Obtener conteo de productos para esta categoría (si falla, asumir 0)
                let productos = [];
                try {
                    productos = await this.api.get(`/productos/?categoria=${categoria.id}`);
                } catch (err) {
                    productos = [];
                }
                const countProductos = Array.isArray(productos) ? productos.length : (productos && productos.count ? productos.count : 0);
                
                const fila = document.createElement('tr');
                fila.setAttribute('data-id', categoria.id);
                fila.innerHTML = `
                    <td>${this.escapeHtml(categoria.nombre)}</td>
                    <td>${this.escapeHtml(categoria.descripcion || '')}</td>
                    <td>${countProductos}</td>
                    <td><span class="status ${categoria.activo ? 'in-stock' : 'out-of-stock'}">${categoria.activo ? 'Activa' : 'Inactiva'}</span></td>
                    <td class="actions">
                        <button class="btn btn-sm btn-warning" type="button" onclick="categoriasManager.editarCategoria(${categoria.id})">Editar</button>
                        <button class="btn btn-sm btn-danger" type="button" onclick="categoriasManager.confirmarEliminacion(${categoria.id})">Eliminar</button>
                    </td>
                `;
                tablaBody.appendChild(fila);
            }

            this.renderPagination(categoriasToRender.length);
        } catch (error) {
            console.error('Error rendering categories:', error);
        }
    }

    renderPagination(totalItems) {
        const pagination = document.getElementById('paginationCategorias');
        if (!pagination) return;

        const totalPages = Math.max(1, Math.ceil(totalItems / this.itemsPerPage));
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHTML = '';
        
        paginationHTML += `<button class="page-btn ${this.currentPage === 1 ? 'disabled' : ''}" 
            ${this.currentPage === 1 ? 'disabled' : ''} onclick="categoriasManager.changePage(${Math.max(1, this.currentPage - 1)})">« Anterior</button>`;
        
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                paginationHTML += `<button class="page-btn ${i === this.currentPage ? 'active' : ''}" 
                    onclick="categoriasManager.changePage(${i})">${i}</button>`;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                paginationHTML += '<span class="page-dots">...</span>';
            }
        }
        
        paginationHTML += `<button class="page-btn ${this.currentPage === totalPages ? 'disabled' : ''}" 
            ${this.currentPage === totalPages ? 'disabled' : ''} onclick="categoriasManager.changePage(${Math.min(totalPages, this.currentPage + 1)})">Siguiente »</button>`;
        
        pagination.innerHTML = paginationHTML;
    }

    changePage(page) {
        if (!page || page < 1) page = 1;
        this.currentPage = page;
        this.renderCategoriasTable();
    }

    handleSort(field) {
        if (this.currentSort.field === field) {
            this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort.field = field;
            this.currentSort.direction = 'asc';
        }

        this.renderCategoriasTable();
        
        document.querySelectorAll('th[data-sort]').forEach(th => {
            th.innerHTML = th.innerHTML.replace(' ↗', '').replace(' ↘', '');
            if (th.dataset.sort === field) {
                th.innerHTML += this.currentSort.direction === 'asc' ? ' ↗' : ' ↘';
            }
        });
    }

    setupRealTimeSearch() {
        const searchInput = document.getElementById('searchInputCategorias');
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
            const categorias = await this.api.get(`/categorias/?search=${encodeURIComponent(termino)}`);
            this.renderCategoriasTable(categorias);
        } catch (error) {
            console.error('Error searching categories:', error);
        }
    }

    showCategoriaForm(categoria = null) {
        this.isEditing = !!categoria;
        this.currentCategoriaId = categoria ? categoria.id : null;
        
        const modal = document.getElementById('modalCategoria');
        const title = document.getElementById('modalTitleCategoria');
        const form = document.getElementById('categoriaForm');
        
        if (categoria) {
            if (title) title.textContent = 'Editar Categoría';
            this.populateForm(categoria);
        } else {
            if (title) title.textContent = 'Nueva Categoría';
            form && form.reset();
            const descCounter = document.getElementById('descripcionCounter');
            if (descCounter) descCounter.textContent = '0';
        }
        
        if (typeof validator !== 'undefined' && validator.clearFieldErrors) {
            try { validator.clearFieldErrors(form); } catch(e){}
        }
        if (modal) modal.classList.add('show');
        
        if (typeof validator !== 'undefined' && validator.setupRealTimeValidation) {
            try { validator.setupRealTimeValidation(form); } catch(e){}
        }
    }

    hideCategoriaForm() {
        const modal = document.getElementById('modalCategoria');
        if (modal) modal.classList.remove('show');
        this.isEditing = false;
        this.currentCategoriaId = null;
    }

    populateForm(categoria) {
        const nombreEl = document.getElementById('nombreCategoria');
        const descEl = document.getElementById('descripcionCategoria');
        const estadoEl = document.getElementById('estadoCategoria');
        const descCounter = document.getElementById('descripcionCounter');

        if (nombreEl) nombreEl.value = categoria.nombre || '';
        if (descEl) descEl.value = categoria.descripcion || '';
        if (estadoEl) estadoEl.value = categoria.activo ? 'activa' : 'inactiva';
        if (descCounter) descCounter.textContent = String((categoria.descripcion || '').length);
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const categoriaData = Object.fromEntries(formData.entries());
        
        categoriaData.activo = categoriaData.estado === 'activa';
        delete categoriaData.estado;

        if (this.isEditing) {
            categoriaData.id = this.currentCategoriaId;
        }

        const validation = this.validateCategoria(categoriaData);
        if (!validation.isValid) {
            if (typeof validator !== 'undefined' && validator.showFieldErrors) {
                try { validator.showFieldErrors(form, validation.errors); } catch(e){}
            }
            this.showNotification('Por favor corrige los errores en el formulario', 'error');
            return;
        }

        this.setFormLoading(true);

        try {
            let resultado;
            if (this.isEditing) {
                resultado = await this.api.put(`/categorias/${this.currentCategoriaId}/`, categoriaData);
            } else {
                resultado = await this.api.post('/categorias/', categoriaData);
            }

            if (resultado) {
                this.showNotification(
                    `Categoría ${this.isEditing ? 'actualizada' : 'agregada'} correctamente`,
                    'success'
                );
                this.hideCategoriaForm();
                await this.renderDashboard();
                await this.renderCategoriasTable();
            } else {
                throw new Error('Error al guardar la categoría');
            }
        } catch (error) {
            this.showNotification('Error al guardar la categoría: ' + (error && error.message ? error.message : error), 'error');
        } finally {
            this.setFormLoading(false);
        }
    }

    validateCategoria(categoria) {
        const errors = {};
        let isValid = true;

        if (!categoria.nombre || categoria.nombre.trim() === '') {
            errors.nombreCategoria = 'El nombre de la categoría es requerido';
            isValid = false;
        }

        if (categoria.descripcion && categoria.descripcion.length > 500) {
            errors.descripcionCategoria = 'La descripción no puede exceder los 500 caracteres';
            isValid = false;
        }

        return { isValid, errors };
    }

    setFormLoading(loading) {
        const btnSubmit = document.getElementById('btnSubmitCategoria');
        const btnLoading = document.getElementById('btnLoadingCategoria');
        const btnText = document.getElementById('btnTextCategoria');
        
        if (btnSubmit && btnLoading && btnText) {
            if (loading) {
                btnSubmit.disabled = true;
                btnLoading.style.display = 'inline-block';
                btnText.textContent = this.isEditing ? 'Actualizando...' : 'Guardando...';
            } else {
                btnSubmit.disabled = false;
                btnLoading.style.display = 'none';
                btnText.textContent = this.isEditing ? 'Actualizar Categoría' : 'Guardar Categoría';
            }
        }
    }

    async editarCategoria(id) {
        try {
            const categoria = await this.api.get(`/categorias/${id}/`);
            if (categoria) {
                this.showCategoriaForm(categoria);
            }
        } catch (error) {
            this.showNotification('Error al cargar la categoría: ' + (error && error.message ? error.message : error), 'error');
        }
    }

    async confirmarEliminacion(id) {
        // Usar sistema de confirmación global
        const confirmed = await (window.confirmCriticalAction 
            ? window.confirmCriticalAction('¿Está seguro de que desea eliminar esta categoría? Los productos asociados quedarán sin categoría.')
            : confirm('¿Está seguro de que desea eliminar esta categoría?')
        );
        
        if (confirmed) {
            this.eliminarCategoria(id);
        }
    }

    // Modal de confirmación reutilizable (implementado para evitar dependencias con otros módulos)
    showConfirmModal(message = '¿Confirmar acción?', onAccept = () => {}, onCancel = () => {}) {
        const confirmModal = document.getElementById('modalConfirm');
        if (!confirmModal) {
            // fallback a confirm nativo
            if (confirm(message)) onAccept();
            else onCancel();
            return;
        }

        const confirmMessage = confirmModal.querySelector('#confirmMessage');
        const btnAccept = confirmModal.querySelector('#btnConfirmAccept');
        const btnCancel = confirmModal.querySelector('#btnConfirmCancel');

        if (confirmMessage) confirmMessage.textContent = message;

        // mostrar modal centrado usando la clase 'show'
        confirmModal.classList.add('show');
        confirmModal.setAttribute('aria-hidden', 'false');

        // limpiar handlers previos
        try {
            if (this._confirmHandlers.accept && btnAccept) btnAccept.removeEventListener('click', this._confirmHandlers.accept);
        } catch(e){}
        try {
            if (this._confirmHandlers.cancel && btnCancel) btnCancel.removeEventListener('click', this._confirmHandlers.cancel);
        } catch(e){}

        // definir nuevos handlers (guardarlos para poder removerlos luego)
        const acceptHandler = (ev) => {
            ev && ev.preventDefault && ev.preventDefault();
            // cerrar y ejecutar
            this.hideConfirmModal();
            try { onAccept(); } catch(e){ console.error(e); }
        };
        const cancelHandler = (ev) => {
            ev && ev.preventDefault && ev.preventDefault();
            this.hideConfirmModal();
            try { onCancel(); } catch(e){ console.error(e); }
        };

        // guardar referencias
        this._confirmHandlers.accept = acceptHandler;
        this._confirmHandlers.cancel = cancelHandler;

        // ligar listeners
        if (btnAccept) btnAccept.addEventListener('click', acceptHandler);
        if (btnCancel) btnCancel.addEventListener('click', cancelHandler);
    }

    hideConfirmModal() {
        const modal = document.getElementById('modalConfirm');
        if (modal) modal.classList.remove('show');

        // remover handlers si estaban ligados
        try {
            const btnAccept = document.querySelector('#btnConfirmAccept');
            const btnCancel = document.querySelector('#btnConfirmCancel');
            if (this._confirmHandlers.accept && btnAccept) btnAccept.removeEventListener('click', this._confirmHandlers.accept);
            if (this._confirmHandlers.cancel && btnCancel) btnCancel.removeEventListener('click', this._confirmHandlers.cancel);
        } catch (e) {
            // ignore
        }

        this._confirmHandlers.accept = null;
        this._confirmHandlers.cancel = null;
    }

    async eliminarCategoria(id) {
        this.hideConfirmModal();
        
        try {
            await this.api.delete(`/categorias/${id}/`);
            this.showNotification('Categoría eliminada correctamente', 'success');
            await this.renderDashboard();
            await this.renderCategoriasTable();
        } catch (error) {
            this.showNotification('Error al eliminar la categoría: ' + (error && error.message ? error.message : error), 'error');
        }
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
        if (unsafe === null || unsafe === undefined) return '';
        return String(unsafe)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

let categoriasManager;
document.addEventListener('DOMContentLoaded', () => {
    categoriasManager = new CategoriasManager();
});
