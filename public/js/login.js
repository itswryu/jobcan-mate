document.addEventListener('DOMContentLoaded', () => {
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const langKoBtn = document.getElementById('langKoBtn');
    const langEnBtn = document.getElementById('langEnBtn');

    const translations = {
        ko: {
            pageTitle: "로그인 - Jobcan Mate",
            headerTitle: "Jobcan Mate",
            loginHeading: "로그인",
            loginDescription: "Jobcan 자동 출퇴근 서비스를 이용하려면 Google 계정으로 로그인하세요.",
            googleLoginBtnText: "Google 계정으로 로그인",
            adminLoginPrompt: "관리자이신가요?",
            adminLoginLinkText: "관리자 로그인"
        },
        en: {
            pageTitle: "Login - Jobcan Mate",
            headerTitle: "Jobcan Mate",
            loginHeading: "Login",
            loginDescription: "Please log in with your Google account to use the Jobcan automated clock-in/out service.",
            googleLoginBtnText: "Login with Google Account",
            adminLoginPrompt: "Are you an administrator?",
            adminLoginLinkText: "Admin Login"
        }
    };

    const elementsToTranslate = {
        pageTitleElement: 'pageTitle', // Special case for document.title
        headerTitleElement: 'headerTitle',
        loginHeadingElement: 'loginHeading',
        loginDescriptionElement: 'loginDescription',
        googleLoginBtnTextElement: 'googleLoginBtnText',
        adminLoginPromptElement: 'adminLoginPrompt',
        adminLoginLinkTextElement: 'adminLoginLinkText'
    };

    function setLanguage(lang) {
        if (!translations[lang]) {
            console.warn(`Language '${lang}' not found in translations. Defaulting to 'ko'.`);
            lang = 'ko';
        }

        document.documentElement.lang = lang; // Set lang attribute on <html>

        for (const elementId in elementsToTranslate) {
            const translationKey = elementsToTranslate[elementId];
            const element = document.getElementById(elementId);
            const translation = translations[lang][translationKey];

            if (elementId === 'pageTitleElement') {
                document.title = translation;
            } else if (element) {
                element.textContent = translation;
            } else {
                console.warn(`Element with ID '${elementId}' not found for translation.`);
            }
        }
        localStorage.setItem('language', lang);
        console.log(`Language set to ${lang}`);
    }

    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', () => {
            window.location.href = '/auth/google';
        });
    }

    if (langKoBtn) {
        langKoBtn.addEventListener('click', () => setLanguage('ko'));
    }
    if (langEnBtn) {
        langEnBtn.addEventListener('click', () => setLanguage('en'));
    }

    // Initial language setup
    const savedLanguage = localStorage.getItem('language') || 'ko';
    setLanguage(savedLanguage);

    // Optional: Admin login link (already in HTML, no JS needed unless for dynamic behavior)
});
