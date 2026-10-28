/* Generated from src/ - edit the TypeScript, not this file. */
(function () {
"use strict";
// ---------- ui/dom ----------
/**
 * Small, typed helpers for the bits of DOM work that appear more than once.
 * Everything fails loudly during start-up: a missing element means the markup
 * and the script have drifted apart, which is a bug worth seeing immediately.
 */
function requireElement(selector, root = document) {
    const element = root.querySelector(selector);
    if (!element) {
        throw new Error(`Expected an element matching "${selector}"`);
    }
    return element;
}
function requireElementById(id) {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`Expected an element with id "${id}"`);
    }
    return element;
}
function optionalElement(selector) {
    return document.querySelector(selector);
}
/**
 * Reads a value out of localStorage, treating a blocked store (private mode,
 * denied cookies) as "nothing stored" rather than an error.
 */
function readStorage(storage, key) {
    try {
        return storage.getItem(key);
    }
    catch {
        return null;
    }
}
function writeStorage(storage, key, value) {
    try {
        storage.setItem(key, value);
    }
    catch {
        /* Storage is a convenience; losing it must never break the page. */
    }
}
/** Returns the key only when the stored value is a plain non-empty string. */
function storedString(source, key) {
    if (!source)
        return null;
    const value = source[key];
    return typeof value === 'string' ? value : null;
}


// ---------- ui/theme ----------
/**
 * Theme toggle: browser default until clicked, then the choice sticks.
 *
 * Shared by every template. Most of the work happens synchronously at start-up
 * so the page never flashes the wrong theme; templates also carry a small
 * inline script that sets the attribute even earlier.
 */
const THEME_STORE_KEY = 'translate-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';
function isTheme(value) {
    return value === 'light' || value === 'dark';
}
const ThemeController = class ThemeController {
    root;
    toggle;
    media;
    constructor(root = document.documentElement, toggle = requireElementById('theme-toggle'), media = window.matchMedia(DARK_QUERY)) {
        this.root = root;
        this.toggle = toggle;
        this.media = media;
    }
    /** Starts the controller unless the page has no toggle (nothing to wire). */
    static start() {
        if (!document.getElementById('theme-toggle'))
            return null;
        const controller = new ThemeController();
        controller.init();
        return controller;
    }
    init() {
        this.applyStoredChoice();
        this.toggle.addEventListener('click', () => this.chooseNext());
        /* Follow the OS while the visitor has never picked a theme. */
        this.media.addEventListener('change', (event) => {
            if (this.storedChoice() === null) {
                this.setTheme(event.matches ? 'dark' : 'light');
            }
        });
        this.updateLabel();
    }
    get current() {
        return this.root.dataset.theme === 'dark' ? 'dark' : 'light';
    }
    get next() {
        return this.current === 'dark' ? 'light' : 'dark';
    }
    storedChoice() {
        const stored = readStorage(window.localStorage, THEME_STORE_KEY);
        return isTheme(stored) ? stored : null;
    }
    applyStoredChoice() {
        const stored = this.storedChoice() ?? (this.media.matches ? 'dark' : 'light');
        this.root.dataset.theme = stored;
    }
    chooseNext() {
        const next = this.next;
        this.setTheme(next);
        writeStorage(window.localStorage, THEME_STORE_KEY, next);
    }
    setTheme(theme) {
        this.root.dataset.theme = theme;
        this.updateLabel();
    }
    updateLabel() {
        this.toggle.setAttribute('aria-label', `Switch to ${this.next} theme`);
    }
}


// ---------- ui/clipboard ----------
/**
 * Copying text, preferring the async clipboard API and falling back to a
 * hidden textarea plus document.execCommand for older or restricted hosts.
 */
const Clipboard = class Clipboard {
    async write(text) {
        const clipboard = navigator.clipboard;
        if (clipboard && typeof clipboard.writeText === 'function') {
            try {
                await clipboard.writeText(text);
                return true;
            }
            catch {
                return this.legacyCopy(text);
            }
        }
        return this.legacyCopy(text);
    }
    legacyCopy(text) {
        try {
            const field = document.createElement('textarea');
            field.value = text;
            field.setAttribute('readonly', '');
            field.style.position = 'fixed';
            field.style.opacity = '0';
            document.body.appendChild(field);
            field.select();
            const copied = document.execCommand('copy');
            field.remove();
            return copied;
        }
        catch {
            return false;
        }
    }
}


// ---------- ui/toast ----------
/**
 * The transient status message at the bottom of the page. Announces itself
 * through role="status" / aria-live, so it is useful to screen readers too.
 */
const Toast = class Toast {
    element;
    timer = null;
    constructor(element = requireElementById('toast')) {
        this.element = element;
    }
    show(message, duration = 2600) {
        this.element.textContent = message;
        this.element.classList.add('visible');
        if (this.timer !== null)
            clearTimeout(this.timer);
        this.timer = setTimeout(() => {
            this.element.classList.remove('visible');
            this.timer = null;
        }, duration);
    }
}


// ---------- translator/languages ----------
/**
 * The language catalogue and the search index built over it.
 *
 * `name` is also the language name sent to the translation API (see
 * `apiName`), `tag` is what the speech synthesiser is asked for, and `native`
 * is what the menu shows underneath each name.
 */
const AUTO_CODE = 'auto';
const LANGS = {
    auto: {
        name: 'Detect language', native: 'Auto', tag: '',
        search: ['detect', 'auto', 'automatic', 'automatisch', 'détection', 'detectar', 'automatique']
    },
    en: {
        name: 'English', native: 'English', tag: 'en-NZ',
        search: ['anglais', 'inglés', 'englisch', 'inglese', 'inglês', 'engels', 'engelska', 'engelsk', 'englannin', 'angielski', 'английский', '英語', '英语', 'الإنجليزية', 'अंग्रेज़ी', 'อังกฤษ', 'tiếng anh', 'inggris']
    },
    mi: {
        name: 'Te reo Māori', native: 'Te reo Māori', tag: 'mi-NZ',
        search: ['maori', 'reo', 'te reo']
    },
    de: {
        name: 'German', native: 'Deutsch', tag: 'de-DE',
        search: ['allemand', 'alemán', 'tedesco', 'duits', 'tyska', 'tysk', 'saksa', 'niemiecki', 'немецкий', '德语', 'ドイツ語', 'الألمانية', 'जर्मन', 'เยอรมัน', 'tiếng đức', 'jerman', 'němčina', 'német', 'njemački']
    },
    fr: {
        name: 'French', native: 'Français', tag: 'fr-FR',
        search: ['francais', 'französisch', 'francés', 'francese', 'frans', 'ranska', 'fransk', 'francuski', 'французский', '法语', 'フランス語', 'الفرنسية', 'फ़्रेंच', 'ฝรั่งเศส', 'tiếng pháp', 'prancis']
    },
    es: {
        name: 'Spanish', native: 'Español', tag: 'es-ES',
        search: ['espagnol', 'spanisch', 'spagnolo', 'spaans', 'espanja', 'spansk', 'hiszpański', 'испанский', '西班牙语', 'スペイン語', 'الإسبانية', 'स्पेनिश', 'สเปน', 'tiếng tây ban nha', 'spanyol']
    },
    it: {
        name: 'Italian', native: 'Italiano', tag: 'it-IT',
        search: ['italienisch', 'italien', 'italiaans', 'italia', 'italiensk', 'włoski', 'итальянский', '意大利语', 'イタリア語', 'الإيطالية', 'इतालवी', 'อิตาลี', 'tiếng ý']
    },
    pt: {
        name: 'Portuguese', native: 'Português', tag: 'pt-PT',
        search: ['portugues', 'portugiesisch', 'portugués', 'portoghese', 'portugees', 'portugali', 'portugisisk', 'portugalski', 'португальский', '葡萄牙语', 'ポルトガル語', 'البرتغالية', 'पुर्तगाली', 'โปรตุเกส', 'tiếng bồ đào nha', 'portugis']
    },
    nl: {
        name: 'Dutch', native: 'Nederlands', tag: 'nl-NL',
        search: ['niederländisch', 'néerlandais', 'neerlandés', 'olandese', 'nederländska', 'holländska', 'niderlandzki', 'нидерландский', '荷兰语', 'オランダ語', 'الهولندية', 'डच', 'ดัตช์', 'tiếng hà lan', 'belanda']
    },
    sv: {
        name: 'Swedish', native: 'Svenska', tag: 'sv-SE',
        search: ['schwedisch', 'suédois', 'sueco', 'svedese', 'zweeds', 'ruotsi', 'szwedzki', 'шведский', '瑞典语', 'スウェーデン語', 'السويدية', 'स्वीडिश', 'สวีเดน', 'tiếng thụy điển', 'swedia']
    },
    da: {
        name: 'Danish', native: 'Dansk', tag: 'da-DK',
        search: ['dänisch', 'danois', 'danés', 'danese', 'deens', 'tanska', 'duński', 'датский', '丹麦语', 'デンマーク語', 'الدنماركية', 'डेनिश', 'เดนมาร์ก', 'tiếng đan mạch', 'denmark']
    },
    no: {
        name: 'Norwegian', native: 'Norsk', tag: 'nb-NO',
        search: ['norwegisch', 'norvégien', 'noruego', 'norvegese', 'noors', 'norja', 'norweski', 'норвежский', '挪威语', 'ノルウェー語', 'النرويجية', 'नॉर्वेजियन', 'นอร์เวย์', 'tiếng na uy', 'norwegia']
    },
    fi: {
        name: 'Finnish', native: 'Suomi', tag: 'fi-FI',
        search: ['finnisch', 'finnois', 'finés', 'finlandese', 'fins', 'finsk', 'fiński', 'финский', '芬兰语', 'フィンランド語', 'الفنلندية', 'फ़िनिश', 'ฟินแลนด์', 'tiếng phần lan', 'finlandia']
    },
    pl: {
        name: 'Polish', native: 'Polski', tag: 'pl-PL',
        search: ['polnisch', 'polonais', 'polaco', 'polacco', 'pools', 'puola', 'polsk', 'польский', '波兰语', 'ポーランド語', 'البولندية', 'पोलिश', 'โปแลนด์', 'tiếng ba lan']
    },
    tr: {
        name: 'Turkish', native: 'Türkçe', tag: 'tr-TR',
        search: ['turkce', 'türkisch', 'turc', 'turco', 'turks', 'turkki', 'tyrkisk', 'turecki', 'турецкий', '土耳其语', 'トルコ語', 'التركية', 'तुर्की', 'ตุรกี', 'tiếng thổ nhĩ kỳ', 'turki']
    },
    ru: {
        name: 'Russian', native: 'Русский', tag: 'ru-RU',
        search: ['russisch', 'russe', 'ruso', 'russo', 'venäjä', 'russisk', 'rosyjski', 'русский', '俄语', 'ロシア語', 'الروسية', 'रूसी', 'รัสเซีย', 'tiếng nga', 'rusia']
    },
    ja: {
        name: 'Japanese', native: '日本語', tag: 'ja-JP',
        search: ['japanisch', 'japonais', 'japonés', 'giapponese', 'japans', 'japani', 'japansk', 'japoński', 'японский', '日语', '日本語', 'اليابانية', 'जापानी', 'ญี่ปุ่น', 'tiếng nhật', 'jepang']
    },
    ko: {
        name: 'Korean', native: '한국어', tag: 'ko-KR',
        search: ['koreanisch', 'coréen', 'coreano', 'koreaans', 'korea', 'koreansk', 'koreański', 'корейский', '韩语', '韓国語', 'الكورية', 'कोरियाई', 'เกาหลี', 'tiếng hàn']
    },
    zh: {
        name: 'Chinese', native: '中文', tag: 'zh-CN',
        search: ['汉语', 'chinesisch', 'chinois', 'chino', 'cinese', 'chinees', 'kiina', 'kinesisk', 'chiński', 'китайский', '中文', '中国語', 'الصينية', 'चीनी', 'จีน', 'tiếng trung', 'mandarin', 'tionghoa']
    },
    hi: {
        name: 'Hindi', native: 'हिन्दी', tag: 'hi-IN',
        search: ['हिंदी', 'hindou', 'hindú', 'hindin', 'хинди', '印地语', 'ヒンディー語', 'الهندية', 'ฮินดี', 'tiếng hindi']
    },
    ar: {
        name: 'Arabic', native: 'العربية', tag: 'ar-SA',
        search: ['arabisch', 'arabe', 'árabe', 'arabo', 'arabia', 'arabisk', 'arabski', 'арабский', '阿拉伯语', 'アラビア語', 'अरबी', 'อาหรับ', 'tiếng ả rập', 'arab']
    },
    th: {
        name: 'Thai', native: 'ไทย', tag: 'th-TH',
        search: ['thailändisch', 'thaï', 'tailandés', 'tailandese', 'thais', 'tajski', 'тайский', '泰语', 'タイ語', 'التايلاندية', 'थाई', 'tiếng thái']
    },
    vi: {
        name: 'Vietnamese', native: 'Tiếng Việt', tag: 'vi-VN',
        search: ['vietnamesisch', 'vietnamien', 'vietnamita', 'vietnamees', 'vietnam', 'vietnamesisk', 'wietnamski', 'вьетнамский', '越南语', 'ベトナム語', 'الفيتنامية', 'वियतनामी', 'เวียดนาม']
    },
    id: {
        name: 'Indonesian', native: 'Bahasa Indonesia', tag: 'id-ID',
        search: ['indonesisch', 'indonésien', 'indonesio', 'indonesiano', 'indonesia', 'indonesisk', 'indonezyjski', 'индонезийский', '印尼语', 'インドネシア語', 'الإندونيسية', 'इंडोनेशियाई', 'อินโดนีเซีย', 'tiếng indonesia', 'bahasa']
    },
    cs: {
        name: 'Czech', native: 'Čeština', tag: 'cs-CZ',
        search: ['cestina', 'tschechisch', 'tchèque', 'checo', 'ceco', 'tsjechisch', 'tšekki', 'tjeckisk', 'czeski', 'чешский', '捷克语', 'チェコ語', 'التشيكية', 'चेक', 'เช็ก']
    },
    el: {
        name: 'Greek', native: 'Ελληνικά', tag: 'el-GR',
        search: ['griechisch', 'grec', 'griego', 'greco', 'grieks', 'kreikka', 'grekisk', 'grecki', 'греческий', '希腊语', 'ギリシャ語', 'اليونانية', 'यूनानी', 'กรีก']
    },
    he: {
        name: 'Hebrew', native: 'עברית', tag: 'he-IL',
        search: ['hebräisch', 'hébreu', 'hebreo', 'ebraico', 'hebreeuws', 'heprea', 'hebreisk', 'hebrajski', 'иврит', '希伯来语', 'ヘブライ語', 'العبرية', 'हिब्रू', 'ฮิบรู']
    },
    hu: {
        name: 'Hungarian', native: 'Magyar', tag: 'hu-HU',
        search: ['ungarisch', 'hongrois', 'húngaro', 'ungherese', 'hongaars', 'unkari', 'ungarsk', 'węgierski', 'венгерский', '匈牙利语', 'ハンガリー語', 'الهنغارية', 'हंगेरियन', 'ฮังการี']
    },
    ro: {
        name: 'Romanian', native: 'Română', tag: 'ro-RO',
        search: ['rumänisch', 'roumain', 'rumano', 'rumeno', 'roemeens', 'romania', 'rumensk', 'rumuński', 'румынский', '罗马尼亚语', 'ルーマニア語', 'الرومانية', 'रोमानियाई', 'โรมาเนีย']
    },
    uk: {
        name: 'Ukrainian', native: 'Українська', tag: 'uk-UA',
        search: ['ukrainisch', 'ukrainien', 'ucraniano', 'ucraino', 'oekraïens', 'ukraina', 'ukrainsk', 'ukraiński', 'украинский', '乌克兰语', 'ウクライナ語', 'الأوكرانية', 'यूक्रेनियन', 'ยูเครน']
    },
    bn: {
        name: 'Bengali', native: 'বাংলা', tag: 'bn-BD',
        search: ['bangla', 'bengalisch', 'bengalí', 'bengalese', 'bengaals', 'bengali', 'bengalesiska', 'bengalski', 'бенгальский', '孟加拉语', 'ベンガル語', 'البنغالية', 'बंगाली', 'เบงกาลี']
    },
    ur: {
        name: 'Urdu', native: 'اردو', tag: 'ur-PK',
        search: ['ourdou', 'urdu', 'урду', '乌尔都语', 'ウルドゥー語', 'الأردية', 'उर्दू', 'อูรดู']
    },
    fa: {
        name: 'Persian', native: 'فارسی', tag: 'fa-IR',
        search: ['farsi', 'persisch', 'persan', 'persa', 'persiano', 'perzisch', 'persia', 'persisk', 'perski', 'персидский', '波斯语', 'ペルシア語', 'الفارسية', 'फ़ारसी', 'เปอร์เซีย']
    },
    sw: {
        name: 'Swahili', native: 'Kiswahili', tag: 'sw-KE',
        search: ['kiswahili', 'suaheli', 'suajili', 'swahili', 'suahili', 'суахили', '斯瓦希里语', 'スワヒリ語', 'السواحيلية', 'स्वाहिली', 'สวาฮิลี']
    },
    tl: {
        name: 'Filipino', native: 'Filipino', tag: 'tl-PH',
        search: ['tagalog', 'philippinisch', 'philippin', 'filippino', 'filipijns', 'filippiini', 'filippinsk', 'filipiński', 'филиппинский', '菲律宾语', 'フィリピン語', 'الفلبينية', 'फ़िलिपीनो', 'ฟิลิปปินส์']
    },
    ms: {
        name: 'Malay', native: 'Bahasa Melayu', tag: 'ms-MY',
        search: ['melayu', 'bahasa melayu', 'malaiisch', 'malais', 'malayo', 'malese', 'maleis', 'malaiji', 'malajisk', 'malajski', 'малайский', '马来语', 'マレー語', 'الملايوية', 'मलय', 'มาเลย์']
    },
    af: {
        name: 'Afrikaans', native: 'Afrikaans', tag: 'af-ZA',
        search: ['afrikaans', 'afrikaans (suid-afrika)']
    },
    sq: {
        name: 'Albanian', native: 'Shqip', tag: 'sq-AL',
        search: ['shqip', 'albanisch', 'albanais', 'albanés']
    },
    am: {
        name: 'Amharic', native: 'አማርኛ', tag: 'am-ET',
        search: ['amharic', 'amharisch', 'amharique', 'amárico']
    },
    hy: {
        name: 'Armenian', native: 'Հայերեն', tag: 'hy-AM',
        search: ['armenisch', 'arménien', 'armenio']
    },
    az: {
        name: 'Azerbaijani', native: 'Azərbaycan dili', tag: 'az-AZ',
        search: ['azerbaijani', 'aserbaidschanisch', 'azéri', 'azerí']
    },
    eu: {
        name: 'Basque', native: 'Euskara', tag: 'eu-ES',
        search: ['euskara', 'baskisch', 'basque', 'vasco']
    },
    be: {
        name: 'Belarusian', native: 'Беларуская', tag: 'be-BY',
        search: ['belarussisch', 'biélorusse', 'bielorruso']
    },
    bs: {
        name: 'Bosnian', native: 'Bosanski', tag: 'bs-BA',
        search: ['bosnisch', 'bosniaque', 'bosnio']
    },
    bg: {
        name: 'Bulgarian', native: 'Български', tag: 'bg-BG',
        search: ['bulgarisch', 'bulgare', 'búlgaro']
    },
    my: {
        name: 'Burmese', native: 'မြန်မာ', tag: 'my-MM',
        search: ['myanmar', 'birmanisch', 'birman', 'birmano']
    },
    ca: {
        name: 'Catalan', native: 'Català', tag: 'ca-ES',
        search: ['catalan', 'katalanisch', 'catalán']
    },
    ceb: {
        name: 'Cebuano', native: 'Cebuano', tag: 'ceb',
        search: ['cebuano', 'sebuano']
    },
    ny: {
        name: 'Chichewa', native: 'Chichewa', tag: 'ny',
        search: ['chewa', 'nyanja', 'chichewa']
    },
    co: {
        name: 'Corsican', native: 'Corsu', tag: 'co',
        search: ['corsu', 'korsisch', 'corse', 'corso']
    },
    hr: {
        name: 'Croatian', native: 'Hrvatski', tag: 'hr-HR',
        search: ['kroatisch', 'croate', 'croata', 'hrvatski']
    },
    eo: {
        name: 'Esperanto', native: 'Esperanto', tag: 'eo',
        search: ['esperanto', 'espéranto']
    },
    et: {
        name: 'Estonian', native: 'Eesti', tag: 'et-EE',
        search: ['eesti', 'estnisch', 'estonien', 'estonio']
    },
    fj: {
        name: 'Fijian', native: 'Na vosa Vakaviti', tag: 'fj',
        search: ['fijian', 'fidschi', 'fidjien', 'fiyiano']
    },
    gl: {
        name: 'Galician', native: 'Galego', tag: 'gl-ES',
        search: ['galego', 'galizisch', 'galicien', 'gallego']
    },
    ka: {
        name: 'Georgian', native: 'ქართული', tag: 'ka-GE',
        search: ['kartuli', 'georgisch', 'géorgien', 'georgiano']
    },
    gn: {
        name: 'Guarani', native: 'Avañe’ẽ', tag: 'gn',
        search: ['guaraní', 'guaranisch']
    },
    gu: {
        name: 'Gujarati', native: 'ગુજરાતી', tag: 'gu-IN',
        search: ['gujarati', 'gujaratisch', 'goudjarati', 'guyaratí']
    },
    ht: {
        name: 'Haitian Creole', native: 'Kreyòl ayisyen', tag: 'ht',
        search: ['kreyol', 'haitianisch', 'créole haïtien', 'criollo haitiano']
    },
    ha: {
        name: 'Hausa', native: 'Hausa', tag: 'ha',
        search: ['hausa', 'haoussa']
    },
    haw: {
        name: 'Hawaiian', native: 'ʻŌlelo Hawaiʻi', tag: 'haw',
        search: ['hawaiian', 'hawaiisch', 'hawaïen', 'hawaiiano']
    },
    hmn: {
        name: 'Hmong', native: 'Hmoob', tag: 'hmn',
        search: ['hmong', 'miao']
    },
    is: {
        name: 'Icelandic', native: 'Íslenska', tag: 'is-IS',
        search: ['isländisch', 'islandais', 'islandés']
    },
    ig: {
        name: 'Igbo', native: 'Igbo', tag: 'ig',
        search: ['igbo', 'ibo']
    },
    ga: {
        name: 'Irish', native: 'Gaeilge', tag: 'ga-IE',
        search: ['gaeilge', 'irisch', 'irlandais', 'irlandés']
    },
    jv: {
        name: 'Javanese', native: 'Basa Jawa', tag: 'jv',
        search: ['jawa', 'javanisch', 'javanais', 'javanés']
    },
    kn: {
        name: 'Kannada', native: 'ಕನ್ನಡ', tag: 'kn-IN',
        search: ['kannada', 'canarés', 'kannadisch']
    },
    kk: {
        name: 'Kazakh', native: 'Қазақ тілі', tag: 'kk-KZ',
        search: ['qazaq', 'kasachisch', 'kazakh', 'kazajo']
    },
    km: {
        name: 'Khmer', native: 'ខ្មែរ', tag: 'km-KH',
        search: ['kambodschanisch', 'khmer', 'jemer']
    },
    rw: {
        name: 'Kinyarwanda', native: 'Ikinyarwanda', tag: 'rw',
        search: ['rwanda', 'kinyarwanda']
    },
    ky: {
        name: 'Kyrgyz', native: 'Кыргызча', tag: 'ky-KG',
        search: ['kirgisisch', 'kirghize', 'kirguís']
    },
    lo: {
        name: 'Lao', native: 'ລາວ', tag: 'lo-LA',
        search: ['laotisch', 'laotien', 'laosiano']
    },
    la: {
        name: 'Latin', native: 'Latina', tag: 'la',
        search: ['latina', 'latein', 'latin', 'latín']
    },
    lv: {
        name: 'Latvian', native: 'Latviešu', tag: 'lv-LV',
        search: ['latviešu', 'lettisch', 'letton', 'letón']
    },
    lt: {
        name: 'Lithuanian', native: 'Lietuvių', tag: 'lt-LT',
        search: ['lietuvių', 'litauisch', 'lituanien', 'lituano']
    },
    lb: {
        name: 'Luxembourgish', native: 'Lëtzebuergesch', tag: 'lb',
        search: ['lëtzebuergesch', 'luxemburgisch', 'luxembourgeois', 'luxemburgués']
    },
    mk: {
        name: 'Macedonian', native: 'Македонски', tag: 'mk-MK',
        search: ['makedonski', 'mazedonisch', 'macédonien', 'macedonio']
    },
    mg: {
        name: 'Malagasy', native: 'Malagasy', tag: 'mg',
        search: ['malagasy', 'malagassisch']
    },
    ml: {
        name: 'Malayalam', native: 'മലയാളം', tag: 'ml-IN',
        search: ['malayalam']
    },
    mt: {
        name: 'Maltese', native: 'Malti', tag: 'mt',
        search: ['malti', 'maltesisch', 'maltais', 'maltés']
    },
    mr: {
        name: 'Marathi', native: 'मराठी', tag: 'mr-IN',
        search: ['marathi']
    },
    mn: {
        name: 'Mongolian', native: 'Монгол', tag: 'mn-MN',
        search: ['mongolisch', 'mongol']
    },
    ne: {
        name: 'Nepali', native: 'नेपाली', tag: 'ne-NP',
        search: ['nepalesisch', 'népalais', 'nepalí']
    },
    or: {
        name: 'Odia', native: 'ଓଡ଼ିଆ', tag: 'or-IN',
        search: ['oriya', 'odia', 'orya']
    },
    ps: {
        name: 'Pashto', native: 'پښتو', tag: 'ps',
        search: ['paschtu', 'pachto', 'pastún']
    },
    pa: {
        name: 'Punjabi', native: 'ਪੰਜਾਬੀ', tag: 'pa-IN',
        search: ['panjabi', 'punjabi', 'pendschabi', 'penjabi']
    },
    qu: {
        name: 'Quechua', native: 'Runasimi', tag: 'qu',
        search: ['quechua', 'ketschua', 'quichua']
    },
    sm: {
        name: 'Samoan', native: 'Gagana Samoa', tag: 'sm',
        search: ['samoan', 'samoanisch']
    },
    gd: {
        name: 'Scottish Gaelic', native: 'Gàidhlig', tag: 'gd-GB',
        search: ['gàidhlig', 'schottisch-gälisch', 'gaélique écossais', 'gaélico escocés']
    },
    sr: {
        name: 'Serbian', native: 'Српски', tag: 'sr-RS',
        search: ['srpski', 'serbisch', 'serbe', 'serbio']
    },
    st: {
        name: 'Sesotho', native: 'Sesotho', tag: 'st',
        search: ['sotho', 'sesotho', 'süd-sotho']
    },
    sn: {
        name: 'Shona', native: 'chiShona', tag: 'sn',
        search: ['shona', 'chishona']
    },
    sd: {
        name: 'Sindhi', native: 'سنڌي', tag: 'sd',
        search: ['sindhi']
    },
    si: {
        name: 'Sinhala', native: 'සිංහල', tag: 'si-LK',
        search: ['sinhala', 'singhalesisch', 'cingalais', 'cingalés']
    },
    sk: {
        name: 'Slovak', native: 'Slovenčina', tag: 'sk-SK',
        search: ['slovenčina', 'slowakisch', 'slovaque', 'eslovaco']
    },
    sl: {
        name: 'Slovenian', native: 'Slovenščina', tag: 'sl-SI',
        search: ['slovenščina', 'slowenisch', 'slovène', 'esloveno']
    },
    so: {
        name: 'Somali', native: 'Soomaali', tag: 'so-SO',
        search: ['somali', 'somalisch']
    },
    su: {
        name: 'Sundanese', native: 'Basa Sunda', tag: 'su',
        search: ['sunda', 'sundanesisch', 'soundanais', 'sundanés']
    },
    tg: {
        name: 'Tajik', native: 'Тоҷикӣ', tag: 'tg-TJ',
        search: ['tojiki', 'tadschikisch', 'tadjik', 'tayiko']
    },
    ta: {
        name: 'Tamil', native: 'தமிழ்', tag: 'ta-IN',
        search: ['tamil', 'tamilisch', 'tamoul']
    },
    te: {
        name: 'Telugu', native: 'తెలుగు', tag: 'te-IN',
        search: ['telugu', 'telugú']
    },
    bo: {
        name: 'Tibetan', native: 'བོད་སྐད', tag: 'bo',
        search: ['tibetisch', 'tibétain', 'tibetano']
    },
    tl2: {
        name: 'Toki Pona', native: 'toki pona', tag: 'x-tok',
        search: ['toki pona', 'toki']
    },
    to: {
        name: 'Tongan', native: 'Lea faka-Tonga', tag: 'to',
        search: ['tongaisch', 'tongien', 'tongano']
    },
    tk: {
        name: 'Turkmen', native: 'Türkmen', tag: 'tk',
        search: ['turkmenisch', 'turkmène', 'turkmeno']
    },
    uz: {
        name: 'Uzbek', native: 'Oʻzbek', tag: 'uz-UZ',
        search: ['oʻzbek', 'usbekisch', 'ouzbek', 'uzbeko']
    },
    cy: {
        name: 'Welsh', native: 'Cymraeg', tag: 'cy-GB',
        search: ['cymraeg', 'walisisch', 'gallois', 'galés']
    },
    yi: {
        name: 'Yiddish', native: 'ייִדיש', tag: 'yi',
        search: ['jiddisch', 'yiddish', 'yidis', 'yídish']
    },
    yo: {
        name: 'Yoruba', native: 'Yorùbá', tag: 'yo',
        search: ['yoruba', 'yorùbá']
    },
    zu: {
        name: 'Zulu', native: 'isiZulu', tag: 'zu-ZA',
        search: ['zulu', 'isizulu']
    },
    ty: {
        name: 'Tahitian', native: 'Reo Tahiti', tag: 'ty',
        search: ['tahitian', 'tahitisch', 'tahitien', 'tahitiano']
    },
    nah: {
        name: 'Nahuatl', native: 'Nāhuatl', tag: 'nah',
        search: ['nahuatl', 'aztec', 'aztekisch', 'aztèque']
    },
    /* The funny ones. No translation engine here, so these are entirely
       for show — the speaker will politely admit it has no such voice. */
    tlh: {
        name: 'Klingon', native: 'tlhIngan Hol', tag: 'tlh',
        search: ['klingon', 'tlhingan', 'tlhingan hol', 'klingonisch', 'klingonien', '克林贡语']
    },
    shy: {
        name: 'Shyriiwook', native: 'Wookiee', tag: 'x-shy',
        search: ['wookiee', 'wookie', 'shyriiwook', 'star wars', 'chewbacca']
    },
    hut: {
        name: 'Huttese', native: 'Huttese', tag: 'x-hut',
        search: ['hutt', 'huttese', 'jabba', 'star wars']
    },
    mando: {
        name: 'Mando’a', native: 'Mando’a', tag: 'x-mando',
        search: ['mandalorian', 'mandoa', 'mando’a', 'star wars']
    },
    elv: {
        name: 'Elvish (Sindarin)', native: 'Sindarin', tag: 'x-sin',
        search: ['elvish', 'elf', 'sindarin', 'tolkien', 'lotr', 'lord of the rings']
    },
    dth: {
        name: 'Dothraki', native: 'Dothraki', tag: 'x-dth',
        search: ['dothraki', 'game of thrones', 'got']
    },
    hvl: {
        name: 'High Valyrian', native: 'Valyrio Muño', tag: 'x-hvl',
        search: ['valyrian', 'high valyrian', 'game of thrones', 'got']
    },
    pig: {
        name: 'Pig Latin', native: 'Igpay Atinlay', tag: 'x-pig',
        search: ['pig latin', 'igpay', 'atinlay']
    },
    pir: {
        name: 'Pirate English', native: 'Pirate Speak', tag: 'x-pirate',
        search: ['pirate', 'pirate english', 'pirate speak', 'talk like a pirate', 'arrr', 'pirat', 'pirata', 'pirate français', '海盗英语', '海賊英語']
    }
};
const STYLES = ['formal', 'informal', 'simple', 'kitten'];
function isLanguageCode(value) {
    return typeof value === 'string' && Object.prototype.hasOwnProperty.call(LANGS, value);
}
function isStyle(value) {
    return typeof value === 'string' && STYLES.includes(value);
}
/** The catalogue entry for a code we already know exists. */
function language(code) {
    const entry = LANGS[code];
    if (!entry) {
        throw new Error(`Unknown language code "${code}"`);
    }
    return entry;
}
/**
 * The language name the translation API expects. The API works in English
 * names ("English", "German"), not the two-letter codes the UI uses, so the
 * catalogue's own `name` is what gets sent. "Detect language" has no name of
 * its own: the source side defaults to English, matching the rest of the app.
 */
function apiName(code) {
    if (code === AUTO_CODE)
        return language('en').name;
    return language(code).name;
}
/** Lower-case and strip accents so "Māori" matches "maori". */
function normalize(value) {
    return String(value).toLowerCase()
        .replace(/ß/g, 'ss')
        .replace(/ø/g, 'o')
        .replace(/æ/g, 'ae')
        .replace(/œ/g, 'oe')
        .replace(/ł/g, 'l')
        .replace(/đ/g, 'd')
        .replace(/ı/g, 'i')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}


// ---------- translator/language-catalog ----------
/**
 * Search over the language catalogue: builds one searchable string per
 * language (English name, native name and common exonyms) and answers
 * "which languages match this query?".
 */
const LanguageCatalog = class LanguageCatalog {
    index = new Map();
    /** Language codes matching `query`, sorted by English name. */
    codesFor(side, query = '') {
        const needle = normalize(query);
        const matches = (code) => !needle || this.searchIndex(code).includes(needle);
        const codes = Object.keys(LANGS)
            .filter((code) => code !== AUTO_CODE && matches(code))
            .sort((a, b) => language(a).name.localeCompare(language(b).name));
        /* Only the source side may auto-detect. */
        if (side === 'source' && matches(AUTO_CODE)) {
            codes.unshift(AUTO_CODE);
        }
        return codes;
    }
    language(code) {
        return language(code);
    }
    searchIndex(code) {
        const cached = this.index.get(code);
        if (cached !== undefined)
            return cached;
        const entry = language(code);
        const haystack = normalize([entry.name, entry.native, ...entry.search].join(' '));
        this.index.set(code, haystack);
        return haystack;
    }
}


// ---------- translator/speech-service ----------
/**
 * Reading translations aloud.
 *
 * Uses the browser's own speechSynthesis, fed by the OS speech engine. Only
 * voices the browser reports as local are used, so text is never sent to a
 * remote service to generate audio.
 */
const SpeechService = class SpeechService {
    utterance = null;
    get supported() {
        return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
    }
    /** Reads `text` in `language`, reporting completion through `onEnd`. */
    speak(text, language, onEnd) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = this.pickVoice(language.tag);
        utterance.lang = language.tag;
        utterance.onend = onEnd;
        utterance.onerror = onEnd;
        this.utterance = utterance;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    }
    cancel() {
        if (!this.supported)
            return;
        this.utterance = null;
        window.speechSynthesis.cancel();
    }
    /** Whether the chosen language has an offline voice on this device. */
    hasVoice(language) {
        return this.pickVoice(language.tag) !== null;
    }
    /**
     * Voices can load asynchronously; a warm-up read keeps them ready.
     */
    prime() {
        if (!this.supported)
            return;
        window.speechSynthesis.getVoices();
        window.speechSynthesis.addEventListener('voiceschanged', () => {
            window.speechSynthesis.getVoices();
        });
    }
    pickVoice(tag) {
        const wanted = tag.toLowerCase();
        const base = wanted.split('-')[0] ?? wanted;
        let best = null;
        let bestRank = 0;
        for (const voice of window.speechSynthesis.getVoices()) {
            /* voice.localService === false means a cloud voice (e.g. Chrome's
               "Google" voices); exclude those. */
            if (voice.localService === false)
                continue;
            const lang = voice.lang.toLowerCase();
            let rank = 0;
            if (lang === wanted)
                rank = voice.default ? 4 : 3;
            else if (lang.split('-')[0] === base)
                rank = voice.default ? 2 : 1;
            if (rank > bestRank) {
                best = voice;
                bestRank = rank;
            }
        }
        return best;
    }
}
/* If the user navigates away mid-sentence, take the voice with us. */
window.addEventListener('pagehide', () => {
    if ('speechSynthesis' in window)
        window.speechSynthesis.cancel();
});


// ---------- translator/translator-state ----------
/**
 * The translator's state and the rules that keep it sensible.
 *
 * Pure data and pure functions: no DOM, so the rules (keep the pair distinct,
 * remember recent languages) can be reasoned about and tested on their own.
 */
const DEFAULT_RECENT = ['en', 'de', 'mi'];
const MAX_RECENT = 6;
function createDefaultState() {
    return {
        source: 'en',
        target: 'de',
        style: null,
        recent: {
            source: [...DEFAULT_RECENT],
            target: [...DEFAULT_RECENT]
        },
        dataDefault: true
    };
}
/** Moves `code` to the front of the side's recent list, capped at six. */
function noteUse(state, side, code) {
    const list = state.recent[side];
    const at = list.indexOf(code);
    if (at !== -1)
        list.splice(at, 1);
    list.unshift(code);
    if (list.length > MAX_RECENT)
        list.length = MAX_RECENT;
}
/**
 * Picks a language for one side, keeping the pair distinct Google-style: if
 * the chosen language is already in use on the other side, the other side
 * takes over whatever this side held before (falling back to an English /
 * German pair when that was "Detect language").
 */
function applySelection(state, side, code) {
    if (!isLanguageCode(code))
        return false;
    if (side === 'target' && code === AUTO_CODE)
        return false;
    const other = side === 'source' ? 'target' : 'source';
    if (code !== state[side] && code === state[other]) {
        const hand = state[side];
        state[other] = hand === AUTO_CODE || hand === code
            ? (code === 'en' ? 'de' : 'en')
            : hand;
    }
    state[side] = code;
    noteUse(state, side, code);
    return true;
}
/**
 * Swaps the pair. "Detect language" has no real detector here, so it stands
 * in as English when it moves to the target side.
 */
function swapPair(state) {
    const source = state.source === AUTO_CODE ? 'en' : state.source;
    state.source = state.target;
    state.target = source;
    noteUse(state, 'source', state.source);
    noteUse(state, 'target', state.target);
}
function isSide(value) {
    return value === 'source' || value === 'target';
}
function sanitizeRecent(value) {
    if (!Array.isArray(value))
        return null;
    const seen = new Set();
    for (const code of value) {
        if (isLanguageCode(code))
            seen.add(code);
    }
    return [...seen].slice(0, MAX_RECENT);
}


// ---------- translator/storage-service ----------
/**
 * Saving and restoring the translator between visits.
 *
 * Anything unrecognised in the stored blob (an old format, a hand-edited
 * value, a language code we no longer know) is dropped rather than trusted.
 */
const SESSION_STORE_KEY = 'translate-state';
function parseStored(raw) {
    if (!raw)
        return null;
    try {
        const parsed = JSON.parse(raw);
        return parsed !== null && typeof parsed === 'object' ? parsed : null;
    }
    catch {
        return null;
    }
}
const StorageService = class StorageService {
    storage;
    constructor(storage = window.localStorage) {
        this.storage = storage;
    }
    /** Writes the language choices and the current text in one record. */
    save(state, session) {
        writeStorage(this.storage, SESSION_STORE_KEY, JSON.stringify({
            source: state.source,
            target: state.target,
            style: state.style,
            recent: state.recent,
            input: session.input,
            output: session.output
        }));
    }
    /**
     * Applies the stored language choices and recent lists to `state`, and
     * returns the stored text, if any, for the caller to place in the DOM.
     */
    restore(state) {
        const saved = parseStored(readStorage(this.storage, SESSION_STORE_KEY));
        if (!saved)
            return { input: null, output: null };
        const source = saved['source'];
        if (isLanguageCode(source))
            state.source = source;
        const target = saved['target'];
        if (isLanguageCode(target) && target !== 'auto')
            state.target = target;
        const style = saved['style'];
        if (isStyle(style))
            state.style = style;
        const recent = saved['recent'];
        if (recent !== null && typeof recent === 'object') {
            ['source', 'target'].forEach((side) => {
                const list = sanitizeRecent(recent[side]);
                if (list)
                    state.recent[side] = list;
            });
        }
        return {
            input: storedString(saved, 'input'),
            output: storedString(saved, 'output')
        };
    }
}


// ---------- translator/translation-service ----------
/**
 * The translation engine: a call to the AI API.
 *
 * The request matches the API's contract exactly —
 *
 *   POST {base}/v1/translations
 *   { "from": "English", "to": "German", "text": "...", "tone": "formal" }
 *   -> { "translation": "..." }
 *
 * — where the languages are the English names the catalogue already carries
 * (see `apiName` in languages.ts) rather than the two-letter codes the UI
 * works in, and `tone` is the writing style, omitted when none is chosen.
 *
 * Two local-development realities are handled here rather than pretended
 * away. The dev API at https://ai.hellyer.test uses a self-signed certificate
 * and sends no CORS headers, so a browser must be started with
 * --ignore-certificate-errors and the API must answer cross-origin requests.
 * Nothing in JavaScript can override either of those; see README.md. This
 * service simply reports a failure clearly when the browser blocks the call.
 */
/** Where the API lives. Overridable per page via `data-api-base`. */
const DEFAULT_API_BASE = 'https://ai.hellyer.test';
/** A failure the UI can show without leaking a stack trace. */
const TranslationError = class TranslationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'TranslationError';
    }
}
const TranslationService = class TranslationService {
    base;
    constructor(base = DEFAULT_API_BASE) {
        this.base = base.replace(/\/+$/, '');
    }
    /**
     * Translates `request`, resolving with the translated text.
     *
     * `signal` lets the caller cancel a request whose text has been replaced;
     * the controller uses that to keep one in-flight request at a time.
     */
    async translate(request, signal) {
        const body = {
            from: apiName(request.source),
            to: apiName(request.target),
            text: request.text
        };
        if (request.tone !== null)
            body['tone'] = request.tone;
        let response;
        try {
            response = await fetch(`${this.base}/v1/translations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal
            });
        }
        catch (error) {
            /* fetch only rejects on a network-level failure: DNS, refused
               connection, a certificate the browser refused, or CORS. A
               blocked cross-origin response surfaces as a TypeError with no
               detail, so say the one thing that is actionable. */
            if (error instanceof DOMException && error.name === 'AbortError')
                throw error;
            throw new TranslationError('Could not reach the translation service. Check your connection and that the API allows this site.');
        }
        if (!response.ok) {
            throw new TranslationError(await this.describeFailure(response));
        }
        const payload = await this.readJson(response);
        const translation = payload['translation'];
        if (typeof translation !== 'string') {
            throw new TranslationError('The translation service returned an unexpected response.');
        }
        return translation;
    }
    async describeFailure(response) {
        if (response.status === 429)
            return 'Too many requests. Wait a moment and try again.';
        if (response.status >= 500)
            return 'The translation service is having trouble. Try again shortly.';
        /* The API may explain itself in JSON; fall back to the status line. */
        const payload = await this.readJson(response);
        const message = payload['error'] ?? payload['message'];
        if (typeof message === 'string' && message !== '')
            return message;
        return `The translation service refused the request (HTTP ${response.status}).`;
    }
    async readJson(response) {
        try {
            const parsed = await response.json();
            return parsed !== null && typeof parsed === 'object' ? parsed : {};
        }
        catch {
            return {};
        }
    }
}


// ---------- ui/icons ----------
/**
 * Inline SVG icons that the script swaps in at runtime. Everything already
 * present in the markup lives in the templates instead.
 */
const ICON_SEARCH = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>';
const ICON_CLEAR = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"></path></svg>';
const ICON_CHECK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5L20 7"/></svg>';
const ICON_DONE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5L20 7"></path></svg>';


// ---------- translator/language-menu ----------
/**
 * One language pulldown: a search box plus a scrollable list of languages.
 *
 * Built once per side at start-up, then re-filtered as the visitor types.
 * Markup is created in code because the list is far too long to repeat in
 * the template, and the active language needs a class of its own.
 */
const LanguageMenu = class LanguageMenu {
    side;
    catalog;
    callbacks;
    menu;
    button;
    input;
    clearButton;
    options;
    constructor(side, catalog, callbacks) {
        this.side = side;
        this.catalog = catalog;
        this.callbacks = callbacks;
        this.menu = requireElementById(`${side}-menu`);
        this.button = requireElementById(`${side}-select`);
        const panel = document.createElement('div');
        panel.className = 'lang-search';
        panel.innerHTML = ICON_SEARCH;
        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.id = `${side}-search`;
        this.input.className = 'lang-search-input';
        this.input.placeholder = 'Search languages';
        this.input.setAttribute('aria-label', `Search ${side} languages`);
        this.input.setAttribute('autocomplete', 'off');
        this.input.setAttribute('spellcheck', 'false');
        this.clearButton = document.createElement('button');
        this.clearButton.type = 'button';
        this.clearButton.className = 'lang-search-clear';
        this.clearButton.setAttribute('aria-label', 'Clear search');
        this.clearButton.innerHTML = ICON_CLEAR;
        this.clearButton.hidden = true;
        this.options = document.createElement('div');
        this.options.className = 'lang-options';
        this.options.id = `${side}-options`;
        panel.append(this.input, this.clearButton);
        this.menu.replaceChildren(panel, this.options);
        this.wireEvents();
        this.fill('');
    }
    /** Rebuilds the list, e.g. after the pair changes so the tick moves. */
    refresh() {
        this.fill(this.input.value);
    }
    get isOpen() {
        return !this.menu.hidden;
    }
    open() {
        this.menu.hidden = false;
        this.button.setAttribute('aria-expanded', 'true');
        this.input.value = '';
        this.clearButton.hidden = true;
        this.fill('');
        this.input.focus();
    }
    close() {
        if (!this.isOpen && this.button.getAttribute('aria-expanded') !== 'true')
            return;
        this.menu.hidden = true;
        this.button.setAttribute('aria-expanded', 'false');
    }
    wireEvents() {
        this.input.addEventListener('input', () => {
            this.clearButton.hidden = this.input.value === '';
            this.fill(this.input.value);
        });
        this.input.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter')
                return;
            const first = this.options.querySelector('.lang-option');
            const code = first?.dataset['lang'];
            if (first && code) {
                event.preventDefault();
                this.callbacks.onSelect(code);
            }
        });
        this.clearButton.addEventListener('click', () => {
            this.input.value = '';
            this.clearButton.hidden = true;
            this.fill('');
            this.input.focus();
        });
    }
    fill(query) {
        const codes = this.catalog.codesFor(this.side, query);
        if (codes.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'lang-empty';
            empty.textContent = 'No languages found';
            this.options.replaceChildren(empty);
            return;
        }
        this.options.replaceChildren(...codes.map((code) => this.createOption(code)));
    }
    createOption(code) {
        const entry = this.catalog.language(code);
        const option = document.createElement('button');
        option.type = 'button';
        option.className = 'lang-option' + (this.callbacks.isActive(code) ? ' is-active' : '');
        option.dataset['lang'] = code;
        const name = document.createElement('span');
        name.className = 'opt-name';
        name.textContent = entry.name;
        const nativeName = document.createElement('span');
        nativeName.className = 'opt-native';
        nativeName.textContent = entry.native;
        const check = document.createElement('span');
        check.className = 'opt-check';
        check.innerHTML = ICON_CHECK;
        option.append(name, nativeName, check);
        option.addEventListener('click', () => this.callbacks.onSelect(code));
        return option;
    }
}


// ---------- translator/translator-view ----------
/**
 * Every element the translator owns, resolved once so the rest of the code
 * can stop asking the document where things are.
 */
const TranslatorView = class TranslatorView {
    card = requireElement('.translator-card');
    textarea = requireElement('.panel.source textarea');
    output = requireElement('.panel.target .translation');
    counter = requireElement('.panel.source .char-count');
    swapButton = requireElementById('swap-btn');
    listenButton = requireElementById('listen-btn');
    copyButton = requireElementById('copy-btn');
    clearButton = requireElementById('clear-btn');
    styleButtons = [...document.querySelectorAll('.style-option')];
    languageTabs = [...document.querySelectorAll('.lang-tab')];
    static exists() {
        return optionalElement('.translator-card') !== null;
    }
    get input() {
        return this.textarea.value;
    }
    set input(value) {
        this.textarea.value = value;
    }
    get outputText() {
        return this.output.textContent ?? '';
    }
    set outputText(value) {
        this.output.textContent = value;
    }
    /** True while a translation is in flight, so callers can leave the text be. */
    get isBusy() {
        return this.card.classList.contains('is-translating');
    }
    /** Dims the output and marks the card busy while the API is called. */
    setBusy(busy) {
        this.card.classList.toggle('is-translating', busy);
        this.output.setAttribute('aria-busy', busy ? 'true' : 'false');
    }
    /** Shows a failure in place of the translation, in the error colour. */
    showError(message) {
        this.output.classList.add('is-error');
        this.output.textContent = message;
    }
    /** Clears the error styling before the next normal render. */
    clearError() {
        this.output.classList.remove('is-error');
    }
    updateCounter() {
        const length = this.input.length.toLocaleString('en-NZ');
        this.counter.textContent = `${length} / 5,000`;
        this.counter.classList.toggle('warn', this.input.length > 4500);
        this.clearButton.hidden = this.input.length === 0;
    }
    /** Copy and listen are meaningless with nothing to read, or on an error. */
    updateActionButtons() {
        const empty = this.outputText.trim() === '' || this.output.classList.contains('is-error');
        this.copyButton.disabled = empty;
        this.listenButton.disabled = empty;
    }
    renderLabels(pair) {
        for (const side of ['source', 'target']) {
            const tabs = requireElementById(`${side}-tabs`);
            const from = requireElement('.lang-tab.from', tabs);
            const into = requireElement('.lang-tab.into', tabs);
            from.textContent = pair.source.name;
            into.textContent = pair.target.name;
        }
    }
    renderStyles(state) {
        for (const button of this.styleButtons) {
            const active = button.dataset['style'] === state.style;
            button.classList.toggle('active', active);
            button.setAttribute('aria-pressed', active ? 'true' : 'false');
        }
    }
    setSpeaking(speaking) {
        this.listenButton.classList.toggle('is-speaking', speaking);
        this.listenButton.setAttribute('aria-pressed', speaking ? 'true' : 'false');
        this.listenButton.setAttribute('aria-label', speaking ? 'Stop reading' : 'Listen to translation');
    }
    markUnsupportedSpeech() {
        this.listenButton.setAttribute('aria-label', 'Text reading is not supported in this browser');
    }
    /** On a keyboard-first device an empty box is an invitation. */
    focusInvitation() {
        if (this.input !== '')
            return;
        if (!window.matchMedia('(pointer: fine)').matches)
            return;
        if (window.innerWidth <= 768)
            return;
        this.textarea.focus({ preventScroll: true });
    }
}


// ---------- translator/translator-controller ----------
/**
 * Translator UI: languages, swapping, writing style, copy and offline speech,
 * plus the live translation itself.
 *
 * Translating is an AJAX call to the AI API (see translation-service.ts),
 * made as the visitor types and when the language pair or style changes. One
 * request is in flight at a time: a newer keystroke aborts the older call, so
 * the output always reflects the latest input. Runs only on the home page;
 * other templates omit the translator card.
 *
 * Constructor dependencies are resolved by tsyringe, so a different storage,
 * clipboard, speech or translation implementation can be substituted in one
 * place.
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
/** Wait this long after the last keystroke before asking the API. */
const TYPING_PAUSE_MS = 500;
let TranslatorController = class TranslatorController {
    storage;
    clipboard;
    speech;
    toast;
    translations;
    state = createDefaultState();
    menus;
    view;
    copyIconHtml;
    catalog;
    speaking = false;
    /** The debounce timer and the request it is about to make, if any. */
    typingTimer = null;
    inFlight = null;
    /** The text the current output corresponds to, to skip needless calls. */
    translatedKey = null;
    constructor(view, catalog, storage, clipboard, speech, toast, translations) {
        this.storage = storage;
        this.clipboard = clipboard;
        this.speech = speech;
        this.toast = toast;
        this.translations = translations;
        this.view = view;
        this.catalog = catalog;
        this.copyIconHtml = view.copyButton.innerHTML;
        this.menus = {
            source: new LanguageMenu('source', catalog, this.menuCallbacks('source')),
            target: new LanguageMenu('target', catalog, this.menuCallbacks('target'))
        };
    }
    /* ---------- Start-up ---------- */
    init() {
        this.wireEvents();
        if (this.speech.supported) {
            this.speech.prime();
        }
        else {
            this.view.markUnsupportedSpeech();
        }
        const saved = this.storage.restore(this.state);
        if (saved.input !== null)
            this.view.input = saved.input;
        this.render();
        this.view.focusInvitation();
        /* Translate whatever is in the box now. A restored output from a
           previous visit is kept on screen until the fresh one arrives. */
        this.translate();
    }
    /* ---------- Wiring ---------- */
    wireEvents() {
        const { view } = this;
        view.swapButton.addEventListener('click', () => this.swap());
        for (const tab of view.languageTabs) {
            tab.addEventListener('click', () => this.swap());
        }
        view.copyButton.addEventListener('click', () => void this.copyTranslation());
        view.clearButton.addEventListener('click', () => this.clear());
        view.listenButton.addEventListener('click', () => this.toggleSpeech());
        view.textarea.addEventListener('input', () => {
            view.updateCounter();
            view.updateActionButtons();
            this.save();
            this.scheduleTranslation();
        });
        for (const side of ['source', 'target']) {
            const button = document.getElementById(`${side}-select`);
            button?.addEventListener('click', () => this.toggleMenu(side));
        }
        for (const button of view.styleButtons) {
            button.addEventListener('click', () => this.toggleStyle(button.dataset['style'] ?? null));
        }
        document.addEventListener('click', (event) => {
            const target = event.target;
            if (!(target instanceof Element))
                return;
            if (target.closest('.lang-menu') || target.closest('.lang-select'))
                return;
            this.closeMenus();
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape')
                this.closeMenus();
        });
    }
    menuCallbacks(side) {
        return {
            isActive: (code) => this.sideValue(side) === code,
            onSelect: (code) => this.selectLang(side, code)
        };
    }
    /* ---------- Rendering ---------- */
    render() {
        this.renderLabels();
        for (const side of ['source', 'target']) {
            this.menus[side].refresh();
        }
        this.view.renderStyles(this.state);
        this.view.updateCounter();
        this.view.updateActionButtons();
    }
    /* The two languages currently being translated appear on the left of
       each pulldown: source first, then target, on both sides. */
    renderLabels() {
        this.view.renderLabels({
            source: this.catalog.language(this.state.source),
            target: this.catalog.language(this.state.target)
        });
    }
    /* ---------- Languages ---------- */
    sideValue(side) {
        return side === 'source' ? this.state.source : this.state.target;
    }
    selectLang(side, code) {
        if (!applySelection(this.state, side, code))
            return;
        this.closeMenus();
        this.save();
        this.render();
        this.translate();
    }
    toggleMenu(side) {
        const menu = this.menus[side];
        const wasOpen = menu.isOpen;
        this.closeMenus();
        if (!wasOpen)
            menu.open();
    }
    closeMenus() {
        this.menus.source.close();
        this.menus.target.close();
    }
    swap() {
        swapPair(this.state);
        const oldSource = this.view.input;
        this.view.input = this.view.outputText;
        this.view.outputText = oldSource;
        this.save();
        this.render();
        this.translate();
    }
    /* ---------- Writing style ---------- */
    toggleStyle(style) {
        if (style === null)
            return;
        this.state.style = this.state.style === style ? null : style;
        this.save();
        this.view.renderStyles(this.state);
        this.translate();
    }
    /* ---------- Copy ---------- */
    async copyTranslation() {
        const copied = await this.clipboard.write(this.view.outputText.trim());
        this.showToast(copied ? 'Translation copied' : 'Could not copy');
        if (!copied)
            return;
        const button = this.view.copyButton;
        button.innerHTML = ICON_DONE;
        setTimeout(() => { button.innerHTML = this.copyIconHtml; }, 1200);
    }
    clear() {
        this.cancelTranslation();
        this.view.input = '';
        this.view.clearError();
        this.view.outputText = '';
        this.translatedKey = null;
        this.view.updateCounter();
        this.view.updateActionButtons();
        this.save();
        this.view.textarea.focus();
    }
    /* ---------- Translation ---------- */
    /** Debounces a keystroke into a single API call once typing settles. */
    scheduleTranslation() {
        if (this.typingTimer !== null)
            clearTimeout(this.typingTimer);
        this.typingTimer = setTimeout(() => {
            this.typingTimer = null;
            this.translate();
        }, TYPING_PAUSE_MS);
    }
    /** Drops any pending or in-flight request without touching the output. */
    cancelTranslation() {
        if (this.typingTimer !== null) {
            clearTimeout(this.typingTimer);
            this.typingTimer = null;
        }
        if (this.inFlight !== null) {
            this.inFlight.abort();
            this.inFlight = null;
        }
    }
    /**
     * Asks the API for the current text and shows the result. Safe to call at
     * any time: an empty box, an unchanged request, or a request already
     * answered for the same text are all no-ops.
     */
    translate() {
        const text = this.view.input.trim();
        if (text === '') {
            this.cancelTranslation();
            this.view.clearError();
            this.view.setBusy(false);
            this.view.outputText = '';
            this.translatedKey = null;
            this.view.updateActionButtons();
            this.save();
            return;
        }
        /* Same text, languages and style as the output on screen: nothing to do. */
        const key = this.translationKey(text);
        if (key === this.translatedKey)
            return;
        this.cancelTranslation();
        const controller = new AbortController();
        this.inFlight = controller;
        this.view.clearError();
        this.view.setBusy(true);
        const request = {
            source: this.state.source,
            target: this.state.target,
            text,
            tone: this.state.style
        };
        void this.translations.translate(request, controller.signal)
            .then((translation) => {
            /* A newer request may have replaced this one while it was out. */
            if (this.inFlight !== controller)
                return;
            this.inFlight = null;
            this.view.setBusy(false);
            this.view.clearError();
            this.view.outputText = translation;
            this.translatedKey = key;
            this.view.updateActionButtons();
            this.save();
        })
            .catch((error) => {
            if (controller.signal.aborted || this.inFlight !== controller)
                return;
            this.inFlight = null;
            this.view.setBusy(false);
            this.translatedKey = null;
            this.view.showError(error instanceof TranslationError
                ? error.message
                : 'Something went wrong while translating.');
            this.view.updateActionButtons();
            this.save();
        });
    }
    /** Identifies a request so identical ones are not repeated. */
    translationKey(text) {
        const source = this.state.source === AUTO_CODE ? 'en' : this.state.source;
        return `${source}\u0000${this.state.target}\u0000${this.state.style ?? ''}\u0000${text}`;
    }
    /* ---------- Speech ---------- */
    toggleSpeech() {
        if (!this.speech.supported) {
            this.showToast('This browser cannot read text aloud');
            return;
        }
        if (this.speaking) {
            this.stopSpeaking();
            return;
        }
        const target = this.catalog.language(this.state.target);
        const text = this.view.outputText.trim();
        if (!text)
            return;
        if (!this.speech.hasVoice(target)) {
            this.showToast(`No offline ${target.name} voice on this device`);
            return;
        }
        this.speaking = true;
        this.view.setSpeaking(true);
        this.speech.speak(text, target, () => this.stopSpeaking());
    }
    stopSpeaking() {
        this.speech.cancel();
        this.speaking = false;
        this.view.setSpeaking(false);
    }
    /* ---------- Bits and pieces ---------- */
    showToast(message) {
        this.toast.show(message);
    }
    save() {
        this.storage.save(this.state, {
            input: this.view.input,
            output: this.view.outputText
        });
    }
};
TranslatorController = __decorate([
    injectable(),
    __metadata("design:paramtypes", [TranslatorView,
        LanguageCatalog,
        StorageService,
        Clipboard,
        SpeechService,
        Toast,
        TranslationService])
], TranslatorController);


// ---------- translator/app ----------
/**
 * Starts the translator card, if the page has one.
 */
const TranslatorApp = class TranslatorApp {
    static startIfPresent() {
        if (!TranslatorView.exists())
            return null;
        TranslatorApp.register(TranslatorApp.apiBase());
        const controller = container.resolve(TranslatorController);
        controller.init();
        return controller;
    }
    /**
     * The API base URL. The template can override it with a data-api-base
     * attribute on the translator card, so the same bundle can point at the
     * local dev API or the production one without a rebuild.
     */
    static apiBase() {
        const card = document.querySelector('.translator-card');
        const configured = card?.getAttribute('data-api-base') ?? '';
        return configured !== '' ? configured : DEFAULT_API_BASE;
    }
    /**
     * Registers the injectable building blocks. Kept separate from start-up so
     * tests can swap any of them for a fake before resolving the controller.
     */
    static register(apiBase = DEFAULT_API_BASE) {
        container.registerSingleton(TranslatorView);
        container.registerSingleton(LanguageCatalog);
        container.registerSingleton(StorageService);
        container.registerSingleton(Clipboard);
        container.registerSingleton(SpeechService);
        container.registerSingleton(Toast);
        container.registerInstance(TranslationService, new TranslationService(apiBase));
    }
}


// ---------- error/error-detector ----------
/**
 * Works out which status code and which URL the visitor was denied.
 *
 * The router in public/index.php serves the error template for any path other
 * than "/", but the status code reaches the browser separately, in order of
 * preference:
 *
 *   1. ?code=404  (or ?status=404) in the query string
 *   2. #404 in the fragment
 *   3. a same-origin cookie named "error_code" (e.g. set by nginx error_page,
 *      or by an upstream 5xx pass-through)
 *   4. Referer / original URL guessing, for hosts that keep the old path
 *      in a redirect fragment or query
 *
 * Anything unrecognised falls back to a plain 404 - the one error every site
 * can be relied upon to produce.
 */
const ErrorDetector = class ErrorDetector {
    location;
    cookie;
    referrer;
    constructor(location = window.location, cookie = document.cookie, referrer = document.referrer) {
        this.location = location;
        this.cookie = cookie;
        this.referrer = referrer;
    }
    get referrerUrl() {
        return this.referrer;
    }
    detect() {
        const params = new URLSearchParams(this.location.search || '');
        const code = this.validCode(params.get('code'))
            ?? this.validCode(params.get('status'))
            ?? this.validCode(params.get('err'))
            ?? this.validCode(this.readCookie('error_code'))
            ?? this.validCode((this.location.hash || '').replace(/^#\/?/, ''));
        let target = this.readTarget(this.location.search, this.location.hash);
        /* The router serves the error page at the requested path, so if
           nothing else identified it, the path we are on is the request
           that went wrong - unless we are somehow on the root. */
        if (!target && this.location.pathname && this.location.pathname !== '/') {
            target = this.location.pathname + this.location.search;
        }
        return { code: code ?? 404, target };
    }
    validCode(value) {
        const code = parseInt(value ?? '', 10);
        return code >= 400 && code <= 599 ? code : null;
    }
    readCookie(name) {
        const parts = (` ${this.cookie}`).split(`; ${name}=`);
        if (parts.length < 2)
            return null;
        const value = parts.pop()?.split(';').shift();
        if (value === undefined)
            return null;
        try {
            return decodeURIComponent(value);
        }
        catch {
            return null;
        }
    }
    /* Paths inside the fragment (some hosts redirect to /#/old/path)
       and the ?url= / ?path= / ?from= query keys all count as "requested". */
    readTarget(search, hash) {
        const params = new URLSearchParams(search || '');
        for (const key of ['url', 'path', 'from', 'uri', 'requested']) {
            const value = params.get(key);
            if (value)
                return value;
        }
        const fragment = (hash || '').replace(/^#\/?/, '');
        if (fragment && !/^\d{3}$/.test(fragment))
            return `/${fragment}`;
        return null;
    }
}


// ---------- error/messages ----------
/**
 * Error copy for every status code the site is prepared to explain, plus a
 * generic fallback for anything else.
 */
const MESSAGES = {
    400: {
        category: 'Bad Request',
        title: 'We couldn\u2019t parse that.',
        joke: 'The browser asked for something in a language this server doesn\u2019t speak. Grammar, mostly.',
        advice: 'Check the address for stray characters, half-finished query strings, or a copy-paste that lost a limb on the way over.'
    },
    401: {
        category: 'Unauthorized',
        title: 'You shall not pass.',
        joke: 'This page wants a password, and frankly it\u2019s being dramatic about it.',
        advice: 'Sign in first, then knock again. If you were already signed in, your session has quietly wandered off.'
    },
    403: {
        category: 'Forbidden',
        title: 'Nothing to see here.',
        joke: 'The page exists. It just doesn\u2019t want to be seen with you. It\u2019s not personal, it\u2019s policy.',
        advice: 'If you\u2019re certain you should have access, ask whoever controls the keys. Politely. With cake.'
    },
    404: {
        category: 'Not Found',
        title: 'This page is lost in translation.',
        joke: 'The address you asked for doesn\u2019t exist here. We looked. We even checked behind the sofa.',
        advice: 'It may have been moved, renamed, or never existed in the first place \u2014 which, in fairness, is a lot to expect from a design mock-up.'
    },
    405: {
        category: 'Method Not Allowed',
        title: 'Wrong verb.',
        joke: 'You knocked with the wrong hand. This page accepts one kind of request and you brought another.',
        advice: 'This is almost always a form or a fetch call doing something the server didn\u2019t agree to.'
    },
    408: {
        category: 'Request Timeout',
        title: 'The server dozed off.',
        joke: 'Your request took so long to finish its sentence that everyone stopped waiting.',
        advice: 'Check your connection and try again. Slower sites are a thing; vanished ones usually aren\u2019t.'
    },
    410: {
        category: 'Gone',
        title: 'Gone. Properly gone.',
        joke: 'This page didn\u2019t move, it left. No forwarding address, no note, just a dramatic exit.',
        advice: 'Unlike a 404, this one isn\u2019t coming back. Try the home page and start over.'
    },
    418: {
        category: 'I\u2019m a Teapot',
        title: 'I\u2019m a teapot.',
        joke: 'You asked a teapot to brew coffee. The teapot is short, stout, and not in the coffee business.',
        advice: 'This status code is a genuine joke from 1998 that refuses to die. There is nothing to fix; enjoy it.'
    },
    429: {
        category: 'Too Many Requests',
        title: 'Slow down there.',
        joke: 'You knocked a lot of times in a very short window. The door noticed, and mildly objected.',
        advice: 'Wait a moment and try again. Automated tools may want to add a delay between requests.'
    },
    451: {
        category: 'Unavailable For Legal Reasons',
        title: 'Unavailable for legal reasons.',
        joke: 'This page has been redacted by someone with a lawyer and a red pen.',
        advice: 'Nothing to retry here \u2014 the restriction is deliberate. Ask the site owner if you need the details.'
    },
    500: {
        category: 'Internal Server Error',
        title: 'The server tripped over its own shoelaces.',
        joke: 'Something broke on our side. It isn\u2019t you. It\u2019s almost never you.',
        advice: 'This one is entirely our fault. Give it a minute and try again \u2014 it may already be fixed.'
    },
    501: {
        category: 'Not Implemented',
        title: 'We never built that bit.',
        joke: 'The server understood the request and has decided, permanently, not to have implemented it.',
        advice: 'No amount of reloading will help. The feature simply isn\u2019t there.'
    },
    502: {
        category: 'Bad Gateway',
        title: 'The middleman dropped it.',
        joke: 'Our gateway asked the server behind it a question and got nonsense back. Rude.',
        advice: 'Usually brief. Reload in a moment; if it sticks around, it\u2019s on our end.'
    },
    503: {
        category: 'Service Unavailable',
        title: 'Taking a nap.',
        joke: 'The site is up but the bit that does the actual work is having a lie-down.',
        advice: 'This is normally a restart, a deploy, or far too much traffic. Try again shortly.'
    },
    504: {
        category: 'Gateway Timeout',
        title: 'We gave up waiting.',
        joke: 'Our gateway waited for the server behind it, then got bored and left the room.',
        advice: 'Reload in a moment. If it keeps timing out, the API behind this page is the thing to check.'
    },
    505: {
        category: 'HTTP Version Not Supported',
        title: 'Speaking a dialect we don\u2019t.',
        joke: 'Your browser requested a version of HTTP this server has never heard of.',
        advice: 'Try a current browser; if you\u2019re writing a client by hand, dial the version down.'
    },
    507: {
        category: 'Insufficient Storage',
        title: 'Run out of room.',
        joke: 'The server tried to write something down and there was no paper left.',
        advice: 'Almost always a disk that needs emptying. Nothing you can do from here except wait.'
    }
};
const GENERIC = {
    category: 'Something Went Wrong',
    title: 'Something went wrong.',
    joke: 'The server tried its best and its best wasn\u2019t quite enough.',
    advice: 'Try again in a moment. If the problem persists, it\u2019s probably not going away on its own.'
};
/** Fallback categories, so an unknown code still reads sensibly. */
function categoryFor(code) {
    if (code >= 400 && code < 500)
        return 'Client Error';
    if (code >= 500 && code < 600)
        return 'Server Error';
    return GENERIC.category;
}


// ---------- error/error-page ----------
/**
 * Paints the error card with the right copy, and wires the retry button.
 */
const ErrorPage = class ErrorPage {
    statusCode = requireElementById('status-code');
    statusCategory = requireElementById('status-category');
    statusTitle = requireElementById('status-title');
    statusJoke = requireElementById('status-joke');
    statusAdvice = requireElementById('status-advice');
    metaStatus = requireElementById('meta-status');
    metaUrl = requireElementById('meta-url');
    metaReferrer = requireElementById('meta-referrer');
    metaTime = requireElementById('meta-time');
    retryButton = requireElementById('retry-btn');
    static exists() {
        return document.getElementById('status-code') !== null;
    }
    static start() {
        const page = new ErrorPage();
        page.render();
        return page;
    }
    render(detector = new ErrorDetector()) {
        const { code, target } = detector.detect();
        const message = MESSAGES[code] ?? GENERIC;
        document.title = `${code} ${message.category} \u2014 translate.hellyer.kiwi`;
        const category = MESSAGES[code] ? message.category : categoryFor(code);
        this.statusCode.textContent = String(code);
        this.statusCategory.textContent = category;
        this.statusTitle.textContent = message.title;
        this.statusJoke.textContent = message.joke;
        this.statusAdvice.textContent = message.advice;
        this.metaStatus.textContent = `${code} ${category}`;
        this.metaUrl.textContent = target ?? 'Not recorded by the server \u2014 ' +
            'add ?code= and the original path to fix that.';
        this.metaReferrer.textContent = detector.referrerUrl || 'Nothing. You arrived alone.';
        this.metaTime.textContent = this.formatTime();
        /* Retry: go back through history so the original URL is retried, and
           reload as the fallback when there is no history to walk. */
        this.retryButton.addEventListener('click', () => {
            if (window.history.length > 1)
                window.history.back();
            else
                window.location.reload();
        });
    }
    formatTime() {
        try {
            return new Date().toLocaleString('en-NZ', { dateStyle: 'medium', timeStyle: 'medium' });
        }
        catch {
            return new Date().toString();
        }
    }
}


// ---------- error/app ----------
/**
 * Starts the error card, if the page has one.
 *
 * Only runs on the error template, so the bundle can be shared by every page.
 */
const ErrorPageApp = class ErrorPageApp {
    static startIfPresent() {
        if (!ErrorPage.exists())
            return null;
        return ErrorPage.start();
    }
}


// ---------- main ----------
/**
 * Entry point for every page.
 *
 * Reflect metadata is imported first because tsyringe reads the design
 * metadata TypeScript emits for constructor parameters on first use.
 */
ThemeController.start();
TranslatorApp.startIfPresent();
ErrorPageApp.startIfPresent();


}());
