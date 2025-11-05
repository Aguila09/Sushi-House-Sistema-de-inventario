// Sistema de reportes
class ReportesManager {
    constructor() {
        this.api = apiClient;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadReportes();
    }

    bindEvents() {
        document.getElementById('btnGenerarReporte')?.addEventListener('click', () => this.generarReporte());
        document.getElementById('btnExportReporte')?.addEventListener('click', () => this.exportarReporte());
    }

    async loadReportes() {
        try {
            const reportes = await this.api.get('/reportes/');
            this.renderReportes(reportes);
        } catch (error) {
            console.error('Error loading reports:', error);
            this.showNotification('Error al cargar los reportes', 'error');
        }
    }

    renderReportes(reportes) {
        // Actualizar dashboard con datos de reportes
        if (reportes.productos_mas_vendidos !== undefined) {
            document.getElementById('productosMasVendidos').textContent = reportes.productos_mas_vendidos;
        }
        
        if (reportes.valor_inventario !== undefined) {
            document.getElementById('valorInventario').textContent = `$${reportes.valor_inventario.toLocaleString()}`;
        }
        
        if (reportes.rotacion_stock !== undefined) {
            document.getElementById('rotacionStock').textContent = `${reportes.rotacion_stock}%`;
        }
        
        if (reportes.productos_vencidos !== undefined) {
            document.getElementById('productosVencidos').textContent = reportes.productos_vencidos;
        }

        // Renderizar gráficos si existen
        this.renderGraficos(reportes);
    }

    renderGraficos(reportes) {
        // Aquí puedes integrar bibliotecas como Chart.js para gráficos
        // Por ahora, solo mostramos datos básicos
        const graficoContainer = document.getElementById('graficoVentas');
        if (graficoContainer && reportes.ventas_por_categoria) {
            graficoContainer.innerHTML = this.generarHTMLGrafico(reportes.ventas_por_categoria);
        }
    }

    generarHTMLGrafico(datos) {
        let html = '<div class="grafico-simple">';
        datos.forEach(item => {
            html += `
                <div class="barra-categoria">
                    <div class="nombre-categoria">${item.categoria}</div>
                    <div class="barra-container">
                        <div class="barra" style="width: ${item.porcentaje}%"></div>
                    </div>
                    <div class="valor-categoria">${item.valor}</div>
                </div>
            `;
        });
        html += '</div>';
        return html;
    }

    async generarReporte() {
        try {
            const tipoReporte = document.getElementById('tipoReporte')?.value || 'general';
            const fechaInicio = document.getElementById('fechaInicio')?.value;
            const fechaFin = document.getElementById('fechaFin')?.value;
            
            const params = new URLSearchParams();
            params.append('tipo', tipoReporte);
            if (fechaInicio) params.append('fecha_inicio', fechaInicio);
            if (fechaFin) params.append('fecha_fin', fechaFin);
            
            const reporte = await this.api.get(`/reportes/generar/?${params}`);
            this.renderReporteDetallado(reporte);
            this.showNotification('Reporte generado correctamente', 'success');
        } catch (error) {
            this.showNotification('Error al generar el reporte: ' + error.message, 'error');
        }
    }

    renderReporteDetallado(reporte) {
        const container = document.getElementById('reporteDetallado');
        if (!container) return;

        container.innerHTML = `
            <div class="reporte-detalle">
                <h4>${reporte.titulo || 'Reporte Detallado'}</h4>
                <div class="fecha-generacion">Generado: ${new Date().toLocaleString()}</div>
                <div class="datos-reporte">
                    ${this.formatearDatosReporte(reporte.datos)}
                </div>
            </div>
        `;
    }

    formatearDatosReporte(datos) {
        if (!datos) return '<p>No hay datos disponibles</p>';
        
        if (Array.isArray(datos)) {
            let html = '<table class="tabla-reporte"><thead><tr>';
            if (datos.length > 0) {
                // Crear headers basados en las keys del primer objeto
                Object.keys(datos[0]).forEach(key => {
                    html += `<th>${this.formatearHeader(key)}</th>`;
                });
                html += '</tr></thead><tbody>';
                
                // Agregar filas
                datos.forEach(item => {
                    html += '<tr>';
                    Object.values(item).forEach(valor => {
                        html += `<td>${valor}</td>`;
                    });
                    html += '</tr>';
                });
                html += '</tbody></table>';
            }
            return html;
        }
        
        return `<pre>${JSON.stringify(datos, null, 2)}</pre>`;
    }

    formatearHeader(key) {
        const headers = {
            'nombre': 'Nombre',
            'categoria': 'Categoría',
            'precio': 'Precio',
            'stock': 'Stock',
            'ventas': 'Ventas',
            'valor': 'Valor'
        };
        return headers[key] || key;
    }

    async exportarReporte() {
        try {
            const response = await this.api.get('/reportes/exportar/', {
                responseType: 'blob'
            });
            
            const blob = new Blob([response], { type: 'application/vnd.ms-excel' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            
            a.href = url;
            a.download = `reporte_sushihouse_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showNotification('Reporte exportado correctamente', 'success');
        } catch (error) {
            this.showNotification('Error al exportar el reporte: ' + error.message, 'error');
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
}

let reportesManager;
document.addEventListener('DOMContentLoaded', () => {
    reportesManager = new ReportesManager();
});