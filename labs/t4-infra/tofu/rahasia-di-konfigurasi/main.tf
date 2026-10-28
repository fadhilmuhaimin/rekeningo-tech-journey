# Bagian A di run.py: secret ditulis di konfigurasi. random_password membuat password database, dan variabel
# kunci_gateway membawa kunci gateway dari lingkungan (TF_VAR_kunci_gateway). Keduanya dipakai satu resource local_file
# (stand-in untuk resource yang menyetel secret di sistem lain), jadi nilainya melewati OpenTofu dan masuk state.
terraform {
  required_providers {
    random = { source = "hashicorp/random", version = "3.9.1" }
    local  = { source = "hashicorp/local", version = "2.9.1" }
  }
}

variable "kunci_gateway" {
  type      = string
  sensitive = true
}

resource "random_password" "db" {
  length  = 24
  special = false
}

resource "local_file" "env_service" {
  filename = "${path.module}/keluaran/service.env"
  content  = "DB_PASSWORD=${random_password.db.result}\n"
}

resource "local_file" "konfigurasi_gateway" {
  filename = "${path.module}/keluaran/gateway.json"
  content  = jsonencode({ kunci = var.kunci_gateway })
}
