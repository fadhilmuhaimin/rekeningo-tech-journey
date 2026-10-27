# Bagian C di run.py: secret dibaca DI DALAM OpenTofu lewat data source. Di lab ini data source-nya local_sensitive_file
# yang membaca berkas rahasia.txt (stand-in untuk data source yang membaca secret manager). Yang dibuktikan: data source
# juga menulis atribut yang dibacanya ke state.
terraform {
  required_providers {
    local = { source = "hashicorp/local", version = "2.9.1" }
  }
}

data "local_sensitive_file" "rahasia" {
  filename = "${path.module}/rahasia.txt"
}
