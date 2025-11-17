-- Script de creación de base de datos para Sushi House Sistema de Inventario
-- Ejecutar este script en SQL Server Management Studio o Azure Data Studio
-- IMPORTANTE: Asegúrate de tener SQL Server instalado y corriendo

-- 1. CREAR LA BASE DE DATOS
USE master;
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'SushiHouse')
BEGIN
    CREATE DATABASE SushiHouse;
    PRINT 'Base de datos SushiHouse creada exitosamente.';
END
ELSE
BEGIN
    PRINT 'La base de datos SushiHouse ya existe.';
END
GO

USE SushiHouse;
GO

-- 2. VERIFICACIÓN
PRINT 'Base de datos lista para usar.';
PRINT 'Ahora ejecute las migraciones de Django con: python manage.py migrate';
GO

-- NOTA IMPORTANTE:
-- Este script solo crea la base de datos vacía.
-- Las tablas se crearán automáticamente cuando ejecutes:
--   python manage.py migrate
-- desde el instalador automático.
