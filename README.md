# Jobcan Mate: Jobcan 출퇴근 자동화

Jobcan 출퇴근 기록을 자동화하는 Node.js 기반 애플리케이션입니다. Playwright를 사용하여 웹 브라우저를 제어하고, 설정된 스케줄에 따라 자동으로 출퇴근을 기록합니다. 공휴일 및 개인 연차를 감지하여 불필요한 실행을 방지하며, Telegram을 통해 실행 결과를 알림 받을 수 있습니다.

## 주요 기능

*   **자동 출퇴근 스케줄링**: 지정된 시간에 자동으로 출근 및 퇴근을 기록합니다. (지연 시간 설정 가능)
*   **공휴일 및 연차 자동 감지**: 대한민국의 공휴일 및 개인 Google Calendar에 등록된 연차를 확인하여 해당 날짜에는 작업을 건너뜁니다.
*   **안정적인 웹 자동화**: Playwright를 사용하여 Jobcan 사이트와 안정적으로 상호작용합니다.
*   **Telegram 알림**: 출퇴근 기록 성공, 실패, 또는 스케줄 건너뛰기 등의 상황을 Telegram 봇을 통해 알림 받습니다.
*   **다양한 실행 모드**:
    *   헤드리스(백그라운드) 모드 또는 브라우저 창을 표시하는 포그라운드 모드 선택 가능.
    *   실제 버튼 클릭 없이 로그만 기록하는 테스트 모드 지원.
*   **유연한 설정**: `config.json` (일반 설정) 및 `.env` (민감 정보) 파일을 통해 세부 동작을 쉽게 설정할 수 있습니다.
*   **간편한 배포**: Docker를 사용하여 애플리케이션을 컨테이너화하고 쉽게 배포할 수 있습니다.
*   **Kubernetes 지원**: 제공된 `deployment.yaml` 파일을 통해 Kubernetes 환경에 배포할 수 있습니다.

## 기술 스택

*   **언어/런타임**: Node.js
*   **웹 자동화**: Playwright
*   **스케줄링**: node-cron
*   **캘린더 파싱**: ical.js
*   **Telegram API**: node-telegram-bot-api
*   **환경 설정**: dotenv
*   **컨테이너화**: Docker
*   **오케스트레이션**: Kubernetes

## 프로젝트 구조

```plaintext
jobcan-auto/
├── kubernetes/
│   └── deployment.yaml     # Kubernetes 배포 매니페스트
├── src/
│   ├── main.js             # 메인 실행 스크립트
│   ├── jobcan.js           # Jobcan 관련 로직 (로그인, 출퇴근 처리, 설정 로드)
│   ├── scheduler.js        # 자동 실행 스케줄러
│   ├── calendarService.js  # Google Calendar ICS 파싱 및 공휴일/연차 확인
│   └── notificationService.js # Telegram 알림 서비스
├── .env.sample             # .env 파일 샘플
├── config.json             # 설정 파일 (근무시간, URL, ICS URL 등)
├── Dockerfile              # Docker 이미지 생성을 위한 파일
├── package.json            # 프로젝트 의존성 및 스크립트
└── README.md               # 프로젝트 설명 (현재 파일)
```

## 사전 준비 사항

*   Node.js (v18.x 이상 권장)
*   npm (Node.js 설치 시 함께 설치됨)
*   Docker (Docker로 실행 시)
*   `kubectl` (Kubernetes 배포 시)

## 설치 및 설정

1.  **저장소 복제:**
    ```bash
    git clone https://github.com/itswryu/jobcan-mate.git
    cd jobcan-mate
    ```

2.  **의존성 설치:**
    ```bash
    npm install
    ```

3.  **`.env` 파일 설정:**
    프로젝트 루트에 있는 `.env.sample` 파일을 복사하여 `.env` 파일을 생성하고, 실제 값으로 수정합니다.
    ```bash
    copy .env.sample .env
    ```
    *   **필수 값:**
        *   `JOBCAN_EMAIL`: Jobcan 로그인 이메일
        *   `JOBCAN_PASSWORD`: Jobcan 로그인 비밀번호
    *   **선택 값 (Telegram 알림 시 필요):**
        *   `TELEGRAM_BOT_TOKEN`: Telegram 봇 토큰
        *   `TELEGRAM_CHAT_ID`: 알림을 받을 Telegram 채팅 ID
    *   **선택 값 (개인 연차 확인 시 필요):**
        *   `ANNUAL_LEAVE_CALENDAR_URL`: 개인 연차 정보가 담긴 Google Calendar의 ICS 형식 공개 URL
    `.env` 파일은 민감한 정보를 포함하므로 `.gitignore`에 의해 버전 관리에서 제외됩니다.

4.  **`config.json` 검토:**
    `config.json` 파일에서 다음 항목들을 필요에 따라 수정합니다:
    *   `workHours`: 출퇴근 기준 시간 (`checkInTime`, `checkOutTime`), 주중 실행 여부 (`weekdaysOnly`)
    *   `scheduler`: 스케줄러 활성화 여부 (`enabled`), 출퇴근 시간 기준 지연 시간 (`delayInMinutes`), 시간대 (`timezone`)
    *   `playwright`: 헤드리스 모드 사용 여부 (`headless`)
    *   `appSettings`: 테스트 모드 (`testMode`), 알림/로그 메시지 언어 (`messageLanguage` - "en" 또는 "ko")
    *   `calendar`: 대한민국 공휴일 ICS URL (`holidayCalendarUrl`), 연차 판단 키워드 (`annualLeaveKeyword`)

## 실행 방법

1.  **수동 실행 (출근 또는 퇴근):**
    ```bash
    node src/main.js checkin
    ```
    ```bash
    node src/main.js checkout
    ```

2.  **스케줄러 실행 (자동 출퇴근):**
    ```bash
    node src/main.js schedule
    ```
    스케줄러를 백그라운드에서 안정적으로 실행하려면 `pm2`와 같은 프로세스 매니저 사용을 권장합니다.
    ```bash
    npm install pm2 -g
    pm2 start src/main.js --name jobcan-scheduler -- run schedule
    ```

## Docker를 이용한 실행

1.  **Docker 이미지 빌드:**
    ```bash
    docker build -t jobcan-mate .
    ```
    (원하는 이미지 이름으로 `jobcan-mate`를 변경할 수 있습니다.)

2.  **Docker 컨테이너 실행 (스케줄러 모드):**
    `.env` 파일의 내용을 환경 변수로 전달하여 실행합니다.
    ```bash
    docker run -d --env-file .env --name jobcan-app jobcan-mate
    ```
    (Dockerfile의 `CMD`는 기본적으로 `node src/main.js schedule`을 실행하도록 설정되어 있습니다.)

## Kubernetes 배포

`kubernetes/deployment.yaml` 파일을 사용하여 Kubernetes 클러스터에 배포할 수 있습니다.

1.  **`Secret` 생성:**
    먼저, 로컬의 `.env` 파일을 사용하여 Kubernetes `Secret`을 생성해야 합니다. 이 `Secret`은 컨테이너 내부에 `.env` 파일로 마운트됩니다.
    ```bash
    kubectl create secret generic jobcan-mate-secret --from-file=.env=./.env -n <your-namespace>
    ```
    (`<your-namespace>`를 실제 배포할 네임스페이스로 변경하세요. 기본값은 `default`입니다.)

2.  **이미지 경로 수정 (필요시):**
    `kubernetes/deployment.yaml` 파일 내의 `spec.template.spec.containers[0].image` 경로를 사용자가 빌드하여 GHCR 또는 다른 컨테이너 레지스트리에 푸시한 실제 이미지 경로로 수정해야 합니다. (기본값: `ghcr.io/itswryu/jobcan-mate:latest`)

3.  **배포:**
    ```bash
    kubectl apply -f kubernetes/deployment.yaml -n <your-namespace>
    ```
    `ConfigMap` (`jobcan-mate-config`)은 `config.json` 파일을 관리하며, `deployment.yaml`에 함께 정의되어 있습니다.

## 라이선스

MIT License
