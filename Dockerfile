FROM ubuntu:22.04

# Prevent interactive prompts
ENV DEBIAN_FRONTEND=noninteractive

# Update and install common VPS tools
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    nano \
    vim \
    htop \
    net-tools \
    iputils-ping \
    python3 \
    python3-pip \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install ttyd (Web Terminal)
RUN wget -O /usr/local/bin/ttyd https://github.com/tsl0922/ttyd/releases/download/1.7.3/ttyd.x86_64 \
    && chmod +x /usr/local/bin/ttyd

# Set default shell to bash
ENV SHELL=/bin/bash

# Expose the port (Render sets $PORT dynamically, but we document 8080)
EXPOSE 8080

# Run ttyd on the port defined by Render ($PORT)
# -W: Writeable (clients can type)
# bash: The shell to run
CMD ttyd -p $PORT -W bash
