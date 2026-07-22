# Plan de Implementación: Inventario y Producción

Para garantizar una transición estructurada y sólida, este mega-proyecto se dividirá en 3 etapas incrementales. **El Módulo de Inventario será la piedra angular (Fase 1)**, ya que sin un control exacto de materiales, la producción no puede automatizarse correctamente.

---

## FASE 1: Módulo de Inventario Profesional
El objetivo de esta fase es tener un control absoluto sobre el almacén, entradas, salidas y compras.

### 1. Modelos de Base de Datos (Schema)
- **`Supplier` (Proveedores):** Gestión de proveedores de aluminio, vidrio y accesorios.
- **`Warehouse` (Bodegas):** Capacidad para múltiples almacenes (Ej. Bodega Central, Taller, Camión 1).
- **`InventoryItem`:** Relaciona un `CatalogItem` con una `Warehouse`. Incluye campos críticos: `current_stock`, `stock_min`, `stock_max`, `unit_cost`.
- **`InventoryMovement` (Kardex):** Tabla inmutable para trazabilidad. Registra cada movimiento: `date`, `type` (ENTRADA, SALIDA, AJUSTE, TRASLADO, PRODUCCION), `quantity`, `reference_id` (ej. ID de Factura o ID de OP) y `user_id`.
- **`PurchaseOrder` (Órdenes de Compra):** Para reabastecimiento automático a proveedores cuando el stock baje del mínimo.

### 2. Funcionalidades y Pantallas (Frontend)
- **Dashboard de Inventario:** Panel principal mostrando alertas en rojo para materiales que están por debajo de su `stock_min`.
- **Visor de Kardex:** Pantalla de auditoría para ver el historial exacto de qué empleado sacó o metió qué material, cuándo y por qué.
- **Gestión de Órdenes de Compra:** Generador de PDFs automáticos para enviar a proveedores.
- **Entradas/Salidas Manuales:** Interfaz para hacer ajustes rápidos por pérdida, daño o ingresos de material sin orden de compra.

---

## FASE 2: Módulo de Producción y Enlace Comercial
El objetivo de esta fase es conectar las cotizaciones aprobadas con la fábrica y hacer la explosión de materiales.

### 1. Modelos de Base de Datos (Schema)
- **`ProductionOrder`:** Representa el trabajo en taller. Campos: `code`, `quote_id`, `status` (Pendiente, En Proceso, Terminado, Entregado).
- **`ProductionTask`:** Desglose de fases (Corte, Ensamble, Vidrio) para asignar responsables y medir tiempos (opcional).

### 2. Funcionalidades y Flujo
- **Botón Manual "Enviar a Producción":** En el detalle de una Cotización Comercial, si el estado es `Aprobada`, aparecerá este botón. El vendedor decide el momento exacto de pasarlo a la fábrica (ej. tras confirmar el anticipo).
- **Tablero Kanban de Producción:** El jefe de taller verá las órdenes y podrá arrastrarlas de columna en columna.
- **Explosión de Materiales y Vale de Bodega:** Al abrir una OP, el sistema calculará todo el material necesario de manera absoluta (sumando bisagras, metros de felpa, tornillos).
- **Afectación de Inventario:** Al mover la OP a "En Proceso", el sistema insertará registros en el `InventoryMovement` y descontará el material del `Warehouse` seleccionado.

---

## FASE 3: Optimización de Cortes y Hojas de Taller
El objetivo de esta fase es el ahorro de dinero (merma) y la facilitación del trabajo manual de los operarios.

### 1. Gestión Dinámica de Retazos (Material Disponible)
- Interfaz donde el encargado del taller, antes de mandar a cortar, le especifica al sistema qué material físico tiene disponible.
- **Ejemplo:** *"Para este perfil blanco, usa primero 3 retazos que tengo de 2.5m, 1 de 3m, y luego usa barras enteras nuevas de 6.1m"*.

### 2. Algoritmo de Optimización Lineal (1D Bin Packing)
- Un motor matemático en el Backend (NestJS) tomará todos los cortes requeridos de las ventanas y los "empaquetará" en el inventario dinámico de barras provisto en el paso anterior.
- El algoritmo buscará la combinación exacta que deje la menor cantidad de aluminio en la basura (desperdicio).

### 3. Salidas / Reportes en PDF
- **Hojas de Corte Visulaes:** Un documento para el aluminero con un diagrama de cómo meter el disco de corte en cada barra física. Ej: *Barra 1 (Retazo 3m): Cortar a 1.2m, luego 1.2m, sobra 0.6m*.
- **Pedido de Cristales:** Un PDF aislado y filtrado exclusivamente con los vidrios necesarios (con sus descuentos reales) para mandárselo a la templadora externa.
