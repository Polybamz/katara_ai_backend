 FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV ANDROID_HOME=/usr/lib/android-sdk
ENV WORKSPACE=/workspaces
ENV PATH="${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/platform-tools:/usr/local/flutter/bin:/usr/local/flutter/bin/cache/dart-sdk/bin:${PATH}"

ARG NODE_ENV=production

# -----------------------------
# 1. Install core dependencies (use apt-get to avoid apt CLI warning)
# -----------------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  curl \
  git \
  unzip \
  zip \
  python3 \
  openjdk-17-jdk \
  build-essential \
  wget \
  xz-utils \
  gnupg2 \
  && rm -rf /var/lib/apt/lists/*

# -----------------------------
# 2. Install Node.js 18
# -----------------------------
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get update && apt-get install -y --no-install-recommends nodejs && \
    rm -rf /var/lib/apt/lists/*

# create a non-root user for runtime
RUN useradd -m -s /bin/bash app

# -----------------------------
# 3. Install Android SDK commandline tools
# -----------------------------
# ...existing code...
RUN mkdir -p /usr/lib/android-sdk/cmdline-tools /tmp/cmdline && \
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip -O /tmp/cmdline-tools.zip && \
    unzip -q /tmp/cmdline-tools.zip -d /tmp/cmdline && \
    rm /tmp/cmdline-tools.zip && \
    mkdir -p /usr/lib/android-sdk/cmdline-tools/latest && \
    # move extracted content into the "latest" folder; handle both possible zip layouts
    if [ -d /tmp/cmdline/cmdline-tools ]; then \
      mv /tmp/cmdline/cmdline-tools/* /usr/lib/android-sdk/cmdline-tools/latest/; \
    else \
      mv /tmp/cmdline/* /usr/lib/android-sdk/cmdline-tools/latest/; \
    fi && \
    rm -rf /tmp/cmdline
# ...existing code...

# Ensure sdkmanager is callable via explicit path (also uses ANDROID_HOME)
ENV PATH="${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/platform-tools:${PATH}"

# Accept licenses and install key SDK components (tolerate failures)
RUN yes | /usr/lib/android-sdk/cmdline-tools/latest/bin/sdkmanager --sdk_root=${ANDROID_HOME} --licenses || true
RUN /usr/lib/android-sdk/cmdline-tools/latest/bin/sdkmanager --sdk_root=${ANDROID_HOME} "platform-tools" "platforms;android-34" "build-tools;34.0.0" || true

# -----------------------------
# 4. Install Flutter
# -----------------------------
# -----------------------------
# 4. Install Flutter (robust download with retries + validation)
# -----------------------------
WORKDIR /usr/local
ARG FLUTTER_VERSION=3.19.0-stable
ENV FLUTTER_URL="https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_${FLUTTER_VERSION}.tar.xz"

RUN set -eux; \
    apt-get update && apt-get install -y --no-install-recommends wget xz-utils || true; \
    echo "Downloading Flutter from ${FLUTTER_URL}"; \
    rm -f /tmp/flutter.tar.xz; \
    for i in 1 2 3 4 5; do \
      echo "Attempt $i to download flutter..."; \
      wget --tries=3 --timeout=30 --retry-connrefused -O /tmp/flutter.tar.xz "${FLUTTER_URL}" && break || echo "wget attempt $i failed, retrying..."; \
      sleep $((i * 5)); \
    done; \
    if [ ! -s /tmp/flutter.tar.xz ]; then \
      echo "ERROR: flutter archive not downloaded or empty: /tmp/flutter.tar.xz"; \
      ls -l /tmp || true; \
      exit 1; \
    fi; \
    echo "Downloaded flutter archive, size:"; ls -lh /tmp/flutter.tar.xz; \
    # try extracting, provide debug info on failure
    mkdir -p /usr/local/flutter_tmp; \
    if ! tar -xJf /tmp/flutter.tar.xz -C /usr/local; then \
      echo "ERROR: tar extraction failed for /tmp/flutter.tar.xz"; \
      echo "File info:"; file /tmp/flutter.tar.xz || true; ls -l /tmp/flutter.tar.xz || true; \
      exit 1; \
    fi; \
    rm -f /tmp/flutter.tar.xz; \
    echo "Flutter installed to /usr/local/flutter"

ENV PATH="/usr/local/flutter/bin:/usr/local/flutter/bin/cache/dart-sdk/bin:${PATH}"

# Pre-cache Flutter artifacts (may be slow)
RUN /usr/local/flutter/bin/flutter precache --no-analytics || true
RUN /usr/local/flutter/bin/flutter doctor -v || true

# -----------------------------
# 5. Install Gradle
# -----------------------------
RUN apt-get update && apt-get install -y --no-install-recommends gradle && rm -rf /var/lib/apt/lists/*

# -----------------------------
# 6. Optional global npm tools
# -----------------------------
RUN npm install -g react-native-cli expo-cli eas-cli --unsafe-perm || true

# -----------------------------
# 7. Setup workspace + app dir
# -----------------------------
RUN mkdir -p /workspaces /app && chown -R app:app /workspaces /app
RUN git config --global user.email "ci@katara" && git config --global user.name "katara-ci"

WORKDIR /app
COPY package*.json ./
RUN chown app:app package*.json

USER app

RUN npm install --no-audit --no-fund

RUN if [ "$NODE_ENV" = "development" ]; \
    then npm install; \
    else npm install --only=production; \
    fi
# copy rest of source as non-root user
COPY --chown=app:app . .

EXPOSE 5000

USER app
CMD ["node", "src/server.js"]
