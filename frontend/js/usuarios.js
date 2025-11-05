// Sistema de gestión de usuarios
class UsuariosManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentSort = { field: 'first_name', direction: 'asc' };
        this.currentUsuarioId = null;
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
        document.getElementById('btnNuevoUsuario')?.addEventListener('click', () => this.showUsuarioForm());
        document.getElementById('btnCancelarUsuario')?.addEventListener('click', () => this.hideUsuarioForm());
        document.getElementById('btnCloseModalUsuario')?.addEventListener('click', () => this.hideUsuarioForm());
        document.getElementById('btnExportUsuarios')?.addEventListener('click', () => this.exportData());
        document.getElementById('usuarioForm')?.addEventListener('submit', (e) => this.handleFormSubmit(e));
        document.getElementById('btnConfirmCancel')?.addEventListener('click', () => this.hideConfirmModal());
        
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideUsuarioForm();
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
            // usar allSettled para evitar que una promesa lenta bloquee todo
            const results = await Promise.allSettled([
                this.renderDashboard(),
                this.renderUsuariosTable()
            ]);
            results.forEach((r, idx) => {
                if (r.status === 'rejected') {
                    console.error(`loadInitialData: task ${idx} failed:`, r.reason);
                }
            });
        } catch (error) {
            console.error('Error loading initial data:', error);
        } finally {
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
        const tableLoading = document.getElementById('tableLoadingUsuarios');
        if (tableLoading) {
            tableLoading.style.display = 'flex';
        }
    }

    hideTableLoading() {
        const tableLoading = document.getElementById('tableLoadingUsuarios');
        if (tableLoading) {
            tableLoading.style.display = 'none';
        }
    }

    async renderDashboard() {
        try {
            const usuarios = await this.api.get('/usuarios/');
            
            const totalUsuarios = usuarios.length;
            const totalAdministradores = usuarios.filter(u => u.is_staff).length;
            const usuariosActivos = usuarios.filter(u => u.is_active).length;
            
            const hoy = new Date().toDateString();
            const accesosHoy = usuarios.filter(u => {
                if (!u.last_login) return false;
                const ultimoAccesoDate = new Date(u.last_login).toDateString();
                return ultimoAccesoDate === hoy;
            }).length;

            document.getElementById('totalUsuarios').textContent = totalUsuarios;
            document.getElementById('totalAdministradores').textContent = totalAdministradores;
            document.getElementById('usuariosActivos').textContent = usuariosActivos;
            document.getElementById('accesosHoy').textContent = accesosHoy;
        } catch (error) {
            console.error('Error loading user dashboard:', error);
        }
    }

    async renderUsuariosTable(usuarios = null) {
        this.showTableLoading();
        
        try {
            const usuariosToRender = usuarios || await this.api.get('/usuarios/');
            const tablaBody = document.getElementById('tablaUsuarios');
            const tableEmpty = document.getElementById('tableEmptyUsuarios');
            
            if (!tablaBody) return;

            const startIndex = (this.currentPage - 1) * this.itemsPerPage;
            const endIndex = startIndex + this.itemsPerPage;
            const paginatedUsuarios = usuariosToRender.slice(startIndex, endIndex);

            tablaBody.innerHTML = '';

            if (paginatedUsuarios.length === 0) {
                if (tableEmpty) tableEmpty.style.display = 'block';
                this.renderPagination(0);
                return;
            }

            if (tableEmpty) tableEmpty.style.display = 'none';

            for (const usuario of paginatedUsuarios) {
                const estado = usuario.is_active ? 'activo' : 'inactivo';
                const ultimoAcceso = usuario.last_login ? 
                    new Date(usuario.last_login).toLocaleString() : 'Nunca';
                const nombreCompleto = usuario.first_name && usuario.last_name 
                    ? `${usuario.first_name} ${usuario.last_name}`
                    : usuario.username;
                
                const fila = document.createElement('tr');
                fila.innerHTML = `
                    <td>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div class="avatar-small" style="background-color: ${this.getAvatarColor(nombreCompleto)}">${this.getInitials(nombreCompleto)}</div>
                            <strong>${this.escapeHtml(nombreCompleto)}</strong>
                        </div>
                    </td>
                    <td>${usuario.email}</td>
                    <td><span class="status ${this.getRolClass(usuario)}">${this.getRolText(usuario)}</span></td>
                    <td>${ultimoAcceso}</td>
                    <td><span class="status ${estado === 'activo' ? 'in-stock' : 'out-of-stock'}">${estado === 'activo' ? 'Activo' : 'Inactivo'}</span></td>
                    <td class="actions">
                        <button class="btn btn-sm btn-warning" onclick="usuariosManager.editarUsuario(${usuario.id})">Editar</button>
                        <button class="btn btn-sm btn-danger" onclick="usuariosManager.confirmarEliminacion(${usuario.id})" ${usuario.id === 1 ? 'disabled' : ''}>Eliminar</button>
                    </td>
                `;
                tablaBody.appendChild(fila);
            }

            this.renderPagination(usuariosToRender.length);
        } catch (error) {
            console.error('Error loading users:', error);
        } finally {
            // Aseguramos que el spinner de tabla siempre se oculte
            this.hideTableLoading();
        }
    }

    getAvatarColor(nombre) {
        const colors = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c', '#34495e'];
        const index = nombre.length % colors.length;
        return colors[index];
    }

    getInitials(nombre) {
        return nombre.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    }

    getRolClass(usuario) {
        if (usuario.is_superuser) return 'in-stock';
        if (usuario.is_staff) return 'low-stock';
        return 'out-of-stock';
    }

    getRolText(usuario) {
        if (usuario.is_superuser) return 'Super Admin';
        if (usuario.is_staff) return 'Administrador';
        return 'Usuario';
    }

    renderPagination(totalItems) {
        const pagination = document.getElementById('paginationUsuarios');
        if (!pagination) return;

        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHTML = '';
        
        paginationHTML += `<button class="page-btn ${this.currentPage === 1 ? 'disabled' : ''}" 
            ${this.currentPage === 1 ? 'disabled' : ''} onclick="usuariosManager.changePage(${this.currentPage - 1})">« Anterior</button>`;
        
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                paginationHTML += `<button class="page-btn ${i === this.currentPage ? 'active' : ''}" 
                    onclick="usuariosManager.changePage(${i})">${i}</button>`;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                paginationHTML += '<span class="page-dots">...</span>';
            }
        }
        
        paginationHTML += `<button class="page-btn ${this.currentPage === totalPages ? 'disabled' : ''}" 
            ${this.currentPage === totalPages ? 'disabled' : ''} onclick="usuariosManager.changePage(${this.currentPage + 1})">Siguiente »</button>`;
        
        pagination.innerHTML = paginationHTML;
    }

    changePage(page) {
        this.currentPage = page;
        this.renderUsuariosTable();
    }

    handleSort(field) {
        if (this.currentSort.field === field) {
            this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort.field = field;
            this.currentSort.direction = 'asc';
        }

        this.renderUsuariosTable();
        
        document.querySelectorAll('th[data-sort]').forEach(th => {
            th.innerHTML = th.innerHTML.replace(' ↗', '').replace(' ↘', '');
            if (th.dataset.sort === field) {
                th.innerHTML += this.currentSort.direction === 'asc' ? ' ↗' : ' ↘';
            }
        });
    }

    setupRealTimeSearch() {
        const searchInput = document.getElementById('searchInputUsuarios');
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
            const usuarios = await this.api.get(`/usuarios/?search=${termino}`);
            this.renderUsuariosTable(usuarios);
        } catch (error) {
            console.error('Error searching users:', error);
        }
    }

    showUsuarioForm(usuario = null) {
        this.isEditing = !!usuario;
        this.currentUsuarioId = usuario ? usuario.id : null;
        
        const modal = document.getElementById('modalUsuario');
        const title = document.getElementById('modalTitleUsuario');
        const form = document.getElementById('usuarioForm');
        
        if (usuario) {
            title.textContent = 'Editar Usuario';
            this.populateForm(usuario);
        } else {
            title.textContent = 'Nuevo Usuario';
            form.reset();
        }
        
        this.togglePasswordFields();
        validator.clearFieldErrors(form);
        modal.classList.add('show');
        
        validator.setupRealTimeValidation(form);
    }

    hideUsuarioForm() {
        const modal = document.getElementById('modalUsuario');
        modal.classList.remove('show');
        this.isEditing = false;
        this.currentUsuarioId = null;
    }

    togglePasswordFields() {
        const contrasenaFields = document.getElementById('contrasenaFields');
        const contrasenaInput = document.getElementById('contrasenaUsuario');
        const confirmarInput = document.getElementById('confirmarContrasena');
        
        if (this.isEditing) {
            contrasenaFields.style.display = 'none';
            contrasenaInput.removeAttribute('required');
            confirmarInput.removeAttribute('required');
        } else {
            contrasenaFields.style.display = 'grid';
            contrasenaInput.setAttribute('required', 'required');
            confirmarInput.setAttribute('required', 'required');
        }
    }

    populateForm(usuario) {
        document.getElementById('nombreUsuario').value = usuario.first_name || '';
        document.getElementById('emailUsuario').value = usuario.email || '';
        document.getElementById('rolUsuario').value = usuario.is_staff ? 'admin' : 'usuario';
        document.getElementById('estadoUsuario').value = usuario.is_active ? 'activo' : 'inactivo';
        document.getElementById('telefonoUsuario').value = usuario.telefono || '';
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const usuarioData = Object.fromEntries(formData.entries());
        
        if (this.isEditing) {
            usuarioData.id = this.currentUsuarioId;
        }

        const validation = validator.validateUsuario(usuarioData);
        if (!validation.isValid) {
            validator.showFieldErrors(form, validation.errors);
            this.showNotification('Por favor corrige los errores en el formulario', 'error');
            return;
        }

        this.setFormLoading(true);

        try {
            let resultado;
            if (this.isEditing) {
                resultado = await this.api.put(`/usuarios/${this.currentUsuarioId}/`, usuarioData);
            } else {
                resultado = await this.api.post('/usuarios/', usuarioData);
            }

            if (resultado) {
                this.showNotification(
                    `Usuario ${this.isEditing ? 'actualizado' : 'agregado'} correctamente`,
                    'success'
                );
                this.hideUsuarioForm();
                this.renderDashboard();
                this.renderUsuariosTable();
            } else {
                throw new Error('Error al guardar el usuario');
            }
        } catch (error) {
            this.showNotification('Error al guardar el usuario: ' + error.message, 'error');
        } finally {
            this.setFormLoading(false);
        }
    }

    setFormLoading(loading) {
        const btnSubmit = document.getElementById('btnSubmitUsuario');
        const btnLoading = document.getElementById('btnLoadingUsuario');
        const btnText = document.getElementById('btnTextUsuario');
        
        if (loading) {
            btnSubmit.disabled = true;
            btnLoading.style.display = 'inline-block';
            btnText.textContent = this.isEditing ? 'Actualizando...' : 'Guardando...';
        } else {
            btnSubmit.disabled = false;
            btnLoading.style.display = 'none';
            btnText.textContent = this.isEditing ? 'Actualizar Usuario' : 'Guardar Usuario';
        }
    }

    async editarUsuario(id) {
        try {
            const usuario = await this.api.get(`/usuarios/${id}/`);
            if (usuario) {
                this.showUsuarioForm(usuario);
            }
        } catch (error) {
            this.showNotification('Error al cargar el usuario: ' + error.message, 'error');
        }
    }

    confirmarEliminacion(id) {
        this.showConfirmModal(
            `¿Está seguro de que desea eliminar este usuario? Esta acción no se puede deshacer.`,
            () => this.eliminarUsuario(id)
        );
    }

    hideConfirmModal() {
        const modal = document.getElementById('modalConfirm');
        modal.classList.remove('show');
    }

    async eliminarUsuario(id) {
        this.hideConfirmModal();
        
        try {
            await this.api.delete(`/usuarios/${id}/`);
            this.showNotification('Usuario eliminado correctamente', 'success');
            this.renderDashboard();
            this.renderUsuariosTable();
        } catch (error) {
            this.showNotification('Error al eliminar el usuario: ' + error.message, 'error');
        }
    }

    async exportData() {
        try {
            const usuarios = await this.api.get('/usuarios/');
            const csvContent = this.convertToCSV(usuarios);
            this.downloadCSV(csvContent, 'usuarios_sushihouse.csv');
            this.showNotification('Datos exportados correctamente', 'success');
        } catch (error) {
            this.showNotification('Error al exportar datos: ' + error.message, 'error');
        }
    }

    convertToCSV(data) {
        if (data.length === 0) return '';
        
        const headers = ['Nombre', 'Email', 'Rol', 'Estado', 'Teléfono', 'Último Acceso'];
        const csvRows = [headers.join(',')];
        
        data.forEach(item => {
            const nombreCompleto = item.first_name && item.last_name 
                ? `${item.first_name} ${item.last_name}`
                : item.username;
            const row = [
                `"${nombreCompleto}"`,
                `"${item.email}"`,
                `"${this.getRolText(item)}"`,
                `"${item.is_active ? 'Activo' : 'Inactivo'}"`,
                `"${item.telefono || ''}"`,
                `"${item.last_login ? new Date(item.last_login).toLocaleString() : 'Nunca'}"`
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

let usuariosManager;
document.addEventListener('DOMContentLoaded', () => {
    usuariosManager = new UsuariosManager();
});
