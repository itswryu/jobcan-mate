document.addEventListener('DOMContentLoaded', () => {
    // DOM Element Selectors
    const settingsForm = document.getElementById('settingsForm');
    const logoutBtn = document.getElementById('logoutBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const notificationArea = document.getElementById('notificationArea');

    const tabLinks = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');

    const testJobcanBtn = document.getElementById('testJobcanBtn');
    const testTelegramBtn = document.getElementById('testTelegramBtn');
    // const saveSettingsBtn = document.getElementById('saveSettingsBtn'); // Already part of form submit

    let csrfToken = ''; // Global variable to store CSRF token

    // --- Utility Functions ---
    function showLoading(isLoading) {
        loadingIndicator.style.display = isLoading ? 'block' : 'none';
    }

    function showNotification(message, type = 'success') {
        notificationArea.textContent = message;
        notificationArea.className = 'notification'; // Reset classes
        notificationArea.classList.add(type); // 'success', 'error', or 'info'
        notificationArea.style.display = 'block';

        setTimeout(() => {
            notificationArea.style.display = 'none';
        }, 5000); // Hide after 5 seconds
    }

    // --- CSRF Token Handling ---
    async function initCsrfToken() {
        showLoading(true);
        try {
            const response = await fetch('/api/csrf-token');
            if (!response.ok) {
                throw new Error(`CSRF token fetch failed: ${response.statusText}`);
            }
            const data = await response.json();
            csrfToken = data.csrfToken;
            const metaCsrfTag = document.querySelector('meta[name="csrf-token"]');
            if (metaCsrfTag) {
                metaCsrfTag.setAttribute('content', csrfToken);
            } else {
                // Create and append meta tag if it doesn't exist
                const newMeta = document.createElement('meta');
                newMeta.name = 'csrf-token';
                newMeta.content = csrfToken;
                document.head.appendChild(newMeta);
            }
            console.log('CSRF token initialized:', csrfToken);
        } catch (error) {
            console.error('Error initializing CSRF token:', error);
            showNotification('CSRF 토큰 초기화 실패. 앱이 정상적으로 동작하지 않을 수 있습니다.', 'error');
            csrfToken = ''; // Ensure it's empty on failure
        } finally {
            showLoading(false);
        }
    }

    // --- Tab Navigation ---
    tabLinks.forEach(link => {
        link.addEventListener('click', () => {
            const tabId = link.getAttribute('data-tab');

            tabLinks.forEach(l => l.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            link.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // --- User Settings ---
    async function loadUserSettings() {
        if (!csrfToken) {
            showNotification('CSRF 토큰이 없어 설정을 로드할 수 없습니다.', 'error');
            return;
        }
        showLoading(true);
        console.log('Loading user settings...');
        try {
            const response = await fetch('/api/user/settings', {
                headers: { 'Accept': 'application/json' } // No CSRF for GET
            });

            if (response.status === 401 || response.status === 403) {
                showNotification('인증 실패. 로그인 페이지로 이동합니다.', 'error');
                window.location.href = '/login.html';
                return;
            }
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: '알 수 없는 오류 발생' }));
                throw new Error(`설정 로드 실패: ${errorData.message || response.statusText}`);
            }

            const settings = await response.json();
            console.log('Settings loaded:', settings);

            // Populate form fields
            document.getElementById('jobcanUsername').value = settings.jobcanUsername || '';
            document.getElementById('jobcanPassword').placeholder = settings.isJobcanPasswordSet ? "******** (변경시에만 입력)" : "Jobcan 비밀번호";
            document.getElementById('jobcanClerkCode').value = settings.jobcanClerkCode || '';
            
            document.getElementById('telegramChatId').value = settings.telegramChatId || '';
            document.getElementById('telegramBotToken').placeholder = settings.isTelegramBotTokenSet ? "******** (변경시에만 입력)" : "Telegram Bot Token";

            document.getElementById('workStartTime').value = settings.workStartTime || '';
            document.getElementById('workEndTime').value = settings.workEndTime || '';
            document.getElementById('checkinDelayMinutes').value = settings.checkinDelayMinutes || '';
            document.getElementById('checkoutDelayMinutes').value = settings.checkoutDelayMinutes || '';
            
            document.getElementById('calendarUrl').value = settings.calendarUrl || '';
            document.getElementById('isCalendarEnabled').checked = settings.isCalendarEnabled || false;
            
            document.getElementById('isTestMode').checked = settings.isTestMode || false;
            document.getElementById('isNotificationsEnabled').checked = settings.isNotificationsEnabled || false;
            document.getElementById('isAutoScheduleEnabled').checked = settings.isAutoScheduleEnabled || false;
            document.getElementById('timezone').value = settings.timezone || 'Asia/Seoul';

            showNotification('설정을 성공적으로 로드했습니다.', 'success');

        } catch (error) {
            console.error('Error loading user settings:', error);
            showNotification(`설정 로드 중 오류: ${error.message}`, 'error');
        } finally {
            showLoading(false);
        }
    }

    // --- Input Validation ---
    function validateSettingsForm() {
        let errors = [];
        const workStartTimeInput = document.getElementById('workStartTime');
        const workEndTimeInput = document.getElementById('workEndTime');
        const calendarUrlInput = document.getElementById('calendarUrl');
        const telegramChatIdInput = document.getElementById('telegramChatId');

        // Clear previous validation styles
        [workStartTimeInput, workEndTimeInput, calendarUrlInput, telegramChatIdInput].forEach(el => el.classList.remove('invalid'));

        // Time validation (HTML5 type="time" handles format, but check if value exists if auto-schedule is on)
        // This is a basic check; more complex logic might be needed based on dependencies (e.g., if auto-schedule is enabled)
        if (document.getElementById('isAutoScheduleEnabled').checked) {
            if (!workStartTimeInput.value) errors.push("자동 출퇴근이 활성화된 경우 출근 시간을 설정해야 합니다.");
            if (!workEndTimeInput.value) errors.push("자동 출퇴근이 활성화된 경우 퇴근 시간을 설정해야 합니다.");
        }
        
        // Calendar URL validation
        if (calendarUrlInput.value && !calendarUrlInput.value.match(/^https?:\/\/.+/)) {
            errors.push("유효한 캘린더 URL을 입력하세요 (http:// 또는 https:// 로 시작).");
            calendarUrlInput.classList.add('invalid');
        }

        // Telegram Chat ID validation
        if (telegramChatIdInput.value && !telegramChatIdInput.value.match(/^\d+$/)) {
            errors.push("Telegram Chat ID는 숫자여야 합니다.");
            telegramChatIdInput.classList.add('invalid');
        }
        
        // Jobcan Username (Email format) - Basic check
        const jobcanUsernameInput = document.getElementById('jobcanUsername');
        if (jobcanUsernameInput.value && !jobcanUsernameInput.value.includes('@')) {
            errors.push("Jobcan 아이디는 유효한 이메일 주소여야 합니다.");
            jobcanUsernameInput.classList.add('invalid');
        }


        if (errors.length > 0) {
            showNotification(errors.join('\n'), 'error');
            return false;
        }
        return true;
    }


    // --- Event Listeners ---
    if (settingsForm) {
        settingsForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!csrfToken) {
                showNotification('CSRF 토큰이 없습니다. 작업을 계속할 수 없습니다.', 'error');
                return;
            }
            if (!validateSettingsForm()) { // Call validation function
                return;
            }

            showLoading(true);
            console.log('Saving settings...');

            const formData = new FormData(settingsForm);
            const settingsData = {};
            formData.forEach((value, key) => {
                 // Handle checkboxes specifically
                const checkbox = document.querySelector(`input[name="${key}"][type="checkbox"]`);
                if (checkbox) {
                    settingsData[key] = checkbox.checked;
                } else {
                    settingsData[key] = value;
                }
            });
            
            // Handle password fields: only send if a value is typed. Otherwise send null to clear, or nothing.
            const jobcanPasswordInput = document.getElementById('jobcanPassword');
            if (jobcanPasswordInput.value) {
                settingsData.jobcanPassword = jobcanPasswordInput.value;
            } else {
                // If the field is empty, we don't want to send an empty string unless it's explicitly meant to clear.
                // The backend API controller logic for saveUserSettings needs to handle this.
                // For now, if empty, don't send it, meaning "no change". If user wants to clear, they should make it null via UI.
                // Or, as per current design, if it's empty string, backend should treat it as "no change".
                // To explicitly clear, we'd need a different UI mechanism or send `null`.
                // For this implementation, if it's empty, it won't be included in settingsData if not in FormData initially.
                // Let's ensure it's explicitly not sent if empty:
                if (!jobcanPasswordInput.value) delete settingsData.jobcanPassword;
            }

            const telegramBotTokenInput = document.getElementById('telegramBotToken');
            if (telegramBotTokenInput.value) {
                settingsData.telegramBotToken = telegramBotTokenInput.value;
            } else {
                 if (!telegramBotTokenInput.value) delete settingsData.telegramBotToken;
            }
            
            console.log('Form Data to be sent:', settingsData);

            try {
                const response = await fetch('/api/user/settings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': csrfToken
                    },
                    body: JSON.stringify(settingsData)
                });

                if (response.status === 401 || response.status === 403) {
                    showNotification('인증 실패. 로그인 페이지로 이동합니다.', 'error');
                    window.location.href = '/login.html';
                    return;
                }

                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.error?.message || `저장 실패: ${response.statusText}`);
                }
                showNotification('설정이 성공적으로 저장되었습니다.', 'success');
                // Clear password fields after successful save
                if (jobcanPasswordInput.value) jobcanPasswordInput.value = '';
                if (telegramBotTokenInput.value) telegramBotTokenInput.value = '';
                // Reload settings to reflect placeholder changes for passwords
                await loadUserSettings(); 
            } catch (error) {
                console.error('Error saving settings:', error);
                showNotification(`설정 저장 중 오류: ${error.message}`, 'error');
            } finally {
                showLoading(false);
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            if (!csrfToken) {
                showNotification('CSRF 토큰이 없습니다. 로그아웃을 진행할 수 없습니다.', 'error');
                return;
            }
            showLoading(true);
            console.log('Logging out...');
            try {
                const response = await fetch('/auth/logout', {
                    method: 'POST',
                    headers: { 'X-CSRF-Token': csrfToken }
                });
                if (response.ok) {
                    showNotification('로그아웃 되었습니다. 로그인 페이지로 이동합니다.', 'success');
                    window.location.href = '/login.html';
                } else {
                    const errorData = await response.json().catch(() => ({ message: '로그아웃 중 알 수 없는 오류 발생' }));
                    showNotification(`로그아웃 실패: ${errorData.message || response.statusText}`, 'error');
                }
            } catch (error) {
                console.error('Logout error:', error);
                showNotification(`로그아웃 중 오류: ${error.message}`, 'error');
            } finally {
                showLoading(false);
            }
        });
    }

    async function handleTestConnection(url, payload, buttonElement) {
        if (!csrfToken) {
            showNotification('CSRF 토큰이 없습니다. 테스트를 진행할 수 없습니다.', 'error');
            return;
        }
        showLoading(true);
        const originalButtonText = buttonElement.textContent;
        buttonElement.textContent = '테스트 중...';
        buttonElement.disabled = true;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken
                },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error?.message || `테스트 실패: ${response.statusText}`);
            }
            showNotification(result.message || '테스트 성공!', 'success');
        } catch (error) {
            console.error(`Error testing ${url}:`, error);
            showNotification(`테스트 중 오류: ${error.message}`, 'error');
        } finally {
            showLoading(false);
            buttonElement.textContent = originalButtonText;
            buttonElement.disabled = false;
        }
    }

    if (testJobcanBtn) {
        testJobcanBtn.addEventListener('click', () => {
            const jobcanUsername = document.getElementById('jobcanUsername').value;
            const jobcanPassword = document.getElementById('jobcanPassword').value;
             if (!jobcanUsername || !jobcanPassword) {
                showNotification('Jobcan 아이디와 비밀번호를 모두 입력해주세요.', 'error');
                return;
            }
            handleTestConnection('/api/test/jobcan', { jobcanUsername, jobcanPassword }, testJobcanBtn);
        });
    }

    if (testTelegramBtn) {
        testTelegramBtn.addEventListener('click', () => {
            const telegramChatId = document.getElementById('telegramChatId').value;
            const telegramBotToken = document.getElementById('telegramBotToken').value;
            if (!telegramChatId || !telegramBotToken) {
                showNotification('Telegram Chat ID와 Bot Token을 모두 입력해주세요.', 'error');
                return;
            }
            handleTestConnection('/api/test/telegram', { telegramChatId, telegramBotToken }, testTelegramBtn);
        });
    }

    // --- Initial Page Load ---
    async function initializePage() {
        await initCsrfToken(); // Ensure CSRF token is fetched first
        if (csrfToken) { // Only load settings if CSRF token was successfully obtained
            await loadUserSettings();
        } else {
            showNotification('초기화 실패: CSRF 토큰을 가져올 수 없어 설정을 로드할 수 없습니다. 페이지를 새로고침하거나 다시 로그인해주세요.', 'error');
        }
        // Other initial setups can go here
    }

    initializePage();
});
