#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=infra/fabric/vm/lib-vm-fabric.sh
. "$SCRIPT_DIR/lib-vm-fabric.sh"

install_apt_packages() {
  if ! command -v apt-get >/dev/null 2>&1; then
    warn "apt-get is not available; install missing packages manually."
    return
  fi

  local packages=(ca-certificates curl git jq bash)
  if ! have_command go; then
    packages+=(golang-go)
  fi

  log "Installing missing VM packages through apt-get. Secret values are not used by this script."
  sudo apt-get update
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y "${packages[@]}"
}

clone_fabric_samples() {
  sudo mkdir -p "$FABRIC_VM_ROOT"
  sudo chown "$(id -u):$(id -g)" "$FABRIC_VM_ROOT"

  if [[ -d "$FABRIC_SAMPLES_DIR/.git" ]]; then
    log "Fabric samples already exist at $FABRIC_SAMPLES_DIR"
    return
  fi

  if [[ -e "$FABRIC_SAMPLES_DIR" ]]; then
    fail "$FABRIC_SAMPLES_DIR exists but is not a git checkout"
  fi

  log "Cloning Hyperledger Fabric samples into $FABRIC_SAMPLES_DIR"
  git clone --depth 1 https://github.com/hyperledger/fabric-samples.git "$FABRIC_SAMPLES_DIR"
}

install_fabric_binaries_and_images() {
  local installer="$FABRIC_SAMPLES_DIR/install-fabric.sh"

  if [[ ! -s "$installer" ]]; then
    installer="$FABRIC_VM_ROOT/install-fabric.sh"
    if [[ ! -s "$installer" ]]; then
      log "Fabric samples installer not found in checkout; downloading official installer script."
      curl -fsSL "$FABRIC_INSTALL_SCRIPT_URL" -o "$installer"
      chmod 0755 "$installer"
    fi
  fi

  require_file "$installer" "Fabric installer"

  log "Installing Fabric binaries and Docker images: Fabric $FABRIC_VERSION, Fabric CA $FABRIC_CA_VERSION"
  (
    cd "$FABRIC_VM_ROOT"
    bash "$installer" \
      --fabric-version "$FABRIC_VERSION" \
      --ca-version "$FABRIC_CA_VERSION" \
      binary docker
  )
}

install_apt_packages
require_command docker
require_command git
require_command curl
require_command jq
require_command bash
require_command go
clone_fabric_samples
install_fabric_binaries_and_images

log "VM Fabric prerequisites are installed."
log "Next: bash infra/fabric/vm/bootstrap-vm-local-fabric.sh"
