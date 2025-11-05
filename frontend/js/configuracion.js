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

        // Modal de confirmación
        document.getElementById('btnConfirmCancel')?.addEventListener('click', () => this.hideConfirmModal());
    }

    async loadConfiguracion() {
        try {
            // Cargar configuración desde la API
            const configFromAPI = await this.api.get('/configuracion/');
            
            // Combinar con configuración local
            this.configuracion = {
                ...storage.getConfiguracion(),
                ...configFromAPI
            };
            
            this.populateForms();
        } catch (error) {
            console.error('Error cargando configuración:', error);
            // Usar configuración local como fallback
            this.configuracion = storage.getConfiguracion();
            this.populateForms();
        }
    }

    populateForms() {
        // Configuración General
        document.getElementById('nombreRestaurante').value = this.configuracion.nombreRestaurante || '';
        document.getElementById('moneda').value = this.configuracion.moneda || 'MXN';
        document.getElementById('iva').value = this.configuracion.iva || 16;
        document.getElementById('formatoFecha').value = this.configuracion.formatoFecha || 'dd/mm/yyyy';
        document.getElementById('direccionRestaurante').value = this.configuracion.direccionRestaurante || '';
        document.getElementById('telefonoRestaurante').value = this.configuracion.telefonoRestaurante || '';
        document.getElementById('direccionCounter').textContent = (this.configuracion.direccionRestaurante || '').length;

        // Configuración de Inventario
        document.getElementById('stockMinimoGlobal').value = this.configuracion.stockMinimoGlobal || 10;
        document.getElementById('alertaStockBajo').value = this.configuracion.alertaStockBajo || 'si';
        document.getElementById('unidadMedida').value = this.configuracion.unidadMedida || 'unidades';
        document.getElementById('controlCaducidad').checked = this.configuracion.controlCaducidad || false;
        document.getElementById('notificacionesAutomaticas').checked = this.configuracion.notificacionesAutomaticas || false;

        // Configuración de Notificaciones
        document.getElementById('emailNotificaciones').value = this.configuracion.emailNotificaciones || '';
        document.getElementById('notifStockBajo').checked = this.configuracion.notifStockBajo !== false;
        document.getElementById('notifStockAgotado').checked = this.configuracion.notifStockAgotado !== false;
        document.getElementById('notifProductosCaducados').checked = this.configuracion.notifProductosCaducados || false;
        document.getElementById('notifPedidosPendientes').checked = this.configuracion.notifPedidosPendientes || false;
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
            // Guardar en API
            await this.api.post('/configuracion/', configData);
            
            // Actualizar configuración local
            this.configuracion = { ...this.configuracion, ...configData };
            storage.setConfiguracion(this.configuracion);
            
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
        
        configData.controlCaducidad = document.getElementById('controlCaducidad').checked;
        configData.notificacionesAutomaticas = document.getElementById('notificacionesAutomaticas').checked;

        this.setFormLoading('btnLoadingInventario', true);

        try {
            await this.api.post('/configuracion/', configData);
            this.configuracion = { ...this.configuracion, ...configData };
            storage.setConfiguracion(this.configuracion);
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
        configData.notifProductosCaducados = document.getElementById('notifProductosCaducados').checked;
        configData.notifPedidosPendientes = document.getElementById('notifPedidosPendientes').checked;
        configData.notifReportesAutomaticos = document.getElementById('notifReportesAutomaticos').checked;
        configData.notifActividadUsuarios = document.getElementById('notifActividadUsuarios').checked;

        if (configData.emailNotificaciones && !this.validateEmail(configData.emailNotificaciones)) {
            this.showNotification('Por favor ingrese un email válido', 'error');
            return;
        }

        this.setFormLoading('btnLoadingNotificaciones', true);

        try {
            await this.api.post('/configuracion/', configData);
            this.configuracion = { ...this.configuracion, ...configData };
            storage.setConfiguracion(this.configuracion);
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
            await this.api.post('/configuracion/', configData);
            this.configuracion = { ...this.configuracion, ...configData };
            storage.setConfiguracion(this.configuracion);
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
        try {
            const backupData = await this.api.get('/backup/');
            
            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            
            a.href = url;
            a.download = `backup_sushihouse_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showNotification('Copia de seguridad generada correctamente', 'success');
        } catch (error) {
            this.showNotification('Error al generar la copia de seguridad: ' + error.message, 'error');
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
            storage.clear();
            storage.initializeStorage();
            
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
        
        newBtnAccept.addEventListener('click', onConfirm);
        modal.classList.add('show');
    }

    hideConfirmModal() {
        const modal = document.getElementById('modalConfirm');
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