# Manual de Usuario Completo - LabRepair
**Sistema de Gestión e Ingeniería para Laboratorios Técnicos**

---

## 1. Introducción
**LabRepair** es una herramienta profesional diseñada para laboratorios de ingeniería y servicios técnicos. Permite gestionar todo el ciclo de vida de una reparación, desde el ingreso del equipo hasta el control de calidad final y la entrega al cliente.

---

## 2. Acceso al Sistema

### 2.1 Inicio de Sesión
Al abrir la aplicación, se presentará la pantalla de autenticación:
1. Ingrese su **Nombre de Usuario**.
2. Ingrese su **Contraseña**.
3. Presione el botón **"Ingresar"**.

> [!NOTE]
> Si es su primer ingreso, solicite sus credenciales al administrador del sistema.

---

## 3. Panel Principal (Dashboard)
El Dashboard ofrece una visión rápida del estado del laboratorio mediante indicadores clave (KPIs):
- **Órdenes Activas:** Cantidad de equipos actualmente en el laboratorio (excluyendo los entregados).
- **Esperando Repuestos:** Equipos que no pueden avanzar por falta de stock.
- **Listos para Entrega:** Equipos que han pasado el control de calidad.
- **Stock Crítico:** Cantidad de repuestos que están por debajo del nivel mínimo.

---

## 4. Gestión de Órdenes de Trabajo (OT)

### 4.1 Crear una Nueva Orden (Ingreso)
Para registrar un equipo que ingresa al taller:
1. Vaya a la pestaña **"Órdenes"** o use el botón de acción rápida en el Dashboard.
2. Haga clic en **"+ Nueva Orden"**.
3. **Datos del Cliente:**
   - Ingrese el nombre del cliente (el sistema sugerirá nombres si ya existen).
   - Ingrese el teléfono de contacto.
4. **Datos del Equipo:**
   - Especifique Marca, Modelo y Número de Serie (fundamental para la trazabilidad).
   - Seleccione el **Tipo de Equipo** (ej: Criolipólisis, VelaShape, etc.).
5. **Estado de Recepción:**
   - Seleccione los **Accesorios** recibidos (Cables, cabezales, gafas, etc.).
   - Describa la **Condición Estética** (ej: "Rayones en carcasa", "Pantalla sana").
   - Defina la **Prioridad** (BAJA, MEDIA, ALTA).
6. Presione **"Guardar Orden"**. Se generará automáticamente un número de OT único (ej: OT-1234).

### 4.2 Búsqueda y Seguimiento
En la pestaña de Órdenes, puede utilizar la barra de búsqueda para filtrar por:
- Número de OT.
- Nombre del Cliente.
- Número de Serie.
- Marca o Modelo.

También puede filtrar por estado (PENDIENTE, EN PROCESO, ESPERANDO REPUESTO, LISTO, ENTREGADO).

---

## 5. Proceso Técnico y Diagnóstico

### 5.1 Banco de Mediciones (Bench Test)
Una vez que el técnico comienza a trabajar:
1. Seleccione la OT y haga clic en **"Ver Diagnóstico"**.
2. En la pestaña **"Mediciones"**, registre los valores técnicos:
   - Presión, temperatura, voltajes, o cualquier parámetro relevante según el equipo.
   - Describa la **Falla Detectada** tras la revisión.
   - Detalle las **Tareas Realizadas** (ej: "Limpieza de filtros", "Calibración de sensor").

### 5.2 Presupuesto y Uso de Repuestos
En la pestaña **"Presupuesto"** dentro del diagnóstico:
1. **Asignación de Repuestos:**
   - Busque el repuesto necesario en el buscador integrado.
   - Al añadirlo, el sistema **descontará automáticamente** la unidad del inventario.
2. **Mano de Obra:** Defina el costo del servicio técnico.
3. El sistema calculará el total automáticamente para informar al cliente.

---

## 6. Control de Calidad y Entrega

### 6.1 Certificado de Calidad (QC)
Cuando la reparación finaliza:
1. Dentro de la OT, busque la opción de **Generar Certificado QC**.
2. El sistema creará un documento PDF con los resultados de las pruebas técnicas, asegurando que el equipo cumple con los estándares de ingeniería antes de salir.

### 6.2 Entrega del Equipo
1. Una vez que el cliente retira el equipo, cambie el estado de la OT a **"ENTREGADO"**.
2. Esto moverá la orden al historial y liberará el indicador de "Listos para Entrega" en el Dashboard.

---

## 7. Gestión de Inventario
En la pestaña **"Repuestos"**:
- **Alta de Repuestos:** Registre nuevos componentes con su costo, precio de venta y stock inicial.
- **Stock Mínimo:** Defina una alerta para que el sistema le avise cuando queden pocas unidades de un repuesto crítico.
- **Edición:** Puede ajustar los niveles de stock manualmente en caso de compras o auditorías.

---

## 8. Historial y Trazabilidad (Serial History)
Esta es una función crítica para ingeniería:
1. Vaya a la pestaña **"Historial"**.
2. Ingrese un **Número de Serie**.
3. El sistema mostrará **todas las veces** que ese equipo específico ingresó al laboratorio en el pasado, qué fallas tuvo y qué técnicos lo intervinieron.

---

## 9. Configuración y Seguridad

### 9.1 Copias de Seguridad (Backup)
Para evitar la pérdida de datos:
- Vaya a **Configuración**.
- Use la opción **"Exportar Backup"** para descargar un archivo con toda la información.
- Puede usar **"Importar Backup"** para restaurar los datos en otro dispositivo.

### 9.2 Cambio de Contraseña
- En el menú de usuario (esquina superior derecha), seleccione **"Cambiar Contraseña"**.
- Deberá ingresar su contraseña actual y la nueva por duplicado.

---

## 10. Soporte y Mejores Prácticas
- **Precisión en los Datos:** Siempre verifique el Número de Serie; es la clave para el historial.
- **Sincronización:** Asegúrese de guardar los cambios antes de cerrar la aplicación.
- **Limpieza de Datos:** Use la función de borrado con precaución, ya que elimina registros históricos.
