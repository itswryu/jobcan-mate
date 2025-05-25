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

## GitHub Actions 워크플로우

이 프로젝트는 GitHub Actions를 사용하여 CI/CD 파이프라인을 자동화합니다. 워크플로우는 다음 작업을 수행합니다:

* **트리거**: `main` 브랜치에 코드가 푸시될 때 자동으로 실행됩니다. 수동으로 워크플로우를 실행할 수도 있습니다.
* **멀티 아키텍처 Docker 이미지 빌드**: `linux/amd64` 및 `linux/arm64` 아키텍처를 모두 지원하는 Docker 이미지를 빌드합니다.
* **GHCR (GitHub Container Registry) 푸시**: 빌드된 이미지를 GitHub Container Registry에 `ghcr.io/<소유자>/jobcan-mate:latest` 태그로 푸시합니다. (현재 워크플로우는 `itswryu` 소유자를 기준으로 설정되어 있습니다. 실제 사용 시 `<소유자>` 부분을 자신의 GitHub 사용자명 또는 조직명으로 변경해야 합니다.)
* **이미지 메타데이터**: 이미지에는 OCI 표준 레이블을 사용하여 소스, 버전, 설명 등의 메타데이터가 포함됩니다.
* **이전 버전 정리**: `latest` 태그가 지정되지 않은 이전 버전의 컨테이너 이미지는 자동으로 삭제되어 GHCR 저장 공간을 효율적으로 관리합니다.

### GHCR에서 이미지 사용하기

빌드된 Docker 이미지는 다음 명령어를 사용하여 가져올 수 있습니다:

```bash
docker pull ghcr.io/itswryu/jobcan-mate:latest
```

(실제 사용 시 `itswryu` 부분을 자신의 GitHub 사용자명 또는 조직명으로 변경해야 합니다.)

## 문제 해결 (Troubleshooting)

다음은 Jobcan Mate 사용 중 발생할 수 있는 일반적인 문제와 해결 방법입니다.

* **Jobcan 사이트 변경으로 인한 오류**:
  * **증상**: "로그인 버튼을 찾을 수 없습니다", "출근/퇴근 버튼을 찾을 수 없습니다" 등의 오류 메시지와 함께 프로그램이 비정상 종료됩니다.
  * **원인**: Jobcan 웹사이트의 HTML 구조가 변경되어 `config.json`에 정의된 XPath 선택자가 더 이상 유효하지 않을 수 있습니다.
  * **해결 방법**:
    1. 브라우저 개발자 도구를 사용하여 변경된 요소의 정확한 XPath를 확인합니다.
    2. `config.json` 파일의 `jobcan.loginCredentials` 및 `jobcan.attendanceButtonXPath`, `jobcan.workingStatusXPath` 등의 값을 새 XPath로 업데이트합니다.

* **환경 변수 설정 오류**:
  * **증상**: "Jobcan 이메일/비밀번호가 설정되지 않았습니다", "Telegram 봇 토큰/채팅 ID가 설정되지 않았습니다" 등의 오류 메시지가 표시됩니다.
  * **원인**: `.env` 파일이 없거나, 필요한 환경 변수가 누락되었거나, 잘못된 값이 설정되었습니다.
  * **해결 방법**:
    1. 프로젝트 루트에 `.env` 파일이 있는지 확인합니다. 없다면 `.env.sample` 파일을 복사하여 생성합니다.
    2. `.env` 파일에 `JOBCAN_EMAIL`, `JOBCAN_PASSWORD` (필수) 및 `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (Telegram 알림 사용 시) 등의 변수가 올바르게 설정되었는지 확인합니다.

* **캘린더 연동 문제 (공휴일/연차)**:
  * **증상**: 공휴일 또는 연차임에도 불구하고 출퇴근 기록이 시도되거나, 반대로 정상 근무일임에도 건너뜁니다.
  * **원인**:
    * `config.json`의 `calendar.holidayCalendarUrl` (공휴일 ICS) 또는 `.env`의 `ANNUAL_LEAVE_CALENDAR_URL` (개인 연차 ICS) 주소가 잘못되었거나 접근할 수 없습니다.
    * 개인 캘린더의 연차 이벤트 이름이 `config.json`의 `calendar.annualLeaveKeyword`와 일치하지 않습니다.
  * **해결 방법**:
    1. ICS URL이 올바른지, 공개적으로 접근 가능한지 확인합니다.
    2. 개인 캘린더에 등록된 연차 이벤트의 제목이 `annualLeaveKeyword`와 정확히 일치하는지 확인합니다. (예: "연차", "Annual Leave")

* **Kubernetes 배포 문제**:
  * **증상**: Pod가 정상적으로 실행되지 않거나, 로그에 오류가 표시됩니다.
  * **원인**: `Secret` 또는 `ConfigMap` 설정 오류, 이미지 경로 오류, 리소스 부족 등 다양합니다.
  * **해결 방법**:
    1. `kubectl describe pod <pod-name> -n <namespace>` 명령으로 Pod의 상태와 이벤트를 확인합니다.
    2. `kubectl logs <pod-name> -n <namespace>` 명령으로 컨테이너 로그를 확인하여 구체적인 오류 메시지를 파악합니다.
    3. `jobcan-mate-secret`이 올바르게 생성되었고, `deployment.yaml`에서 참조하는 이미지 경로가 정확한지 확인합니다.
    4. `jobcan-mate-config` (`ConfigMap`)의 내용이 로컬 `config.json`과 동기화되어 있는지 확인합니다.

* **로그 확인**:
  * **로컬 실행 시**: 콘솔에 직접 로그가 출력됩니다.
  * **Docker 실행 시**: `docker logs <container-name>` 명령으로 컨테이너 로그를 확인할 수 있습니다.
  * **Kubernetes 실행 시**: `kubectl logs <pod-name> -n <namespace>` 명령으로 컨테이너 로그를 확인할 수 있습니다.
  * `config.json`의 `appSettings.testMode`를 `true`로 설정하면 실제 웹 자동화 동작 없이 상세한 로그만 기록하여 디버깅에 도움이 될 수 있습니다.

문제가 지속되거나 여기에 언급되지 않은 다른 문제가 발생하면, GitHub 이슈를 통해 문의해주세요.

## 라이선스

MIT License
