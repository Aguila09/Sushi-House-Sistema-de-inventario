// Sistema de gestión de usuarios
class UsuariosManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentSort = { field: 'nombre', direction: 'asc' };
        this.currentUsuarioId = null;
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
        document.getElementById('btnNuevoUsuario')?.addEventListener('click', () => this.showUsuarioForm());
        document.getElementById('btnCancelarUsuario')?.addEventListener('click', () => this.hideUsuarioForm());
        document.getElementById('btnCloseModalUsuario')?.addEventListener('click', () => this.hideUsuarioForm());
        document.getElementById('btnExportUsuarios')?.addEventListener('click', () => this.exportData());

        // Formulario
        document.getElementById('usuarioForm')?.addEventListener('submit', (e) => this.handleFormSubmit(e));

        // Mostrar/ocultar campos de contraseña según edición
        document.getElementById('modalUsuario')?.addEventListener('show', () => {
            this.togglePasswordFields();
        });

        // Modal de confirmación
        document.getElementById('btnConfirmCancel')?.addEventListener('click', () => this.hideConfirmModal());
        
        // Cerrar modal al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideUsuarioForm();
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
            this.renderUsuariosTable();
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

    renderDashboard() {
        const usuarios = storage.getUsuarios();
        
        const totalUsuarios = usuarios.length;
        const totalAdministradores = usuarios.filter(u => u.rol === 'admin').length;
        const usuariosActivos = usuarios.filter(u => u.estado === 'activo').length;
        
        // Calcular accesos de hoy (simulado)
        const hoy = new Date().toDateString();
        const accesosHoy = usuarios.filter(u => {
            if (!u.ultimoAcceso) return false;
            const ultimoAccesoDate = new Date(u.ultimoAcceso).toDateString();
            return ultimoAccesoDate === hoy;
        }).length;

        document.getElementById('totalUsuarios').textContent = totalUsuarios;
        document.getElementById('totalAdministradores').textContent = totalAdministradores;
        document.getElementById('usuariosActivos').textContent = usuariosActivos;
        document.getElementById('accesosHoy').textContent = accesosHoy;
    }

    renderUsuariosTable(usuarios = null) {
        this.showTableLoading();
        
        setTimeout(() => {
            const tablaBody = document.getElementById('tablaUsuarios');
            const tableEmpty = document.getElementById('tableEmptyUsuarios');
            
            if (!tablaBody) return;

            const usuariosToRender = usuarios || storage.getUsuarios();
            const startIndex = (this.currentPage - 1) * this.itemsPerPage;
            const endIndex = startIndex + this.itemsPerPage;
            const paginatedUsuarios = usuariosToRender.slice(startIndex, endIndex);

            tablaBody.innerHTML = '';

            if (paginatedUsuarios.length === 0) {
                tableEmpty.style.display = 'block';
                this.renderPagination(0);
                this.hideTableLoading();
                return;
            }

            tableEmpty.style.display = 'none';

            paginatedUsuarios.forEach(usuario => {
                const estado = usuario.estado || 'activo';
                const ultimoAcceso = usuario.ultimoAcceso ? 
                    new Date(usuario.ultimoAcceso).toLocaleString() : 'Nunca';
                
                const fila = document.createElement('tr');
                fila.innerHTML = `
                    <td>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div class="avatar-small" style="background-color: ${this.getAvatarColor(usuario.nombre)}">${this.getInitials(usuario.nombre)}</div>
                            <strong>${this.escapeHtml(usuario.nombre)}</strong>
                        </div>
                    </td>
                    <td>${usuario.email}</td>
                    <td><span class="status ${this.getRolClass(usuario.rol)}">${this.getRolText(usuario.rol)}</span></td>
                    <td>${ultimoAcceso}</td>
                    <td><span class="status ${estado === 'activo' ? 'in-stock' : 'out-of-stock'}">${estado === 'activo' ? 'Activo' : 'Inactivo'}</span></td>
                    <td class="actions">
                        <button class="btn btn-sm btn-warning" onclick="usuariosManager.editarUsuario(${usuario.id})">Editar</button>
                        <button class="btn btn-sm btn-danger" onclick="usuariosManager.confirmarEliminacion(${usuario.id})" ${usuario.id === 1 ? 'disabled' : ''}>Eliminar</button>
                    </td>
                `;
                tablaBody.appendChild(fila);
            });

            this.renderPagination(usuariosToRender.length);
            this.hideTableLoading();
        }, 500);
    }

    getAvatarColor(nombre) {
        const colors = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c', '#34495e'];
        const index = nombre.length % colors.length;
        return colors[index];
    }

    getInitials(nombre) {
        return nombre.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    }

    getRolClass(rol) {
        const classes = {
            'admin': 'in-stock',
            'usuario': 'low-stock',
            'visor': 'out-of-stock'
        };
        return classes[rol] || 'out-of-stock';
    }

    getRolText(rol) {
        const texts = {
            'admin': 'Administrador',
            'usuario': 'Usuario',
            'visor': 'Visor'
        };
        return texts[rol] || rol;
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
        
        // Botón anterior
        paginationHTML += `<button class="page-btn ${this.currentPage === 1 ? 'disabled' : ''}" 
            ${this.currentPage === 1 ? 'disabled' : ''} onclick="usuariosManager.changePage(${this.currentPage - 1})">« Anterior</button>`;
        
        // Páginas
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                paginationHTML += `<button class="page-btn ${i === this.currentPage ? 'active' : ''}" 
                    onclick="usuariosManager.changePage(${i})">${i}</button>`;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                paginationHTML += '<span class="page-dots">...</span>';
            }
        }
        
        // Botón siguiente
        paginationHTML += `<button class="page-btn ${this.currentPage === totalPages ? 'disabled' : ''}" 
            ${this.currentPage === totalPages ? 'disabled' : ''} onclick="usuariosManager.changePage(${this.currentPage + 1})">Siguiente »</button>`;
        
        pagination.innerHTML = paginationHTML;
    }

    changePage(page) {
        const totalPages = Math.ceil(storage.getUsuarios().length / this.itemsPerPage);
        if (page < 1 || page > totalPages) return;
        
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

        const usuarios = storage.getUsuarios();
        const sortedUsuarios = this.sortUsuarios(usuarios, this.currentSort.field, this.currentSort.direction);
        this.renderUsuariosTable(sortedUsuarios);
        
        // Actualizar indicador visual en el header
        document.querySelectorAll('th[data-sort]').forEach(th => {
            th.innerHTML = th.innerHTML.replace(' ↗', '').replace(' ↘', '');
            if (th.dataset.sort === field) {
                th.innerHTML += this.currentSort.direction === 'asc' ? ' ↗' : ' ↘';
            }
        });
    }

    sortUsuarios(usuarios, field, direction) {
        return [...usuarios].sort((a, b) => {
            let aValue = a[field];
            let bValue = b[field];
            
            if (field === 'ultimoAcceso') {
                aValue = aValue ? new Date(aValue) : new Date(0);
                bValue = bValue ? new Date(bValue) : new Date(0);
            }
            
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

    handleSearch(termino) {
        this.currentPage = 1;
        const usuarios = storage.getUsuarios();
        const usuariosFiltrados = usuarios.filter(usuario => 
            usuario.nombre.toLowerCase().includes(termino.toLowerCase()) ||
            usuario.email.toLowerCase().includes(termino.toLowerCase()) ||
            usuario.rol.toLowerCase().includes(termino.toLowerCase())
        );
        this.renderUsuariosTable(usuariosFiltrados);
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
        
        // Configurar validación en tiempo real
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
        document.getElementById('nombreUsuario').value = usuario.nombre || '';
        document.getElementById('emailUsuario').value = usuario.email || '';
        document.getElementById('rolUsuario').value = usuario.rol || '';
        document.getElementById('estadoUsuario').value = usuario.estado || 'activo';
        document.getElementById('telefonoUsuario').value = usuario.telefono || '';
        
        // Seleccionar permisos
        if (usuario.permisos) {
            const checkboxes = document.querySelectorAll('input[name="permisos"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = usuario.permisos.includes(checkbox.value);
            });
        }
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const usuarioData = Object.fromEntries(formData.entries());
        
        // Procesar permisos múltiples
        usuarioData.permisos = Array.from(formData.getAll('permisos'));
        
        if (this.isEditing) {
            usuarioData.id = this.currentUsuarioId;
        }

        // Validar
        const validation = validator.validateUsuario(usuarioData);
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
                resultado = this.actualizarUsuario(this.currentUsuarioId, usuarioData);
            } else {
                resultado = this.agregarUsuario(usuarioData);
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

    agregarUsuario(usuarioData) {
        const usuarios = storage.getUsuarios();
        const nuevoId = usuarios.length > 0 ? Math.max(...usuarios.map(u => u.id)) + 1 : 1;
        
        const nuevoUsuario = {
            id: nuevoId,
            ...usuarioData,
            fechaCreacion: new Date().toISOString(),
            // En un sistema real, aquí se haría hash de la contraseña
            contrasenaHash: btoa(usuarioData.contrasena) // Solo para demo, NO usar en producción
        };
        
        // Eliminar la contraseña en texto plano
        delete nuevoUsuario.contrasena;
        delete nuevoUsuario.confirmarContrasena;
        
        usuarios.push(nuevoUsuario);
        return storage.setUsuarios(usuarios) ? nuevoUsuario : null;
    }

    actualizarUsuario(id, datosActualizados) {
        const usuarios = storage.getUsuarios();
        const index = usuarios.findIndex(u => u.id === id);
        if (index !== -1) {
            const usuarioActualizado = { 
                ...usuarios[index], 
                ...datosActualizados, 
                fechaActualizacion: new Date().toISOString() 
            };
            
            // Si se está editando y no se cambió la contraseña, mantener la actual
            if (!datosActualizados.contrasena) {
                delete usuarioActualizado.contrasena;
                delete usuarioActualizado.confirmarContrasena;
            } else {
                // En un sistema real, aquí se haría hash de la nueva contraseña
                usuarioActualizado.contrasenaHash = btoa(datosActualizados.contrasena);
            }
            
            usuarios[index] = usuarioActualizado;
            return storage.setUsuarios(usuarios);
        }
        return false;
    }

    editarUsuario(id) {
        const usuarios = storage.getUsuarios();
        const usuario = usuarios.find(u => u.id === id);
        if (usuario) {
            this.showUsuarioForm(usuario);
        }
    }

    confirmarEliminacion(id) {
        const usuarios = storage.getUsuarios();
        const usuario = usuarios.find(u => u.id === id);
        
        if (!usuario) return;

        // No permitir eliminar al usuario admin principal
        if (id === 1) {
            this.showNotification('No se puede eliminar el usuario administrador principal', 'error');
            return;
        }

        const modal = document.getElementById('modalConfirm');
        const message = document.getElementById('confirmMessage');
        const btnAccept = document.getElementById('btnConfirmAccept');
        
        message.textContent = `¿Está seguro de que desea eliminar al usuario "${usuario.nombre}"? Esta acción no se puede deshacer.`;
        
        // Remover event listeners previos
        const newBtnAccept = btnAccept.cloneNode(true);
        btnAccept.parentNode.replaceChild(newBtnAccept, btnAccept);
        
        newBtnAccept.addEventListener('click', () => this.eliminarUsuario(id));
        modal.classList.add('show');
    }

    hideConfirmModal() {
        const modal = document.getElementById('modalConfirm');
        modal.classList.remove('show');
    }

    async eliminarUsuario(id) {
        this.hideConfirmModal();
        
        try {
            // Simular delay de red
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const resultado = this.eliminarUsuarioStorage(id);
            
            if (resultado) {
                this.showNotification('Usuario eliminado correctamente', 'success');
                this.renderDashboard();
                this.renderUsuariosTable();
            } else {
                throw new Error('Error al eliminar el usuario');
            }
        } catch (error) {
            this.showNotification('Error al eliminar el usuario: ' + error.message, 'error');
        }
    }

    eliminarUsuarioStorage(id) {
        const usuarios = storage.getUsuarios();
        const nuevosUsuarios = usuarios.filter(u => u.id !== id);
        return storage.setUsuarios(nuevosUsuarios);
    }

    exportData() {
        const usuarios = storage.getUsuarios();
        const csvContent = this.convertToCSV(usuarios);
        this.downloadCSV(csvContent, 'usuarios_restocontrol.csv');
        this.showNotification('Datos exportados correctamente', 'success');
    }

    convertToCSV(data) {
        if (data.length === 0) return '';
        
        const headers = ['Nombre', 'Email', 'Rol', 'Estado', 'Teléfono', 'Último Acceso'];
        const csvRows = [headers.join(',')];
        
        data.forEach(item => {
            const row = [
                `"${item.nombre}"`,
                `"${item.email}"`,
                `"${this.getRolText(item.rol)}"`,
                `"${item.estado}"`,
                `"${item.telefono || ''}"`,
                `"${item.ultimoAcceso ? new Date(item.ultimoAcceso).toLocaleString() : 'Nunca'}"`
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

// Inicializar el manager de usuarios
let usuariosManager;
document.addEventListener('DOMContentLoaded', () => {
    usuariosManager = new UsuariosManager();
});