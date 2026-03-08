# Arduino Helper

<p align="center">
  <a href="#english">English</a> | <a href="#한국어">한국어</a>
</p>

---

## English

Arduino CLI-based VS Code extension — compile, upload, serial monitor, and board/library management directly from VS Code.

### Features

- **Auto-Download CLI** — Automatically downloads `arduino-cli` if not found (v0.2.2+)
- **Board Selection** — Select from all installed boards
- **Port Selection** — Pick connected COM ports (auto-detects USB boards)
- **Compile & Upload** — Integrated `Ctrl+Shift+B` TaskProvider support
- **Serial Monitor** — Interactive serial monitor in the terminal
- **Serial Plotter (GUI)** — Visualize real-time telemetry data with Chart.js (supports CSV Export)
- **Auto-Formatting** — Generate standard Arduino `.clang-format` to format `.ino` files beautifully
- **Manager GUI (Webview)** — Visually search and install boards and libraries
- **Webview Dashboard** — Rich graphical sidebar interface
- **Memory Inspector** — Real-time Flash & RAM usage bars after compilation
- **Dependency Management** — Auto-install missing libraries from `arduino.json`
- **Enhanced Serial Monitor** — Timestamps, Hex View, and Log Export functionality
- **IntelliSense & Clangd** — Generates `c_cpp_properties.json` and `compile_commands.json`
- **Code Snippets** — Built-in Arduino snippets (`setup`, `loop`, `pm`, etc.)
- **Hardware Debugging** — Auto-generate `launch.json` for Cortex-Debug
- **Example Sketches** — Browse and open library/core examples

### Prerequisites

- [arduino-cli](https://arduino.github.io/arduino-cli/latest/installation/) installed and added to PATH

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

- **CLI 자동 다운로드** — `arduino-cli`가 없으면 자동으로 다운로드 (v0.2.2+)
- **보드 & 포트 선택** — 설치된 플러그인에서 보드 선택 및 연결된 USB 자동 감지
- **컴파일 및 업로드** — `Ctrl+Shift+B` 빌드 단축키(Task 연동)를 통한 빠른 컴파일/업로드
- **시리얼 모니터** — 가상 터미널 환경에서 입출력이 가능한 시리얼 통신
- **시리얼 플로터 (GUI)** — 센서 출력 데이터를 다중 채널 그래프(Chart.js)로 시각화 및 **CSV 내보내기** 지원
- **자동 포맷팅 (Auto-Format)** — 아두이노 표준 `.clang-format` 파일을 생성하여 `.ino` 코드를 예쁘게 정렬
- **매니저 대시보드 (Webview)** — 라이브러리 및 보드 코어를 시각적인 화면에서 검색/설치
- **웹뷰 대시보드 사이드바** — 시각적이고 풍부한 인터페이스 제공
- **메모리 사용량 검사기** — 컴파일 완료 후 실시간 Flash 및 RAM 점유율 프로그레스 바 표시
- **프로젝트 종속성 자동 관리** — `arduino.json`의 라이브러리 배열을 읽고 누락된 패키지 자동 설치
- **향상된 시리얼 모니터** — 타임스탬프 기록, 16진수(Hex) 뷰, 로그 텍스트로 내보내기 기능
- **인텔리센스 & Clangd** — `c_cpp_properties.json` 및 `compile_commands.json` 자동 생성 지원
- **코드 스니펫** — `setup`, `loop`, `pm` 등 필수 아두이노 코드 자동완성
- **하드웨어 디버깅** — OpenOCD 및 Cortex-Debug를 위한 `launch.json` 자동 구성
- **예제 스케치** — 라이브러리/코어의 예제를 탐색하고 새 창으로 열기

### 사전 요구 사항

- [arduino-cli](https://arduino.github.io/arduino-cli/latest/installation/) 설치 및 PATH 등록

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
