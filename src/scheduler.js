const cron = require('node-cron');
const { exec } = require('child_process');
const path = require('path');
// getConfig은 notificationService를 초기화하므로, sendNotification을 여기서 바로 사용할 수 있습니다.
const { getConfig } = require('./jobcan');
const { isTodayHoliday } = require('./calendarService');
const { sendNotification, initializeNotificationService } = require('./notificationService'); // sendNotification 추가

const mainScriptPath = path.join(__dirname, 'main.js');

// 스케줄러 시작 시점에 config를 로드하고 notificationService를 초기화합니다.
// 이렇게 하면 runJob이나 cron 작업 콜백에서 별도로 getConfig을 호출할 필요가 줄어듭니다.
let appConfig = null;

async function runJob(action) {
  console.log(`[${new Date().toISOString()}] Running ${action} job...`);
  exec(`node ${mainScriptPath} ${action}`, async (error, stdout, stderr) => { // async 추가
    if (error) {
      const errorMessage = `스케줄된 ${action} 작업 실행 중 오류 발생: ${error.message}`;
      console.error(`[${new Date().toISOString()}] ${errorMessage}`);
      await sendNotification(`[오류] ${errorMessage}`, true);
      return;
    }
    if (stderr) {
      const stderrMessage = `스케줄된 ${action} 작업 실행 중 표준 오류 발생: ${stderr}`;
      console.error(`[${new Date().toISOString()}] ${stderrMessage}`);
      // stderr은 오류일 수도 있고, 단순 경고나 정보성 메시지일 수도 있으므로, 필요에 따라 알림 처리
      await sendNotification(`[경고] ${stderrMessage}`, true);
    }
    console.log(`[${new Date().toISOString()}] Stdout for ${action} job:`, stdout);
    console.log(`[${new Date().toISOString()}] ${action} job finished.`);
    // 성공 알림은 main.js 내부의 checkIn/checkOut에서 이미 처리되므로 여기서는 중복 알림 X
  });
}

async function startScheduler() {
  try {
    appConfig = await getConfig(); // Load config and initialize notificationService via getConfig

    const { scheduler, workHours, calendar } = appConfig;

    if (!scheduler?.enabled) { // 옵셔널 체이닝 적용
      console.log('Scheduler is disabled in config.json.');
      return;
    }

    const { checkInCron, checkOutCron, timezone } = scheduler;

    if (!cron.validate(checkInCron)) {
      const message = `잘못된 출근 크론 표현식: ${checkInCron}`;
      console.error(message);
      await sendNotification(`[오류] ${message}`, true);
      return;
    }
    if (!cron.validate(checkOutCron)) {
      const message = `잘못된 퇴근 크론 표현식: ${checkOutCron}`;
      console.error(message);
      await sendNotification(`[오류] ${message}`, true);
      return;
    }

    const schedulerInitMessage = `스케줄러가 시작되었습니다. 타임존: ${timezone || '시스템 기본값'}`;
    console.log(schedulerInitMessage);
    // 스케줄러 시작 알림은 로그로 충분하다고 판단하여 제거

    cron.schedule(checkInCron, async () => {
      const today = new Date();
      const dateString = today.toISOString();
      console.log(`[${dateString}] 출근 작업 실행 예정 (스케줄: ${checkInCron})`);

      if (workHours?.weekdaysOnly && (today.getDay() === 0 || today.getDay() === 6)) { // 옵셔널 체이닝 적용
        const message = `오늘은 주말입니다. 출근 작업을 건너<0xEB><0><0x8E>니다.`;
        console.log(`[${dateString}] ${message}`);
        // 주말 건너뛰기 알림은 로그로 충분하다고 판단하여 제거
        return;
      }
      const holidayInfo = await isTodayHoliday(calendar?.holidayCalendarUrl); // 옵셔널 체이닝 적용
      if (holidayInfo) {
        const message = `오늘은 공휴일 (${holidayInfo}) 입니다. 출근 작업을 건너<0xEB><0><0x8E>니다.`;
        console.log(`[${dateString}] ${message}`);
        // 공휴일 건너뛰기 알림은 로그로 충분하다고 판단하여 제거
        return;
      }
      runJob('checkIn');
    }, {
      timezone: timezone
    });
    console.log(`출근 작업이 크론으로 스케줄되었습니다: ${checkInCron}`);

    cron.schedule(checkOutCron, async () => {
      const today = new Date();
      const dateString = today.toISOString();
      console.log(`[${dateString}] 퇴근 작업 실행 예정 (스케줄: ${checkOutCron})`);

      if (workHours?.weekdaysOnly && (today.getDay() === 0 || today.getDay() === 6)) { // 옵셔널 체이닝 적용
        const message = `오늘은 주말입니다. 퇴근 작업을 건너<0xEB><0><0x8E>니다.`;
        console.log(`[${dateString}] ${message}`);
        // 주말 건너뛰기 알림은 로그로 충분하다고 판단하여 제거
        return;
      }
      const holidayInfo = await isTodayHoliday(calendar?.holidayCalendarUrl); // 옵셔널 체이닝 적용
      if (holidayInfo) {
        const message = `오늘은 공휴일 (${holidayInfo}) 입니다. 퇴근 작업을 건너<0xEB><0><0x8E>니다.`;
        console.log(`[${dateString}] ${message}`);
        // 공휴일 건너뛰기 알림은 로그로 충분하다고 판단하여 제거
        return;
      }
      runJob('checkOut');
    }, {
      timezone: timezone
    });
    console.log(`퇴근 작업이 크론으로 스케줄되었습니다: ${checkOutCron}`);

  } catch (error) {
    const errorMessage = `스케줄러 시작 중 오류 발생: ${error.message}`;
    console.error(errorMessage);
    // getConfig() 실패 시 appConfig가 null일 수 있고, notificationService 초기화도 안됐을 수 있음.
    // 이 경우 sendNotification은 내부적으로 경고를 로깅하고 알림을 보내지 않음.
    await sendNotification(`[CRITICAL] ${errorMessage}`, true);
  }
}

startScheduler();
