// frontend/js/proveedores.js
// ProveedoresManager - versión robusta y compatible con backends inconsistentes

class ProveedoresManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentSort = { field: 'nombre', direction: 'asc' };
        this.currentProveedorId = null;
        this.isEditing = false;
        this.api = (typeof apiClient !== 'undefined') ? apiClient : { get: async ()=>[], post: async ()=>true, put: async ()=>true, delete: async ()=>true };

        // Bindings
        this._tableClickHandler = this._tableClickHandler.bind(this);

        this.init();
    }

    init() {
        this.bindEvents();
        this.loadInitialData();
        this.setupRealTimeSearch();
    }

    bindEvents() {
        // Botones principales
        const btnNuevo = document.getElementById('btnNuevoProveedor');
        if (btnNuevo) btnNuevo.addEventListener('click', () => this.showProveedorForm());

        const btnCancelar = document.getElementById('btnCancelarProveedor');
        if (btnCancelar) btnCancelar.addEventListener('click', () => this.hideProveedorForm());

        const btnClose = document.getElementById('btnCloseModalProveedor');
        if (btnClose) btnClose.addEventListener('click', () => this.hideProveedorForm());

        // Cerrar modal detalles con método consistente
        const btnCerrarDetalles = document.getElementById('btnCerrarDetalles');
        if (btnCerrarDetalles) btnCerrarDetalles.addEventListener('click', (e) => { e.preventDefault(); this.hideDetallesModal(); });

        // Form
        const form = document.getElementById('proveedorForm');
        if (form) form.addEventListener('submit', (e) => this.handleFormSubmit(e));

        // Modal confirm
        const btnConfirmCancel = document.getElementById('btnConfirmCancel');
        if (btnConfirmCancel) btnConfirmCancel.addEventListener('click', () => this.hideConfirmModal());

        // Click en overlay para cerrar modales (delegado)
        document.addEventListener('click', (e) => {
            if (e.target && e.target.classList && e.target.classList.contains('modal')) {
                const modalProv = document.getElementById('modalProveedor');
                if (modalProv) modalProv.classList.remove('show');

                const modalDet = document.getElementById('modalDetallesProveedor');
                if (modalDet) modalDet.classList.remove('show');

                const modalConfirm = document.getElementById('modalConfirm');
                if (modalConfirm) modalConfirm.classList.remove('show');
            }
        });

        // Ordenamiento columnas
        document.querySelectorAll('th[data-sort]').forEach(th => {
            th.addEventListener('click', () => this.handleSort(th.dataset.sort));
        });

        // Delegación para tabla (botones dinámicos)
        const tabla = document.getElementById('tablaProveedores') || document.getElementById('tablaProveedoresTable') || document.querySelector('.table-container');
        if (tabla) {
            tabla.removeEventListener('click', this._tableClickHandler);
            tabla.addEventListener('click', this._tableClickHandler);
        }

        // Enlace de inputs específicos para restricción en tiempo real
        this.attachInputGuards();
    }

    attachInputGuards() {
        // Teléfono: permitir sólo dígitos y signos comunes (+ - ( ) espacio)
        const telefono = document.getElementById('telefonoProveedor');
        if (telefono) {
            telefono.addEventListener('keypress', (e) => {
                const char = String.fromCharCode(e.which || e.keyCode);
                if (!/[0-9+\-() ]/.test(char) && !e.metaKey && !e.ctrlKey) {
                    e.preventDefault();
                }
            });
            telefono.addEventListener('input', (e) => {
                const v = e.target.value;
                const cleaned = v.replace(/[^\d+\-\(\)\s]/g, '');
                if (cleaned !== v) e.target.value = cleaned;
            });
            telefono.addEventListener('blur', () => {
                const digits = (telefono.value || '').replace(/\D/g, '');
                if (digits.length < 7) {
                    this.setFieldError(telefono, 'El teléfono debe contener al menos 7 dígitos.');
                } else {
                    this.clearFieldError(telefono);
                }
            });
        }

        // Email
        const email = document.getElementById('emailProveedor');
        if (email) {
            email.addEventListener('blur', () => {
                if (email.value && !this.isValidEmail(email.value)) {
                    this.setFieldError(email, 'Introduce un correo electrónico válido (ejemplo@dominio.com).');
                } else {
                    this.clearFieldError(email);
                }
            });
            email.addEventListener('input', () => {
                if (email.value.includes(' ')) email.value = email.value.replace(/\s/g, '');
            });
        }

        // Nombre y contacto
        const nombre = document.getElementById('nombreProveedor');
        if (nombre) {
            nombre.addEventListener('blur', () => {
                if (!nombre.value || nombre.value.trim().length < 2) {
                    this.setFieldError(nombre, 'El nombre es requerido (mínimo 2 caracteres).');
                } else {
                    this.clearFieldError(nombre);
                }
            });
        }
        const contacto = document.getElementById('contactoProveedor');
        if (contacto) {
            contacto.addEventListener('blur', () => {
                if (!contacto.value || contacto.value.trim().length < 2) {
                    this.setFieldError(contacto, 'El contacto es requerido (mínimo 2 caracteres).');
                } else {
                    this.clearFieldError(contacto);
                }
            });
        }

        // Dirección: longitud mínima
        const direccion = document.getElementById('direccionProveedor');
        if (direccion) {
            direccion.addEventListener('blur', () => {
                if (direccion.value && direccion.value.length < 5) {
                    this.setFieldError(direccion, 'Si especificas dirección, debe tener al menos 5 caracteres.');
                } else {
                    this.clearFieldError(direccion);
                }
            });
        }
    }

    // Helpers de UI para errores en campos
    setFieldError(inputEl, message) {
        if (!inputEl) return;
        inputEl.classList.add('field-error');
        try { inputEl.setAttribute('aria-invalid', 'true'); } catch(e){}
        try {
            if (typeof inputEl.setCustomValidity === 'function') {
                inputEl.setCustomValidity(message);
                inputEl.reportValidity();
            }
        } catch (e) {}
        let wrapper = inputEl.parentElement || inputEl;
        let msg = wrapper.querySelector('.field-error-msg');
        if (!msg) {
            msg = document.createElement('div');
            msg.className = 'field-error-msg';
            wrapper.appendChild(msg);
        }
        msg.textContent = message;
    }

    clearFieldError(inputEl) {
        if (!inputEl) return;
        inputEl.classList.remove('field-error');
        try { inputEl.removeAttribute('aria-invalid'); } catch(e){}
        try {
            if (typeof inputEl.setCustomValidity === 'function') inputEl.setCustomValidity('');
        } catch (e) {}
        const wrapper = inputEl.parentElement;
        if (wrapper) {
            const msg = wrapper.querySelector('.field-error-msg');
            if (msg) msg.remove();
        }
    }

    clearFieldErrors(formElement) {
        if (!formElement) return;
        const inputs = formElement.querySelectorAll('input, textarea, select');
        inputs.forEach(i => this.clearFieldError(i));
    }

    showFieldErrors(formElement, errors = {}) {
        if (!formElement) return;
        Object.keys(errors).forEach(key => {
            const msg = errors[key];
            if (key === '_general') {
                if (msg) this.showNotification(msg, 'error');
                return;
            }
            const input = formElement.querySelector(`[name="${key}"], #${key}`);
            if (input) this.setFieldError(input, msg);
            else this.showNotification(`${key}: ${msg}`, 'error');
        });
    }

    async loadInitialData() {
        const loading = document.getElementById('loadingScreen');
        if (loading) loading.style.display = 'flex';
        try {
            await Promise.allSettled([
                this.renderDashboard(),
                this.renderProveedoresTable(),
                this.populateCategoriasSelect()
            ]);
        } catch (e) {
            console.error(e);
        } finally {
            if (loading) {
                loading.classList.add('fade-out');
                setTimeout(()=> { loading.style.display = 'none'; loading.classList.remove('fade-out'); }, 300);
            }
        }
    }

    async renderDashboard() {
        try {
            const proveedores = await this.api.get('/proveedores/').catch(()=>[]);
            const productos = await this.api.get('/productos/').catch(()=>[]);
            const totalProveedores = Array.isArray(proveedores) ? proveedores.length : (proveedores && proveedores.count ? proveedores.count : 0);
            const totalProductos = Array.isArray(productos) ? productos.length : (productos && productos.count ? productos.count : 0);

            const elTotal = document.getElementById('totalProveedores');
            if (elTotal) elTotal.textContent = String(totalProveedores);
            const elProductos = document.getElementById('totalProductosProveedores');
            if (elProductos) elProductos.textContent = String(totalProductos);
        } catch (e) {
            console.error('Error renderizando dashboard proveedores:', e);
        }
    }

    // Normaliza estado soportando varias formas (activo/estado/1/0/true/false/'1'/'0')
    normalizeEstado(obj) {
        // obj puede ser proveedor o valor
        let activoVal;
        if (obj && typeof obj === 'object') {
            if (typeof obj.activo !== 'undefined') activoVal = obj.activo;
            else if (typeof obj.estado !== 'undefined') activoVal = obj.estado;
            else activoVal = null;
        } else {
            activoVal = obj;
        }

        // Normalizar
        const isTruthy = (v) => v === true || v === 1 || v === '1' || v === 'true' || v === 'activo' || v === 'Activo' || v === 'activo';
        const activo = isTruthy(activoVal);
        return {
            activo,
            texto: activo ? 'Activo' : 'Inactivo',
            clase: activo ? 'in-stock' : 'out-of-stock',
            raw: activoVal
        };
    }

    async renderProveedoresTable(proveedores = null) {
        const tableLoading = document.getElementById('tableLoadingProveedores');
        if (tableLoading) tableLoading.style.display = 'flex';
        try {
            const proveedoresList = proveedores || await this.api.get('/proveedores/').catch(()=>[]);
            const tablaBody = document.getElementById('tablaProveedores');
            const tableEmpty = document.getElementById('tableEmptyProveedores');
            if (!tablaBody) {
                console.warn('tablaProveedores no encontrada en DOM.');
                return;
            }

            const list = Array.isArray(proveedoresList) ? proveedoresList : (proveedoresList && proveedoresList.results ? proveedoresList.results : []);
            tablaBody.innerHTML = '';
            if (!list || list.length === 0) {
                if (tableEmpty) tableEmpty.style.display = 'block';
                return;
            } else if (tableEmpty) tableEmpty.style.display = 'none';

            for (const p of list) {
                const productosCount = await this.getProductosCountByProveedor(p.id).catch(()=>0);
                const estadoNorm = this.normalizeEstado(p);
                const tr = document.createElement('tr');
                tr.setAttribute('data-id', p.id);
                tr.innerHTML = `
                    <td><strong>${this.escapeHtml(p.nombre)}</strong></td>
                    <td>${this.escapeHtml(p.contacto || '')}</td>
                    <td>${this.escapeHtml(p.telefono || '')}</td>
                    <td>${this.escapeHtml(p.email || '')}</td>
                    <td>${productosCount}</td>
                    <td><span class="status ${estadoNorm.clase}">${estadoNorm.texto}</span></td>
                    <td class="actions">
                        <button class="btn btn-sm btn-primary" data-action="ver" data-id="${p.id}">Ver</button>
                        <button class="btn btn-sm btn-warning" data-action="editar" data-id="${p.id}">Editar</button>
                        <button class="btn btn-sm btn-danger" data-action="eliminar" data-id="${p.id}">Eliminar</button>
                    </td>
                `;
                tablaBody.appendChild(tr);
            }
        } catch (e) {
            console.error('Error renderizando tabla proveedores:', e);
            this.showNotification('Error cargando proveedores', 'error');
        } finally {
            if (tableLoading) tableLoading.style.display = 'none';
        }
    }

    async getProductosCountByProveedor(proveedorId) {
        try {
            const productos = await this.api.get(`/productos/?proveedor=${proveedorId}`);
            return Array.isArray(productos) ? productos.length : (productos && productos.count ? productos.count : 0);
        } catch (e) {
            return 0;
        }
    }

    _tableClickHandler(ev) {
        const btn = ev.target.closest('button, [data-action]');
        if (!btn) return;
        const id = btn.dataset?.id || btn.closest('tr')?.dataset?.id;
        const action = btn.dataset?.action || null;
        if (!id || !action) return;

        if (action === 'ver') this.verDetalles(id);
        else if (action === 'editar' || action === 'edit') this.editarProveedor(id);
        else if (action === 'eliminar' || action === 'delete') this.confirmarEliminacion(id);
    }

    handleSort(field) {
        if (this.currentSort.field === field) this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        else { this.currentSort.field = field; this.currentSort.direction = 'asc'; }
        this.renderProveedoresTable();
    }

    setupRealTimeSearch() {
        const input = document.getElementById('searchInputProveedores');
        if (!input) return;
        let to = null;
        input.addEventListener('input', (e) => {
            if (to) clearTimeout(to);
            to = setTimeout(() => this.handleSearch(e.target.value), 300);
        });
    }

    async handleSearch(termino) {
        this.currentPage = 1;
        try {
            if (!termino || termino.trim() === '') {
                await this.renderProveedoresTable();
                return;
            }
            const res = await this.api.get(`/proveedores/?search=${encodeURIComponent(termino)}`);
            await this.renderProveedoresTable(res);
        } catch (e) {
            console.error('Error searching proveedores:', e);
        }
    }

    async populateCategoriasSelect() {
        const select = document.getElementById('categoriasProveedor');
        if (!select) return;
        try {
            const categorias = await this.api.get('/categorias/').catch(()=>[]);
            select.innerHTML = '';
            (Array.isArray(categorias) ? categorias : []).forEach(c => {
                const option = document.createElement('option');
                option.value = c.id;
                option.textContent = c.nombre;
                select.appendChild(option);
            });
        } catch (e) {
            console.error('Error cargando categorías para proveedores:', e);
        }
    }

    async showProveedorForm(proveedor = null) {
        this.isEditing = !!proveedor;
        this.currentProveedorId = proveedor ? proveedor.id : null;

        const modal = document.getElementById('modalProveedor');
        const title = document.getElementById('modalTitleProveedor');
        const form = document.getElementById('proveedorForm');

        if (title) title.textContent = proveedor ? 'Editar Proveedor' : 'Nuevo Proveedor';
        if (form) {
            form.reset();
            this.clearFieldErrors(form);
        }

        // llenar si es edición
        if (proveedor && form) {
            form.querySelector('#nombreProveedor') && (form.querySelector('#nombreProveedor').value = proveedor.nombre || '');
            form.querySelector('#contactoProveedor') && (form.querySelector('#contactoProveedor').value = proveedor.contacto || '');
            form.querySelector('#telefonoProveedor') && (form.querySelector('#telefonoProveedor').value = proveedor.telefono || '');
            form.querySelector('#emailProveedor') && (form.querySelector('#emailProveedor').value = proveedor.email || '');
            form.querySelector('#direccionProveedor') && (form.querySelector('#direccionProveedor').value = proveedor.direccion || '');

            // estado: preferencia activo -> estado
            const estadoEl = form.querySelector('#estadoProveedor');
            if (estadoEl) {
                const norm = this.normalizeEstado(proveedor);
                estadoEl.value = norm.activo ? 'activo' : 'inactivo';
            }

            // categorias (si backend envía arreglo de ids)
            const categoriasSelect = form.querySelector('#categoriasProveedor');
            if (categoriasSelect && proveedor.categorias && Array.isArray(proveedor.categorias)) {
                Array.from(categoriasSelect.options).forEach(opt => {
                    opt.selected = proveedor.categorias.includes(Number(opt.value));
                });
            }
        } else if (form) {
            // nuevo proveedor por defecto activo
            const estadoEl = form.querySelector('#estadoProveedor');
            if (estadoEl) estadoEl.value = 'activo';
        }

        if (modal) modal.classList.add('show');
    }

    hideProveedorForm() {
        const modal = document.getElementById('modalProveedor');
        if (modal) modal.classList.remove('show');
        this.isEditing = false;
        this.currentProveedorId = null;
    }

    populateForm(proveedor) {
        this.showProveedorForm(proveedor);
    }

    validateProveedorData(data) {
        const errors = {};
        let isValid = true;

        if (!data.nombre || typeof data.nombre !== 'string' || data.nombre.trim().length < 2) {
            errors.nombre = 'El nombre del proveedor es requerido (mínimo 2 caracteres).';
            isValid = false;
        }

        if (!data.contacto || typeof data.contacto !== 'string' || data.contacto.trim().length < 2) {
            errors.contacto = 'El nombre de contacto es requerido (mínimo 2 caracteres).';
            isValid = false;
        }

        if (!data.telefono || (String(data.telefono).replace(/\D/g, '').length < 7)) {
            errors.telefono = 'Teléfono inválido: debe contener al menos 7 dígitos.';
            isValid = false;
        } else {
            const digits = String(data.telefono).replace(/\D/g, '');
            if (digits.length > 15) {
                errors.telefono = 'Teléfono demasiado largo (max 15 dígitos).';
                isValid = false;
            }
        }

        if (!data.email || !this.isValidEmail(data.email)) {
            errors.email = 'Correo inválido. Usa el formato ejemplo@dominio.com.';
            isValid = false;
        }

        if (data.direccion && data.direccion.trim() !== '' && data.direccion.trim().length < 5) {
            errors.direccion = 'Si indicas dirección, debe tener al menos 5 caracteres.';
            isValid = false;
        }

        return { isValid, errors };
    }

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase());
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        const form = e.target;
        if (!form) return;
        this.clearFieldErrors(form);

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Capturar categorías multiple correctamente
        const categoriasSelect = form.querySelector('#categoriasProveedor');
        if (categoriasSelect) {
            data.categorias = Array.from(categoriasSelect.selectedOptions).map(o => {
                const v = o.value;
                return v === '' ? null : (isNaN(Number(v)) ? v : Number(v));
            });
        } else {
            data.categorias = [];
        }

        data.nombre = (data.nombre || '').trim();
        data.contacto = (data.contacto || '').trim();
        data.telefono = (data.telefono || '').trim();
        data.email = (data.email || '').trim();
        data.direccion = (data.direccion || '').trim();
        data.estado = data.estado || 'activo';

        // Mapear estado a activo boolean para backend y mantener estado string
        const activo = (data.estado === 'activo' || data.estado === '1' || data.estado === 'true' || data.activo === true || data.activo === '1');
        data.activo = activo;
        data.estado = activo ? 'activo' : 'inactivo';

        // Validar
        const validation = this.validateProveedorData(data);
        if (!validation.isValid) {
            this.showFieldErrors(form, validation.errors);
            this.showNotification('Por favor corrige los errores en el formulario', 'error');
            return;
        }

        // Envío
        this.setFormLoading(true);
        try {
            let result;
            if (this.isEditing && this.currentProveedorId) {
                result = await this.api.put(`/proveedores/${this.currentProveedorId}/`, data);
            } else {
                result = await this.api.post('/proveedores/', data);
            }

            if (!result) throw new Error('Respuesta vacía del servidor');

            this.showNotification(this.isEditing ? 'Proveedor actualizado correctamente' : 'Proveedor agregado correctamente', 'success');
            this.hideProveedorForm();
            await this.renderDashboard();
            await this.renderProveedoresTable();
        } catch (err) {
            console.error('Error guardando proveedor:', err);
            const msg = (err && err.message) ? err.message : 'Error al guardar el proveedor';
            this.showNotification('❌ ' + msg, 'error');
        } finally {
            this.setFormLoading(false);
        }
    }

    setFormLoading(loading) {
        const btn = document.getElementById('btnSubmitProveedor');
        const spinner = document.getElementById('btnLoadingProveedor');
        const txt = document.getElementById('btnTextProveedor');

        if (loading) {
            if (btn) btn.disabled = true;
            if (spinner) spinner.style.display = 'inline-block';
            if (txt) txt.textContent = this.isEditing ? 'Actualizando...' : 'Guardando...';
        } else {
            if (btn) btn.disabled = false;
            if (spinner) spinner.style.display = 'none';
            if (txt) txt.textContent = this.isEditing ? 'Actualizar Proveedor' : 'Guardar Proveedor';
        }
    }

    async editarProveedor(id) {
        try {
            const proveedor = await this.api.get(`/proveedores/${id}/`);
            if (!proveedor) throw new Error('No se encontró el proveedor');
            this.showProveedorForm(proveedor);
        } catch (e) {
            console.error('Error cargando proveedor:', e);
            this.showNotification('❌ Error cargando proveedor: ' + (e.message || e), 'error');
        }
    }

    async verDetalles(id) {
        try {
            const [proveedor, productos] = await Promise.all([
                this.api.get(`/proveedores/${id}/`),
                this.api.get(`/productos/?proveedor=${id}`)
            ]);
            if (!proveedor) throw new Error('Proveedor no encontrado');

            const modal = document.getElementById('modalDetallesProveedor');
            const title = document.getElementById('modalTitleDetalles');
            const content = document.getElementById('detallesProveedorContent');

            const estadoNorm = this.normalizeEstado(proveedor);

            if (title) title.textContent = `Detalles: ${proveedor.nombre}`;
            if (content) {
                content.innerHTML = `
                    <div class="detalles-grid">
                        <div class="detalle-item"><label>Nombre:</label><span>${this.escapeHtml(proveedor.nombre)}</span></div>
                        <div class="detalle-item"><label>Contacto:</label><span>${this.escapeHtml(proveedor.contacto || '')}</span></div>
                        <div class="detalle-item"><label>Teléfono:</label><span>${this.escapeHtml(proveedor.telefono || '')}</span></div>
                        <div class="detalle-item"><label>Email:</label><span>${this.escapeHtml(proveedor.email || '')}</span></div>
                        <div class="detalle-item"><label>Dirección:</label><span>${this.escapeHtml(proveedor.direccion || 'No especificada')}</span></div>
                        <div class="detalle-item"><label>Estado:</label><span class="status ${estadoNorm.clase}">${estadoNorm.texto}</span></div>
                    </div>
                    <div style="margin-top:16px;">
                        <h4>Productos (${Array.isArray(productos)?productos.length:0})</h4>
                        ${Array.isArray(productos) && productos.length ? `<ul>${productos.map(p => `<li>${this.escapeHtml(p.nombre)} - Stock: ${p.stock ?? 0}</li>`).join('')}</ul>` : '<p>No hay productos asociados.</p>'}
                    </div>
                `;
            }

            if (modal) modal.classList.add('show');
        } catch (e) {
            console.error('Error cargando detalles:', e);
            this.showNotification('❌ Error cargando detalles del proveedor: ' + (e.message || e), 'error');
        }
    }

    hideDetallesModal() {
        const modal = document.getElementById('modalDetallesProveedor');
        if (modal) modal.classList.remove('show');
    }

    async confirmarEliminacion(id) {
        // Usar sistema de confirmación global
        const confirmed = await (window.confirmCriticalAction 
            ? window.confirmCriticalAction('¿Está seguro de que desea eliminar este proveedor? Esta acción no se puede deshacer.')
            : confirm('¿Está seguro de que desea eliminar este proveedor?')
        );
        
        if (confirmed) {
            try {
                await this.eliminarProveedor(id);
            } catch (e) {
                console.error(e);
            }
        }
    }
            } finally {
                const cm = document.getElementById('modalConfirm');
                if (cm) cm.classList.remove('show');
            }
        });
    }

    hideConfirmModal() {
        const modal = document.getElementById('modalConfirm');
        if (modal) modal.classList.remove('show');
    }

    async eliminarProveedor(id) {
        try {
            await this.api.delete(`/proveedores/${id}/`);
            this.showNotification('Proveedor eliminado correctamente', 'success');
            await this.renderDashboard();
            await this.renderProveedoresTable();
        } catch (e) {
            console.error('Error eliminando proveedor:', e);
            this.showNotification('❌ Error al eliminar proveedor: ' + (e.message || e), 'error');
        }
    }

    showNotification(message, type='info') {
        const container = document.getElementById('notifications');
        if (!container) {
            console.warn('No existe #notifications para mostrar:', message);
            return;
        }
        const n = document.createElement('div');
        n.className = `notification ${type}`;
        n.innerHTML = `
            <span class="notification-icon">${this.getNotificationIcon(type)}</span>
            <span class="notification-message">${message}</span>
            <button class="btn-close btn-close-sm" aria-label="Cerrar">&times;</button>
        `;
        container.appendChild(n);
        n.querySelector('.btn-close')?.addEventListener('click', () => n.remove());
        setTimeout(()=> { if (n.parentElement) n.remove(); }, 5000);
    }

    getNotificationIcon(type) {
        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
        return icons[type] || 'ℹ️';
    }

    escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
    }
}

// inicializar
let proveedoresManager;
document.addEventListener('DOMContentLoaded', () => {
    proveedoresManager = new ProveedoresManager();
});
