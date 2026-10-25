// Lab B8 · server Node.js untuk uji kerja CPU, dijalankan sebagai proses terpisah.
const http = require("node:http");
// Port dasar 18092 + LAB_PORT_OFFSET (labs/README.md).
const PORT = 18092 + Number(process.env.LAB_PORT_OFFSET || 0);
// --8<-- [start:blok]
http.createServer((req, res) => {
  if (req.url === "/cpu") {
    const akhir = Date.now() + 1000;
    while (Date.now() < akhir) {}   // kerja CPU 1 detik di thread event loop
  }
  res.end();
}).listen(PORT, "127.0.0.1");
// --8<-- [end:blok]
