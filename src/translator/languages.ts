/**
 * The language catalogue and the search index built over it.
 *
 * `name` is also the language name sent to the translation API (see
 * `apiName`), `tag` is what the speech synthesiser is asked for, and `native`
 * is what the menu shows underneath each name.
 */

export const AUTO_CODE = 'auto';

export type LanguageCode = string;
export type Side = 'source' | 'target';

export interface Language {
	readonly name: string;
	readonly native: string;
	/** BCP 47 tag handed to speech synthesis; empty means "no voice". */
	readonly tag: string;
	/** Common exonyms, so people can find a language by its foreign names. */
	readonly search: readonly string[];
}

export const LANGS: Readonly<Record<LanguageCode, Language>> = {
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

export const STYLES = ['formal', 'informal', 'simple', 'kitten'] as const;
export type Style = (typeof STYLES)[number];

export function isLanguageCode(value: unknown): value is LanguageCode {
	return typeof value === 'string' && Object.prototype.hasOwnProperty.call(LANGS, value);
}

export function isStyle(value: unknown): value is Style {
	return typeof value === 'string' && (STYLES as readonly string[]).includes(value);
}

/** The catalogue entry for a code we already know exists. */
export function language(code: LanguageCode): Language {
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
export function apiName(code: LanguageCode): string {
	if (code === AUTO_CODE) return language('en').name;
	return language(code).name;
}

/** Lower-case and strip accents so "Māori" matches "maori". */
export function normalize(value: string): string {
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
