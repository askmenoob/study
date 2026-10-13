#!/usr/bin/env python3
"""Exercise the nginx template in a disposable container, with no production network or credentials."""
import argparse
import ipaddress
import json
from pathlib import Path
import subprocess
import tempfile
import time
import urllib.request
import uuid

parser = argparse.ArgumentParser()
parser.add_argument("--image", default="nginx:1.29-alpine", help="An available nginx image with its standard envsubst entrypoint")
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
name = "study-access-ingress-" + uuid.uuid4().hex[:12]
def docker(*arguments):
    return subprocess.check_output(["docker", *arguments], text=True, stderr=subprocess.PIPE).strip()

with tempfile.TemporaryDirectory(prefix="study-access-ingress-") as directory:
    template = Path(directory) / "default.conf.template"
    template.write_text((root / "deploy/nginx.conf").read_text() + """
server {
  listen 127.0.0.1:4181;
  location /api/ {
    default_type application/json;
    return 200 '{"ip":"$http_x_forwarded_for","real":"$http_x_real_ip","cf":"$http_cf_connecting_ip"}';
  }
}
""")
    template.chmod(0o644)
    try:
        docker("run", "--rm", "-d", "--name", name, "--publish", "127.0.0.1::80",
               "--add-host", "api:127.0.0.1", "--env", "ACCESS_LOG_TRUSTED_TUNNEL_IP=127.0.0.1",
               "--volume", str(template) + ":/etc/nginx/templates/default.conf.template:ro", args.image)
        port = docker("port", name, "80/tcp").rsplit(":", 1)[1]
        url = "http://127.0.0.1:" + port + "/api/inspect"
        for attempt in range(25):
            try:
                with urllib.request.urlopen(url, timeout=1) as response:
                    json.load(response)
                break
            except (OSError, ValueError):
                if attempt == 24:
                    raise
                time.sleep(0.2)
        docker("exec", name, "nginx", "-t")
        request = urllib.request.Request(url, headers={
            "X-Forwarded-For": "198.51.100.9, 172.25.0.5",
            "CF-Connecting-IP": "198.51.100.10",
            "X-Real-IP": "198.51.100.11",
        })
        with urllib.request.urlopen(request, timeout=2) as response:
            direct = json.load(response)
        ipaddress.ip_address(direct["ip"])
        assert direct["ip"] not in ["198.51.100.9", "198.51.100.10", "198.51.100.11"]
        assert direct["ip"] == direct["real"] and direct["cf"] == ""

        for valid in ["198.51.100.20", "2001:db8::20"]:
            trusted = json.loads(docker("exec", name, "wget", "-qO-",
                "--header=CF-Connecting-IP: " + valid,
                "--header=X-Forwarded-For: 198.51.100.99",
                "http://127.0.0.1/api/inspect"))
            assert trusted == {"ip": valid, "real": valid, "cf": ""}, trusted
        for invalid in ["not-an-ip", ""]:
            fallback = json.loads(docker("exec", name, "wget", "-qO-",
                "--header=CF-Connecting-IP: " + invalid,
                "--header=X-Forwarded-For: 198.51.100.99",
                "http://127.0.0.1/api/inspect"))
            assert fallback == {"ip": "127.0.0.1", "real": "127.0.0.1", "cf": ""}, fallback
        print("PASS nginx config, direct forged headers, trusted IPv4/IPv6, invalid/missing client IP; 6 checks")
    finally:
        subprocess.run(["docker", "rm", "-f", name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
