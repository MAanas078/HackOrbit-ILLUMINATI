FROM --platform=linux/amd64 ubuntu:22.04

# Install Blender and dependencies
RUN apt-get update && apt-get install -y \
    wget \
    xz-utils \
    libxrender1 \
    libxxf86vm1 \
    libxi6 \
    libxfixes3 \
    libgl1-mesa-glx \
    libxkbcommon0 \
    libsm6 \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Download and install Blender 3.6.7 (or replace with your preferred version)
RUN mkdir -p /opt/blender && \
    wget -q https://download.blender.org/release/Blender3.6/blender-3.6.7-linux-x64.tar.xz -O /tmp/blender.tar.xz && \
    tar -xf /tmp/blender.tar.xz -C /opt/blender --strip-components=1 && \
    rm /tmp/blender.tar.xz && \
    ln -s /opt/blender/blender /usr/local/bin/blender

# Set working directory
WORKDIR /blender

# Create outputs directory
RUN mkdir -p /blender/outputs && chmod 777 /blender/outputs

# Default entrypoint
ENTRYPOINT ["blender"]
