# Seung AI Labs

공개돼도 괜찮은 교육·운영 자료만 게시합니다. 숨은 자료실도 비밀 보관함이 아닙니다.

- 게시 가이드: `public/privacy-guidelines.html`. 전화번호·개인 이메일·학생 식별 자료·암호를 올리지 않습니다.
- 새 클론에서 한 번 `npm run privacy:install-hook`를 실행하면 커밋 전 스테이징된 텍스트를 검사합니다. Git hook은 로컬 설정이므로 각 클론에서 설정해야 합니다.
- `npm run check:privacy`: public/src와 진입 HTML 검사. `npm run build`는 빌드 전과 빌드 산출물에도 검사합니다. PR에서도 같은 검사를 실행합니다.
- 감지되면 파일·행·유형만 표시합니다. 실제 값은 로그에 출력하지 않습니다. 검사에 실패하면 개인정보를 지우거나 역할명/가상 데이터로 바꾸고 다시 실행합니다.
- 이미지·PDF·첨부·이름·얼굴·주소·여러 정보의 조합까지 자동으로 판별하지는 못하므로 사람이 게시 전 확인합니다. 외부에서 직접 수정·게시하거나 로컬 hook을 건너뛰는 경로까지 차단하는 기능은 아닙니다.

## 개발 환경

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
