# TeacherMate 가상 학교 업무 앱

[온라인에서 앱 열기](https://ljs0336-koco.github.io/Seung_AI_Labs/apps/teachermate-map/)

이 앱에는 업무 지도와 월간 달력, 자료 올리기, 인수인계, 업무 질문, 설정이 들어 있습니다. 로그인 없이 가상 자료를 사용합니다. 업무 질문은 앱 안의 자료를 검색합니다. 실제 학교 자료를 입력하지 마세요. 설정에서 업무·인수인계·대화·내 담당을 JSON으로 백업하고 복원할 수 있습니다.

## 내 컴퓨터에서 열기

전달 ZIP의 압축을 모두 풀고 `TeacherMate_바로열기.html`을 두 번 누르면 됩니다. 이 파일 한 개에 화면과 자료가 모두 들어 있습니다. 인터넷에 연결하지 않아도 열립니다.

## 코드를 수정할 때

이 소스 ZIP을 별도 폴더에 풀어 원본을 한 부 복사해 두세요. `index.html`은 화면, `style.css`는 화면 배치와 색, `app.js`는 버튼과 검색 동작, `data/demoData.js`는 가상 학교 자료를 담고 있습니다. `savedWorkspace.js`는 브라우저 저장과 백업 복원을, `tm-local-handover.js`와 같은 이름의 CSS 파일은 메모·답변 작성을 담당합니다.

Python이 설치돼 있다면 `index.html`이 있는 폴더에서 `python -m http.server 8000 --bind 127.0.0.1`을 실행하고 브라우저에서 `http://127.0.0.1:8000/`을 여세요. 마칠 때는 명령을 실행한 창에서 Ctrl+C를 누르면 됩니다. 웹 서버에 올릴 때는 파일의 폴더 구조를 유지해 주세요.

## 선생님 서버나 Vercel에서 열기

이 소스 ZIP을 풀어 `index.html`과 `data` 폴더를 같은 위치에 두고 정적 웹 서버에 올려 주세요. Vercel에서는 이 파일들만 담은 별도 저장소를 가져옵니다. 프로젝트의 루트는 `index.html`이 있는 폴더로, Framework Preset은 `Other`로 선택하고 Build Command는 비워 두세요. 공개 주소에서 ‘자료 올리기’와 ‘인수인계’가 열리는지 확인해 주세요. [Vercel 공식 빌드 설정](https://vercel.com/docs/builds/configure-a-build)

브라우저별로 저장되므로 다른 컴퓨터로 옮길 때에는 설정에서 가상 자료를 백업하고 새 컴퓨터에서 복원해 주세요. 답변 링크도 질문을 만든 같은 컴퓨터·브라우저에서 사용합니다. 교사 계정 간 자료 공유에는 별도의 서버 기능이 필요합니다.
