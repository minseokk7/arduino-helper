# Arduino Helper

Arduino CLI 기반 VS Code 확장 — 컴파일, 업로드, 시리얼 모니터, 보드/라이브러리 관리를 VS Code에서 직접 수행합니다.

## 기능

- **보드 선택**: 설치된 모든 보드 중 선택 (USB 연결 보드 자동 감지)
- **포트 선택**: 연결된 COM 포트 선택
- **컴파일**: 스케치 컴파일 + 에러를 에디터에 표시
- **업로드**: 컴파일 후 보드에 자동 업로드
- **시리얼 모니터**: 터미널에서 시리얼 모니터 열기
- **라이브러리 설치**: 검색 → 선택 → 설치
- **새 스케치**: 템플릿 기반 스케치 생성
- **코어 설치**: 보드 플랫폼 패키지 설치

## 사전 요구 사항

- [arduino-cli](https://arduino.github.io/arduino-cli/latest/installation/) 설치 및 PATH 등록

## 설정

| 설정 | 기본값 | 설명 |
|------|--------|------|
| `arduino.cliPath` | `arduino-cli` | arduino-cli 경로 |
| `arduino.defaultBaudRate` | `9600` | 시리얼 모니터 기본 보드레이트 |
| `arduino.autoDetectBoard` | `true` | USB 보드 자동 감지 |
