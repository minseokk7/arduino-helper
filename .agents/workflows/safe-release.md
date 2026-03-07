---
description: 빌드 오류가 있을 경우 배포(Release)를 방지하는 안전한 배포 워크플로우
---

이 워크플로우를 사용하면 확장 프로그램 자체의 TypeScript 타입 오류나 린트 오류가 있을 경우 배포를 중단하여 안정적인 버전을 유지할 수 있습니다.

### 📜 안전 배포 단계 (Safe Release Steps)

1. **타입 체크 (Type Check)**
   - `npm run build:strict` 명령어를 실행하여 TypeScript 프로젝트에 타입 오류가 없는지 확인합니다.
   - 내부적으로 `tsc --noEmit`을 먼저 실행하여 모든 파일의 정적 분석을 통과해야만 빌드 번들이 생성됩니다.

2. **코드 스타일 검사 (Lint Check)**
   - `npm run lint`를 실행하여 ESLint 규칙을 준수하는지 확인합니다.

3. **패키징 (Packaging)**
   - 오류가 없는 것이 확인되면 `npm run package`를 통해 `.vsix` 파일을 생성합니다.

4. **버전 태그 및 푸시 (Tag & Push)**
   - 빌드가 성공하면 Git 태그를 작성하고 리포지토리에 푸시합니다.

5. **릴리즈 배포 (Publish)**
   - GitHub Release 및 Open VSX에 배포를 진행합니다.

---

### 💡 팁
- `package.json`에 정의된 `prepublish` 스크립트 덕분에 `vsce package`나 `ovsx publish` 명령어 실행 시 자동으로 `build:strict`가 선행되어 오류를 방지합니다.
- 만약 강제로 배포해야 할 상황(문서 수정 등)이라면 `--no-verify` 같은 옵션 대신 개별 명령어를 사용하세요.
