# Gmail Desktop

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Release](https://img.shields.io/badge/Release-v1.0.0-green.svg)](https://github.com/e-slzr/gmail-desktop/releases)
[![Platform](https://img.shields.io/badge/Platform-Linux%20%7C%20Windows%20%7C%20macOS-lightgrey.svg)](https://github.com/e-slzr/gmail-desktop)

Cliente de escritorio independiente, ligero y elegante para Gmail, diseñado para ofrecer una experiencia limpia y nativa sin pestañas de navegador innecesarias.

<p align="center">
  <img src="assets/icon.png" width="128" height="128" alt="Gmail Desktop Icon" />
</p>

---

## Características

- **Diseño Google Material Design 3:** Barra de título minimalista con adaptación automática al tema del sistema (modo oscuro `#1f1f1f` y modo claro `#f6f8fc`).
- **Controles de ventana integrados:** Botones discretos de recarga, minimizar, maximizar y cerrar con transiciones suaves.
- **Zona de arrastre completa:** Movimiento fluido de la ventana y soporte para doble clic para maximizar o restaurar.
- **Contador de correos no leídos:** Insignia dinámica que refleja el número exacto de mensajes pendientes en tiempo real.
- **Notificaciones de escritorio nativas:** Alertas del sistema cuando llegan nuevos correos, con clic para enfocar la aplicación.
- **Navegación externa segura:** Los enlaces de terceros incluidos en los correos se abren directamente en tu navegador predeterminado.
- **Instancia única:** Si la aplicación ya está abierta, hacer clic en el acceso directo o abrir un correo la trae al frente al instante.
- **Bajo consumo de recursos:** Optimizado para operar con mínima sobrecarga de memoria y CPU en reposo.

---

## Descargas (v1.0.0)

Los paquetes compilados listos para usar se encuentran en la sección de [Releases](https://github.com/e-slzr/gmail-desktop/releases) o en la carpeta `dist/`:

| Plataforma | Formato | Descripción |
|---|---|---|
| **Linux** | `.AppImage` | Ejecutable portable universal (funciona en cualquier distro). |
| **Linux** | `.deb` | Instalador nativo para Ubuntu, Debian, elementary OS, Mint. |
| **Windows** | `.exe` | Instalador estándar con asistente (NSIS). |
| **macOS** | `.dmg` / `.zip` | Imagen de disco e instalador empaquetado para macOS. |

---

## Atajos de teclado

| Atajo | Acción |
|---|---|
| `Ctrl + Q` / `Cmd + Q` | Cerrar completamente la aplicación |
| `Ctrl + W` / `Cmd + W` | Ocultar ventana en segundo plano |
| `Ctrl + R` / `F5` | Recargar bandeja de entrada |
| Doble clic en barra | Maximizar / Restaurar tamaño |

---

## Instalación rápida en Linux (elementary OS / Ubuntu)

Para integrar la versión de Linux directamente en el menú de aplicaciones y el Dock del sistema:

```bash
./install-app.sh
```

---

## Desarrollo y Compilación

### Requisitos previos
- [Node.js](https://nodejs.org/) (versión 20 o superior)
- npm

### Pasos
```bash
# Clonar el repositorio
git clone https://github.com/e-slzr/gmail-desktop.git
cd gmail-desktop

# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npm start

# Compilar instaladores según la plataforma
npm run dist:linux    # AppImage y .deb
npm run dist:win      # Instalador Windows (.exe)
npm run dist:mac      # macOS (.dmg y .zip)
npm run dist:all      # Todas las plataformas soportadas
```

---

## Autor

**Eliu Salazar**  
- GitHub: [@e-slzr](https://github.com/e-slzr)  
- Contacto: [eliu.asalazar@gmail.com](mailto:eliu.asalazar@gmail.com)

---

## Licencia

Este proyecto está bajo la Licencia **MIT**. Consulta el archivo [LICENSE](LICENSE) para más detalles.

---

## Aviso de Marcas y Exención de Responsabilidad (Disclaimer)

**Gmail™** y el logotipo de Gmail son marcas registradas de **Google LLC**.

Este proyecto es un cliente de escritorio independiente de código abierto y **no está afiliado, patrocinado, respaldado ni autorizado oficialmente por Google LLC** ni por ninguna de sus filiales. Todos los nombres comerciales, marcas comerciales y logotipos son propiedad de sus respectivos dueños y se utilizan aquí únicamente con fines de identificación y compatibilidad.
