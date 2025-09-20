#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
本地开发用 HTTPS 静态服务器（标准库实现）

- 根目录：脚本所在目录（即包含 index.html 的目录）
- 端口：默认 8443，可通过环境变量 PORT 或命令行参数指定
- 证书：优先使用同目录下 localhost.cert.pem / localhost.key.pem
  - 如缺失，则尝试调用系统 OpenSSL 自动生成（包含 SAN: localhost/127.0.0.1/本机局域网IP）
  - 若未安装 OpenSSL，则提示手动生成方法

注意：自签名证书仅用于本地开发与调试，浏览器将出现“非受信任”提示，继续即可。
"""

from __future__ import annotations

import os
import sys
import ssl
import socket
import pathlib
import subprocess
from http.server import HTTPServer, SimpleHTTPRequestHandler


HERE = pathlib.Path(__file__).resolve().parent
DEFAULT_CERT = HERE / "localhost.cert.pem"
DEFAULT_KEY = HERE / "localhost.key.pem"


def get_lan_ip() -> str:
	"""获取本机局域网 IPv4（最佳努力）。"""
	try:
		s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
		s.connect(("8.8.8.8", 80))
		ip = s.getsockname()[0]
	except Exception:
		ip = "127.0.0.1"
	finally:
		try:
			s.close()
		except Exception:
			pass
	return ip


def has_openssl() -> str | None:
	"""检测 openssl 可执行文件，返回可用路径或 None。"""
	candidates = [
		"openssl",
		os.path.join(os.environ.get("ProgramFiles", r"C:\\Program Files"), "Git", "usr", "bin", "openssl.exe"),
		os.path.join(os.environ.get("ProgramW6432", r"C:\\Program Files"), "Git", "usr", "bin", "openssl.exe"),
		os.path.join(os.environ.get("ProgramFiles(x86)", r"C:\\Program Files (x86)"), "Git", "usr", "bin", "openssl.exe"),
	]
	for exe in candidates:
		try:
			res = subprocess.run([exe, "version"], capture_output=True, text=True)
			if res.returncode == 0:
				return exe
		except FileNotFoundError:
			continue
	return None


def ensure_cert_key(cert_path: pathlib.Path, key_path: pathlib.Path) -> None:
	"""确保证书/私钥存在；若缺失尝试用 openssl 生成（带 SAN）。"""
	if cert_path.exists() and key_path.exists():
		return

	openssl = has_openssl()
	if not openssl:
		msg = f"""
未找到 openssl，无法自动生成自签名证书。
请任选其一手动生成 PEM（推荐安装 Git for Windows 自带 openssl）：

方案A（如已安装 openssl）：
  1) 在 PowerShell 中切换到：{HERE}
  2) 执行：
	 openssl req -x509 -newkey rsa:2048 -nodes -keyout localhost.key.pem -out localhost.cert.pem -days 3650 \
		 -subj "/CN=localhost" -addext "subjectAltName = DNS:localhost,IP:127.0.0.1"

方案B（mkcert）：
  1) 安装 mkcert（第三方，按需）：https://github.com/FiloSottile/mkcert
  2) 在 {HERE} 目录执行： mkcert -key-file localhost.key.pem -cert-file localhost.cert.pem localhost 127.0.0.1

完成后重新运行本脚本。
"""
		print(msg)
		sys.exit(2)

	lan_ip = get_lan_ip()
	print(f"[INFO] 正在使用 openssl 生成自签名证书（含 SAN: localhost, 127.0.0.1, {lan_ip}）...")
	# 一些旧版 openssl 不支持 -addext；失败则退化为不带 SAN（可能被新浏览器拒绝）
	cmd = [
		openssl,
		"req", "-x509", "-newkey", "rsa:2048", "-nodes",
		"-keyout", str(key_path),
		"-out", str(cert_path),
		"-days", "3650",
		"-subj", "/CN=localhost",
		"-addext", f"subjectAltName = DNS:localhost,IP:127.0.0.1,IP:{lan_ip}",
	]
	res = subprocess.run(cmd, capture_output=True, text=True)
	if res.returncode != 0:
		print("[WARN] 以 -addext 生成失败，尝试退化命令...")
		cmd_fallback = [
			openssl,
			"req", "-x509", "-newkey", "rsa:2048", "-nodes",
			"-keyout", str(key_path),
			"-out", str(cert_path),
			"-days", "3650",
			"-subj", "/CN=localhost",
		]
		res2 = subprocess.run(cmd_fallback, capture_output=True, text=True)
		if res2.returncode != 0:
			print("[ERROR] 证书生成失败：")
			print("STDOUT:\n" + (res2.stdout or ""))
			print("STDERR:\n" + (res2.stderr or ""))
			sys.exit(2)
	print("[OK] 自签名证书已生成。")


class RootIndexHandler(SimpleHTTPRequestHandler):
	def __init__(self, *args, **kwargs):
		# 指定目录为脚本所在目录
		super().__init__(*args, directory=str(HERE), **kwargs)

	def end_headers(self):
		# 禁用缓存，便于调试
		self.send_header("Cache-Control", "no-store")
		super().end_headers()

	def log_message(self, fmt, *args):
		sys.stdout.write("[HTTP] " + (fmt % args) + "\n")


def run(host: str = "127.0.0.1", port: int = 8000,
		cert_path: pathlib.Path = DEFAULT_CERT, key_path: pathlib.Path = DEFAULT_KEY) -> None:
	ensure_cert_key(cert_path, key_path)

	httpd = HTTPServer((host, port), RootIndexHandler)

	# 配置 TLS
	ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
	# 仅启用较新的协议
	if hasattr(ssl, "TLSVersion"):
		ctx.minimum_version = ssl.TLSVersion.TLSv1_2
	ctx.load_cert_chain(certfile=str(cert_path), keyfile=str(key_path))
	httpd.socket = ctx.wrap_socket(httpd.socket, server_side=True)

	url = f"https://{host}:{port}/"
	print(f"\n服务已启动: {url}")
	print("根目录:", HERE)
	print("如需局域网访问，请在手机上打开: https://<本机IP>:%d/ (证书为自签名，需手动信任)" % port)
	try:
		httpd.serve_forever()
	except KeyboardInterrupt:
		print("\n正在关闭服务器...")
	finally:
		httpd.server_close()


def main(argv: list[str]) -> None:
	# 端口从命令行或环境变量读取
	port = int(os.environ.get("PORT", "8000"))
	if len(argv) >= 2:
		try:
			port = int(argv[1])
		except ValueError:
			pass

	host = os.environ.get("HOST", "0.0.0.0")
	try:
		run(host=host, port=port)
	except OSError as e:
		print(f"[ERROR] 启动失败：{e}")
		if "Address already in use" in str(e):
			print("提示：更换端口重试，例如： python web.py 8444")


if __name__ == "__main__":
	main(sys.argv)

