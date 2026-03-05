# Arduino Helper

<p align="center">
  <a href="#english">English</a> | <a href="#한국어">한국어</a>
</p>

---

## English

Arduino CLI-based VS Code extension — compile, upload, serial monitor, and board/library management directly from VS Code.

### Features

- **Board Selection** — Select from all installed boards (auto-detect USB-connected boards)
- **Port Selection** — Pick connected COM ports
- **Compile** — Compile sketches + display errors in the editor
- **Upload** — Compile and auto-upload to your board
- **Serial Monitor** — Open serial monitor in the terminal
- **Library Install** — Search → Select → Install
- **New Sketch** — Create sketches from templates
- **Core Install** — Install board platform packages
- **Example Sketches** — Browse and open example sketches from libraries/cores

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

- **보드 선택** — 설치된 모든 보드 중 선택 (USB 연결 보드 자동 감지)
- **포트 선택** — 연결된 COM 포트 선택
- **컴파일** — 스케치 컴파일 + 에러를 에디터에 표시
- **업로드** — 컴파일 후 보드에 자동 업로드
- **시리얼 모니터** — 터미널에서 시리얼 모니터 열기
- **라이브러리 설치** — 검색 → 선택 → 설치
- **새 스케치** — 템플릿 기반 스케치 생성
- **코어 설치** — 보드 플랫폼 패키지 설치
- **예제 스케치** — 설치된 라이브러리/코어의 예제를 탐색하고 열기

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
