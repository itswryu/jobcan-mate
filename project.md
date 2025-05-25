# Jobcan 출퇴근 자동화 프로젝트

## 1. 개요

본 프로젝트는 Playwright를 사용하여 Jobcan 사이트의 출퇴근 기록을 자동화하는 것을 목표로 합니다.

## 2. 개발 환경

- **언어**: Node.js
- **테스트 프레임워크**: Playwright
- **패키지 매니저**: npm

## 3. 주요 기능

- 설정 파일을 통한 유연한 설정 (근무 요일, 출퇴근 시간, 실행 모드 등)
- 지정된 시간에 자동으로 출퇴근 기록 실행
- 헤드리스(백그라운드) 모드와 포그라운드(화면 표시) 모드 지원
- 로그인 페이지 및 출퇴근 기록 페이지 자동 이동
- 사용자 직접 로그인을 위한 브라우저 실행 기능
- 실행 결과 및 오류 로깅
- 공휴일 및 연차 자동 확인 후 작업 건너뛰기 기능
- 텔레그램 알림 기능

## 4. 프로젝트 구조

```plaintext
jobcan-auto/
├── node_modules/ (Git 관리 대상에서 제외)
├── src/
│   ├── main.js             # 메인 실행 스크립트
│   ├── jobcan.js           # Jobcan 관련 로직 (로그인, 출퇴근 처리, 설정 로드)
│   ├── scheduler.js        # 자동 실행 스케줄러
│   ├── calendarService.js  # Google Calendar ICS 파싱 및 공휴일/연차 확인 서비스
│   └── notificationService.js # 알림 서비스 (텔레그램 등)
├── config.json             # 설정 파일 (근무시간, URL, ICS URL 등)
├── .env                    # 환경 변수 파일 (로그인 정보, 캘린더 URL 등 - Git 관리 대상에서 제외)
├── project.md              # 프로젝트 가이드라인
├── package.json
├── package-lock.json
├── .gitignore
├── Dockerfile
├── .dockerignore
├── .github/workflows/
│   └── docker-publish.yml  # Docker 이미지 빌드 및 GHCR 게시 워크플로
└── kubernetes/
    └── deployment.yaml     # Kubernetes 배포 매니페스트
```

## 5. 개발 가이드라인

- **코딩 스타일**: 일관성 있는 코딩 스타일 유지 (ESLint, Prettier 사용 권장)
- **주석**: 주요 기능 및 복잡한 로직에는 **영문** 주석 작성
- **에러 처리**: 예상되는 오류에 대한 적절한 예외 처리 로직 포함
- **로깅**: 주요 실행 단계 및 오류 발생 시 **영문** 로그 기록 (이모지 대신 `[INFO]`, `[ERROR]` 등 문자열 표현 사용)
- **커밋 메시지**: 명확하고 간결하게 작성 (예: `feat: Add feature X`, `fix: Resolve bug Y`)

## 6. 설정 (`config.json` 예시)

```json
{
  "jobcan": {
    "loginUrl": "https://id.jobcan.jp/users/sign_in?app_key=atd",
    "attendanceUrl": "https://ssl.jobcan.jp/employee",
    "loginCredentials": {
      "envFilePath": ".env", // .env 파일 경로 (프로젝트 루트 기준)
      "emailXPath": "//*[@id='user_email']",
      "passwordXPath": "//*[@id='user_password']",
      "loginButtonXPath": "//*[@id='login_button']"
    },
    "attendanceButtonXPath": "//*[@id='adit-button-push']",
    "workingStatusXPath": "//*[@id='working_status']"
  },
  "workHours": {
    "weekdaysOnly": true, // true: 주중(월-금)에만 실행, false: 매일 실행
    "checkInTime": "08:00", // HH:mm 형식
    "checkOutTime": "17:00" // HH:mm 형식
  },
  "scheduler": {
    "enabled": true,
    "delayInMinutes": {
      "checkIn": 0, // 출근 시간 지연 (분)
      "checkOut": 0 // 퇴근 시간 지연 (분)
    },
    "timezone": "Asia/Seoul" // 스케줄러 시간대
  },
  "playwright": {
    "headless": false, // true: 백그라운드 실행, false: 브라우저 창 표시
    "locale": "ko-KR" // Playwright 브라우저 컨텍스트 로케일
  },
  "appSettings": {
    "testMode": false, // true: 실제 버튼 클릭 없이 로그만 기록, false: 실제 동작 수행
    "messageLanguage": "en" // 애플리케이션 메시지 언어 ("en" 또는 "ko")
  },
  "calendar": {
    "holidayCalendarUrl": "https://calendar.google.com/calendar/ical/ko.south_korea%23holiday%40group.v.calendar.google.com/public/basic.ics",
    // 연차 캘린더 URL은 .env 파일의 ANNUAL_LEAVE_CALENDAR_URL 환경 변수에서 읽어옵니다.
    "annualLeaveKeyword": "연차" // 연차 판단을 위한 키워드 (ICS 파일 내 이벤트 요약에 포함될 문자열)
  },
  "telegram": {
    // 텔레그램 봇 토큰 및 채팅 ID는 환경 변수(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID)를 통해 설정됩니다.
    // 해당 환경 변수가 없으면 텔레그램 알림은 비활성화됩니다.
  }
}
```

**참고: `.env` 파일 예시 (`.env`라는 이름으로 프로젝트 루트에 생성)**

```env
JOBCAN_EMAIL="your_email@example.com"
JOBCAN_PASSWORD="your_actual_password"

# Optional: Telegram Notifications
TELEGRAM_BOT_TOKEN="your_telegram_bot_token"
TELEGRAM_CHAT_ID="your_telegram_chat_id"

# Optional: Annual Leave Calendar (ICS format)
# If this URL is not provided, annual leave checking will be skipped.
ANNUAL_LEAVE_CALENDAR_URL="your_annual_leave_calendar_ics_url"
```

`.env` 파일은 민감한 정보를 포함하므로 `.gitignore`에 추가하여 버전 관리에서 제외해야 합니다.

## 7. 작업 목록

- [x] Node.js 프로젝트 초기화 (`npm init -y`)
- [x] Playwright, dotenv, node-cron, ical.js, node-telegram-bot-api 설치
- [x] `.gitignore` 파일 생성 (node_modules, .env 등 제외)
- [x] `config.json` 기본 설정 파일 생성
- [x] `src/jobcan.js` 모듈 생성
  - [x] 설정 로드 (`getConfig`)
  - [x] 브라우저 실행 및 로그인 페이지 이동 (`launchBrowserAndLoginPage`)
    - [x] `.env` 파일에서 로그인 정보 로드
    - [x] 자동 로그인 시도
    - [x] 수동 로그인 지원 (로그인 정보 없을 시)
    - [x] 출퇴근 페이지 이동 확인
    - [x] Playwright `locale` 설정 (`ko-KR`)
  - [x] 출퇴근 버튼 클릭 (`clickAttendanceButton`)
  - [x] 현재 근무 상태 확인 (`getWorkingStatus`)
  - [x] 출근 처리 (`checkIn`)
  - [x] 퇴근 처리 (`checkOut`)
  - [x] 메시지 현지화 (`getMessage`)
    - [x] 로그 메시지 이모지 문자열로 대체 (`[SUCCESS]`, `[INFO]` 등)
  - [x] `ANNUAL_LEAVE_CALENDAR_URL` 환경 변수에서 연차 캘린더 URL 로드
- [x] `src/notificationService.js` 모듈 생성
  - [x] 텔레그램 알림 초기화 (`initializeNotificationService`)
    - [x] `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` 환경 변수 하드코딩 사용
    - [x] 환경 변수 누락 시 경고/정보 로그 및 알림 비활성화
  - [x] 텔레그램 알림 전송 (`sendNotification`)
- [x] `src/calendarService.js` 모듈 생성
  - [x] 공휴일 확인 (`isTodayPublicHoliday`)
  - [x] 연차 확인 (`isTodayAnnualLeave`)
    - [x] `config.calendar.annualLeaveCalendarUrl` (환경 변수에서 로드) 사용
    - [x] `config.calendar.annualLeaveKeyword` 사용
  - [x] 연차/공휴일 종합 확인 (`checkIfTodayIsOffDay`)
    - [x] 연차 우선 확인
- [x] `src/scheduler.js` 모듈 생성
  - [x] 스케줄 초기화 및 작업 등록 (`initializeScheduler`)
    - [x] `config.json`의 `workHours` (출퇴근 시간) 및 `scheduler.delayInMinutes` (지연 시간) 기반 동적 cron 표현식 생성
    - [x] `workHours.weekdaysOnly` 설정에 따른 주중 실행 제어
    - [x] `calendarService.checkIfTodayIsOffDay`를 사용하여 공휴일/연차 시 작업 건너뛰기
- [x] `src/main.js` 메인 스크립트 생성
  - [x] `checkIn` 또는 `checkOut` 실행 로직
  - [x] 스케줄러 실행 로직
- [x] `Dockerfile` 및 `.dockerignore` 파일 생성
- [x] GitHub Actions 워크플로 생성 (`.github/workflows/docker-publish.yml`)
  - [x] `main` 브랜치 푸시 시 빌드 및 GHCR에 Docker 이미지 게시
  - [x] 이미지 태그는 `latest`로만 지정
  - [x] 태그 없는 이전 이미지 자동 삭제 ( `actions/delete-package-versions@v5` 사용)
- [x] Kubernetes 배포를 위한 YAML 파일 생성 (`kubernetes/deployment.yaml`)
  - [ ] `ConfigMap` 및 `Secret` 정의 (사용자 수동 작업 필요)
- [x] `node_modules` Git 히스토리에서 제거
- [x] `project.md` 업데이트 (개발 가이드라인, 설정 정보, 작업 목록 등)
  - [x] `config.json`의 `telegram.messageLanguage`를 `appSettings.messageLanguage`로 이동
  - [x] `config.json`의 `telegram.botTokenEnvVar`, `telegram.chatIdEnvVar` 제거 명시
  - [x] `config.json`의 `calendar.annualLeaveCalendarUrl` 제거 및 환경 변수 사용 명시
  - [x] `.env` 파일 예시에 `ANNUAL_LEAVE_CALENDAR_URL` 추가
- [ ] 최종 테스트 및 버그 수정
- [ ] 사용자 문서화 (README.md 또는 `project.md` 내 상세화)

## 8. 실행 방법

1. **저장소 복제**

   ```bash
   git clone https://github.com/itswryu/jobcan-mate.git
   cd jobcan-mate
   ```

2. **의존성 설치**

   ```bash
   npm install
   ```

3. **환경 변수 설정**

   프로젝트 루트에 `.env` 파일을 생성하고 위 `6. 설정` 섹션의 예시를 참고하여 내용을 채웁니다.

4. **설정 파일 검토**

   `config.json` 파일의 내용을 필요에 따라 수정합니다. (특히 `workHours`, `scheduler`, `playwright.headless`, `appSettings.testMode`)

5. **수동 실행 (출근 또는 퇴근)**

   ```bash
   node src/main.js checkin
   # 또는
   node src/main.js checkout
   ```

6. **스케줄러 실행 (자동 출퇴근)**

   ```bash
   node src/main.js schedule
   ```

   스케줄러를 백그라운드에서 안정적으로 실행하려면 `pm2`와 같은 프로세스 매니저 사용을 권장합니다.

   ```bash
   npm install pm2 -g
   pm2 start src/main.js --name jobcan-scheduler -- run schedule
   ```

## 9. Docker를 이용한 실행

1. **Docker 이미지 빌드**

   ```bash
   docker build -t jobcan-mate .
   ```

2. **Docker 컨테이너 실행 (스케줄러 모드)**

   `.env` 파일의 내용을 환경 변수로 전달해야 합니다.

   ```bash
   docker run -d --env-file .env --name jobcan-app jobcan-mate
   ```

   (Dockerfile의 `CMD`가 `node src/main.js schedule`을 실행하도록 설정되어 있어야 합니다.)

## 10. Kubernetes 배포

`kubernetes/deployment.yaml` 파일은 기본적인 `Deployment` 정의를 포함하고 있습니다.
실제 배포 시에는 다음 사항들을 고려하여 수정해야 합니다:

- **이미지 경로**: `spec.template.spec.containers[0].image`를 GHCR에 푸시된 실제 이미지 경로로 변경해야 합니다 (예: `ghcr.io/itswryu/jobcan-mate:latest`).
- **환경 변수**: Jobcan 로그인 정보, Telegram 토큰/ID, 연차 캘린더 URL 등 민감한 정보는 Kubernetes `Secret`을 통해 주입해야 합니다. `deployment.yaml`의 `env` 섹션을 `valueFrom.secretKeyRef`를 사용하도록 수정합니다.
- **ConfigMap**: `config.json`의 내용 중 환경에 따라 변경될 수 있는 부분(예: `holidayCalendarUrl`, `playwright.headless`, `appSettings.testMode` 등)은 `ConfigMap`으로 분리하여 관리하는 것이 좋습니다. `deployment.yaml`에 `ConfigMap`을 볼륨으로 마운트하고, 애플리케이션이 해당 경로에서 설정을 읽도록 수정해야 합니다. (현재는 `config.json`을 이미지에 포함하고 있음)
- **리소스 요청 및 제한**: `spec.template.spec.containers[0].resources`에 적절한 CPU 및 메모리 요청/제한을 설정합니다.
- **프로브(Probes)**: `livenessProbe` 및 `readinessProbe`를 설정하여 컨테이너의 상태를 Kubernetes가 관리할 수 있도록 합니다.
- **재시작 정책(Restart Policy)**: `spec.template.spec.restartPolicy`를 필요에 맞게 설정합니다 (기본값: `Always`).

**예시 `Secret` 생성 (kubectl 사용):**

```bash
kubectl create secret generic jobcan-secrets \
  --from-literal=JOBCAN_EMAIL='your_email@example.com' \
  --from-literal=JOBCAN_PASSWORD='your_actual_password' \
  --from-literal=TELEGRAM_BOT_TOKEN='your_telegram_bot_token' \
  --from-literal=TELEGRAM_CHAT_ID='your_telegram_chat_id' \
  --from-literal=ANNUAL_LEAVE_CALENDAR_URL='your_annual_leave_calendar_ics_url'
```

**예시 `ConfigMap` 생성 (kubectl 사용):**

로컬에 `jobcan-configmap-data.json` 파일을 생성합니다 (필요한 설정만 포함):

```json
{
  "playwright": {
    "headless": true
  },
  "appSettings": {
    "testMode": false,
    "messageLanguage": "ko"
  },
  "calendar": {
    "holidayCalendarUrl": "https://calendar.google.com/calendar/ical/ko.south_korea%23holiday%40group.v.calendar.google.com/public/basic.ics",
    "annualLeaveKeyword": "연차"
  }
}
```

```bash
kubectl create configmap jobcan-config --from-file=config.json=./jobcan-configmap-data.json
```

이후 `deployment.yaml`에서 이 `Secret`과 `ConfigMap`을 참조하도록 수정합니다.

## 11. 커밋 및 푸시

모든 변경 사항을 커밋하고 원격 저장소에 푸시합니다.

```bash
git add .
git commit -m "feat: Load annual leave calendar URL from env and update project docs"
git push
```
