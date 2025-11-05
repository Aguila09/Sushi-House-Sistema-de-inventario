// Sistema de gestión de categorías
class CategoriasManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentSort = { field: 'nombre', direction: 'asc' };
        this.currentCategoriaId = null;
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
        document.getElementById('btnNuevaCategoria')?.addEventListener('click', () => this.showCategoriaForm());
        document.getElementById('btnCancelarCategoria')?.addEventListener('click', () => this.hideCategoriaForm());
        document.getElementById('btnCloseModalCategoria')?.addEventListener('click', () => this.hideCategoriaForm());
        document.getElementById('categoriaForm')?.addEventListener('submit', (e) => this.handleFormSubmit(e));
        document.getElementById('btnConfirmCancel')?.addEventListener('click', () => this.hideConfirmModal());
        
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideCategoriaForm();
                this.hideConfirmModal();
            }
        });

        document.querySelectorAll('th[data-sort]').forEach(th => {
            th.addEventListener('click', () => this.handleSort(th.dataset.sort));
        });
    }

    async loadInitialData() {
        this.showLoading();
        try {
            await this.renderDashboard();
            await this.renderCategoriasTable();
            this.hideLoading();
        } catch (error) {
            console.error('Error loading initial data:', error);
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

    async renderDashboard() {
        try {
            const categorias = await this.api.get('/categorias/');
            const productos = await this.api.get('/productos/');
            
            const totalCategorias = categorias.length;
            const categoriasActivas = categorias.filter(c => c.activo).length;
            const totalProductos = productos.length;
            
            document.getElementById('totalCategorias').textContent = totalCategorias;
            document.getElementById('categoriasActivas').textContent = categoriasActivas;
            document.getElementById('totalProductosCategorias').textContent = totalProductos;
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    }

    async renderCategoriasTable(categorias = null) {
        try {
            const categoriasToRender = categorias || await this.api.get('/categorias/');
            const tablaBody = document.getElementById('tablaCategorias');
            const tableEmpty = document.getElementById('tableEmptyCategorias');
            
            if (!tablaBody) return;

            const startIndex = (this.currentPage - 1) * this.itemsPerPage;
            const endIndex = startIndex + this.itemsPerPage;
            const paginatedCategorias = categoriasToRender.slice(startIndex, endIndex);

            tablaBody.innerHTML = '';

            if (paginatedCategorias.length === 0) {
                if (tableEmpty) tableEmpty.style.display = 'block';
                this.renderPagination(0);
                return;
            }

            if (tableEmpty) tableEmpty.style.display = 'none';

            for (const categoria of paginatedCategorias) {
                // Obtener conteo de productos para esta categoría
                const productos = await this.api.get(`/productos/?categoria=${categoria.id}`);
                const countProductos = productos.length;
                
                const fila = document.createElement('tr');
                fila.innerHTML = `
                    <td>${this.escapeHtml(categoria.nombre)}</td>
                    <td>${this.escapeHtml(categoria.descripcion || '')}</td>
                    <td>${countProductos}</td>
                    <td><span class="status ${categoria.activo ? 'in-stock' : 'out-of-stock'}">${categoria.activo ? 'Activa' : 'Inactiva'}</span></td>
                    <td class="actions">
                        <button class="btn btn-sm btn-warning" onclick="categoriasManager.editarCategoria(${categoria.id})">Editar</button>
                        <button class="btn btn-sm btn-danger" onclick="categoriasManager.confirmarEliminacion(${categoria.id})">Eliminar</button>
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

        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHTML = '';
        
        paginationHTML += `<button class="page-btn ${this.currentPage === 1 ? 'disabled' : ''}" 
            ${this.currentPage === 1 ? 'disabled' : ''} onclick="categoriasManager.changePage(${this.currentPage - 1})">« Anterior</button>`;
        
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                paginationHTML += `<button class="page-btn ${i === this.currentPage ? 'active' : ''}" 
                    onclick="categoriasManager.changePage(${i})">${i}</button>`;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                paginationHTML += '<span class="page-dots">...</span>';
            }
        }
        
        paginationHTML += `<button class="page-btn ${this.currentPage === totalPages ? 'disabled' : ''}" 
            ${this.currentPage === totalPages ? 'disabled' : ''} onclick="categoriasManager.changePage(${this.currentPage + 1})">Siguiente »</button>`;
        
        pagination.innerHTML = paginationHTML;
    }

    changePage(page) {
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
            const categorias = await this.api.get(`/categorias/?search=${termino}`);
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
            title.textContent = 'Editar Categoría';
            this.populateForm(categoria);
        } else {
            title.textContent = 'Nueva Categoría';
            form.reset();
            document.getElementById('descripcionCounter').textContent = '0';
        }
        
        validator.clearFieldErrors(form);
        if (modal) modal.classList.add('show');
        
        validator.setupRealTimeValidation(form);
    }

    hideCategoriaForm() {
        const modal = document.getElementById('modalCategoria');
        if (modal) modal.classList.remove('show');
        this.isEditing = false;
        this.currentCategoriaId = null;
    }

    populateForm(categoria) {
        document.getElementById('nombreCategoria').value = categoria.nombre || '';
        document.getElementById('descripcionCategoria').value = categoria.descripcion || '';
        document.getElementById('estadoCategoria').value = categoria.activo ? 'activa' : 'inactiva';
        document.getElementById('descripcionCounter').textContent = (categoria.descripcion || '').length;
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
            validator.showFieldErrors(form, validation.errors);
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
                this.renderDashboard();
                this.renderCategoriasTable();
            } else {
                throw new Error('Error al guardar la categoría');
            }
        } catch (error) {
            this.showNotification('Error al guardar la categoría: ' + error.message, 'error');
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
            this.showNotification('Error al cargar la categoría: ' + error.message, 'error');
        }
    }

    confirmarEliminacion(id) {
        this.showConfirmModal(
            `¿Está seguro de que desea eliminar esta categoría? Los productos asociados quedarán sin categoría.`,
            () => this.eliminarCategoria(id)
        );
    }

    hideConfirmModal() {
        const modal = document.getElementById('modalConfirm');
        if (modal) modal.classList.remove('show');
    }

    async eliminarCategoria(id) {
        this.hideConfirmModal();
        
        try {
            await this.api.delete(`/categorias/${id}/`);
            this.showNotification('Categoría eliminada correctamente', 'success');
            this.renderDashboard();
            this.renderCategoriasTable();
        } catch (error) {
            this.showNotification('Error al eliminar la categoría: ' + error.message, 'error');
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
        if (!unsafe) return '';
        return unsafe
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