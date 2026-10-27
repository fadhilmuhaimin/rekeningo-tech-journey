# Bagian B di run.py: secret tidak melewati OpenTofu. Konfigurasi hanya menulis ke mana service harus pergi mengambil
# secret (alamat secret manager dan path dokumen); nilai secret ditulis operator langsung ke OpenBao dan dibaca service
# saat berjalan. Tidak ada resource atau data source di sini yang menyentuh nilainya.
terraform {
  required_providers {
    local = { source = "hashicorp/local", version = "2.9.1" }
  }
}

variable "alamat_bao" {
  type    = string
  default = "http://openbao:8200"
}

variable "path_rahasia" {
  type    = string
  default = "secret/data/pembayaran/webhook"
}

resource "local_file" "konfigurasi_service" {
  filename = "${path.module}/keluaran/service.json"
  content  = jsonencode({ secret_manager = var.alamat_bao, path = var.path_rahasia })
}
