# Arduino Helper

<p align="center">
  <a href="#english">English</a> | <a href="#한국어">한국어</a>
</p>

---

## English

Arduino CLI-based VS Code extension — compile, upload, serial monitor, and board/library management directly from VS Code.

### Features

### 🚀 Features

This extension provides a complete, modern toolchain for Arduino development inside VS Code:

| Core & Management | Serial & Telemetry | Smart Coding & Debugging |
| :--- | :--- | :--- |
| 📥 **CLI Auto-Download**<br>Automatically installs `arduino-cli` | 🔌 **Enhanced Monitor**<br>Interactive terminal with Hex & Timestamps | 🧠 **IntelliSense & Clangd**<br>Auto-generates `compile_commands.json` |
| 🛹 **Board & Port Picker**<br>Select targets and auto-detect USBs | 📈 **Serial Plotter (GUI)**<br>Real-time multi-channel charts (Chart.js) | ✨ **Auto-Formatting**<br>Generates `.clang-format` for `.ino` files |
| ⚡ **Compile & Upload**<br>Integrated `Ctrl+Shift+B` TaskRunner | 💾 **Log & Plot Export**<br>Export raw logs or CSV telemetry data | 🐞 **Hardware Debugging**<br>`launch.json` for Cortex-Debug / OpenOCD |
| 🧩 **Manager GUI**<br>Visual installer for boards and libraries | 📊 **Memory Inspector**<br>Visual progress bars for Flash/RAM usage | 💡 **Code Snippets**<br>Quick inserts for `setup`, `loop`, etc. |
| 🔍 **Dependency Management**<br>Auto-installs missing libs from `arduino.json` | 🎛️ **Webview Dashboard**<br>Rich graphical sidebar control panel | 📚 **Example Sketches**<br>Browse builtin examples safely |

### Prerequisites

- [arduino-cli](https://arduino.github.io/arduino-cli/latest/installation/) installed and added to PATH

### Shortcuts

| Command | Windows / Linux | macOS |
|---------|-----------------|-------|
| **Compile Sketch** | \`Ctrl+Alt+C\` | \`Cmd+Alt+C\` |
| **Upload Sketch** | \`Ctrl+Alt+U\` | \`Cmd+Alt+U\` |
| **Serial Monitor** | \`Ctrl+Alt+M\` | \`Cmd+Alt+M\` |
| **Generate .clang-format** | \`Ctrl+Alt+F\` | \`Cmd+Alt+F\` |
| **Build Task (Default)** | \`Ctrl+Shift+B\` | \`Cmd+Shift+B\` |

### Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `arduino.cliPath` | `arduino-cli` | Path to arduino-cli |
| `arduino.defaultBaudRate` | `9600` | Default serial monitor baud rate |
| `arduino.autoDetectBoard` | `true` | Auto-detect USB boards |

### Localization

This extension supports **English** and **Korean** based on your VS Code display language.
To switch language, run `Configure Display Language` from the Command Palette.

---

## 한국어

Arduino CLI 기반 VS Code 확장 — 컴파일, 업로드, 시리얼 모니터, 보드/라이브러리 관리를 VS Code에서 직접 수행합니다.

### 기능

### 🚀 주요 기능

이 확장 프로그램은 VS Code 내부에서 완벽한 아두이노 개발 환경을 제공합니다:

| 핵심 제어 & 컴파일 | 시리얼 통신 & 시각화 | 스마트 에디터 & 디버깅 |
| :--- | :--- | :--- |
| 📥 **CLI 자동 설치**<br>`arduino-cli`가 없으면 자동 다운로드 | 🔌 **향상된 모니터**<br>가상 터미널 환경, Hex 뷰, 타임스탬프 | 🧠 **IntelliSense & Clangd**<br>`compile_commands.json` 자동 생성 |
| 🛹 **보드 & 포트 선택**<br>연결된 USB 자동 감지 지원 | 📈 **시리얼 플로터 (GUI)**<br>실시간 다중 채널 그래프 (Chart.js) | ✨ **자동 포맷팅 (Auto-Format)**<br>아두이노 전용 `.clang-format` 생성 |
| ⚡ **컴파일 및 업로드**<br>`Ctrl+Shift+B` 빌드 단축키 지원 | 💾 **로그 & CSV 내보내기**<br>텍스트 로그 및 플로터 데이터 파일 저장 | 🐞 **하드웨어 디버깅**<br>`launch.json` 원클릭 자동 구성 |
| 🧩 **매니저 대시보드**<br>라이브러리 및 보드 코어 시각적 검색/설치 | 📊 **메모리 검사기**<br>Flash 및 RAM 점유율 프로그레스 바 | 💡 **코드 스니펫**<br>`setup`, `loop` 등 필수 코드 자동완성 |
| 🔍 **종속성 자동 관리**<br>`arduino.json` 기반 누락 패키지 설치 | 🎛️ **웹뷰 통합 사이드바**<br>시각적이고 풍부한 설정 인터페이스 | 📚 **라이브러리 예제 탐색**<br>내장 예제 스케치를 새 창으로 열기 |

### 사전 요구 사항

- [arduino-cli](https://arduino.github.io/arduino-cli/latest/installation/) 설치 및 PATH 등록

### 단축키

| 명령어 | Windows / Linux | macOS |
|--------|-----------------|-------|
| **스케치 컴파일 (Compile)** | \`Ctrl+Alt+C\` | \`Cmd+Alt+C\` |
| **스케치 업로드 (Upload)** | \`Ctrl+Alt+U\` | \`Cmd+Alt+U\` |
| **시리얼 모니터 열기** | \`Ctrl+Alt+M\` | \`Cmd+Alt+M\` |
| **.clang-format 파일 생성** | \`Ctrl+Alt+F\` | \`Cmd+Alt+F\` |
| **기본 빌드 태스크 연동** | \`Ctrl+Shift+B\` | \`Cmd+Shift+B\` |

### 설정

| 설정 | 기본값 | 설명 |
|------|--------|------|
| `arduino.cliPath` | `arduino-cli` | arduino-cli 경로 |
| `arduino.defaultBaudRate` | `9600` | 시리얼 모니터 기본 보드레이트 |
| `arduino.autoDetectBoard` | `true` | USB 보드 자동 감지 |

### 다국어 지원

이 확장은 VS Code 디스플레이 언어에 따라 **영어**와 **한국어**를 자동으로 전환합니다.
언어 변경은 커맨드 팔레트에서 `Configure Display Language`를 실행하세요.

---

## License

[MIT](LICENSE)
