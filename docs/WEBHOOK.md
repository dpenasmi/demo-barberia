# Conexión futura: Astro → API → webhook n8n

Esta entrega incluye el cliente. El servidor y los flujos n8n quedan pendientes de configurar con tu agenda y credenciales.

## Configuración

```env
PUBLIC_BOOKING_API=https://tu-api.example/reservas
```

Esa URL es la raíz de dos rutas que debe implementar tu servidor. Mantén el secreto del webhook en el servidor. Un hosting estático como GitHub Pages no ejecuta rutas de servidor Astro; utiliza un backend separado o configura un adaptador de servidor antes de añadir endpoints dinámicos.

## 1. Consultar huecos

```http
GET /reservas/availability?service=corte-barba&barber=any&date=2026-11-17&timeZone=Europe%2FMadrid
```

Respuesta 200:

```json
{
  "slots": [
    { "id": "slot-opaco-del-servidor", "time": "16:00" },
    { "id": "otro-slot-opaco", "time": "17:30" }
  ]
}
```

`time` debe ser `HH:mm` en horario Europe/Madrid y corresponder a la fecha solicitada. Un array vacío significa que no hay huecos. Cada identificador debe resolver en servidor la fecha, el profesional y el intervalo real; no confíes en la hora recibida desde el navegador.

## 2. Confirmar

```http
POST /reservas/bookings
Content-Type: application/json
Idempotency-Key: uuid-generado-por-el-cliente
```

```json
{
  "service": "corte-barba",
  "barber": "any",
  "slotId": "slot-opaco-del-servidor",
  "date": "2026-11-17",
  "time": "16:00",
  "timeZone": "Europe/Madrid",
  "customer": { "name": "Cliente", "email": "cliente@example.com", "phone": "" },
  "consent": true
}
```

Solo después de registrar realmente la cita:

```json
{ "status": "confirmed", "bookingId": "RES-000123" }
```

No se da una reserva por confirmada si la respuesta no contiene ambos campos. Los nombres y referencias devueltos se muestran como texto, nunca como HTML. Un estado HTTP `409` devuelve al usuario a elegir hora. Usa 400/422 para datos inválidos, 429 para exceso de peticiones y 500/503 si la agenda falla.

## Requisitos del backend

- Validar servicio, profesional, email, fecha, zona horaria, horarios, cierres, duración y antelación. El servidor decide precio y duración; nunca el cliente.
- Consultar ocupación real y confirmar con bloqueo o transacción para impedir dos citas solapadas para el mismo profesional. Una secuencia «consultar calendario → crear evento» por sí sola no evita carreras.
- Persistir `Idempotency-Key` y devolver la misma reserva si se reintenta la misma solicitud; rechazar su reutilización con datos distintos. Si no hay preferencia, asignar un profesional disponible de forma atómica.
- Resolver el intervalo horario en Europe/Madrid teniendo en cuenta cambios de horario. Guardar instantes en UTC y renderizarlos en la zona de la barbería.
- Permitir solo el origen web esperado y limitar abuso. Si la API está en otro dominio, responder a OPTIONS y permitir `Content-Type` e `Idempotency-Key` además de GET y POST. CORS no sustituye autenticación, validación o límites.
- Mantener credenciales en servidor. Enviar a n8n únicamente la información necesaria. Si el envío de email falla después de crear la cita, conservar la cita y reintentar el email sin volver a reservar.
- Añadir información de privacidad real, retención de datos y el mecanismo de cancelación antes de abrir el sistema al público.

## Dos flujos de n8n sugeridos

1. **Disponibilidad:** API valida parámetros → webhook consulta agenda y reglas → API devuelve huecos.
2. **Reserva:** API valida + bloquea/crea cita → webhook registra o sincroniza el evento → envía confirmación y aviso a la barbería.

También se puede ubicar la coordinación en n8n si utiliza almacenamiento transaccional y bloqueo adecuados. La agenda elegida y las credenciales todavía no se han configurado.
