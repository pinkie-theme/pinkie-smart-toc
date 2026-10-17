(function() {
    // Prevent duplicate injection
    if (document.getElementById('pinkie-toc-shadow-host')) return;

    // Translation dictionary
    const TRANSLATIONS = {
        vi: {
            title: "🌸 Pinkie Smart TOC",
            tabUser: "❓ Bạn hỏi",
            tabAI: "✨ AI trả lời",
            tabPinned: "📌 Đã ghim",
            tabHighlights: "🖍️ Highlight",
            emptyUser: "Chưa tìm thấy câu hỏi nào. Bắt đầu chat hoặc quét lại nhé! 💕",
            emptyAI: "Chưa tìm thấy câu trả lời nào. Bắt đầu chat hoặc quét lại nhé! 💕",
            emptyPinned: "Chưa có mục nào được ghim. Hãy nhấn nút 📌 trên các thẻ để lưu xem sau! 🎀",
            emptyHighlights: "Chưa có đoạn văn bản nào được lưu. Hãy bôi đen chữ trên trang và nhấn nút 🖍️ hiện lên để lưu nhé! 🌸",
            settingsTitle: "⚙️ Cài đặt Pinkie",
            settingsLang: "Ngôn ngữ:",
            settingsShortcut: "Phím tắt mở nhanh:",
            settingsShortcutDesc: "Nhấn Alt + Q để bật/tắt nhanh thanh TOC bất kỳ lúc nào!",
            closeSettings: "Đóng",
            tooltipPos: "Đổi vị trí (Trái/Phải)",
            tooltipTheme: "Đổi chế độ Sáng/Tối",
            tooltipSettings: "Cài đặt ngôn ngữ & phím tắt",
            tooltipSize: "Thu nhỏ/Mở rộng kích thước",
            searchPlaceholder: "Tìm kiếm từ khóa... 🔍🌸",
            tooltipCopy: "Sao chép",
            tooltipDelete: "Xóa",
            tooltipAddHighlight: "Lưu highlight 🖍️"
        },
        en: {
            title: "🌸 Pinkie Smart TOC",
            tabUser: "❓ Asked",
            tabAI: "✨ Answered",
            tabPinned: "📌 Pinned",
            tabHighlights: "🖍️ Highlights",
            emptyUser: "No questions found yet. Start chatting or re-scan! 💕",
            emptyAI: "No answers found yet. Start chatting or re-scan! 💕",
            emptyPinned: "No pinned items yet. Click the 📌 icon on any card to pin it! 🎀",
            emptyHighlights: "No highlights saved yet. Highlight text on the page and click the 🖍️ tooltip to save! 🌸",
            settingsTitle: "⚙️ Pinkie Settings",
            settingsLang: "Language:",
            settingsShortcut: "Quick Hotkey:",
            settingsShortcutDesc: "Press Alt + Q to quickly toggle the TOC sidebar anytime!",
            closeSettings: "Close",
            tooltipPos: "Switch Position (Left/Right)",
            tooltipTheme: "Toggle Light/Dark Theme",
            tooltipSettings: "Language & Hotkey Settings",
            tooltipSize: "Toggle Compact/Spacious Size",
            searchPlaceholder: "Search keywords... 🔍🌸",
            tooltipCopy: "Copy",
            tooltipDelete: "Delete",
            tooltipAddHighlight: "Save highlight 🖍️"
        }
    };

    function getPlatformConfig() {
        const hostname = window.location.hostname;
        if (hostname.includes('chatgpt.com') || hostname.includes('openai.com')) {
            return {
                name: 'ChatGPT',
                userSelector: '[data-message-author-role="user"]',
                aiSelector: '[data-message-author-role="assistant"]'
            };
        } else if (hostname.includes('gemini.google.com')) {
            return {
                name: 'Gemini',
                userSelector: 'user-query, .query-text, .user-queryText, .query-content, .user-query-container',
                aiSelector: '.model-response, message, [class*="model-response"]'
            };
        } else if (hostname.includes('claude.ai')) {
            return {
                name: 'Claude',
                userSelector: '[data-testid="user-message"], .font-user, div.custom-user-message',
                aiSelector: '[data-testid="assistant-message"], .font-claude'
            };
        } else if (hostname.includes('grok.com')) {
            return {
                name: 'Grok',
                userSelector: '.message-user, [data-testid="user-message"], div[class*="message-user"]',
                aiSelector: '.message-assistant, [data-testid="assistant-message"], div[class*="message-assistant"]'
            };
        }
        // Generic fallback
        return {
            name: 'AI Chat',
            userSelector: '.user-message, .my-message, [class*="user-message"], [class*="UserPrompt"]',
            aiSelector: '.assistant-message, .bot-message, [class*="assistant-message"], [class*="BotResponse"]'
        };
    }

    const config = getPlatformConfig();
    let scannedUsers = [];
    let scannedAIs = [];
    let activeTab = 'user'; // 'user' | 'ai' | 'pinned' | 'highlights'

    // Default settings loaded from storage or fallbacks
    let appSettings = {
        language: 'vi',
        theme: 'light',
        position: 'right',
        size: 'normal',
        pinned: [], // array of { text: string, type: 'user' | 'ai', originalIndex: number }
        highlights: [] // array of { text: string, timestamp: string }
    };

    // Load settings from Chrome Extension Storage
    chrome.storage.local.get(['language', 'theme', 'position', 'size', 'pinned', 'highlights'], (result) => {
        if (result.language) appSettings.language = result.language;
        if (result.theme) appSettings.theme = result.theme;
        if (result.position) appSettings.position = result.position;
        if (result.size) appSettings.size = result.size;
        if (result.pinned) appSettings.pinned = result.pinned;
        if (result.highlights) appSettings.highlights = result.highlights;
        
        applySettingsToUI();
        scanPage();
    });

    // Create shadow host
    const host = document.createElement('div');
    host.id = 'pinkie-toc-shadow-host';
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });

    // CSS Styling using modern CSS variables
    const style = document.createElement('style');
    style.textContent = `
        :host {
            --bg-color-light: rgba(255, 245, 248, 0.96);
            --border-color-light: #ffc5d9;
            --text-color-light: #4a3e47;
            --card-bg-light: #ffffff;
            --card-hover-light: #fff9fb;
            --header-bg-light: #ffeff6;
            --accent-color: #d44b8b;
            
            --bg-color-dark: rgba(38, 25, 31, 0.97);
            --border-color-dark: #d44b8b;
            --text-color-dark: #ffdbe7;
            --card-bg-dark: #331d27;
            --card-hover-dark: #472635;
            --header-bg-dark: #241119;
        }

        /* Floating Toggle Button */
        #pinkie-toc-toggle {
            position: fixed;
            bottom: 30px;
            width: 48px;
            height: 48px;
            background-color: #ffeff6;
            border: 2px solid #ffc5d9;
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(212, 75, 139, 0.25);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 22px;
            z-index: 9999999999;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        #pinkie-toc-toggle.pos-right {
            right: 18px;
        }
        #pinkie-toc-toggle.pos-left {
            left: 18px;
        }
        #pinkie-toc-toggle:hover {
            transform: scale(1.15) rotate(15deg);
            background-color: #ffc5d9;
            box-shadow: 0 6px 16px rgba(212, 75, 139, 0.35);
        }

        /* Sidebar Container */
        #pinkie-toc-sidebar {
            position: fixed;
            top: 70px;
            height: calc(100vh - 140px);
            z-index: 9999999998;
            display: flex;
            flex-direction: column;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            overflow: hidden;
            transition: all 0.35s cubic-bezier(0.25, 0.8, 0.25, 1);
            
            /* Theme variable assignments */
            background-color: var(--bg-color);
            border: 2px solid var(--border-color);
            color: var(--text-color);
        }

        /* Positions and Sizes */
        #pinkie-toc-sidebar.pos-right {
            right: -370px;
            border-radius: 16px 0 0 16px;
            box-shadow: -4px 4px 20px rgba(212, 75, 139, 0.18);
        }
        #pinkie-toc-sidebar.pos-right.expanded {
            right: 0;
        }

        #pinkie-toc-sidebar.pos-left {
            left: -370px;
            border-radius: 0 16px 16px 0;
            box-shadow: 4px 4px 20px rgba(212, 75, 139, 0.18);
        }
        #pinkie-toc-sidebar.pos-left.expanded {
            left: 0;
        }

        #pinkie-toc-sidebar.size-normal {
            width: 290px;
        }
        #pinkie-toc-sidebar.size-spacious {
            width: 360px;
        }

        /* Header */
        .sidebar-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 14px 18px;
            border-bottom: 2px solid var(--border-color);
            background-color: var(--header-bg);
        }
        .sidebar-title {
            font-size: 13px;
            font-weight: 800;
            color: var(--accent-color);
            display: flex;
            align-items: center;
            gap: 4px;
        }
        .sync-btn {
            background-color: var(--card-bg);
            border: 1px solid var(--accent-color);
            color: var(--accent-color);
            border-radius: 6px;
            cursor: pointer;
            font-size: 10px;
            padding: 3px 8px;
            font-weight: 800;
            transition: all 0.2s ease;
        }
        .sync-btn:hover {
            background-color: var(--accent-color);
            color: white;
        }

        /* Search Box */
        .search-container {
            padding: 8px 12px;
            background-color: var(--header-bg);
            border-bottom: 1px solid var(--border-color);
        }
        .search-input {
            width: 100%;
            padding: 7px 14px;
            border-radius: 20px;
            border: 1px solid var(--border-color);
            background-color: var(--card-bg);
            color: var(--text-color);
            font-size: 11px;
            outline: none;
            box-sizing: border-box;
            font-weight: bold;
            transition: all 0.2s ease;
        }
        .search-input:focus {
            border-color: var(--accent-color);
            box-shadow: 0 0 5px rgba(212, 75, 139, 0.25);
        }

        /* Tabs Navigation */
        .tabs-nav {
            display: flex;
            background-color: var(--header-bg);
            border-bottom: 1px solid var(--border-color);
            padding: 0 4px;
        }
        .tab-btn {
            flex: 1;
            background: none;
            border: none;
            border-bottom: 3px solid transparent;
            padding: 10px 0;
            font-size: 10px;
            font-weight: 800;
            cursor: pointer;
            color: var(--text-color);
            opacity: 0.65;
            transition: all 0.2s ease;
            white-space: nowrap;
        }
        .tab-btn.active {
            border-bottom-color: var(--accent-color);
            color: var(--accent-color);
            opacity: 1;
        }
        .tab-btn:hover {
            opacity: 1;
        }

        /* Content List */
        .toc-list {
            flex: 1;
            overflow-y: auto;
            padding: 12px;
            scroll-behavior: smooth;
        }
        .toc-list::-webkit-scrollbar {
            width: 5px;
        }
        .toc-list::-webkit-scrollbar-track {
            background: transparent;
        }
        .toc-list::-webkit-scrollbar-thumb {
            background: var(--border-color);
            border-radius: 99px;
        }

        /* Item Card */
        .toc-item {
            background-color: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 10px;
            padding: 10px 12px;
            margin-bottom: 10px;
            font-size: 11.5px;
            line-height: 1.45;
            cursor: pointer;
            transition: all 0.25s ease;
            position: relative;
            box-shadow: 0 2px 4px rgba(212, 75, 139, 0.03);
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .toc-item:hover {
            background-color: var(--card-hover);
            transform: translateX(var(--hover-slide, -4px));
            box-shadow: 0 4px 8px rgba(212, 75, 139, 0.08);
        }
        .toc-item-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .toc-item-badge {
            background-color: var(--header-bg);
            color: var(--accent-color);
            font-size: 9px;
            font-weight: 800;
            padding: 2px 6px;
            border-radius: 99px;
        }
        .pin-btn, .action-btn {
            background: none;
            border: none;
            color: var(--text-color);
            cursor: pointer;
            font-size: 12px;
            opacity: 0.4;
            padding: 2px;
            transition: all 0.2s ease;
        }
        .pin-btn.pinned, .pin-btn:hover, .action-btn:hover {
            opacity: 1;
            color: var(--accent-color);
            transform: scale(1.1);
        }
        .action-row {
            display: flex;
            gap: 6px;
        }
        .toc-item-text {
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            color: var(--text-color);
            font-weight: 600;
            word-break: break-word;
        }

        /* Empty State */
        .empty-state {
            text-align: center;
            padding: 40px 15px;
            color: var(--text-color);
            opacity: 0.6;
            font-size: 11px;
            font-weight: 500;
        }

        /* Footer */
        .sidebar-footer {
            display: flex;
            border-top: 2px solid var(--border-color);
            background-color: var(--header-bg);
            padding: 8px 12px;
            justify-content: space-around;
            align-items: center;
        }
        .footer-btn {
            background: none;
            border: none;
            font-size: 18px;
            cursor: pointer;
            padding: 4px;
            border-radius: 6px;
            transition: all 0.2s ease;
            opacity: 0.8;
        }
        .footer-btn:hover {
            background-color: var(--card-bg);
            opacity: 1;
            transform: scale(1.1);
        }

        /* Settings Overlay Modal */
        #pinkie-settings-modal {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.4);
            z-index: 10000;
            display: none;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(4px);
        }
        #pinkie-settings-modal.show {
            display: flex;
        }
        .modal-content {
            background-color: var(--card-bg);
            border: 2px solid var(--border-color);
            border-radius: 12px;
            padding: 18px;
            width: 80%;
            box-shadow: 0 4px 15px rgba(0,0,0,0.15);
            color: var(--text-color);
        }
        .modal-title {
            font-size: 14px;
            font-weight: 800;
            color: var(--accent-color);
            margin-top: 0;
            margin-bottom: 12px;
        }
        .setting-row {
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 12px;
            font-weight: bold;
        }
        .setting-select {
            background-color: var(--header-bg);
            color: var(--text-color);
            border: 1px solid var(--border-color);
            padding: 4px 8px;
            border-radius: 6px;
            font-weight: bold;
            outline: none;
        }
        .shortcut-desc {
            font-size: 10px;
            opacity: 0.7;
            margin-top: 4px;
            line-height: 1.4;
        }
        .close-modal-btn {
            width: 100%;
            background-color: var(--accent-color);
            border: none;
            color: white;
            padding: 6px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
            font-size: 12px;
            margin-top: 8px;
            transition: opacity 0.2s;
        }
        .close-modal-btn:hover {
            opacity: 0.9;
        }
    `;
    shadow.appendChild(style);

    // Inject Global Tooltip Style for selected text
    const globalStyle = document.createElement('style');
    globalStyle.id = 'pinkie-global-highlight-style';
    globalStyle.textContent = `
        #pinkie-highlight-tooltip {
            position: absolute !important;
            background-color: #ffeff6 !important;
            border: 1.5px solid #ffc5d9 !important;
            color: #d44b8b !important;
            padding: 4px 10px !important;
            font-size: 11px !important;
            font-weight: 800 !important;
            border-radius: 20px !important;
            cursor: pointer !important;
            box-shadow: 0 4px 12px rgba(212, 75, 139, 0.25) !important;
            z-index: 10000000000 !important;
            display: flex !important;
            align-items: center !important;
            gap: 4px !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            pointer-events: auto !important;
            user-select: none !important;
            transition: transform 0.1s ease !important;
        }
        #pinkie-highlight-tooltip:hover {
            transform: scale(1.08) !important;
            background-color: #ffc5d9 !important;
        }
    `;
    document.head.appendChild(globalStyle);

    // Create Sidebar Elements
    const sidebar = document.createElement('div');
    sidebar.id = 'pinkie-toc-sidebar';

    const header = document.createElement('div');
    header.className = 'sidebar-header';
    header.innerHTML = `
        <span class="sidebar-title" id="pinkie-sidebar-title">🌸 Pinkie Smart TOC</span>
        <button class="sync-btn" id="pinkie-toc-sync">↻ Re-scan</button>
    `;
    sidebar.appendChild(header);

    // Create Search Container
    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';
    searchContainer.innerHTML = `
        <input type="text" class="search-input" id="pinkie-toc-search" placeholder="Tìm kiếm từ khóa... 🔍🌸">
    `;
    sidebar.appendChild(searchContainer);
    
    const searchInput = searchContainer.querySelector('#pinkie-toc-search');

    // Create Tabs Nav
    const tabsNav = document.createElement('div');
    tabsNav.className = 'tabs-nav';
    tabsNav.innerHTML = `
        <button class="tab-btn active" id="btn-tab-user" data-tab="user">❓ Bạn hỏi</button>
        <button class="tab-btn" id="btn-tab-ai" data-tab="ai">✨ AI trả lời</button>
        <button class="tab-btn" id="btn-tab-pinned" data-tab="pinned">📌 Đã ghim</button>
        <button class="tab-btn" id="btn-tab-highlights" data-tab="highlights">🖍️ Highlight</button>
    `;
    sidebar.appendChild(tabsNav);

    // List Container
    const listContainer = document.createElement('div');
    listContainer.className = 'toc-list';
    listContainer.id = 'pinkie-toc-list';
    sidebar.appendChild(listContainer);

    // Create Footer
    const footer = document.createElement('div');
    footer.className = 'sidebar-footer';
    footer.innerHTML = `
        <button class="footer-btn" id="btn-footer-pos" title="Đổi vị trí (Trái/Phải)">↔️</button>
        <button class="footer-btn" id="btn-footer-theme" title="Đổi chế độ Sáng/Tối">☀️</button>
        <button class="footer-btn" id="btn-footer-size" title="Thu nhỏ/Mở rộng kích thước">🔍</button>
        <button class="footer-btn" id="btn-footer-settings" title="Cài đặt ngôn ngữ">⚙️</button>
    `;
    sidebar.appendChild(footer);

    // Create Settings Modal Overlay
    const modal = document.createElement('div');
    modal.id = 'pinkie-settings-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h4 class="modal-title" id="settings-modal-title">⚙️ Cài đặt Pinkie</h4>
            <div class="setting-row">
                <span id="label-settings-lang">Ngôn ngữ:</span>
                <select class="setting-select" id="settings-lang-select">
                    <option value="vi">Tiếng Việt 🇻🇳</option>
                    <option value="en">English 🇬🇧</option>
                </select>
            </div>
            <div class="setting-row" style="flex-direction: column; align-items: flex-start; gap: 4px;">
                <span id="label-settings-shortcut">Phím tắt mở nhanh:</span>
                <div class="shortcut-desc" id="settings-shortcut-desc">Nhấn Alt + Q để bật/tắt nhanh thanh TOC bất kỳ lúc nào!</div>
            </div>
            <button class="close-modal-btn" id="btn-close-modal">Đóng</button>
        </div>
    `;
    sidebar.appendChild(modal);

    // Toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'pinkie-toc-toggle';
    toggleBtn.textContent = '🌸';
    toggleBtn.title = 'Toggle Chat Table of Contents';

    shadow.appendChild(sidebar);
    shadow.appendChild(toggleBtn);

    // Apply Saved Settings to UI
    function applySettingsToUI() {
        // Theme variables injection
        if (appSettings.theme === 'light') {
            sidebar.style.setProperty('--bg-color', 'var(--bg-color-light)');
            sidebar.style.setProperty('--border-color', 'var(--border-color-light)');
            sidebar.style.setProperty('--text-color', 'var(--text-color-light)');
            sidebar.style.setProperty('--card-bg', 'var(--card-bg-light)');
            sidebar.style.setProperty('--card-hover', 'var(--card-hover-light)');
            sidebar.style.setProperty('--header-bg', 'var(--header-bg-light)');
            sidebar.classList.remove('theme-dark');
            footer.querySelector('#btn-footer-theme').textContent = '☀️';
        } else {
            sidebar.style.setProperty('--bg-color', 'var(--bg-color-dark)');
            sidebar.style.setProperty('--border-color', 'var(--border-color-dark)');
            sidebar.style.setProperty('--text-color', 'var(--text-color-dark)');
            sidebar.style.setProperty('--card-bg', 'var(--card-bg-dark)');
            sidebar.style.setProperty('--card-hover', 'var(--card-hover-dark)');
            sidebar.style.setProperty('--header-bg', 'var(--header-bg-dark)');
            sidebar.classList.add('theme-dark');
            footer.querySelector('#btn-footer-theme').textContent = '🌙';
        }

        // Position class rules
        sidebar.classList.remove('pos-left', 'pos-right');
        toggleBtn.classList.remove('pos-left', 'pos-right');
        
        if (appSettings.position === 'left') {
            sidebar.classList.add('pos-left');
            toggleBtn.classList.add('pos-left');
            sidebar.style.setProperty('--hover-slide', '4px');
        } else {
            sidebar.classList.add('pos-right');
            toggleBtn.classList.add('pos-right');
            sidebar.style.setProperty('--hover-slide', '-4px');
        }

        // Size class rules
        sidebar.classList.remove('size-normal', 'size-spacious');
        if (appSettings.size === 'spacious') {
            sidebar.classList.add('size-spacious');
        } else {
            sidebar.classList.add('size-normal');
        }

        // Translations text mapping
        const lang = appSettings.language;
        const dict = TRANSLATIONS[lang];
        
        header.querySelector('#pinkie-sidebar-title').textContent = `${dict.title}`;
        header.querySelector('#pinkie-toc-sync').textContent = `${lang === 'vi' ? '↻ Quét lại' : '↻ Re-scan'}`;
        
        tabsNav.querySelector('#btn-tab-user').textContent = dict.tabUser;
        tabsNav.querySelector('#btn-tab-ai').textContent = dict.tabAI;
        tabsNav.querySelector('#btn-tab-pinned').textContent = dict.tabPinned;
        tabsNav.querySelector('#btn-tab-highlights').textContent = dict.tabHighlights;

        footer.querySelector('#btn-footer-pos').title = dict.tooltipPos;
        footer.querySelector('#btn-footer-theme').title = dict.tooltipTheme;
        footer.querySelector('#btn-footer-size').title = dict.tooltipSize;
        footer.querySelector('#btn-footer-settings').title = dict.tooltipSettings;

        modal.querySelector('#settings-modal-title').textContent = dict.settingsTitle;
        modal.querySelector('#label-settings-lang').textContent = dict.settingsLang;
        modal.querySelector('#label-settings-shortcut').textContent = dict.settingsShortcut;
        modal.querySelector('#settings-shortcut-desc').textContent = dict.settingsShortcutDesc;
        modal.querySelector('#btn-close-modal').textContent = dict.closeSettings;
        modal.querySelector('#settings-lang-select').value = lang;

        // Update search placeholder
        searchInput.placeholder = dict.searchPlaceholder;
    }

    // Save settings helper
    function saveSettings() {
        chrome.storage.local.set(appSettings);
    }

    // Toggle sidebar visibility
    toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('expanded');
        if (sidebar.classList.contains('expanded')) {
            scanPage();
        }
    });

    // Keyboard shortcut handler (Alt + Q)
    document.addEventListener('keydown', (e) => {
        if (e.altKey && e.code === 'KeyQ') {
            e.preventDefault();
            sidebar.classList.toggle('expanded');
            if (sidebar.classList.contains('expanded')) {
                scanPage();
            }
        }
    });

    // Handle Manual Sync
    header.querySelector('#pinkie-toc-sync').addEventListener('click', (e) => {
        e.stopPropagation();
        scanPage();
    });

    // Handle Live Search Input
    searchInput.addEventListener('input', () => {
        renderCurrentTab();
    });

    // Tab buttons event listeners
    tabsNav.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            tabsNav.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeTab = btn.getAttribute('data-tab');
            renderCurrentTab();
        });
    });

    // Footer control event listeners
    footer.querySelector('#btn-footer-pos').addEventListener('click', () => {
        appSettings.position = appSettings.position === 'right' ? 'left' : 'right';
        applySettingsToUI();
        saveSettings();
    });

    footer.querySelector('#btn-footer-theme').addEventListener('click', () => {
        appSettings.theme = appSettings.theme === 'light' ? 'dark' : 'light';
        applySettingsToUI();
        saveSettings();
    });

    footer.querySelector('#btn-footer-size').addEventListener('click', () => {
        appSettings.size = appSettings.size === 'normal' ? 'spacious' : 'normal';
        applySettingsToUI();
        saveSettings();
    });

    footer.querySelector('#btn-footer-settings').addEventListener('click', () => {
        modal.classList.add('show');
    });

    // Modal settings listeners
    modal.querySelector('#settings-lang-select').addEventListener('change', (e) => {
        appSettings.language = e.target.value;
        applySettingsToUI();
        saveSettings();
        renderCurrentTab(); // Refresh text inside current list
    });

    modal.querySelector('#btn-close-modal').addEventListener('click', () => {
        modal.classList.remove('show');
    });

    // Scan page for both User prompts and AI answers
    function scanPage() {
        scannedUsers = Array.from(document.querySelectorAll(config.userSelector)).filter(el => {
            const txt = el.innerText || el.textContent || '';
            return txt.trim().length > 0;
        });

        scannedAIs = Array.from(document.querySelectorAll(config.aiSelector)).filter(el => {
            const txt = el.innerText || el.textContent || '';
            return txt.trim().length > 0;
        });

        renderCurrentTab();
    }

    // Render list based on the active tab
    function renderCurrentTab() {
        listContainer.innerHTML = '';
        const dict = TRANSLATIONS[appSettings.language];

        if (activeTab === 'user') {
            if (scannedUsers.length === 0) {
                listContainer.innerHTML = `<div class="empty-state">${dict.emptyUser}</div>`;
                return;
            }
            renderList(scannedUsers, 'user');
        } else if (activeTab === 'ai') {
            if (scannedAIs.length === 0) {
                listContainer.innerHTML = `<div class="empty-state">${dict.emptyAI}</div>`;
                return;
            }
            renderList(scannedAIs, 'ai');
        } else if (activeTab === 'pinned') {
            if (appSettings.pinned.length === 0) {
                listContainer.innerHTML = `<div class="empty-state">${dict.emptyPinned}</div>`;
                return;
            }
            renderPinnedList();
        } else if (activeTab === 'highlights') {
            if (appSettings.highlights.length === 0) {
                listContainer.innerHTML = `<div class="empty-state">${dict.emptyHighlights}</div>`;
                return;
            }
            renderHighlightsList();
        }
    }

    // Render generic list cards with live keyword filtering
    function renderList(elements, type) {
        const searchQuery = searchInput.value.toLowerCase().trim();
        const dict = TRANSLATIONS[appSettings.language];

        // Map elements with their original indices so sequence sequence sequence is preserved during filtering!
        const itemsToRender = elements
            .map((el, originalIndex) => ({ el, originalIndex }))
            .filter(item => {
                let text = item.el.innerText || item.el.textContent || '';
                return text.toLowerCase().includes(searchQuery);
            });

        if (itemsToRender.length === 0) {
            listContainer.innerHTML = `<div class="empty-state">${searchQuery ? (appSettings.language === 'vi' ? 'Không có kết quả khớp 🔍' : 'No matching results found 🔍') : dict.emptyUser}</div>`;
            return;
        }

        itemsToRender.forEach(({ el, originalIndex }) => {
            let text = el.innerText || el.textContent || '';
            text = text.replace(/\s+/g, ' ').trim();
            const snippet = text.length > 100 ? text.substring(0, 100) + '...' : text;

            const isItemPinned = appSettings.pinned.some(p => p.text === text && p.type === type);

            const card = document.createElement('div');
            card.className = 'toc-item';
            
            const badgeLabel = type === 'user' ? `#${originalIndex + 1}` : `✨ AI #${originalIndex + 1}`;
            
            card.innerHTML = `
                <div class="toc-item-header">
                    <span class="toc-item-badge">${badgeLabel}</span>
                    <button class="pin-btn ${isItemPinned ? 'pinned' : ''}" title="Ghim xem sau">📌</button>
                </div>
                <span class="toc-item-text">${escapeHtml(snippet)}</span>
            `;

            // Card body click scrolls to element
            card.addEventListener('click', (e) => {
                if (e.target.classList.contains('pin-btn')) return; // Avoid double triggering
                scrollToElement(el);
            });

            // Pin button click
            card.querySelector('.pin-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                togglePinItem(text, type, originalIndex);
                renderCurrentTab();
            });

            listContainer.appendChild(card);
        });
    }

    // Render Pinned Tab List with live keyword filtering
    function renderPinnedList() {
        const searchQuery = searchInput.value.toLowerCase().trim();
        const dict = TRANSLATIONS[appSettings.language];

        const itemsToRender = appSettings.pinned.filter(item => {
            return item.text.toLowerCase().includes(searchQuery);
        });

        if (itemsToRender.length === 0) {
            listContainer.innerHTML = `<div class="empty-state">${searchQuery ? (appSettings.language === 'vi' ? 'Không có kết quả khớp 🔍' : 'No matching results found 🔍') : dict.emptyPinned}</div>`;
            return;
        }

        itemsToRender.forEach((pinnedItem) => {
            const card = document.createElement('div');
            card.className = 'toc-item';
            
            const badgeLabel = pinnedItem.type === 'user' ? `📌 Bạn #${pinnedItem.originalIndex + 1}` : `📌 AI #${pinnedItem.originalIndex + 1}`;
            
            card.innerHTML = `
                <div class="toc-item-header">
                    <span class="toc-item-badge">${badgeLabel}</span>
                    <button class="pin-btn pinned" title="Bỏ ghim">📌</button>
                </div>
                <span class="toc-item-text">${escapeHtml(pinnedItem.text)}</span>
            `;

            // Click card attempts to find and scroll to the original item on the page
            card.addEventListener('click', (e) => {
                if (e.target.classList.contains('pin-btn')) return;
                
                // Find element by selecting and comparing text
                const targetSelector = pinnedItem.type === 'user' ? config.userSelector : config.aiSelector;
                const matches = Array.from(document.querySelectorAll(targetSelector));
                const matchedEl = matches.find(el => {
                    let t = el.innerText || el.textContent || '';
                    t = t.replace(/\s+/g, ' ').trim();
                    return t === pinnedItem.text || t.startsWith(pinnedItem.text.substring(0, 50));
                });

                if (matchedEl) {
                    scrollToElement(matchedEl);
                }
            });

            card.querySelector('.pin-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                togglePinItem(pinnedItem.text, pinnedItem.type, pinnedItem.originalIndex);
                renderCurrentTab();
            });

            listContainer.appendChild(card);
        });
    }

    // Render Highlights Tab List with live keyword filtering
    function renderHighlightsList() {
        const searchQuery = searchInput.value.toLowerCase().trim();
        const dict = TRANSLATIONS[appSettings.language];

        const itemsToRender = appSettings.highlights.filter(item => {
            return item.text.toLowerCase().includes(searchQuery);
        });

        if (itemsToRender.length === 0) {
            listContainer.innerHTML = `<div class="empty-state">${searchQuery ? (appSettings.language === 'vi' ? 'Không có kết quả khớp 🔍' : 'No matching results found 🔍') : dict.emptyHighlights}</div>`;
            return;
        }

        itemsToRender.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'toc-item';
            
            const formattedTime = new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            
            card.innerHTML = `
                <div class="toc-item-header">
                    <span class="toc-item-badge">🖍️ ${formattedTime}</span>
                    <div class="action-row">
                        <button class="action-btn btn-copy" title="${dict.tooltipCopy}">📋</button>
                        <button class="action-btn btn-delete" title="${dict.tooltipDelete}">🗑️</button>
                    </div>
                </div>
                <span class="toc-item-text" style="user-select: text;">${escapeHtml(item.text)}</span>
            `;

            // Copy to Clipboard
            card.querySelector('.btn-copy').addEventListener('click', (e) => {
                e.stopPropagation();
                const copyBtn = e.target;
                navigator.clipboard.writeText(item.text).then(() => {
                    copyBtn.textContent = '✅';
                    setTimeout(() => {
                        copyBtn.textContent = '📋';
                    }, 1000);
                });
            });

            // Delete highlight
            card.querySelector('.btn-delete').addEventListener('click', (e) => {
                e.stopPropagation();
                appSettings.highlights.splice(appSettings.highlights.indexOf(item), 1);
                saveSettings();
                renderCurrentTab();
            });

            listContainer.appendChild(card);
        });
    }

    // Scroll and flash target helper
    function scrollToElement(el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        const originalBg = el.style.backgroundColor;
        const originalTransition = el.style.transition;
        
        el.style.transition = 'background-color 0.4s ease';
        el.style.backgroundColor = 'rgba(255, 197, 217, 0.35)'; // Gentle pink flash
        
        setTimeout(() => {
            el.style.backgroundColor = originalBg;
            setTimeout(() => {
                el.style.transition = originalTransition;
            }, 500);
        }, 1200);
    }

    // Pin/Unpin logic
    function togglePinItem(text, type, originalIndex) {
        const pinIdx = appSettings.pinned.findIndex(p => p.text === text && p.type === type);
        if (pinIdx > -1) {
            appSettings.pinned.splice(pinIdx, 1);
        } else {
            appSettings.pinned.push({
                text: text,
                type: type,
                originalIndex: originalIndex
            });
        }
        saveSettings();
    }

    function escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Highlight Tooltip Management
    let currentSelectionText = '';

    // Mouse up event listener on document
    document.addEventListener('mouseup', (e) => {
        // Skip selection inside the extension sidebar host to avoid loops
        if (host.contains(e.target)) return;

        setTimeout(() => {
            const selection = window.getSelection();
            const selectedText = selection.toString().trim();
            
            if (selectedText.length > 2) { // Only show tooltip for meaningful selection
                currentSelectionText = selectedText;
                showHighlightTooltip(e.pageX, e.pageY);
            } else {
                hideHighlightTooltip();
            }
        }, 50);
    });

    // Hide tooltip on mouse down elsewhere
    document.addEventListener('mousedown', (e) => {
        const tooltip = document.getElementById('pinkie-highlight-tooltip');
        if (tooltip && !tooltip.contains(e.target)) {
            hideHighlightTooltip();
        }
    });

    function showHighlightTooltip(x, y) {
        let tooltip = document.getElementById('pinkie-highlight-tooltip');
        const dict = TRANSLATIONS[appSettings.language];
        
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'pinkie-highlight-tooltip';
            tooltip.textContent = dict.tooltipAddHighlight;
            
            // Add click action to save highlight
            tooltip.addEventListener('click', (e) => {
                e.stopPropagation();
                if (currentSelectionText) {
                    appSettings.highlights.push({
                        text: currentSelectionText,
                        timestamp: new Date().toISOString()
                    });
                    saveSettings();
                    
                    // Instantly repaint if highlights tab is active!
                    if (sidebar.classList.contains('expanded') && activeTab === 'highlights') {
                        renderCurrentTab();
                    }
                }
                hideHighlightTooltip();
                
                // Clear active selection on screen for better UX
                window.getSelection().removeAllRanges();
            });
            
            document.body.appendChild(tooltip);
        }
        
        // Update label text according to active language
        tooltip.textContent = dict.tooltipAddHighlight;

        // Position slightly above selection
        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y - 45}px`;
        tooltip.style.display = 'flex';
    }

    function hideHighlightTooltip() {
        const tooltip = document.getElementById('pinkie-highlight-tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }

    // Auto-scan periodically (every 4 seconds) to capture chat updates in real-time
    setInterval(() => {
        if (sidebar.classList.contains('expanded')) {
            const currentUsersCount = document.querySelectorAll(config.userSelector).length;
            const currentAIsCount = document.querySelectorAll(config.aiSelector).length;
            
            if (currentUsersCount !== scannedUsers.length || currentAIsCount !== scannedAIs.length) {
                scanPage();
            }
        }
    }, 4000);

})();
