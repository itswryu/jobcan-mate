# Jobcan 출퇴근 자동화 프로젝트

## 1. 개요

본 프로젝트는 Playwright를 사용하여 Jobcan 사이트의 출퇴근 기록을 자동화하는 것을 목표로 합니다.

## 2. 개발 환경

-   **언어**: Node.js
-   **테스트 프레임워크**: Playwright
-   **패키지 매니저**: npm (또는 yarn)

## 3. 주요 기능

-   설정 파일을 통한 유연한 설정 (근무 요일, 출퇴근 시간, 실행 모드 등)
-   지정된 시간에 자동으로 출퇴근 기록 실행
-   헤드리스(백그라운드) 모드와 포그라운드(화면 표시) 모드 지원
-   로그인 페이지 및 출퇴근 기록 페이지 자동 이동
-   사용자 직접 로그인을 위한 브라우저 실행 기능
-   실행 결과 및 오류 로깅

## 4. 프로젝트 구조 (예상)

```
jobcan-auto/
├── node_modules/
├── src/
│   ├── main.js             # 메인 실행 스크립트
│   ├── jobcan.js           # Jobcan 관련 로직 (로그인, 출퇴근 처리)
│   ├── scheduler.js        # 자동 실행 스케줄러
│   ├── calendarService.js  # Google Calendar ICS 파싱 및 공휴일 확인 서비스
│   └── notificationService.js # 알림 서비스 (텔레그램 등)
├── config.json             # 설정 파일 (근무시간, URL, ICS URL 등)
├── project.md              # 프로젝트 가이드라인
├── package.json
└── package-lock.json
```

## 5. 개발 가이드라인

- **코딩 스타일**: 일관성 있는 코딩 스타일 유지 (ESLint, Prettier 사용 권장)
- **주석**: 주요 기능 및 복잡한 로직에는 주석 작성
- **에러 처리**: 예상되는 오류에 대한 적절한 예외 처리 로직 포함
- **로깅**: 주요 실행 단계 및 오류 발생 시 로그 기록

## 6. 설정 (`config.json` 예시)

```json
{
  "jobcan": {
    "loginUrl": "https://id.jobcan.jp/users/sign_in?app_key=atd",
    "attendanceUrl": "https://ssl.jobcan.jp/employee",
    "loginCredentials": {
      "envFilePath": ".env", // .env 파일 경로 (프로젝트 루트 기준 또는 절대 경로)
      "emailXPath": "//*[@id='user_email']",
      "passwordXPath": "//*[@id='user_password']",
      "loginButtonXPath": "//*[@id='login_button']"
    },
    "attendanceButtonXPath": "//*[@id='adit-button-push']",
    "workingStatusXPath": "//*[@id='working_status']"
  },
  "workHours": {
    "weekdaysOnly": true,
    "checkInTime": "08:00",
    "checkOutTime": "17:00"
  },
  "scheduler": {
    "enabled": true,
    "delayInMinutes": {
      "checkIn": 0,
      "checkOut": 0
    },
    "timezone": "Asia/Seoul"
  },
  "playwright": {
    "headless": false
  },
  "appSettings": {
    "testMode": false,
    "messageLanguage": "en" // 애플리케이션 로케일 (로그, 알림 메시지 언어)
  },
  "calendar": {
    "holidayCalendarUrl": "https://calendar.google.com/calendar/ical/ko.south_korea%23holiday%40group.v.calendar.google.com/public/basic.ics"
  },
  "telegram": {
    // botTokenEnvVar 및 chatIdEnvVar는 config.json에서 제거됨.
    // 대신 src/notificationService.js 내에 'TELEGRAM_BOT_TOKEN' 및 'TELEGRAM_CHAT_ID'로 하드코딩됨.
    // 두 환경 변수 중 하나라도 누락 시 경고 로그 출력 후 텔레그램 알림 비활성화.
    // 두 환경 변수 모두 누락 시 정보 로그 출력 후 텔레그램 알림 비활성화.
  }
}
```

**참고: `.env` 파일 예시 (`.env`라는 이름으로 프로젝트 루트에 생성)**

```env
JOBCAN_EMAIL="your_email@example.com"
JOBCAN_PASSWORD="your_actual_password"
TELEGRAM_BOT_TOKEN="your_telegram_bot_token"
TELEGRAM_CHAT_ID="your_telegram_chat_id"
```

`.env` 파일은 `.gitignore`에 추가하여 버전 관리에서 제외하는 것을 권장합니다.

## 6.1. 출퇴근 로직 상세

- **출근**:
  - 현재 상태(`workingStatusXPath`의 텍스트)가 '미출근'일 때만 출근 버튼(`attendanceButtonXPath`) 클릭을 진행합니다.
  - 클릭 후, 현재 상태가 '근무중'으로 변경되면 성공으로 간주합니다.
- **퇴근**:
  - 현재 상태가 '근무중'일 때만 퇴근 버튼 클릭을 진행합니다.
  - 클릭 후, 현재 상태가 '휴식중'으로 변경되면 성공으로 간주합니다. (사용자 명시: '휴식중'. 일반적인 '퇴근' 상태와 다를 수 있으므로 확인 필요)
- **테스트 모드**:
  - `config.json`의 `appSettings.testMode`가 `true`일 경우, 실제 출퇴근 버튼 클릭 동작을 수행하지 않고 로그만 기록합니다.

## 7. 실행 방법

- **의존성 설치**: 프로젝트 루트 디렉토리에서 다음 명령을 실행하여 필요한 라이브러리를 설치합니다.

  ```bash
  npm install
  ```

- **환경 변수 설정**: 프로젝트 루트 디렉토리에 `.env` 파일을 생성하고 Jobcan 로그인 정보를 입력합니다. (아래 `6. 설정` 참고)

  ```env
  JOBCAN_EMAIL="your_email@example.com"
  JOBCAN_PASSWORD="your_password"
  TELEGRAM_BOT_TOKEN="your_telegram_bot_token"
  TELEGRAM_CHAT_ID="your_telegram_chat_id"
  ```

- **수동 실행**: 특정 작업을 즉시 실행하려면 다음 명령을 사용합니다.

  - 출근 기록:

    ```bash
    npm run checkin
    ```

    또는

    ```bash
    node src/main.js checkIn
    ```

  - 퇴근 기록:

    ```bash
    npm run checkout
    ```

    또는

    ```bash
    node src/main.js checkOut
    ```

- **스케줄러 실행**: `config.json`에 설정된 시간에 따라 자동으로 출퇴근을 기록하려면 다음 명령으로 스케줄러를 실행합니다. 스케줄러는 백그라운드에서 계속 실행됩니다.

  ```bash
  npm run schedule
  ```

  로그는 콘솔에 출력됩니다.

- **테스트 모드**: `config.json` 파일에서 `appSettings.testMode`를 `true`로 설정하면, 실제 버튼 클릭 없이 로그만 기록하여 테스트해볼 수 있습니다.

## 8. 작업 관리

- [X] `project.md` 기본 구조 작성
- [X] Playwright, `node-cron`, `dotenv` 필요 라이브러리 설치 (`npm install playwright node-cron dotenv`)
- [X] `config.json` 설정 파일 구조 정의 및 초기값 작성
  - [X] `loginCredentials.envFilePath` 필드 추가 반영
  - [X] `scheduler.timezone` 필드 추가 반영 ("Asia/Seoul")
- [X] `.env` 파일에서 로그인 정보(이메일, 비밀번호)를 읽어오는 기능 구현 (`jobcan.js`, `dotenv` 사용)
- [X] `config.json`에서 설정값(근무 시간, URL, XPath, 모드 등)을 읽어오는 기능 구현 (`jobcan.js`)
- [X] Playwright 브라우저 실행 및 로그인 페이지 이동 기능 구현 (`jobcan.js`)
  - [X] 자동 로그인 시도 로직 추가 (환경변수에서 이메일/비밀번호 사용)
- [X] 사용자가 로그인할 때까지 대기하는 로직 구현 (`jobcan.js` - `waitForURL`, 수동 로그인 폴백)
- [X] 현재 시간 및 설정된 근무 요일/시간을 비교하는 로직 구현 (스케줄러에서 cron 표현식으로 처리)
- [X] 출퇴근 페이지(`https://ssl.jobcan.jp/employee`)로 이동하는 기능 구현
- [X] 근무 상태('미출근', '근무중', '휴식중' 등)를 확인하는 로직 구현 (`jobcan.js`)
- [X] 출근 버튼 클릭 로직 구현 (`jobcan.js`):
  - [X] `appSettings.testMode` 확인
  - [X] 현재 상태 '미출근' 확인
  - [X] 버튼 클릭 (테스트 모드가 아닐 경우) 및 API 응답 대기
  - [X] 클릭 후 상태 '근무중' 확인
- [X] 퇴근 버튼 클릭 로직 구현 (`jobcan.js`):
  - [X] `appSettings.testMode` 확인
  - [X] 현재 상태 '근무중' 확인
  - [X] 버튼 클릭 (테스트 모드가 아닐 경우) 및 API 응답 대기
  - [X] 클릭 후 상태 '휴식중' 또는 '미출근' 확인
- [X] `node-cron`을 사용한 스케줄링 기능 구현 (설정 파일의 cron 표현식 및 시간대 기반) (`scheduler.js`)
- [X] 헤드리스/포그라운드 실행 모드 전환 기능 구현 (`config.json`의 `playwright.headless` 설정)
- [X] 간단한 로그 기록 기능 구현 (콘솔 출력)
- [X] README.md (또는 `project.md`에 사용 방법 상세 기술
- [X] `main.js`에서 인자 없이 실행 시 도움말 또는 기본 정보 출력 기능 (선택 사항)
- [X] `node-ical` 라이브러리 설치 (`npm install node-ical`)
- [X] `config.json`에 공휴일 ICS URL 필드 추가 (`calendar.holidayCalendarUrl`)
- [X] `src/calendarService.js` 모듈 생성 및 공휴일 확인 기능 구현
  - [X] ICS URL 파싱 로직
  - [X] 오늘 날짜와 비교하여 공휴일 여부 반환
- [X] `src/scheduler.js`에 공휴일 체크 로직 연동
  - [X] 스케줄 실행 전 `isTodayHoliday` 호출
  - [X] 공휴일일 경우 작업 건너뛰고 로그 기록
- [x] **텔레그램 알림 기능 추가**
  - [x] `project.md`: `node-telegram-bot-api` 라이브러리 추가, `config.json` 및 `.env` 예시 업데이트
  - [x] `config.json`: `telegram` 섹션 추가 (봇 토큰 및 채팅 ID 환경 변수 이름)
  - [x] (사용자 작업) 텔레그램 봇 생성 및 API 토큰, 채팅 ID를 `.env` 파일에 추가
  - [x] `src/notificationService.js` 파일 생성
    - [x] 환경 변수에서 텔레그램 봇 토큰 및 채팅 ID 로드
    - [x] `sendNotification(message)` 함수 구현
    - [x] 토큰 또는 채팅 ID 누락 시 오류 처리
  - [x] `src/jobcan.js` 수정
    - [x] `getConfig` 함수에서 텔레그램 관련 환경 변수 로드하도록 수정
    - [x] `notificationService.js`의 `sendNotification` 함수 import 및 사용
      - [x] 출퇴근 성공/실패 시 알림
      - [x] `launchBrowserAndLoginPage` 함수 내 웹사이트 접속 또는 로그인 오류 발생 시 알림
      - [x] 기타 예외 발생 시 알림
  - [x] `src/main.js` 수정
    - [x] `notificationService.js`의 `sendNotification` 함수 import 및 사용
    - [x] 메인 `try...catch` 블록에서 오류 발생 시 알림
  - [x] (선택 사항) `src/scheduler.js` 수정
    - [x] 공휴일/주말로 인한 작업 건너뛰기 시 알림 고려 (콘솔 로그로 대체)
    - [x] `exec` 명령어 실행 오류 시 알림
  - [x] `project.md` 작업 목록 업데이트 (텔레그램 기능 완료)
  - [x] 텔레그램 연동 기능 커밋

- [X] **다국어 지원 및 로깅/주석 표준화 (영어)**
  - [X] `project.md`: 로깅/주석 영어 사용 규칙 및 텔레그램 메시지 언어 설정 지침 추가
  - [X] `config.json`: `telegram.messageLanguage` 필드 추가 (기본값 "en")
  - [X] `src/notificationService.js`:
    - [X] 주석 및 로그 영어로 변경
    - [X] `messageLanguage` 설정을 읽도록 `initializeNotificationService` 수정 (실제 메시지 선택은 호출 측에서)
  - [X] `src/jobcan.js`:
    - [X] 주석 및 로그 영어로 변경
    - [X] `getConfig` 수정하여 `messageLanguage` 설정 제공
    - [X] `sendNotification` 호출 시 언어 설정에 따라 메시지 분기 처리 (영/한 메시지 준비)
    - [X] `getMessage` 함수 export
  - [X] `src/main.js`:
    - [X] 주석 및 로그 영어로 변경
    - [X] `sendNotification` 호출 시 언어 설정에 따라 메시지 분기 처리 (getMessage 사용)
  - [X] `src/scheduler.js`:
    - [X] 주석 및 로그 영어로 변경
    - [X] `sendNotification` 호출 시 언어 설정에 따라 메시지 분기 처리 (getMessage 사용)
  - [X] `src/calendarService.js`:
    - [X] 주석 및 로그 영어로 변경
  - [X] `project.md` 작업 목록 업데이트 (다국어 지원 및 표준화 완료)
  - [X] 다국어 지원 및 표준화 기능 커밋

- [X] **Playwright 로케일 설정을 'ko-KR'로 지정**
  - [X] `config.json`의 `playwright` 섹션에 `locale: "ko-KR"` 추가
  - [X] `src/jobcan.js`의 `launchBrowserAndLoginPage` 함수에서 `browser.newContext()` 호출 시 `locale` 설정 적용
  - [X] `project.md` 작업 목록 업데이트
  - [X] Playwright 로케일 설정 기능 커밋

- [X] **Git 저장소에서 `node_modules` 폴더 완전 제거**
  - [X] `git filter-repo` 도구 설치 확인 (Windows의 경우 Git Bash 또는 WSL 환경에서 실행 필요할 수 있음)
  - [X] 명령어 실행: `git filter-repo --path node_modules --invert-paths --force` (필요시 전체 경로 사용)
  - [X] 원격 저장소 재연결: `git remote add origin https://github.com/itswryu/jobcan-mate.git` (필요한 경우)
  - [X] 변경된 히스토리 강제 푸시: `git push --force origin --all`
  - [X] (선택 사항) 로컬 저장소 정리: `git reflog expire --expire=now --all && git gc --prune=now --aggressive`
  - [X] `project.md` 작업 목록 업데이트
  - [X] `node_modules` 완전 제거 작업 커밋

- [X] **GitHub Actions 워크플로우 수정**
  - [X] `main` 브랜치 푸시 시에만 트리거되도록 수정
  - [X] Docker 이미지 태그는 `latest`만 생성하도록 수정
  - [X] 태그 없는 이전 GHCR 이미지 삭제 단계 추가 (`Chizkiyahu/delete-untagged-ghcr-action` 사용)
    - [X] `owner_type: user` 파라미터 추가하여 오류 수정
    - [X] `Chizkiyahu/delete-untagged-ghcr-action` 버전을 `@v3`에서 `@v4.1.0`으로 업데이트하여 오류 수정 시도
    - [X] `Chizkiyahu/delete-untagged-ghcr-action` 버전을 `@v6`으로 업데이트하여 오류 수정 시도
      - name: Delete untagged container image versions
        uses: actions/delete-package-versions@v5
        with:
          package-name: ${{{{ github.event.repository.name }}}}
          owner: ${{{{ github.repository_owner }}}}
          package-type: 'container'
          delete-untagged-versions: 'true'
          token: ${{{{ secrets.GITHUB_TOKEN }}}}
  - [X] `project.md` 작업 목록 업데이트
  - [X] GitHub Actions 워크플로우 수정 작업 커밋

- [X] **텔레그램 알림 기능 수정**
  - [X] `config.json`에서 `telegram.botTokenEnvVar`, `telegram.chatIdEnvVar` 제거. `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` 환경 변수명을 `src/notificationService.js`에 하드코딩.
  - [X] `config.json`에서 `telegram.messageLanguage`를 `appSettings.messageLanguage`로 이동.
  - [X] `src/notificationService.js`: 토큰/채팅 ID 누락 시 경고/정보 로그 출력 및 알림 비활성화 로직 구현.
  - [X] `src/jobcan.js`, `src/main.js`, `src/scheduler.js`: `messageLanguage` 참조 경로를 `config.appSettings.messageLanguage`로 변경.
- [X] **`page.waitForURL` 버그 수정**
  - [X] `src/jobcan.js`의 `launchBrowserAndLoginPage` 함수 내 `page.waitForURL` 호출 시 `url.href.startsWith()`를 사용하도록 수정 (URL 객체의 `href` 속성 사용).
- [ ] (신규) `project.md` 업데이트 및 모든 변경사항 커밋/푸시

## 9. 추가 개선 사항 (선택적)
