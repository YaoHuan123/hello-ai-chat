import os from "node:os";

const addrs = [];
for (const ifaces of Object.values(os.networkInterfaces())) {
  for (const iface of ifaces ?? []) {
    if (iface.family !== "IPv4" || iface.internal) continue;
    addrs.push(iface.address);
  }
}

if (addrs.length === 0) {
  console.log("未检测到局域网 IPv4，请在本机运行 ipconfig 查看无线/WLAN 地址。");
  process.exit(1);
}

console.log("将下方任一地址写入 .env.android 的 VITE_API_BASE（手机与电脑需同一 Wi‑Fi）：\n");
for (const ip of addrs) {
  console.log(`  VITE_API_BASE=http://${ip}:4000`);
}
console.log("");
