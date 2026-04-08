#!/bin/bash
# ============================================================
#   MultiSync Pro v1.0 — Instalador macOS
#   Duplo-clique para instalar no Mac.
#   Requer: macOS 12+ e Adobe Premiere Pro 2025+
# ============================================================

clear

# ─── Cores ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GRN='\033[0;32m'; YLW='\033[1;33m'
BLU='\033[0;34m'; CYN='\033[0;36m'; BLD='\033[1m'; RST='\033[0m'

log_ok()   { echo -e "${GRN}  ✓${RST}  $1"; }
log_warn() { echo -e "${YLW}  ⚠${RST}  $1"; }
log_err()  { echo -e "${RED}  ✗${RST}  $1"; }
log_step() { echo -e "\n${BLU}${BLD}▸ $1${RST}"; }
log_info() { echo -e "     ${CYN}$1${RST}"; }

# ─── Banner ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${BLD}  ╔══════════════════════════════════════╗${RST}"
echo -e "${BLD}  ║     MultiSync Pro v1.0 — macOS       ║${RST}"
echo -e "${BLD}  ╚══════════════════════════════════════╝${RST}"
echo ""
echo -e "  Plugin de IA para Adobe Premiere Pro"
echo -e "  Sincronização · Viral · Cortes · Export"
echo ""
echo -e "${YLW}  Este script necessita de permissões de administrador.${RST}"
echo ""
read -p "  Prima ENTER para continuar (ou Ctrl+C para cancelar)..." _

# ─── Verificar macOS ──────────────────────────────────────────────────────────
log_step "A verificar sistema..."

OS_VER=$(sw_vers -productVersion 2>/dev/null || echo "0")
OS_MAJOR=$(echo "$OS_VER" | cut -d. -f1)

if [ "$OS_MAJOR" -lt 12 ]; then
  log_err "macOS $OS_VER não suportado. Requer macOS 12 (Monterey) ou superior."
  exit 1
fi
log_ok "macOS $OS_VER"
log_ok "Arquitectura: $(uname -m)"

# ─── Variáveis ────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_SRC="$SCRIPT_DIR/plugin"
CEP_PATH="/Library/Application Support/Adobe/CEP/extensions/multisync-pro"
HOME_DIR="$(eval echo ~${SUDO_USER:-$USER})"
LOG_FILE="$HOME_DIR/Desktop/multisyncpro-install.log"

# ─── Verificar plugin bundled ─────────────────────────────────────────────────
if [ ! -d "$PLUGIN_SRC" ] || [ ! -f "$PLUGIN_SRC/manifest.json" ]; then
  log_err "Pasta do plugin não encontrada em: $PLUGIN_SRC"
  log_err "Certifica-te que o ficheiro .command está na mesma pasta que a pasta 'plugin'."
  echo ""
  read -p "  Prima ENTER para fechar..." _
  exit 1
fi
log_ok "Plugin encontrado"

# ─── Verificar Premiere Pro ───────────────────────────────────────────────────
log_step "A verificar Adobe Premiere Pro..."

PREMIERE_FOUND=false
for v in 2026 2025 2024; do
  if [ -d "/Applications/Adobe Premiere Pro $v" ]; then
    log_ok "Adobe Premiere Pro $v encontrado"
    PREMIERE_FOUND=true
    break
  fi
done

if [ "$PREMIERE_FOUND" = false ]; then
  log_warn "Adobe Premiere Pro não encontrado. O plugin será instalado mas requer Premiere Pro 2025+."
fi

# ─── Pedir sudo ───────────────────────────────────────────────────────────────
echo ""
echo -e "  ${YLW}Será pedida a tua password de administrador.${RST}"
sudo -v || { log_err "Permissões de administrador necessárias."; exit 1; }

# Manter sudo activo durante a instalação
while true; do sudo -n true; sleep 50; kill -0 "$$" || exit; done 2>/dev/null &
SUDO_PID=$!
trap "kill $SUDO_PID 2>/dev/null" EXIT

# ─── Instalar Homebrew ────────────────────────────────────────────────────────
log_step "A verificar Homebrew..."

BREW=""
[ -f "/opt/homebrew/bin/brew" ] && BREW="/opt/homebrew/bin/brew"
[ -f "/usr/local/bin/brew"    ] && BREW="/usr/local/bin/brew"

if [ -z "$BREW" ]; then
  log_warn "Homebrew não encontrado. A instalar..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" 2>&1 | tee -a "$LOG_FILE"
  [ -f "/opt/homebrew/bin/brew" ] && BREW="/opt/homebrew/bin/brew"
  [ -f "/usr/local/bin/brew"    ] && BREW="/usr/local/bin/brew"
  [ -n "$BREW" ] && log_ok "Homebrew instalado" || log_warn "Homebrew não instalado — FFmpeg e Python serão ignorados"
else
  log_ok "Homebrew encontrado: $BREW"
fi

# ─── Instalar FFmpeg ──────────────────────────────────────────────────────────
log_step "A verificar FFmpeg..."

if command -v ffmpeg &>/dev/null; then
  log_ok "FFmpeg já instalado: $(ffmpeg -version 2>&1 | head -1 | cut -c1-50)"
elif [ -n "$BREW" ]; then
  log_info "A instalar FFmpeg via Homebrew (pode demorar alguns minutos)..."
  "$BREW" install ffmpeg 2>&1 | tee -a "$LOG_FILE" | grep -E "^==>|Error" || true
  command -v ffmpeg &>/dev/null && log_ok "FFmpeg instalado" || log_warn "FFmpeg não foi instalado automaticamente"
else
  log_warn "Homebrew não disponível. FFmpeg não instalado."
  log_info "Instala manualmente: brew install ffmpeg"
fi

# ─── Instalar Python ──────────────────────────────────────────────────────────
log_step "A verificar Python 3..."

PY=""
command -v python3 &>/dev/null && PY="python3"
command -v python  &>/dev/null && [[ "$(python --version 2>&1)" == *"3."* ]] && PY="${PY:-python}"

if [ -n "$PY" ]; then
  log_ok "Python encontrado: $($PY --version 2>&1)"
elif [ -n "$BREW" ]; then
  log_info "A instalar Python 3.13 via Homebrew..."
  "$BREW" install python@3.13 2>&1 | tee -a "$LOG_FILE" | grep -E "^==>|Error" || true
  command -v python3 &>/dev/null && PY="python3" && log_ok "Python instalado" || log_warn "Python não instalado"
else
  log_warn "Python não encontrado."
fi

# ─── Instalar pacotes Python ──────────────────────────────────────────────────
if [ -n "$PY" ]; then
  log_step "A instalar pacotes Python (Whisper, pyannote, speechbrain)..."
  log_info "Isto pode demorar 5-15 minutos na primeira vez..."
  echo ""

  "$PY" -m pip install --upgrade pip --quiet 2>&1 | tail -1 || true

  PACKAGES="openai-whisper torch torchvision torchaudio pyannote.audio speechbrain transformers"
  "$PY" -m pip install --upgrade $PACKAGES 2>&1 | tee -a "$LOG_FILE" | grep -E "^(Collecting|Installing|Successfully|ERROR)" || true

  if "$PY" -c "import whisper" 2>/dev/null; then
    log_ok "Whisper instalado"
  else
    log_warn "Whisper pode não estar instalado. Verifica manualmente: pip3 install openai-whisper"
  fi
else
  log_warn "Python não disponível. Instala manualmente:"
  log_info "  brew install python@3.13"
  log_info "  pip3 install openai-whisper pyannote.audio speechbrain"
fi

# ─── Copiar plugin → CEP ──────────────────────────────────────────────────────
log_step "A instalar plugin no Adobe Premiere Pro..."

# CEP (compatibilidade Premiere 2024 e anterior)
log_info "Destino CEP: $CEP_PATH"
sudo mkdir -p "$CEP_PATH"
sudo rm -rf "$CEP_PATH"
sudo cp -R "$PLUGIN_SRC" "$CEP_PATH"
sudo chmod -R 755 "$CEP_PATH"
log_ok "Plugin copiado para CEP"

# UXP (Premiere 2025+) — pasta do utilizador
UXP_BASE="$HOME_DIR/Library/Application Support/Adobe/UXP/PluginsStorage/PPRO"
for v in 25 26; do
  UXP_DEST="$UXP_BASE/$v/Developer/com.multisyncpro.plugin"
  mkdir -p "$(dirname "$UXP_DEST")"
  rm -rf "$UXP_DEST"
  cp -R "$PLUGIN_SRC" "$UXP_DEST"
  chmod -R 755 "$UXP_DEST"
  log_ok "Plugin copiado para UXP v$v"
done

# ─── Concluído ────────────────────────────────────────────────────────────────
echo ""
echo -e "${GRN}${BLD}  ╔══════════════════════════════════════╗${RST}"
echo -e "${GRN}${BLD}  ║     Instalação concluída!            ║${RST}"
echo -e "${GRN}${BLD}  ╚══════════════════════════════════════╝${RST}"
echo ""
echo -e "  ${BLD}Próximos passos:${RST}"
echo -e "  ${CYN}1.${RST} Abre o Adobe Premiere Pro 2025"
echo -e "  ${CYN}2.${RST} Vai a  Janela → Extensões → MultiSync Pro"
echo -e "  ${CYN}3.${RST} Insere a tua chave de licença"
echo ""
echo -e "  Log: ${CYN}$LOG_FILE${RST}"
echo -e "  Suporte: ${CYN}+244 927 575 533 (WhatsApp)${RST}"
echo ""
read -p "  Prima ENTER para fechar..." _
