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
│   └── scheduler.js        # 자동 실행 스케줄러
├── config.json             # 설정 파일 (근무시간, URL 등)
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
    "checkOutCron": "0 17 * * 1-5"
  },
  "playwright": {
    "headless": false
  },
  "appSettings": {
    "testMode": false
  }
}
```

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

-   **최초 실행 시**: `npm install`
-   **수동 실행**: `node src/main.js --action checkIn` 또는 `node src/main.js --action checkOut`
-   **자동 실행**: (스케줄러 설정에 따라 자동으로 실행됨)

## 8. 작업 관리

- [X] `project.md` 기본 구조 작성
- [ ] Playwright 및 필요 라이브러리 설치 (`npm install playwright node-cron`)
- [ ] `config.json` 설정 파일 구조 정의 및 초기값 작성
- [ ] Playwright 브라우저 실행 및 로그인 페이지 이동 기능 구현
- [ ] 사용자가 로그인할 때까지 대기하는 로직 구현
- [ ] `config.json`에서 설정값(근무 시간, URL, XPath, 모드 등)을 읽어오는 기능 구현
- [ ] 현재 시간 및 설정된 근무 요일/시간을 비교하는 로직 구현
- [ ] 출퇴근 페이지(`https://ssl.jobcan.jp/employee`)로 이동하는 기능 구현
- [ ] 근무 상태('미출근', '근무중', '휴식중' 등)를 확인하는 로직 구현 (`jobcan.js`)
- [ ] 출근 버튼 클릭 로직 구현 (`jobcan.js`):
  - [ ] `appSettings.testMode` 확인
  - [ ] 현재 상태 '미출근' 확인
  - [ ] 버튼 클릭 (테스트 모드가 아닐 경우)
  - [ ] 클릭 후 상태 '근무중' 확인
- [ ] 퇴근 버튼 클릭 로직 구현 (`jobcan.js`):
  - [ ] `appSettings.testMode` 확인
  - [ ] 현재 상태 '근무중' 확인
  - [ ] 버튼 클릭 (테스트 모드가 아닐 경우)
  - [ ] 클릭 후 상태 '휴식중' 확인
- [ ] `node-cron`을 사용한 스케줄링 기능 구현 (설정 파일의 cron 표현식 기반) (`scheduler.js`)
- [ ] 헤드리스/포그라운드 실행 모드 전환 기능 구현
- [ ] 간단한 로그 기록 기능 구현 (콘솔 또는 파일)
- [ ] README.md (또는 `project.md`에 통합)에 사용 방법 상세 기술
