#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="$HOME/.local/lib/gmail-desktop"
BIN_DIR="$HOME/.local/bin"
APP_DIR="$HOME/.local/share/applications"
ICON_DIR="$HOME/.local/share/icons/hicolor/scalable/apps"
ICON_PNG_DIR="$HOME/.local/share/icons/hicolor/512x512/apps"

# Limpiar instalaciones previas para evitar sobrescribir con enlaces recursivos
rm -rf "$INSTALL_DIR"
rm -f "$BIN_DIR/gmail-desktop"

mkdir -p "$INSTALL_DIR"
mkdir -p "$BIN_DIR"
mkdir -p "$APP_DIR"
mkdir -p "$ICON_DIR"
mkdir -p "$ICON_PNG_DIR"

# Copiar el binario compilado listo para producción
cp -r "$SCRIPT_DIR/dist/linux-unpacked/"* "$INSTALL_DIR/"
chmod +x "$INSTALL_DIR/gmail-desktop"

# Crear script ejecutable seguro en PATH
cat << 'EOF' > "$BIN_DIR/gmail-desktop"
#!/bin/sh
exec "$HOME/.local/lib/gmail-desktop/gmail-desktop" --no-sandbox "$@"
EOF
chmod +x "$BIN_DIR/gmail-desktop"

# Instalar iconos en alta resolución
cp "$SCRIPT_DIR/assets/icon.svg" "$ICON_DIR/gmail-desktop.svg"
cp "$SCRIPT_DIR/assets/icon.png" "$ICON_PNG_DIR/gmail-desktop.png"

# Crear archivo .desktop oficial del sistema apuntando al lanzador seguro
cat <<EOF > "$APP_DIR/gmail-desktop.desktop"
[Desktop Entry]
Name=Gmail
Comment=Cliente de escritorio oficial de Gmail
GenericName=Cliente de correo
Exec=$BIN_DIR/gmail-desktop %u
Icon=gmail-desktop
Terminal=false
Type=Application
Categories=Network;Email;Office;
StartupWMClass=Gmail
Keywords=email;gmail;google;correo;
MimeType=x-scheme-handler/mailto;
EOF

chmod +x "$APP_DIR/gmail-desktop.desktop"

# Actualizar base de datos de escritorio e iconos
if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database "$APP_DIR"
fi

if command -v gtk-update-icon-cache >/dev/null 2>&1; then
    gtk-update-icon-cache -f -t "$HOME/.local/share/icons/hicolor" 2>/dev/null || true
fi

echo "¡Gmail Desktop v1.0.0 instalado con éxito en el sistema!"
