FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# -----------------------------
# 1. Install core dependencies
# -----------------------------
RUN apt update && apt install -y \
  curl \
  git \
  unzip \
  zip \
  python3 \
  openjdk-17-jdk \
  build-essential \
  wget \
  xz-utils \
  ca-certificates

# -----------------------------
# 2. Install Node.js
# -----------------------------
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt install -y nodejs

# create a non-root user for runtime
RUN useradd -m -s /bin/bash app

# -----------------------------
# 3. Install Android SDK (commandline tools + packages)
# -----------------------------
RUN mkdir -p /usr/lib/android-sdk/cmdline-tools
WORKDIR /tmp

RUN wget https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip -O /tmp/cmdline-tools.zip && \
    unzip /tmp/cmdline-tools.zip -d /usr/lib/android-sdk/cmdline-tools && \
    rm /tmp/cmdline-tools.zip

ENV ANDROID_HOME=/usr/lib/android-sdk
ENV PATH="${ANDROID_HOME}/cmdline-tools/bin:${ANDROID_HOME}/platform-tools:${PATH}"

# Accept licenses and install required SDK components
RUN yes | sdkmanager --licenses || true

RUN sdkmanager --install "platform-tools" "platforms;android-34" "build-tools;34.0.0" "emulator" "system-images;android-34;google_apis;x86_64" || true

# -----------------------------
# 4. Install Flutter
# -----------------------------
WORKDIR /usr/local
RUN wget https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_3.19.0-stable.tar.xz && \
    tar xf flutter_linux_3.19.0-stable.tar.xz -C /usr/local/ && \
    rm flutter_linux_3.19.0-stable.tar.xz

ENV PATH="/usr/local/flutter/bin:/usr/local/flutter/bin/cache/dart-sdk/bin:${PATH}"

# Pre-cache Flutter artifacts (non-interactive)
RUN flutter precache --no-analytics || true

# Run doctor to ensure binaries are in place (continue on non-zero exit)
RUN flutter doctor -v || true

# -----------------------------
# 5. Install Gradle
# -----------------------------
RUN apt install -y gradle

# -----------------------------
# 6. Install React Native + Expo (global)
# -----------------------------
RUN npm install -g react-native-cli expo-cli eas-cli --unsafe-perm

# -----------------------------
# 7. Setup workspace + Express server
# -----------------------------
# Create workspace and make it writable by the runtime user
RUN mkdir -p /workspace && chown -R app:app /workspace
ENV WORKSPACE=/workspace

# ensure /app exists and owned by app
WORKDIR /app
RUN mkdir -p /app && chown -R app:app /app

# set git user to avoid commit failure
RUN git config --global user.email "ci@katara" && git config --global user.name "katara-ci"

# Copy project files and install dependencies as non-root user
COPY package*.json ./
RUN chown app:app package*.json

USER app
RUN npm install --no-audit --no-fund

# copy rest of source as non-root user
COPY --chown=app:app . .

# switch back to root only if you need privileged operations later
USER app

EXPOSE 4000

CMD ["node", "src/server.js"]





# FROM ubuntu:22.04

# # -----------------------------
# # 1. Install core dependencies
# # -----------------------------
# RUN apt update && apt install -y \
#   curl \
#   git \
#   unzip \
#   zip \
#   python3 \
#   openjdk-17-jdk \
#   build-essential \
#   wget \
#   xz-utils

# # -----------------------------
# # 2. Install Node.js
# # -----------------------------
# RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
#     apt install -y nodejs

# # -----------------------------
# # 3. Install Flutter
# # -----------------------------
# RUN wget https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_3.19.0-stable.tar.xz && \
#     tar xf flutter_linux_3.19.0-stable.tar.xz -C /usr/local/

# ENV PATH="/usr/local/flutter/bin:/usr/local/flutter/bin/cache/dart-sdk/bin:${PATH}"

# RUN flutter doctor

# RUN flutter pub get \
#  flutter_bloc\
#  bloc\
#  http

# # ...existing code...
# # create workspace and make it writable by non-root user
# RUN mkdir -p /workspace && chown -R node:node /workspace
# ENV WORKSPACE=/workspace

# # set git user to avoid commit failure
# RUN git config --global user.email "ci@katara" && git config --global user.name "katara-ci"
# # ...existing code...
# # -----------------------------
# # 4. Install Android SDK
# # -----------------------------
# RUN mkdir -p /usr/lib/android-sdk/cmdline-tools

# RUN wget https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip && \
#     unzip commandlinetools-linux-9477386_latest.zip -d /usr/lib/android-sdk/cmdline-tools && \
#     rm commandlinetools-linux-9477386_latest.zip

# ENV ANDROID_HOME=/usr/lib/android-sdk
# ENV PATH="${ANDROID_HOME}/cmdline-tools/bin:${ANDROID_HOME}/platform-tools:${PATH}"

# RUN yes | sdkmanager --licenses

# RUN sdkmanager \
#     "platform-tools" \
#     "platforms;android-34" \
#     "build-tools;34.0.0" \
#     "emulator" \
#     "system-images;android-34;google_apis;x86_64"

# # -----------------------------
# # 5. Install Gradle
# # -----------------------------
# RUN apt install -y gradle

# # -----------------------------
# # 6. Install React Native + Expo
# # -----------------------------
# RUN npm install -g react-native-cli expo-cli eas-cli

# # -----------------------------
# # 7. Setup workspace + Express server
# # -----------------------------
# WORKDIR /app

# COPY package*.json ./
# RUN npm install

# COPY . .

# EXPOSE 4000

# CMD ["node", "src/server.js"]
