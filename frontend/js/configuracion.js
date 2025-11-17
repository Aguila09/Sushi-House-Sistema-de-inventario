// Sistema de configuración
class ConfiguracionManager {
    constructor() {
        this.configuracion = {};
        this.api = apiClient;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadConfiguracion();
    }

    bindEvents() {
        // Formularios
        document.getElementById('configGeneralForm')?.addEventListener('submit', (e) => this.handleGeneralSubmit(e));
        document.getElementById('configInventarioForm')?.addEventListener('submit', (e) => this.handleInventarioSubmit(e));
        document.getElementById('configNotificacionesForm')?.addEventListener('submit', (e) => this.handleNotificacionesSubmit(e));
        document.getElementById('configSeguridadForm')?.addEventListener('submit', (e) => this.handleSeguridadSubmit(e));

        // Botones de mantenimiento
        document.getElementById('btnBackup')?.addEventListener('click', () => this.generarBackup());
        document.getElementById('btnRestore')?.addEventListener('click', () => this.restaurarSistema());
        document.getElementById('btnResetSystem')?.addEventListener('click', () => this.confirmarReset());

        // Contador de caracteres
        document.getElementById('direccionRestaurante')?.addEventListener('input', (e) => {
            document.getElementById('direccionCounter').textContent = e.target.value.length;
        });

        // Modal de confirmación
        document.getElementById('btnConfirmCancel')?.addEventListener('click', () => this.hideConfirmModal());
        
        // Cerrar modal con ESC o click fuera
        document.getElementById('modalConfirm')?.addEventListener('click', (e) => {
            if (e.target.id === 'modalConfirm') this.hideConfirmModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.getElementById('modalConfirm')?.classList.contains('show')) {
                this.hideConfirmModal();
            }
        });
    }

    async loadConfiguracion() {
        try {
            // Cargar configuración desde la API (singleton)
            let configFromAPI = await this.api.get('/configuracion/');
            
            // Si es array, tomar el primero (list action del viewset)
            if (Array.isArray(configFromAPI) && configFromAPI.length > 0) {
                configFromAPI = configFromAPI[0];
            }
            
            // Usar solo la configuración de la API
            this.configuracion = configFromAPI || {};
            
            // Cargar categorías para el selector
            await this.loadCategorias();
            
            this.populateForms();
        } catch (error) {
            console.error('Error cargando configuración:', error);
            this.showNotification('Error al cargar configuración del sistema', 'error');
            this.configuracion = {};
        } finally {
            // Ocultar loading screen
            if (typeof Loading !== 'undefined') {
                Loading.hide();
            } else if (typeof hideLoading !== 'undefined') {
                hideLoading();
            }
        }
    }

    async loadCategorias() {
        try {
            const categorias = await this.api.get('/categorias/');
            const select = document.getElementById('categoriaPredeterminada');
            if (select) {
                // Limpiar opciones excepto la primera
                select.innerHTML = '<option value="">Seleccione una categoría</option>';
                
                // Agregar categorías
                categorias.forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat.id;
                    option.textContent = cat.nombre;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error cargando categorías:', error);
        }
    }

    populateForms() {
        // Configuración General (campos en camelCase desde API)
        document.getElementById('nombreRestaurante').value = this.configuracion.nombreRestaurante || '';
        document.getElementById('moneda').value = this.configuracion.moneda || 'MXN';
        document.getElementById('iva').value = this.configuracion.iva || 16;
        document.getElementById('formatoFecha').value = this.configuracion.formatoFecha || 'dd/mm/yyyy';
        document.getElementById('direccionRestaurante').value = this.configuracion.direccionRestaurante || '';
        document.getElementById('telefonoRestaurante').value = this.configuracion.telefonoRestaurante || '';
        document.getElementById('direccionCounter').textContent = (this.configuracion.direccionRestaurante || '').length;

        // Configuración de Inventario
        document.getElementById('stockMinimoGlobal').value = this.configuracion.stockMinimoGlobal || 10;
        document.getElementById('alertaStockBajo').value = this.configuracion.alertaStockBajo ? 'si' : 'no';
        document.getElementById('unidadMedida').value = this.configuracion.unidadMedida || 'unidades';
        document.getElementById('notificacionesAutomaticas').checked = this.configuracion.notificacionesAutomaticas || false;
        
        // Categoría predeterminada
        if (this.configuracion.categoriaPredeterminada) {
            document.getElementById('categoriaPredeterminada').value = this.configuracion.categoriaPredeterminada;
        }

        // Configuración de Notificaciones
        document.getElementById('emailNotificaciones').value = this.configuracion.emailNotificaciones || '';
        document.getElementById('notifStockBajo').checked = this.configuracion.notifStockBajo !== false;
        document.getElementById('notifStockAgotado').checked = this.configuracion.notifStockAgotado !== false;
        document.getElementById('notifReportesAutomaticos').checked = this.configuracion.notifReportesAutomaticos || false;
        document.getElementById('notifActividadUsuarios').checked = this.configuracion.notifActividadUsuarios || false;
        document.getElementById('frecuenciaReportes').value = this.configuracion.frecuenciaReportes || 'semanal';
        document.getElementById('horaNotificaciones').value = this.configuracion.horaNotificaciones || '09:00';

        // Configuración de Seguridad
        document.getElementById('tiempoSesion').value = this.configuracion.tiempoSesion || 30;
        document.getElementById('intentosFallidos').value = this.configuracion.intentosFallidos || 3;
        document.getElementById('requerirConfirmacion').checked = this.configuracion.requerirConfirmacion || false;
        document.getElementById('registroActividad').checked = this.configuracion.registroActividad !== false;
        document.getElementById('backupAutomatico').checked = this.configuracion.backupAutomatico || false;
    }

    async handleGeneralSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const configData = Object.fromEntries(formData.entries());
        
        if (!this.validateGeneralConfig(configData)) {
            return;
        }

        this.setFormLoading('btnLoadingGeneral', true);

        try {
            // Actualizar en API (PATCH para actualizar singleton)
            const updated = await this.api.patch('/configuracion/' + (this.configuracion.id || '1') + '/', configData);
            
            // Actualizar configuración local
            this.configuracion = { ...this.configuracion, ...updated };
            
            this.showNotification('Configuración general guardada correctamente', 'success');
        } catch (error) {
            this.showNotification('Error al guardar la configuración: ' + error.message, 'error');
        } finally {
            this.setFormLoading('btnLoadingGeneral', false);
        }
    }

    async handleInventarioSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const configData = Object.fromEntries(formData.entries());
        
        configData.notificacionesAutomaticas = document.getElementById('notificacionesAutomaticas').checked;
        configData.alertaStockBajo = document.getElementById('alertaStockBajo').value === 'si';

        this.setFormLoading('btnLoadingInventario', true);

        try {
            const updated = await this.api.patch('/configuracion/' + (this.configuracion.id || '1') + '/', configData);
            this.configuracion = { ...this.configuracion, ...updated };
            this.showNotification('Configuración de inventario guardada correctamente', 'success');
        } catch (error) {
            this.showNotification('Error al guardar la configuración: ' + error.message, 'error');
        } finally {
            this.setFormLoading('btnLoadingInventario', false);
        }
    }

    async handleNotificacionesSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const configData = Object.fromEntries(formData.entries());
        
        configData.notifStockBajo = document.getElementById('notifStockBajo').checked;
        configData.notifStockAgotado = document.getElementById('notifStockAgotado').checked;
        configData.notifReportesAutomaticos = document.getElementById('notifReportesAutomaticos').checked;
        configData.notifActividadUsuarios = document.getElementById('notifActividadUsuarios').checked;

        if (configData.emailNotificaciones && !this.validateEmail(configData.emailNotificaciones)) {
            this.showNotification('Por favor ingrese un email válido', 'error');
            return;
        }

        this.setFormLoading('btnLoadingNotificaciones', true);

        try {
            const updated = await this.api.patch('/configuracion/' + (this.configuracion.id || '1') + '/', configData);
            this.configuracion = { ...this.configuracion, ...updated };
            this.showNotification('Configuración de notificaciones guardada correctamente', 'success');
        } catch (error) {
            this.showNotification('Error al guardar la configuración: ' + error.message, 'error');
        } finally {
            this.setFormLoading('btnLoadingNotificaciones', false);
        }
    }

    async handleSeguridadSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const configData = Object.fromEntries(formData.entries());
        
        configData.requerirConfirmacion = document.getElementById('requerirConfirmacion').checked;
        configData.registroActividad = document.getElementById('registroActividad').checked;
        configData.backupAutomatico = document.getElementById('backupAutomatico').checked;

        this.setFormLoading('btnLoadingSeguridad', true);

        try {
            const updated = await this.api.patch('/configuracion/' + (this.configuracion.id || '1') + '/', configData);
            this.configuracion = { ...this.configuracion, ...updated };
            this.showNotification('Configuración de seguridad guardada correctamente', 'success');
        } catch (error) {
            this.showNotification('Error al guardar la configuración: ' + error.message, 'error');
        } finally {
            this.setFormLoading('btnLoadingSeguridad', false);
        }
    }

    validateGeneralConfig(config) {
        if (!config.nombreRestaurante || config.nombreRestaurante.trim() === '') {
            this.showNotification('El nombre del restaurante es requerido', 'error');
            return false;
        }

        if (config.iva < 0 || config.iva > 100) {
            this.showNotification('El IVA debe estar entre 0 y 100', 'error');
            return false;
        }

        return true;
    }

    validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    setFormLoading(buttonId, loading) {
        const button = document.getElementById(buttonId);
        if (button) {
            if (loading) {
                button.style.display = 'inline-block';
            } else {
                button.style.display = 'none';
            }
        }
    }

    async generarBackup() {
        const mensaje = 'Este backup descargará un archivo JSON con la configuración, categorías, proveedores, productos y datos básicos de usuarios. Úsalo para restaurar el sistema en caso de pérdida o migración. ¿Deseas continuar?';
        try {
            const confirmado = await window.confirmCriticalAction(mensaje, true);
            if (!confirmado) {
                this.showNotification('Descarga de backup cancelada', 'warning');
                return;
            }
            const data = await this.api.get('/backup/');
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const ts = new Date();
            const fecha = ts.toISOString().slice(0,19).replace(/[:T]/g,'-');
            a.href = url;
            a.download = `backup_sushihouse_${fecha}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            this.showNotification('Backup descargado correctamente', 'success');
        } catch (error) {
            this.showNotification('Error al descargar el backup: ' + error.message, 'error');
        }
    }

    async restaurarSistema() {
        const fileInput = document.getElementById('fileRestore');
        const file = fileInput.files[0];
        
        if (!file) {
            this.showNotification('Por favor seleccione un archivo de backup', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const datos = JSON.parse(e.target.result);
                
                this.showConfirmModal(
                    '¿Está seguro de que desea restaurar el sistema desde este backup? Todos los datos actuales serán reemplazados.',
                    async () => {
                        try {
                            await this.api.post('/restore/', datos);
                            this.showNotification('Sistema restaurado correctamente desde el backup', 'success');
                            setTimeout(() => {
                                location.reload();
                            }, 2000);
                        } catch (error) {
                            this.showNotification('Error al restaurar el sistema: ' + error.message, 'error');
                        }
                    }
                );
            } catch (error) {
                this.showNotification('Error al leer el archivo: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
    }

    confirmarReset() {
        this.showConfirmModal(
            '¿Está completamente seguro de que desea restablecer el sistema? TODOS los datos serán eliminados y no se podrán recuperar. Esta acción no se puede deshacer.',
            () => {
                this.resetSystem();
            }
        );
    }

    async resetSystem() {
        try {
            await this.api.post('/system/reset/');
            
            this.showNotification('Sistema restablecido correctamente', 'success');
            setTimeout(() => {
                location.reload();
            }, 2000);
        } catch (error) {
            this.showNotification('Error al restablecer el sistema: ' + error.message, 'error');
        }
    }

    showConfirmModal(message, onConfirm) {
        const modal = document.getElementById('modalConfirm');
        const messageElement = document.getElementById('confirmMessage');
        const btnAccept = document.getElementById('btnConfirmAccept');
        
        messageElement.textContent = message;
        
        const newBtnAccept = btnAccept.cloneNode(true);
        btnAccept.parentNode.replaceChild(newBtnAccept, btnAccept);
        
        newBtnAccept.addEventListener('click', () => {
            onConfirm();
            this.hideConfirmModal();
        });
        
        document.body.classList.add('modal-open');
        modal.classList.add('show');
    }

    hideConfirmModal() {
        const modal = document.getElementById('modalConfirm');
        document.body.classList.remove('modal-open');
        modal.classList.remove('show');
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
}

let configManager;
document.addEventListener('DOMContentLoaded', () => {
    configManager = new ConfiguracionManager();
});

