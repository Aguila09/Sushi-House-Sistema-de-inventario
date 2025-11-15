# Generated migration for ConfiguracionSistema model expansion

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('inventario', '0001_initial'),
    ]

    operations = [
        # Rename existing fields to match new naming convention
        migrations.RenameField(
            model_name='configuracionsistema',
            old_name='email_notificacion',
            new_name='email_notificaciones',
        ),
        
        # Add new General Configuration fields
        migrations.AddField(
            model_name='configuracionsistema',
            name='formato_fecha',
            field=models.CharField(default='dd/mm/yyyy', max_length=20),
        ),
        migrations.AddField(
            model_name='configuracionsistema',
            name='direccion_restaurante',
            field=models.CharField(blank=True, default='', max_length=200),
        ),
        migrations.AddField(
            model_name='configuracionsistema',
            name='telefono_restaurante',
            field=models.CharField(blank=True, default='', max_length=20),
        ),
        
        # Add Inventory Configuration fields
        migrations.AddField(
            model_name='configuracionsistema',
            name='stock_minimo_global',
            field=models.IntegerField(default=10),
        ),
        migrations.AddField(
            model_name='configuracionsistema',
            name='alerta_stock_bajo',
            field=models.CharField(default='si', max_length=5),
        ),
        migrations.AddField(
            model_name='configuracionsistema',
            name='unidad_medida',
            field=models.CharField(default='unidades', max_length=20),
        ),
        migrations.AddField(
            model_name='configuracionsistema',
            name='categoria_predeterminada',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                to='inventario.categoria'
            ),
        ),
        migrations.AddField(
            model_name='configuracionsistema',
            name='control_caducidad',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='configuracionsistema',
            name='notificaciones_automaticas',
            field=models.BooleanField(default=False),
        ),
        
        # Add Notification Configuration fields
        migrations.AddField(
            model_name='configuracionsistema',
            name='notif_stock_bajo',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='configuracionsistema',
            name='notif_stock_agotado',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='configuracionsistema',
            name='notif_productos_caducados',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='configuracionsistema',
            name='notif_pedidos_pendientes',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='configuracionsistema',
            name='notif_reportes_automaticos',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='configuracionsistema',
            name='notif_actividad_usuarios',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='configuracionsistema',
            name='frecuencia_reportes',
            field=models.CharField(default='semanal', max_length=20),
        ),
        migrations.AddField(
            model_name='configuracionsistema',
            name='hora_notificaciones',
            field=models.TimeField(default='09:00'),
        ),
        
        # Add Security Configuration fields
        migrations.AddField(
            model_name='configuracionsistema',
            name='tiempo_sesion',
            field=models.IntegerField(default=30),
        ),
        migrations.AddField(
            model_name='configuracionsistema',
            name='intentos_fallidos',
            field=models.IntegerField(default=3),
        ),
        migrations.AddField(
            model_name='configuracionsistema',
            name='requerir_confirmacion',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='configuracionsistema',
            name='registro_actividad',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='configuracionsistema',
            name='backup_automatico',
            field=models.BooleanField(default=False),
        ),
        
        # Remove old field that's no longer used
        migrations.RemoveField(
            model_name='configuracionsistema',
            name='notificaciones_stock',
        ),
        
        # Update default value for nombre_restaurante
        migrations.AlterField(
            model_name='configuracionsistema',
            name='nombre_restaurante',
            field=models.CharField(default='Sushi House', max_length=100),
        ),
    ]
