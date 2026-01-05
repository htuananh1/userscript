# ===============================
#   UBUNTU + SSHX + KEEP ALIVE
#   Railway Ready
# ===============================
FROM ubuntu:22.04

# Tránh hỏi khi apt install
ENV DEBIAN_FRONTEND=noninteractive

# Timezone Việt Nam
ENV TZ=Asia/Ho_Chi_Minh

# Railway web service port
ENV PORT=8080

# -------------------------------
# Cài các gói cần thiết
# -------------------------------
RUN apt update && apt install -y \
    curl \
    tzdata \
    ca-certificates \
    python3 \
    && ln -fs /usr/share/zoneinfo/Asia/Ho_Chi_Minh /etc/localtime \
    && dpkg-reconfigure -f noninteractive tzdata \
    && apt clean \
    && rm -rf /var/lib/apt/lists/*

# -------------------------------
# Command chạy:
# 1. Start web service ảo (8080)
# 2. Chạy sshx
# -------------------------------
CMD bash -c '\
echo "🇻🇳 Timezone: $TZ"; \
echo "🌐 Starting fake web service on port $PORT"; \
python3 -m http.server $PORT >/dev/null 2>&1 & \
echo "🚀 Starting SSHX..."; \
curl -sSf https://sshx.io/get | sh -s run \
'
