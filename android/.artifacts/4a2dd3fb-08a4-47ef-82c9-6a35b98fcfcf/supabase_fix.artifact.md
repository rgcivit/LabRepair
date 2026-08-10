# Corrección de Base de Datos - Columnas Faltantes

La orden no se guarda porque intentamos enviar la firma del técnico y el sistema aún no tiene ese "espacio" en la base de datos. Para arreglarlo, sigue estos pasos:

1. Ve a tu proyecto en **Supabase**.
2. Entra en **SQL Editor** -> **New query**.
3. Pega este código y dale a **Run**:

```sql
-- Agregar columna para la firma del técnico
alter table work_orders
add column if not exists tech_signature text;

-- Asegurarse de que el presupuesto estimado acepte vacíos correctamente
alter table work_orders
alter column estimated_budget drop not null;
```

Una vez que veas el mensaje "Success", intenta guardar la orden de nuevo. Ya debería funcionar correctamente.
