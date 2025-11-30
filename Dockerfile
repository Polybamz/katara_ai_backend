FROM ubuntu:22.04

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
  xz-utils

# -----------------------------
# 2. Install Node.js
# -----------------------------
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt install -y nodejs

# -----------------------------
# 3. Install Flutter
# -----------------------------
RUN wget https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_3.19.0-stable.tar.xz && \
    tar xf flutter_linux_3.19.0-stable.tar.xz -C /usr/local/

ENV PATH="/usr/local/flutter/bin:/usr/local/flutter/bin/cache/dart-sdk/bin:${PATH}"

RUN flutter doctor

RUN flutter pub get \
 flutter_bloc\
 bloc\
 http\
# -----------------------------
# 4. Install Android SDK
# -----------------------------
RUN mkdir -p /usr/lib/android-sdk/cmdline-tools

RUN wget https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip && \
    unzip commandlinetools-linux-9477386_latest.zip -d /usr/lib/android-sdk/cmdline-tools && \
    rm commandlinetools-linux-9477386_latest.zip

ENV ANDROID_HOME=/usr/lib/android-sdk
ENV PATH="${ANDROID_HOME}/cmdline-tools/bin:${ANDROID_HOME}/platform-tools:${PATH}"

RUN yes | sdkmanager --licenses

RUN sdkmanager \
    "platform-tools" \
    "platforms;android-34" \
    "build-tools;34.0.0" \
    "emulator" \
    "system-images;android-34;google_apis;x86_64"

# -----------------------------
# 5. Install Gradle
# -----------------------------
RUN apt install -y gradle

# -----------------------------
# 6. Install React Native + Expo
# -----------------------------
RUN npm install -g react-native-cli expo-cli eas-cli

# -----------------------------
# 7. Setup workspace + Express server
# -----------------------------
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 4000

CMD ["node", "src/server.js"]
