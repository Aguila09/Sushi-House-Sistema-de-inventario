// frontend/js/usuarios.js
// Gestión de usuarios con control de roles y permisos en UI
class UsuariosManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentSort = { field: 'first_name', direction: 'asc' };
        this.currentUsuarioId = null;
        this.isEditing = false;
        // apiClient debe estar expuesto en window como apiClient (tu api.js)
        this.api = (typeof apiClient !== 'undefined') ? apiClient : { get: async()=>[], post: async()=>true, put: async()=>true, delete: async()=>true };

        this.currentUser = null;
        this._tableClickHandler = this._tableClickHandler.bind(this);

        // Id pendiente para eliminar (usado por el modal de confirmación)
        this._pendingDeleteId = null;

        // Handlers para cerrar modales (ESC/overlay)
        this._onKeydown = null;
        this._onOverlayClick = null;

        this.init();
    }

    // ----- inicialización -----
    async init() {
        this.bindEvents();
        await this.fetchCurrentUser();
        this.setupRoleSelect();
        await this.loadInitialData();
        this.setupRealTimeSearch();
    }

    bindEvents() {
        document.getElementById('btnNuevoUsuario')?.addEventListener('click', () => this.showUsuarioForm(null, { readOnly:false }));
        document.getElementById('btnCancelarUsuario')?.addEventListener('click', () => this.hideUsuarioForm());
        document.getElementById('btnCloseModalUsuario')?.addEventListener('click', () => this.hideUsuarioForm());
        document.getElementById('usuarioForm')?.addEventListener('submit', (e) => this.handleFormSubmit(e));
        document.getElementById('btnConfirmCancel')?.addEventListener('click', () => this.hideConfirmModal());

        // Listener único para ACEPTAR en modal de confirmación (usa _pendingDeleteId)
        const btnConfirmAccept = document.getElementById('btnConfirmAccept');
        if (btnConfirmAccept) {
            btnConfirmAccept.addEventListener('click', async () => {
                const id = this._pendingDeleteId;
                if (!id) {
                    console.warn('btnConfirmAccept clic sin id pendiente.');
                    this.hideConfirmModal();
                    return;
                }
                try {
                    console.log('confirm: aceptado, id pendiente ->', id);
                    await this.eliminarUsuario(id);
                } catch (e) {
                    console.error('Error en confirm accept:', e);
                    this.showNotification('Error al eliminar usuario', 'error');
                } finally {
                    this._pendingDeleteId = null;
                    this.hideConfirmModal();
                }
            });
        }

        // click overlay para cerrar modales (si haces clic en el backdrop con data-close="true")
        document.addEventListener('click', (e) => {
            const target = e.target;
            if (target && target.dataset && target.dataset.close === 'true') {
                // cerrar cualquier modal abierto
                this.hideUsuarioForm();
                this.hideConfirmModal();
            }
        });

        // ordenar encabezados
        document.querySelectorAll('th[data-sort]').forEach(th => {
            th.addEventListener('click', () => this.handleSort(th.dataset.sort));
        });

        // delegación de clicks en tabla (robusta)
        const tablaContainer = document.getElementById('tablaUsuarios') || document.getElementById('tablaUsuariosTable') || document.querySelector('.table-container');
        if (tablaContainer) {
            tablaContainer.removeEventListener('click', this._tableClickHandler);
            tablaContainer.addEventListener('click', this._tableClickHandler);
        }
    }

    // ----- utilitarios -----
    _bool(val) {
        if (val === true || val === 1 || val === '1') return true;
        if (typeof val === 'string' && val.toLowerCase() === 'true') return true;
        return false;
    }
    _coalesce(...vals) {
        for (const v of vals) if (v !== null && v !== undefined) return v;
        return null;
    }
    _unwrap(resp) {
        if (resp === null || resp === undefined) return resp;
        if (resp.data !== undefined) return resp.data;
        if (resp.results !== undefined && Array.isArray(resp.results)) return resp.results;
        return resp;
    }

    formatDateToDDMMYYYY_HHMMSS(dateStr) {
        if (!dateStr) return 'Nunca';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return 'Nunca';
            const pad = (n) => String(n).padStart(2, '0');
            const day = pad(d.getDate());
            const month = pad(d.getMonth() + 1);
            const year = d.getFullYear();
            const hh = pad(d.getHours());
            const mm = pad(d.getMinutes());
            const ss = pad(d.getSeconds());
            return `${day}/${month}/${year} ${hh}:${mm}:${ss}`;
        } catch (e) {
            return 'Nunca';
        }
    }

    escapeHtml(s){ if (s===0) return '0'; if (!s && s!==0) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    generateUsernameFrom(nombres, apellidos, email) {
        const sanitize = (s) => String(s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const n = sanitize(nombres).slice(0, 20);
        const a = sanitize(apellidos).slice(0, 20);
        let base = (n && a) ? `${n}.${a}` : '';
        if (!base && email && email.includes('@')) {
            base = sanitize(email.split('@',1)[0]);
        }
        if (!base) base = `user${Date.now().toString().slice(-4)}`;
        return base;
    }

    // ----- roles helpers -----
    isSuperuser(u) {
        if (!u) return false;
        if (this._bool(u.is_superuser)) return true;
        if (u.rol && String(u.rol).toLowerCase().includes('super')) return true;
        if (u.isSuperuser !== undefined) return this._bool(u.isSuperuser);
        return false;
    }
    isAdmin(u) {
        if (!u) return false;
        if (this._bool(u.is_staff)) return true;
        if (u.rol && String(u.rol).toLowerCase().includes('admin')) return true;
        if (u.isStaff !== undefined) return this._bool(u.isStaff);
        return false;
    }

    canCreate(roleToAssign = null) {
        if (!this.currentUser) return false;
        if (this.isSuperuser(this.currentUser)) return true;
        if (this.isAdmin(this.currentUser)) {
            if (!roleToAssign) return true;
            return ['operacional','consulta'].includes(String(roleToAssign));
        }
        return false;
    }

    canEdit(targetUser) {
        if (!this.currentUser) return false;
        if (this.isSuperuser(this.currentUser)) return true;
        if (this.isAdmin(this.currentUser)) {
            // Requisito: admin NO puede editar otros admins ni superusers
            if (!targetUser) return true; // crear nuevo (validado después por rol permitido)
            if (this.isSuperuser(targetUser)) return false;
            if (this.isAdmin(targetUser)) return false; // bloqueo editar administrador
            return true; // puede editar operacional / consulta
        }
        if ((targetUser && targetUser.id) && String(targetUser.id) === String(this.currentUser.id)) return true;
        return false;
    }

    canDelete(targetUser) {
        if (!this.currentUser) return false;
        if (this.isSuperuser(this.currentUser)) {
            if (targetUser && String(targetUser.id) === String(this.currentUser.id)) return false;
            return true;
        }
        if (this.isAdmin(this.currentUser)) {
            if (!targetUser) return false;
            if (this.isSuperuser(targetUser)) return false;
            if (this.isAdmin(targetUser)) return false;
            return true;
        }
        return false;
    }

    // ----- carga inicial -----
    async loadInitialData() {
        try { if (typeof Loading !== 'undefined' && Loading.show) Loading.show(); await Promise.allSettled([ this.renderDashboard(), this.renderUsuariosTable() ]); }
        catch (e) { console.error(e); }
        finally { if (typeof Loading !== 'undefined' && Loading.hide) Loading.hide(); }
    }
    showTableLoading() { const el = document.getElementById('tableLoadingUsuarios'); if (el) el.style.display = 'flex'; }
    hideTableLoading() { const el = document.getElementById('tableLoadingUsuarios'); if (el) el.style.display = 'none'; }

    _normalizeListResponse(resp) {
        const un = this._unwrap(resp);
        if (!un) return [];
        if (Array.isArray(un)) return un;
        if (un.results && Array.isArray(un.results)) return un.results;
        for (const k of Object.keys(un || {})) {
            if (Array.isArray(un[k])) return un[k];
        }
        return [];
    }

    // ----- fetch current user (con fallback) -----
    async fetchCurrentUser() {
        const tries = ['/usuarios/me/','/auth/user/','/usuarios/current/','/auth/me/'];
        for (const ep of tries) {
            try {
                let resp = await this.api.get(ep).catch(()=>null);
                resp = this._unwrap(resp);
                if (!resp) continue;
                if (Array.isArray(resp)) continue;
                if (typeof resp === 'object' && (resp.id || resp.email || resp.usuario || resp.nombre || resp.nombres || resp.is_superuser !== undefined)) {
                    // si endpoint no incluye is_superuser, preguntar al detalle
                    if (resp.is_superuser === undefined && resp.id) {
                        try {
                            let full = await this.api.get(`/usuarios/${resp.id}/`).catch(()=>null);
                            full = this._unwrap(full);
                            if (full && typeof full === 'object') {
                                resp.is_superuser = (full.is_superuser !== undefined) ? full.is_superuser : resp.is_superuser;
                                resp.is_staff = (full.is_staff !== undefined) ? full.is_staff : resp.is_staff;
                                resp.is_active = (full.is_active !== undefined) ? full.is_active : resp.is_active;
                                if (full.rol) resp.rol = full.rol;
                                if (full.ultimo_acceso !== undefined) resp.ultimo_acceso = full.ultimo_acceso;
                                console.log('Verificado is_superuser en /usuarios/' + resp.id, full);
                            }
                        } catch(ignore){}
                    }
                    // fallback heurístico si sigue faltando
                    if (resp.is_superuser === undefined) {
                        const rolLower = resp.rol ? String(resp.rol).toLowerCase() : '';
                        if (rolLower.includes('super')) resp.is_superuser = true;
                        else resp.is_superuser = this._bool(resp.is_staff) && Number(resp.id) === 1;
                    }
                    resp.is_superuser = this._bool(resp.is_superuser);
                    resp.is_staff = this._bool(resp.is_staff);
                    resp.is_active = this._bool(resp.is_active);
                    this.currentUser = resp;
                    console.log('Usuario autenticado obtenido de', ep, this.currentUser);
                    this.setupRoleSelect();
                    return;
                }
            } catch (e) { /* ignora y sigue */ }
        }

        // fallback por lista
        try {
            let listResp = await this.api.get('/usuarios/').catch(()=>null);
            listResp = this._unwrap(listResp);
            const list = this._normalizeListResponse(listResp);
            if (Array.isArray(list) && list.length > 0) {
                const su = list.find(u => this._bool(u.is_superuser) || (u.rol && String(u.rol).toLowerCase().includes('super')));
                if (su) {
                    su.is_superuser = this._bool(su.is_superuser);
                    su.is_staff = this._bool(su.is_staff);
                    this.currentUser = su;
                    console.log('Fallback currentUser: encontrado is_superuser en la lista', su);
                    this.setupRoleSelect();
                    return;
                }
            }
        } catch (err) { console.warn('Fallback fetch /usuarios/ falló:', err); }

        console.warn('No se pudo obtener currentUser desde la API — ciertas restricciones de UI no estarán disponibles.');
        this.currentUser = null;
    }

    // ----- select de roles (no incluye superuser como opción) -----
    setupRoleSelect() {
        const rolSelect = document.getElementById('rolUsuario');
        if (!rolSelect) return;
        rolSelect.innerHTML = '';
        const allowAdmin = this.currentUser ? this.isSuperuser(this.currentUser) : false;
        const allowed = [
            { value: 'admin', label: 'Administrador' },
            { value: 'operacional', label: 'Usuario Operacional' },
            { value: 'consulta', label: 'Usuario de Consulta' }
        ];
        for (const r of allowed) {
            if (r.value === 'admin' && !allowAdmin) continue;
            const opt = document.createElement('option');
            opt.value = r.value;
            opt.textContent = r.label;
            rolSelect.appendChild(opt);
        }
    }

    // ----- renderización -----
    async renderDashboard() {
        try {
            let resp = await this.api.get('/usuarios/').catch(()=>[]);
            resp = this._unwrap(resp);
            const usuarios = this._normalizeListResponse(resp);
            const totalUsuarios = usuarios.length;
            const totalAdministradores = usuarios.filter(u => this._bool(u.is_staff) || (u.rol && String(u.rol).toLowerCase().includes('admin'))).length;
            const usuariosActivos = usuarios.filter(u => this._bool(u.is_active) || u.activo === 1 || u.activo === '1').length;
            const hoy = new Date().toDateString();
            const accesosHoy = usuarios.filter(u => {
                const last = this._coalesce(u.ultimo_acceso, u.ultimoAcceso, u.last_login, u.lastLogin, null);
                if (!last) return false;
                return new Date(last).toDateString() === hoy;
            }).length;

            document.getElementById('totalUsuarios') && (document.getElementById('totalUsuarios').textContent = totalUsuarios);
            document.getElementById('totalAdministradores') && (document.getElementById('totalAdministradores').textContent = totalAdministradores);
            document.getElementById('usuariosActivos') && (document.getElementById('usuariosActivos').textContent = usuariosActivos);
            document.getElementById('accesosHoy') && (document.getElementById('accesosHoy').textContent = accesosHoy);
        } catch (e) { console.error('Error render dashboard usuarios', e); }
    }

    async renderUsuariosTable(usuarios = null) {
        this.showTableLoading();
        try {
            let resp = usuarios ?? await this.api.get('/usuarios/').catch(()=>[]);
            resp = this._unwrap(resp);
            const usuariosList = this._normalizeListResponse(resp);
            const tablaBody = document.getElementById('tablaUsuarios');
            const tableEmpty = document.getElementById('tableEmptyUsuarios');
            if (!tablaBody) { console.warn('tablaUsuarios no encontrada en DOM.'); this.hideTableLoading(); return; }

            tablaBody.innerHTML = '';
            if (!usuariosList || usuariosList.length === 0) {
                if (tableEmpty) tableEmpty.style.display = 'block';
                this.hideTableLoading();
                return;
            } else if (tableEmpty) tableEmpty.style.display = 'none';

            for (const usuario of usuariosList) {
                const nombres = this._coalesce(usuario.nombres, usuario.first_name, '') || '';
                const apellidos = this._coalesce(usuario.apellidos, usuario.last_name, '') || '';
                const nombreDB = this._coalesce(usuario.nombre, `${(nombres + ' ' + apellidos).trim()}`, '') || '';
                const email = this._coalesce(usuario.email, usuario.usuario, '') || '';

                const isSU = this.isSuperuser(usuario);
                const rol = isSU ? 'superuser' : (usuario.rol ? String(usuario.rol).toLowerCase() : (this._bool(usuario.is_staff) ? 'admin' : 'consulta'));

                const activo = (usuario.activo !== undefined) ? (String(usuario.activo) === '1' || usuario.activo === true || this._bool(usuario.is_active)) : (this._bool(usuario.is_active));

                let last = this._coalesce(usuario.ultimo_acceso, usuario.ultimoAcceso, usuario.last_login, usuario.lastLogin, null);
                if (typeof last === 'string' && ['null','none','undefined',''].includes(last.trim().toLowerCase())) last = null;
                const ultimoAccesoText = this.formatDateToDDMMYYYY_HHMMSS(last);

                const tr = document.createElement('tr');
                tr.setAttribute('data-id', usuario.id ?? '');
                tr.innerHTML = `
                    <td>
                      <div style="display:flex; align-items:center; gap:10px;">
                        <div class="avatar-small" style="background-color:${this.getAvatarColor(nombreDB)}">${this.getInitials(nombreDB)}</div>
                        <strong>${this.escapeHtml(nombreDB)}</strong>
                      </div>
                    </td>
                    <td>${this.escapeHtml(email)}</td>
                    <td><span class="status ${this.getRolClassFromString(rol)}">${this.getRolLabel(rol)}</span></td>
                    <td>${this.escapeHtml(ultimoAccesoText)}</td>
                    <td><span class="status ${activo ? 'in-stock' : 'out-of-stock'}">${activo ? 'Activo' : 'Inactivo'}</span></td>
                    <td class="actions"></td>
                `;

                const actionsTd = tr.querySelector('.actions');
                const btnVer = document.createElement('button');
                btnVer.className = 'btn btn-sm';
                btnVer.textContent = 'Ver';
                btnVer.dataset.action = 'ver';
                btnVer.dataset.id = usuario.id ?? '';
                actionsTd.appendChild(btnVer);

                const btnEditar = document.createElement('button');
                btnEditar.className = 'btn btn-sm btn-warning';
                btnEditar.textContent = 'Editar';
                btnEditar.dataset.action = 'editar';
                btnEditar.dataset.id = usuario.id ?? '';
                if (!this.canEdit(usuario)) btnEditar.disabled = true;
                actionsTd.appendChild(btnEditar);

                const btnEliminar = document.createElement('button');
                btnEliminar.className = 'btn btn-sm btn-danger';
                btnEliminar.textContent = 'Eliminar';
                btnEliminar.dataset.action = 'eliminar';
                btnEliminar.dataset.id = usuario.id ?? '';
                if (!this.canDelete(usuario)) btnEliminar.disabled = true;
                actionsTd.appendChild(btnEliminar);

                tablaBody.appendChild(tr);
            }
        } catch (e) { console.error('Error renderizando usuarios', e); }
        finally { this.hideTableLoading(); }
    }

    getAvatarColor(nombre = '') {
        const safe = String(nombre || '');
        const colors=['#3498db','#2ecc71','#e74c3c','#f39c12','#9b59b6','#1abc9c','#34495e'];
        return colors[safe.length % colors.length];
    }
    getInitials(nombre = '') {
        const s = String(nombre || '').trim();
        if (!s) return 'US';
        const parts = s.split(/\s+/);
        if (parts.length === 1) return parts[0].slice(0,2).toUpperCase();
        return (parts[0][0]+parts[parts.length-1][0]).toUpperCase();
    }
    getRolLabel(rol) {
        if (!rol) return 'Usuario';
        if (String(rol).toLowerCase().includes('super')) return 'Super Usuario';
        if (String(rol).toLowerCase().includes('admin')) return 'Administrador';
        if (String(rol).toLowerCase().includes('oper')) return 'Usuario Operacional';
        return 'Usuario de Consulta';
    }
    getRolClassFromString(rol) { if (!rol) return 'out-of-stock'; if (String(rol).toLowerCase().includes('super')) return 'in-stock'; if (String(rol).toLowerCase().includes('admin')) return 'low-stock'; if (String(rol).toLowerCase().includes('oper')) return 'in-stock'; return 'out-of-stock'; }

    // ----- paginación / búsqueda -----
    renderPagination(totalItems) {
        const pagination = document.getElementById('paginationUsuarios');
        if (!pagination) return;
        const totalPages = Math.max(1, Math.ceil((totalItems || 0)/this.itemsPerPage));
        if (totalPages <= 1) { pagination.innerHTML = ''; return; }
        let html = `<button class="page-btn ${this.currentPage===1?'disabled':''}" data-page="${Math.max(1,this.currentPage-1)}">« Anterior</button>`;
        for (let i=1;i<=totalPages;i++){
            if (i===1 || i===totalPages || (i>=this.currentPage-2 && i<=this.currentPage+2)) html += `<button class="page-btn ${i===this.currentPage?'active':''}" data-page="${i}">${i}</button>`;
            else if (i===this.currentPage-3 || i===this.currentPage+3) html += '<span class="page-dots">...</span>';
        }
        html += `<button class="page-btn ${this.currentPage===totalPages?'disabled':''}" data-page="${Math.min(totalPages,this.currentPage+1)}">Siguiente »</button>`;
        pagination.innerHTML = html;
        pagination.querySelectorAll('button.page-btn').forEach(btn=>{
            btn.removeEventListener('click', this._paginationHandler);
            btn.addEventListener('click', ()=> {
                const page = parseInt(btn.dataset.page);
                if (!isNaN(page)) this.changePage(page);
            });
        });
    }
    changePage(page) { if (!page || page<1) return; this.currentPage = page; this.renderUsuariosTable(); document.querySelector('.table-container')?.scrollIntoView({behavior:'smooth',block:'start'}); }
    handleSort(field) { if (this.currentSort.field === field) this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc':'asc'; else { this.currentSort.field = field; this.currentSort.direction = 'asc'; } this.renderUsuariosTable(); }
    setupRealTimeSearch() { const searchInput = document.getElementById('searchInputUsuarios'); if (!searchInput) return; let to = null; searchInput.addEventListener('input', (e)=> { if (to) clearTimeout(to); to = setTimeout(()=> this.handleSearch(e.target.value), 300); }); }
    async handleSearch(termino) { this.currentPage = 1; try { if (!termino || !termino.trim()) { await this.renderUsuariosTable(); return; } let resp = await this.api.get(`/usuarios/?search=${encodeURIComponent(termino)}`); resp = this._unwrap(resp); await this.renderUsuariosTable(resp); } catch (e) { console.error('Error buscando usuarios', e); } }

    // ----- formulario -----
    showUsuarioForm(usuario = null, { readOnly=false } = {}) {
        this.isEditing = !!usuario;
        this.currentUsuarioId = usuario ? usuario.id : null;

        const modal = document.getElementById('modalUsuario');
        const title = document.getElementById('modalTitleUsuario');
        const form = document.getElementById('usuarioForm');

        if (title) {
            const titleTxt = usuario ? (readOnly ? `Ver: ${this._coalesce(usuario.nombre, `${this._coalesce(usuario.nombres, usuario.first_name, '')} ${this._coalesce(usuario.apellidos, usuario.last_name, '')}`.trim(), '')}` : 'Editar Usuario') : 'Nuevo Usuario';
            title.textContent = titleTxt;
        }
        if (modal) {
            if (readOnly) modal.setAttribute('data-readonly','true');
            else modal.removeAttribute('data-readonly');
        }
        if (form) {
            form.reset();
            Array.from(form.querySelectorAll('input,select,textarea')).forEach(i => { i.disabled = false; try { i.readOnly = false; } catch(e) {} });
            const submitBtn = document.getElementById('btnSubmitUsuario');
            if (submitBtn) submitBtn.style.display = '';
        }

        // campo usuario (aparece en Ver, Editar, Nuevo)
        const usuarioField = document.getElementById('usuarioUsuario');

        if (usuario && form) {
            document.getElementById('nombresUsuario') && (document.getElementById('nombresUsuario').value = this._coalesce(usuario.nombres, usuario.first_name, ''));
            document.getElementById('apellidosUsuario') && (document.getElementById('apellidosUsuario').value = this._coalesce(usuario.apellidos, usuario.last_name, ''));
            document.getElementById('emailUsuario') && (document.getElementById('emailUsuario').value = this._coalesce(usuario.email, ''));
            document.getElementById('telefonoUsuario') && (document.getElementById('telefonoUsuario').value = this._coalesce(usuario.telefono, ''));

            if (usuarioField) {
                usuarioField.value = this._coalesce(usuario.usuario, usuario.username, '');
                usuarioField.disabled = true; // por defecto no permitimos editar username desde Ver/Editar a menos que la lógica lo permita
            }

            const rolEl = document.getElementById('rolUsuario');
            const computedRol = this.isSuperuser(usuario) ? 'superuser' : (usuario.rol ? usuario.rol : (this._bool(usuario.is_staff) ? 'admin' : 'consulta'));

            if (computedRol === 'superuser') {
                if (rolEl) {
                    rolEl.innerHTML = '';
                    const opt = document.createElement('option');
                    opt.value = 'superuser';
                    opt.text = 'Super Usuario';
                    opt.selected = true;
                    rolEl.appendChild(opt);
                    rolEl.disabled = true;
                }
            } else {
                this.setupRoleSelect();
                if (rolEl) {
                    if (!this.canEdit(usuario)) rolEl.disabled = true;
                    else {
                        if (!this.isSuperuser(this.currentUser) && (String(computedRol).toLowerCase() === 'admin')) {
                            rolEl.value = 'admin';
                            rolEl.disabled = true;
                        } else {
                            rolEl.value = computedRol;
                        }
                    }
                }
            }

            const estadoEl = document.getElementById('estadoUsuario');
            if (estadoEl) estadoEl.value = (usuario.activo !== undefined ? (usuario.activo ? '1' : '0') : (this._bool(usuario.is_active) ? '1' : '0'));

            // contraseñas: no requeridas en edición por defecto
            const pass = document.getElementById('contrasenaUsuario');
            const pass2 = document.getElementById('confirmarContrasena');
            if (pass) { pass.required = !this.isEditing; pass.value = ''; }
            if (pass2) { pass2.required = !this.isEditing; pass2.value = ''; }
        } else {
            // nuevo usuario
            if (usuarioField) {
                usuarioField.value = '';
                usuarioField.placeholder = 'Dejar vacío para generar automáticamente';
                usuarioField.disabled = !this.canCreate();
                usuarioField.readOnly = false;
            }
            this.setupRoleSelect();
            const rolEl = document.getElementById('rolUsuario');
            if (rolEl) rolEl.disabled = !this.canCreate();
            document.getElementById('contrasenaUsuario') && (document.getElementById('contrasenaUsuario').required = true);
            document.getElementById('confirmarContrasena') && (document.getElementById('confirmarContrasena').required = true);
        }

        // ocultar o mostrar bloque contraseñas
        const contrasenaBlock = document.getElementById('contrasenaFields');
        if (contrasenaBlock) {
            if (readOnly) {
                contrasenaBlock.style.display = 'none';
                const p = document.getElementById('contrasenaUsuario');
                const p2 = document.getElementById('confirmarContrasena');
                if (p) { p.required = false; p.value = ''; }
                if (p2) { p2.required = false; p2.value = ''; }
            } else {
                contrasenaBlock.style.display = 'grid';
            }
        }

        // FORZAR modo lectura
        if (readOnly && form) {
            Array.from(form.querySelectorAll('input,select,textarea')).forEach(i => {
                i.disabled = true;
                try { i.readOnly = true; } catch(e) {}
            });
            const submitBtn = document.getElementById('btnSubmitUsuario');
            if (submitBtn) submitBtn.style.display = 'none';
            if (modal) modal.classList.add('readonly-mode');
        } else if (modal) {
            modal.classList.remove('readonly-mode');
            // permitir editar username si se cumple canEdit y estamos en edición
            if (usuarioField) {
                if (this.isEditing) {
                    const target = usuario || null;
                    usuarioField.disabled = !this.canEdit(target);
                } else {
                    usuarioField.disabled = !this.canCreate();
                }
            }
        }

        try { if (typeof validator !== 'undefined' && validator.clearFieldErrors) validator.clearFieldErrors(form); } catch(e){}
        if (modal) {
            // Centrar modal con clase .show y bloquear scroll de fondo
            modal.style.removeProperty('display');
            modal.classList.add('show');
            document.body.classList.add('modal-open');

            // Cierre con click en overlay (fuera de .modal-content)
            this._onOverlayClick = (ev) => {
                if (ev.target === modal) this.hideUsuarioForm();
            };
            modal.addEventListener('click', this._onOverlayClick);

            // Cierre con tecla ESC
            this._onKeydown = (ev) => {
                if (ev.key === 'Escape') this.hideUsuarioForm();
            };
            document.addEventListener('keydown', this._onKeydown);
        }
    }

    hideUsuarioForm() {
        const modal = document.getElementById('modalUsuario');
        if (modal) {
            modal.classList.remove('show');
            modal.style.display = 'none';
            modal.removeAttribute('data-readonly');
            modal.classList.remove('readonly-mode');
            // Quitar listeners y desbloquear scroll
            if (this._onOverlayClick) {
                modal.removeEventListener('click', this._onOverlayClick);
                this._onOverlayClick = null;
            }
            if (this._onKeydown) {
                document.removeEventListener('keydown', this._onKeydown);
                this._onKeydown = null;
            }
            document.body.classList.remove('modal-open');
        }
        this.isEditing = false;
        this.currentUsuarioId = null;
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const fd = new FormData(form);
        const data = Object.fromEntries(fd.entries());

        // Normalizar campos
        data.usuario = (data.usuario || '').trim();
        data.nombres = (data.nombres || '').trim();
        data.apellidos = (data.apellidos || '').trim();
        data.email = (data.email || '').trim();
        data.rol = data.rol || 'consulta';
        data.activo = (data.activo === '1' || data.activo === 1 || data.activo === 'true' || data.activo === true) ? 1 : 0;

        // Validar primero campos obligatorios ANTES de la contraseña
        const requiredErrors = [];
        const focusCandidates = [];
        if (!data.nombres) { requiredErrors.push('Nombres'); const el = document.getElementById('nombresUsuario'); if (el) focusCandidates.push(el); }
        if (!data.apellidos) { requiredErrors.push('Apellidos'); const el = document.getElementById('apellidosUsuario'); if (el) focusCandidates.push(el); }
        if (!data.email) { requiredErrors.push('Email'); const el = document.getElementById('emailUsuario'); if (el) focusCandidates.push(el); }
        else {
            // Validación básica de email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(data.email)) {
                requiredErrors.push('Email válido');
                const el = document.getElementById('emailUsuario');
                if (el) focusCandidates.push(el);
            }
        }
        if (requiredErrors.length > 0) {
            // Mensaje prioritario antes de validar contraseña
            this.showNotification('Por favor completa: ' + requiredErrors.join(', '), 'warning');
            // Enfocar el primer campo faltante
            try { focusCandidates[0]?.focus(); } catch(e){}
            return;
        }

        // Si no se envió usuario, generarlo localmente
        if (!data.usuario) {
            data.usuario = this.generateUsernameFrom(data.nombres, data.apellidos, data.email);
        }

        // Si es edición y el currentUser no tiene permiso para cambiar username, eliminarlo del payload
        if (this.isEditing && !this.canEdit({ id: this.currentUsuarioId })) {
            delete data.usuario;
        }

        // Validación de contraseña (después de requeridos de arriba)
        // IMPORTANTE: usamos name "password" y "password_confirm" (coincide con serializer)
        if (!this.isEditing) {
            if (!data.password || data.password.length < 8) return this.showNotification('Contraseña mínima 8 caracteres.', 'error');
            if (!(/[A-Za-z]/.test(data.password) && /\d/.test(data.password))) return this.showNotification('La contraseña debe contener letras y números.', 'error');
            if (!data.password_confirm || data.password !== data.password_confirm) return this.showNotification('Falta confirmar la contraseña o las contraseñas no coinciden.', 'error');
        } else {
            if (data.password) {
                if (data.password.length < 8) return this.showNotification('Contraseña mínima 8 caracteres.', 'error');
                if (!(/[A-Za-z]/.test(data.password) && /\d/.test(data.password))) return this.showNotification('La contraseña debe contener letras y números.', 'error');
                if (!data.password_confirm || data.password !== data.password_confirm) return this.showNotification('Falta confirmar la contraseña o las contraseñas no coinciden.', 'error');
            }
        }

        data.nombre = `${data.nombres} ${data.apellidos}`.trim();

        this.setFormLoading(true);

        try {
            let payload;
            if (this.isEditing && this.currentUsuarioId) payload = await this.api.put(`/usuarios/${this.currentUsuarioId}/`, data);
            else payload = await this.api.post('/usuarios/', data);

            // Si la API lanza una excepción, api.js normalmente la lanza. Si devuelve objeto con errores, lo normalizamos.
            if (!payload) throw new Error('Respuesta vacía del servidor');

            const unwrapped = this._unwrap(payload) ?? payload;
            // Detectar forma de error verdadera (campos con arrays de errores o "detail")
            const isErrorShape = (obj) => {
                if (!obj || typeof obj !== 'object') return false;
                if (obj.detail) return true;
                const errKeys = ['usuario','password','password_confirm','email'];
                return errKeys.some(k => Array.isArray(obj[k]));
            };

            if (isErrorShape(unwrapped)) {
                // Construir mensaje amable en español
                let mensajes = [];
                if (Array.isArray(unwrapped.password)) {
                    const p = unwrapped.password.join('; ');
                    if (p.toLowerCase().includes('too common') || p.toLowerCase().includes('demasiado común') || p.toLowerCase().includes('too similar')) {
                        mensajes.push('La contraseña es demasiado común o insegura — elige otra más fuerte (mezcla letras y números).');
                    } else {
                        mensajes.push('Contraseña: ' + p);
                    }
                }
                if (Array.isArray(unwrapped.password_confirm)) {
                    const pc = unwrapped.password_confirm.join('; ');
                    const low = pc.toLowerCase();
                    if (!low.includes('this field is required') && !low.includes('required') && !low.includes('este campo es obligatorio')) {
                        mensajes.push('Confirmar contraseña: ' + pc);
                    }
                }
                if (Array.isArray(unwrapped.usuario)) {
                    const u = unwrapped.usuario.join('; ');
                    if (!/required/i.test(u)) mensajes.push('Usuario: ' + u);
                }
                if (Array.isArray(unwrapped.email)) {
                    const em = unwrapped.email.join('; ');
                    if (!/required/i.test(em)) mensajes.push('Email: ' + em);
                }
                if (unwrapped.detail) mensajes.push(String(unwrapped.detail));

                if (mensajes.length > 0) throw new Error(mensajes.join(' — '));
                throw new Error('Error al guardar el usuario (ver consola para más detalles).');
            }

            // éxito
            this.showNotification(this.isEditing ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente', 'success');
            this.hideUsuarioForm();
            await this.renderDashboard();
            await this.renderUsuariosTable();
        } catch (err) {
            console.error('Error guardando usuario:', err);
            // si err contiene JSON incrustado, intentar extraer
            let msg = 'Error al guardar el usuario';
            if (err && err.message) msg = String(err.message);
            this.showNotification(msg, 'error');
        } finally {
            this.setFormLoading(false);
        }
    }

    setFormLoading(loading) {
        const btn = document.getElementById('btnSubmitUsuario');
        const spinner = document.getElementById('btnLoadingUsuario');
        const txt = document.getElementById('btnTextUsuario');
        if (btn) btn.disabled = loading;
        if (spinner) spinner.style.display = loading ? 'inline-block' : 'none';
        if (txt) txt.textContent = loading ? (this.isEditing ? 'Actualizando...' : 'Guardando...') : (this.isEditing ? 'Actualizar Usuario' : 'Guardar Usuario');
    }

    // ----- eliminación y confirm ----
    async confirmarEliminacion(id) {
        console.log('confirmarEliminacion: preparando confirm para id ->', id);
        
        // Usar sistema de confirmación global
        const confirmed = await (window.confirmCriticalAction 
            ? window.confirmCriticalAction('¿Está seguro de que desea eliminar este usuario? Esta acción no se puede deshacer.')
            : confirm('¿Está seguro de que desea eliminar este usuario?')
        );
        
        if (confirmed) {
            this.eliminarUsuario(id);
        }
    }

    hideConfirmModal() {
        const cm = document.getElementById('modalConfirm');
        if (cm) {
            cm.classList.remove('show');
            cm.style.display = 'none';
        }
        if (this._onKeydown) {
            document.removeEventListener('keydown', this._onKeydown);
            this._onKeydown = null;
        }
        document.body.classList.remove('modal-open');
        this._pendingDeleteId = null;
    }

    async eliminarUsuario(id) {
        try {
            console.log('eliminarUsuario: inicio ->', id);
            let target = await this.api.get(`/usuarios/${id}/`).catch(()=>null);
            target = this._unwrap(target);
            console.log('eliminarUsuario: target obtenido ->', target);
            if (!this.canDelete(target)) {
                console.warn('eliminarUsuario: no tienes permisos para eliminar ->', target);
                return this.showNotification('No tienes permisos para eliminar este usuario.', 'error');
            }
            await this.api.delete(`/usuarios/${id}/`);
            console.log('eliminarUsuario: delete solicitado para id ->', id);
            this.showNotification('Usuario eliminado correctamente', 'success');
            await this.renderDashboard();
            await this.renderUsuariosTable();
        } catch (e) {
            console.error('Error eliminando usuario:', e);
            this.showNotification('Error al eliminar el usuario: ' + (e && e.message ? e.message : e), 'error');
            throw e;
        }
    }

    _tableClickHandler(ev) {
        const btn = ev.target.closest('button[data-action], [data-action]');
        if (!btn) return;
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        if (!action || !id) return;
        console.log('Tabla: acción detectada ->', action, 'id ->', id);
        if (action === 'editar') this.editarUsuario(id);
        else if (action === 'eliminar') this.confirmarEliminacion(id);
        else if (action === 'ver') this.verUsuario(id);
    }

    async editarUsuario(id) {
        try {
            let usuario = await this.api.get(`/usuarios/${id}/`);
            usuario = this._unwrap(usuario);
            console.log('editarUsuario: usuario cargado ->', usuario);
            if (!usuario) return this.showNotification('Usuario no encontrado', 'error');
            if (!this.canEdit(usuario)) return this.showNotification('No tienes permisos para editar este usuario.', 'error');
            this.showUsuarioForm(usuario, { readOnly:false });
        } catch (e) {
            console.error('Error cargando usuario:', e);
            this.showNotification('Error cargando usuario: ' + (e && e.message ? e.message : e), 'error');
        }
    }

    async verUsuario(id) {
        try {
            let u = await this.api.get(`/usuarios/${id}/`);
            u = this._unwrap(u);
            console.log('verUsuario: usuario cargado ->', u);
            if (!u) return this.showNotification('Usuario no encontrado', 'error');
            this.showUsuarioForm(u, { readOnly: true });
        } catch (e) {
            console.error(e);
        }
    }

    showNotification(message, type='info') {
        const container = document.getElementById('notifications');
        if (!container) {
            // fallback alert
            alert(message);
            return;
        }
        const n = document.createElement('div');
        n.className = `notification ${type}`;
        n.innerHTML = `<span class="notification-icon">${this.getNotificationIcon(type)}</span><span class="notification-message">${message}</span><button class="btn-close btn-close-sm" aria-label="Cerrar">&times;</button>`;
        container.appendChild(n);
        n.querySelector('.btn-close')?.addEventListener('click', ()=> n.remove());
        setTimeout(()=> { if (n.parentElement) n.remove(); }, 6000);
    }
    getNotificationIcon(type) { const icons = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' }; return icons[type] || 'ℹ️'; }
}

// instanciar
let usuariosManager;
document.addEventListener('DOMContentLoaded', ()=> { usuariosManager = new UsuariosManager(); });
