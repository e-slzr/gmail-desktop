# Gmail Desktop (v1.0.0)

Cliente de escritorio nativo, ligero y elegante para Gmail, diseñado especialmente para **elementary OS (Pantheon)** y entornos Linux modernos sobre Wayland y X11.

![Gmail Desktop](assets/icon.png)

## Características principales

- **Barra de título con diseño oficial de Google:** Estilizada siguiendo la guía de diseño Google Material Design 3 (`#1f1f1f` en modo oscuro / `#f6f8fc` en modo claro).
- **Controles de ventana integrados:** Botones discretos y circulares de recargar, minimizar, maximizar/restaurar y cerrar con efectos suaves de iluminación.
- **Zona de arrastre completa:** Permite mover la ventana tomándola de cualquier parte de la barra superior, con soporte para doble clic para maximizar o restaurar.
- **Insignia dinámica de correos no leídos:** Insignia roja que muestra el número exacto de correos no leídos en tiempo real.
- **Rendimiento optimizado con Chromium (Electron):**
  - Consumo de RAM reducido en más del **65%** respecto a WebKitGTK (~450 MB vs 1.7 GB).
  - Uso de CPU del **0% al 1%** en reposo.
  - Sin parpadeos ni oscurecimientos de ventana en Wayland y tarjetas NVIDIA.
- **Compatibilidad con pantallas Ultrawide y 4K:** Sincronización continua de dimensiones entre Wayland y la vista web.
- **Notificaciones de escritorio nativas:** Integración directa con las notificaciones de elementary OS (`libnotify`) con clic para enfocar la app.
- **Enlaces externos protegidos:** Cualquier enlace de terceros contenido en un correo se abre automáticamente en tu navegador web predeterminado.
- **Instancia única vía D-Bus:** Al abrir la aplicación desde el menú o Dock mientras ya está en ejecución, se restaura al instante en 0 ms sin duplicar procesos.

---

## Atajos de teclado

| Atajo | Acción |
|---|---|
| `Ctrl + Q` | Cerrar completamente la aplicación |
| `Ctrl + W` | Ocultar ventana en segundo plano |
| `Ctrl + R` / `F5` | Recargar bandeja de entrada |
| Doble clic en barra | Maximizar / Restaurar tamaño |

---

## Instaladores disponibles para compartir

Los paquetes compilados listos para distribuir se encuentran en la carpeta `dist/`:

- **`Gmail-1.0.0.AppImage` (120 MB):** Paquete ejecutable portable universal. Funciona en cualquier distribución Linux (Ubuntu, elementary OS, Fedora, Arch, etc.) con doble clic.
- **`gmail-desktop_1.0.0_amd64.deb` (95 MB):** Paquete instalable nativo Debian/Ubuntu/elementary OS.
  ```bash
  sudo dpkg -i dist/gmail-desktop_1.0.0_amd64.deb
  ```

---

## Instalación local en elementary OS

Si deseas instalar la versión compilada directamente en tu usuario (sin requerir permisos de `sudo`):

```bash
./install-app.sh
```

Esto registrará `Gmail` en el menú de aplicaciones de elementary OS (Slingshot) con su icono oficial en alta resolución y listo para anclarse al Dock (Plank).

---

## Desarrollo y Compilación

### Requisitos
- Node.js (v20 o v22 LTS)
- npm

### Ejecutar en modo desarrollo
```bash
npm start
```

### Generar nuevos paquetes / releases
```bash
npm run dist
```
Los archivos generados se guardarán en la carpeta `dist/`.
