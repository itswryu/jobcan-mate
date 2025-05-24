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
│   └── calendarService.js  # Google Calendar ICS 파싱 및 공휴일 확인 서비스
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
    "checkInCron": "0 8 * * 1-5",
    "checkOutCron": "0 17 * * 1-5",
    "timezone": "Asia/Seoul"
  },
  "playwright": {
    "headless": false
  },
  "appSettings": {
    "testMode": false
  },
  "calendar": {
    "holidayCalendarUrl": "https://calendar.google.com/calendar/ical/ko.south_korea%23holiday%40group.v.calendar.google.com/public/basic.ics"
  }
}
```

**참고: `.env` 파일 예시 (`.env`라는 이름으로 프로젝트 루트에 생성)**

```env
JOBCAN_EMAIL="your_email@example.com"
JOBCAN_PASSWORD="your_actual_password"
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
- [X] README.md (또는 `project.md`에 통합)에 사용 방법 상세 기술
- [X] `main.js`에서 인자 없이 실행 시 도움말 또는 기본 정보 출력 기능 (선택 사항)
- [X] `node-ical` 라이브러리 설치 (`npm install node-ical`)
- [X] `config.json`에 공휴일 ICS URL 필드 추가 (`calendar.holidayCalendarUrl`)
- [X] `src/calendarService.js` 모듈 생성 및 공휴일 확인 기능 구현
  - [X] ICS URL 파싱 로직
  - [X] 오늘 날짜와 비교하여 공휴일 여부 반환
- [X] `src/scheduler.js`에 공휴일 체크 로직 연동
  - [X] 스케줄 실행 전 `isTodayHoliday` 호출
  - [X] 공휴일일 경우 작업 건너뛰고 로그 기록
