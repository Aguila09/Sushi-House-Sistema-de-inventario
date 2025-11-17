// Reportes reales basados en endpoints existentes: /dashboard/estadisticas/ y /productos/
class ReportesManager {
    constructor() {
        this.api = apiClient;
        this._productosCache = [];
        this._charts = {}; // Almacenar instancias de Chart.js
        this.config = { moneda: '$', iva: 0 }; // Valores por defecto si aún no se obtiene configuración
        this.bindEvents();
        this.load();
    }

    bindEvents() {
        document.getElementById('btnGenerarReporte')?.addEventListener('click', () => this.load());
        document.getElementById('btnExportReporte')?.addEventListener('click', () => this.exportarCSVProductos());
    }

    async load() {
        try {
            // Cargar configuración del sistema (singleton)
            await this.loadConfig();

            // Stats generales
            let stats = null;
            try {
                stats = await this.api.get('/dashboard/estadisticas/');
            } catch (e) { stats = null; }

            // Productos para gráficos y cálculos
            let productosResp = await this.api.get('/productos/');
            const productos = Array.isArray(productosResp) ? productosResp : (productosResp?.results || []);
            this._productosCache = productos;

            // Calcular métricas derivadas si stats no está
            let agotados = stats?.stock_agotado ?? productos.filter(p => (p.stock ?? 0) === 0).length;
            let stockBajo = stats?.stock_bajo ?? productos.filter(p => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= (p.stock_minimo ?? 0)).length;
            let valorInventario;
            if (typeof stats?.valor_inventario !== 'undefined') valorInventario = Number(stats.valor_inventario);
            else valorInventario = productos.reduce((acc, p) => acc + ((parseFloat(p.precio) || 0) * (p.stock || 0)), 0);

            // Categorías activas a partir de productos si no hay stats
            let categoriasActivas = stats?.total_categorias;
            if (typeof categoriasActivas === 'undefined') {
                const setCat = new Set((productos || []).map(p => (p.categoria_nombre || p.categoria)).filter(Boolean));
                categoriasActivas = setCat.size;
            }

            // Pintar tarjetas
            const fmtMoney = (n) => `${this.config.moneda} ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            const valorInventarioIVA = valorInventario * (1 + (Number(this.config.iva) || 0) / 100);
            document.getElementById('reporteAgotados') && (document.getElementById('reporteAgotados').textContent = String(agotados));
            document.getElementById('reporteStockBajo') && (document.getElementById('reporteStockBajo').textContent = String(stockBajo));
            if (document.getElementById('valorTotalInventario')) {
                const elem = document.getElementById('valorTotalInventario');
                // Mostrar valor con y sin IVA si aplica
                if ((Number(this.config.iva) || 0) > 0) {
                    elem.textContent = `${fmtMoney(valorInventario)} (IVA: ${this.config.iva}%) = ${fmtMoney(valorInventarioIVA)}`;
                } else {
                    elem.textContent = fmtMoney(valorInventario);
                }
            }
            document.getElementById('categoriasActivas') && (document.getElementById('categoriasActivas').textContent = String(categoriasActivas));

            // Gráficos
            this.renderChartStockPorCategoria(productos);
            this.renderChartEstadoStock(productos);

            this.showNotification('Reportes actualizados', 'success');
        } catch (error) {
            console.error('Error cargando reportes:', error);
            this.showNotification('Error al cargar reportes', 'error');
        }
    }

    // ====== Gráficos con Chart.js ======
    renderChartStockPorCategoria(productos) {
        const canvas = document.getElementById('chartStockPorCategoria');
        if (!canvas) return;

        // Agrupar por categoría
        const map = new Map();
        (productos || []).forEach(p => {
            const key = (p.categoria_nombre || p.categoria || 'Sin categoría');
            const stock = Number(p.stock || 0);
            map.set(key, (map.get(key) || 0) + stock);
        });
        const entries = Array.from(map.entries()).sort((a,b) => b[1]-a[1]).slice(0, 10);
        const labels = entries.map(e => String(e[0]));
        const values = entries.map(e => e[1]);

        // Destruir gráfico anterior si existe
        if (this._charts.stockPorCategoria) {
            this._charts.stockPorCategoria.destroy();
        }

        // Crear nuevo gráfico
        const ctx = canvas.getContext('2d');
        this._charts.stockPorCategoria = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Stock por Categoría',
                    data: values,
                    backgroundColor: [
                        'rgba(52, 152, 219, 0.8)',
                        'rgba(46, 204, 113, 0.8)',
                        'rgba(243, 156, 18, 0.8)',
                        'rgba(155, 89, 182, 0.8)',
                        'rgba(26, 188, 156, 0.8)',
                        'rgba(52, 73, 94, 0.8)',
                        'rgba(231, 76, 60, 0.8)',
                        'rgba(149, 165, 166, 0.8)',
                        'rgba(241, 196, 15, 0.8)',
                        'rgba(142, 68, 173, 0.8)'
                    ],
                    borderColor: [
                        'rgba(52, 152, 219, 1)',
                        'rgba(46, 204, 113, 1)',
                        'rgba(243, 156, 18, 1)',
                        'rgba(155, 89, 182, 1)',
                        'rgba(26, 188, 156, 1)',
                        'rgba(52, 73, 94, 1)',
                        'rgba(231, 76, 60, 1)',
                        'rgba(149, 165, 166, 1)',
                        'rgba(241, 196, 15, 1)',
                        'rgba(142, 68, 173, 1)'
                    ],
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Stock por Categoría (Top 10)',
                        font: {
                            size: 16,
                            weight: 'bold',
                            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                        },
                        padding: {
                            top: 10,
                            bottom: 20
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: {
                            size: 14,
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 13
                        },
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                return `Stock: ${context.parsed.y} unidades`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            font: {
                                size: 12
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        ticks: {
                            font: {
                                size: 11
                            },
                            maxRotation: 45,
                            minRotation: 45
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    renderChartEstadoStock(productos) {
        const canvas = document.getElementById('chartEstadoStock');
        if (!canvas) return;

        const total = (productos || []).length || 1;
        const agotados = productos.filter(p => (p.stock||0) === 0).length;
        const bajo = productos.filter(p => (p.stock||0) > 0 && (p.stock||0) <= (p.stock_minimo||0)).length;
        const ok = Math.max(0, total - agotados - bajo);

        // Destruir gráfico anterior si existe
        if (this._charts.estadoStock) {
            this._charts.estadoStock.destroy();
        }

        // Crear nuevo gráfico
        const ctx = canvas.getContext('2d');
        this._charts.estadoStock = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['En Stock', 'Stock Bajo', 'Agotados'],
                datasets: [{
                    data: [ok, bajo, agotados],
                    backgroundColor: [
                        'rgba(46, 204, 113, 0.85)',
                        'rgba(243, 156, 18, 0.85)',
                        'rgba(231, 76, 60, 0.85)'
                    ],
                    borderColor: [
                        'rgba(46, 204, 113, 1)',
                        'rgba(243, 156, 18, 1)',
                        'rgba(231, 76, 60, 1)'
                    ],
                    borderWidth: 3,
                    hoverOffset: 15
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2,
                cutout: '65%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            font: {
                                size: 13,
                                family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                            },
                            usePointStyle: true,
                            pointStyle: 'circle',
                            generateLabels: function(chart) {
                                const data = chart.data;
                                const sum = data.datasets[0].data.reduce((a, b) => a + b, 0) || 1;
                                return data.labels.map((label, i) => {
                                    const value = data.datasets[0].data[i];
                                    const percentage = Math.round((value / sum) * 100);
                                    return {
                                        text: `${label}: ${value} (${percentage}%)`,
                                        fillStyle: data.datasets[0].backgroundColor[i],
                                        hidden: false,
                                        index: i
                                    };
                                });
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: 'Estado del Stock',
                        font: {
                            size: 16,
                            weight: 'bold',
                            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                        },
                        padding: {
                            top: 10,
                            bottom: 20
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: {
                            size: 14,
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 13
                        },
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} productos (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    // ====== Utilidades ======
    exportarCSVProductos() {
        const productos = this._productosCache || [];
        if (!productos.length) {
            this.showNotification('No hay productos para exportar', 'warning');
            return;
        }

        const moneda = this.config.moneda || '$';
        const ivaPct = Number(this.config.iva) || 0;

        // Calcular estadísticas generales
        const agotados = productos.filter(p => (p.stock||0) === 0).length;
        const bajo = productos.filter(p => (p.stock||0) > 0 && (p.stock||0) <= (p.stock_minimo||0)).length;
        const ok = productos.filter(p => (p.stock||0) > (p.stock_minimo||0)).length;
        const valorTotal = productos.reduce((acc, p) => acc + ((parseFloat(p.precio) || 0) * (p.stock || 0)), 0);
        const valorTotalIVA = valorTotal * (1 + ivaPct / 100);
        const stockTotal = productos.reduce((acc, p) => acc + (p.stock || 0), 0);
        
        // Agrupar por categoría
        const categorias = new Map();
        productos.forEach(p => {
            const cat = p.categoria_nombre || p.categoria || 'Sin categoría';
            if (!categorias.has(cat)) {
                categorias.set(cat, { productos: 0, stock: 0, valor: 0 });
            }
            const stats = categorias.get(cat);
            stats.productos++;
            stats.stock += (p.stock || 0);
            stats.valor += ((parseFloat(p.precio) || 0) * (p.stock || 0));
        });

        // Agrupar por proveedor
        const proveedores = new Map();
        productos.forEach(p => {
            const prov = p.proveedor_nombre || p.proveedor || 'Sin proveedor';
            if (!proveedores.has(prov)) {
                proveedores.set(prov, { productos: 0, stock: 0, valor: 0 });
            }
            const stats = proveedores.get(prov);
            stats.productos++;
            stats.stock += (p.stock || 0);
            stats.valor += ((parseFloat(p.precio) || 0) * (p.stock || 0));
        });

        // Construir CSV con secciones
        const BOM = '\uFEFF'; // BOM para UTF-8
        let csv = BOM;
        
        // Encabezado del reporte
        const fecha = new Date().toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' });
        csv += `REPORTE DETALLADO DE INVENTARIO - SUSHI HOUSE\n`;
        csv += `Generado: ${fecha}\n`;
        csv += `\n`;
        
        // Estadísticas generales
        csv += `ESTADÍSTICAS GENERALES\n`;
        csv += `Total de Productos,${productos.length}\n`;
        csv += `Stock Total,${stockTotal} unidades\n`;
        csv += `Moneda,${moneda}\n`;
        csv += `IVA (%),${ivaPct}\n`;
        csv += `Valor Total Inventario,${moneda} ${valorTotal.toFixed(2)}\n`;
        if (ivaPct > 0) {
            csv += `Valor Total Inventario con IVA,${moneda} ${valorTotalIVA.toFixed(2)}\n`;
        }
        csv += `Productos en Stock,${ok}\n`;
        csv += `Productos con Stock Bajo,${bajo}\n`;
        csv += `Productos Agotados,${agotados}\n`;
        csv += `\n`;

        // Estadísticas por categoría
        csv += `ESTADÍSTICAS POR CATEGORÍA\n`;
        csv += `Categoría,Productos,Stock Total,Valor Total (${moneda})\n`;
        Array.from(categorias.entries())
            .sort((a, b) => b[1].valor - a[1].valor)
            .forEach(([cat, stats]) => {
                csv += `"${cat}",${stats.productos},${stats.stock},${moneda} ${stats.valor.toFixed(2)}\n`;
            });
        csv += `\n`;

        // Estadísticas por proveedor
        csv += `ESTADÍSTICAS POR PROVEEDOR\n`;
        csv += `Proveedor,Productos,Stock Total,Valor Total (${moneda})\n`;
        Array.from(proveedores.entries())
            .sort((a, b) => b[1].valor - a[1].valor)
            .forEach(([prov, stats]) => {
                csv += `"${prov}",${stats.productos},${stats.stock},${moneda} ${stats.valor.toFixed(2)}\n`;
            });
        csv += `\n`;

        // Productos con stock bajo
        const productosBajo = productos.filter(p => (p.stock||0) > 0 && (p.stock||0) <= (p.stock_minimo||0));
        if (productosBajo.length > 0) {
            csv += `PRODUCTOS CON STOCK BAJO (${productosBajo.length})\n`;
            csv += `ID,Nombre,Categoría,Stock Actual,Stock Mínimo,Diferencia\n`;
            productosBajo.forEach(p => {
                const diff = (p.stock_minimo || 0) - (p.stock || 0);
                csv += `${p.id},"${(p.nombre||'').replace(/"/g,'""')}","${p.categoria_nombre || p.categoria || ''}",${p.stock||0},${p.stock_minimo||0},${diff}\n`;
            });
            csv += `\n`;
        }

        // Productos agotados
        const productosAgotados = productos.filter(p => (p.stock||0) === 0);
        if (productosAgotados.length > 0) {
            csv += `PRODUCTOS AGOTADOS (${productosAgotados.length})\n`;
            csv += `ID,Nombre,Categoría,Proveedor,Stock Mínimo\n`;
            productosAgotados.forEach(p => {
                csv += `${p.id},"${(p.nombre||'').replace(/"/g,'""')}","${p.categoria_nombre || p.categoria || ''}","${p.proveedor_nombre || p.proveedor || ''}",${p.stock_minimo||0}\n`;
            });
            csv += `\n`;
        }

        // Listado completo de productos
        csv += `LISTADO COMPLETO DE PRODUCTOS (${productos.length})\n`;
        csv += `ID,Nombre,Categoría,Proveedor,Precio (${moneda}),Precio con IVA (${moneda}),Stock,Stock Mínimo,Valor Stock (${moneda}),Valor Stock con IVA (${moneda}),Estado\n`;
        productos.forEach(p => {
            const estado = (p.stock||0) === 0 ? 'Agotado' : ((p.stock||0) <= (p.stock_minimo||0) ? 'Stock Bajo' : 'En Stock');
            const precio = Number(p.precio || 0);
            const precioIVA = precio * (1 + ivaPct / 100);
            const valorStock = (precio * (p.stock || 0));
            const valorStockIVA = valorStock * (1 + ivaPct / 100);
            csv += `${p.id},"${(p.nombre||'').replace(/"/g,'""')}","${p.categoria_nombre || p.categoria || ''}","${p.proveedor_nombre || p.proveedor || ''}",${moneda} ${precio.toFixed(2)},${moneda} ${precioIVA.toFixed(2)},${p.stock||0},${p.stock_minimo||0},${moneda} ${valorStock.toFixed(2)},${moneda} ${valorStockIVA.toFixed(2)},${estado}\n`;
        });

        // Crear y descargar archivo
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const fechaArchivo = new Date().toISOString().split('T')[0];
        a.download = `reporte_completo_inventario_${fechaArchivo}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showNotification('Reporte completo exportado correctamente', 'success');
    }

    showNotification(message, type='info') {
        const container = document.getElementById('notifications');
        if (!container) return;
        const n = document.createElement('div');
        n.className = `notification ${type}`;
        n.innerHTML = `<span class=\"notification-icon\">${this.getIcon(type)}</span><span class=\"notification-message\">${message}</span><button class=\"btn-close btn-close-sm\" aria-label=\"Cerrar\">&times;</button>`;
        container.appendChild(n);
        n.querySelector('.btn-close')?.addEventListener('click', ()=> n.remove());
        setTimeout(()=>{ if (n.parentElement) n.remove(); }, 5000);
    }
    getIcon(type){ const m={success:'✅',error:'❌',warning:'⚠️',info:'ℹ️'}; return m[type]||'ℹ️'; }

    async loadConfig() {
        // Evitar múltiples cargas simultáneas
        if (this._loadingConfig) return;
        this._loadingConfig = true;
        try {
            // El viewset está registrado bajo /api/configuracion/, el router genera listado en ese endpoint
            let resp = await this.api.get('/configuracion/'); // Dado que apiClient ya debe incluir el prefijo /api/
            // Si el serializer devuelve un array (list action), tomar el primero
            if (Array.isArray(resp)) {
                this.config = resp[0] || this.config;
            } else if (resp && typeof resp === 'object') {
                // Si devuelve objeto singleton personalizado
                this.config = resp;
            }
        } catch (e) {
            console.warn('No se pudo cargar configuración del sistema, se usan valores por defecto.', e);
        } finally {
            this._loadingConfig = false;
        }
    }
}

let reportesManager;
document.addEventListener('DOMContentLoaded', () => {
    reportesManager = new ReportesManager();
});