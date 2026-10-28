	/* Theme toggle: browser default until clicked, then the choice sticks. */
	(function () {
		var root = document.documentElement;
		var toggle = document.getElementById('theme-toggle');
		var media = window.matchMedia('(prefers-color-scheme: dark)');

		function storedChoice() {
			try {
				var stored = localStorage.getItem('translate-theme');
				return stored === 'light' || stored === 'dark' ? stored : null;
			} catch (e) {
				return null;
			}
		}

		function label() {
			var next = root.dataset.theme === 'dark' ? 'light' : 'dark';
			toggle.setAttribute('aria-label', 'Switch to ' + next + ' theme');
		}

		toggle.addEventListener('click', function () {
			var next = root.dataset.theme === 'dark' ? 'light' : 'dark';
			root.dataset.theme = next;
			try { localStorage.setItem('translate-theme', next); } catch (e) {}
			label();
		});

		/* Follow the OS while the visitor has never picked a theme. */
		media.addEventListener('change', function (event) {
			if (!storedChoice()) {
				root.dataset.theme = event.matches ? 'dark' : 'light';
				label();
			}
		});

		label();
	})();

	/* Translator UI: languages, swapping, writing style, copy and offline speech.
	   There is still no translation engine; the output text is a placeholder.
	   Runs only on the home page; other templates omit the translator card. */
	(function () {
		'use strict';

		if (!document.querySelector('.translator-card')) return;

		var LANGS = {
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
				search: ['hawaiian', 'hawaiisch', 'hawaïen', 'hawaiano']
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
				search: ['marathi', 'marathi']
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
		var STYLES = ['formal', 'informal', 'simple', 'kitten'];
		var STORE_KEY = 'translate-state';

		var DEFAULT_RECENT = ['en', 'de', 'mi'];

		var state = {
			source: 'en',
			target: 'de',
			style: null,
			recent: {
				source: DEFAULT_RECENT.slice(),
				target: DEFAULT_RECENT.slice()
			}
		};

		var textarea = document.querySelector('.panel.source textarea');
		var output = document.querySelector('.panel.target .translation');
		var counter = document.querySelector('.panel.source .char-count');
		var toast = document.getElementById('toast');
		var listenBtn = document.getElementById('listen-btn');
		var copyBtn = document.getElementById('copy-btn');
		var clearBtn = document.getElementById('clear-btn');
		var copyIconHTML = copyBtn.innerHTML;
		var ICON_DONE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5L20 7"></path></svg>';
		var selectButton = {
			source: document.getElementById('source-select'),
			target: document.getElementById('target-select')
		};

		var toastTimer = null;
		var speaking = false;
		var utterance = null;
		var speechReady = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

		/* ---------- Persistence ---------- */

		function saveState() {
			try {
				localStorage.setItem(STORE_KEY, JSON.stringify({
					source: state.source,
					target: state.target,
					style: state.style,
					recent: state.recent,
					input: textarea.value,
					output: output.textContent
				}));
			} catch (err) {}
		}

		function loadState() {
			try {
				var saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
				if (LANGS[saved.source]) state.source = saved.source;
				if (LANGS[saved.target] && saved.target !== 'auto') state.target = saved.target;
				if (STYLES.indexOf(saved.style) !== -1) state.style = saved.style;
				if (saved.recent) {
					['source', 'target'].forEach(function (side) {
						if (Array.isArray(saved.recent[side])) {
							state.recent[side] = saved.recent[side].filter(function (code, index, arr) {
								return LANGS[code] && arr.indexOf(code) === index;
							}).slice(0, 6);
						}
					});
				}
				if (typeof saved.input === 'string') textarea.value = saved.input;
				if (typeof saved.output === 'string') output.textContent = saved.output;
			} catch (err) {}
		}

		/* ---------- Helpers ---------- */

		function updateCount() {
			var length = textarea.value.length;
			counter.textContent = length.toLocaleString('en-NZ') + ' / 5,000';
			counter.classList.toggle('warn', length > 4500);
			clearBtn.hidden = length === 0;
			var noOutput = output.textContent.trim() === '';
			copyBtn.disabled = noOutput;
			listenBtn.disabled = noOutput;
		}

		function showToast(message) {
			toast.textContent = message;
			toast.classList.add('visible');
			clearTimeout(toastTimer);
			toastTimer = setTimeout(function () {
				toast.classList.remove('visible');
			}, 2600);
		}

		/* ---------- Language menu ---------- */

		var ICON_SEARCH = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>';
		var ICON_CLEAR = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"></path></svg>';
		var ICON_CHECK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5L20 7"/></svg>';

		var searchCache = {};

		/* Lower-case and strip accents so "Māori" matches "maori". */
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

		/* Index the English name, native name and common exonyms. */
		function searchIndex(code) {
			if (!searchCache[code]) {
				var language = LANGS[code];
				searchCache[code] = normalize(
					[language.name, language.native]
						.concat(language.search || [])
						.join(' ')
				);
			}
			return searchCache[code];
		}

		function codesFor(side, query) {
			var q = normalize(query || '');
			var matches = function (code) {
				return !q || searchIndex(code).indexOf(q) !== -1;
			};

			var codes = Object.keys(LANGS).filter(function (code) {
				return code !== 'auto' && matches(code);
			});

			codes.sort(function (a, b) {
				return LANGS[a].name.localeCompare(LANGS[b].name);
			});

			if (side === 'source' && matches('auto')) codes.unshift('auto');
			return codes;
		}

		function closeMenus() {
			['source', 'target'].forEach(function (side) {
				document.getElementById(side + '-menu').hidden = true;
				selectButton[side].setAttribute('aria-expanded', 'false');
			});
		}

		function fillOptions(side, query) {
			var box = document.getElementById(side + '-options');
			var active = side === 'source' ? state.source : state.target;
			var codes = codesFor(side, query);

			box.innerHTML = '';

			if (!codes.length) {
				var empty = document.createElement('p');
				empty.className = 'lang-empty';
				empty.textContent = 'No languages found';
				box.appendChild(empty);
				return;
			}

			codes.forEach(function (code) {
				var option = document.createElement('button');
				option.type = 'button';
				option.className = 'lang-option' + (code === active ? ' is-active' : '');
				option.dataset.lang = code;

				var name = document.createElement('span');
				name.className = 'opt-name';
				name.textContent = LANGS[code].name;

				var nativeName = document.createElement('span');
				nativeName.className = 'opt-native';
				nativeName.textContent = LANGS[code].native;

				var check = document.createElement('span');
				check.className = 'opt-check';
				check.innerHTML = ICON_CHECK;

				option.append(name, nativeName, check);
				option.addEventListener('click', function () {
					selectLang(side, code);
				});
				box.appendChild(option);
			});
		}

		function buildMenu(side) {
			var menu = document.getElementById(side + '-menu');
			menu.innerHTML = '';

			var search = document.createElement('div');
			search.className = 'lang-search';
			search.innerHTML = ICON_SEARCH;

			var input = document.createElement('input');
			input.type = 'text';
			input.id = side + '-search';
			input.className = 'lang-search-input';
			input.placeholder = 'Search languages';
			input.setAttribute('aria-label', 'Search ' + side + ' languages');
			input.setAttribute('autocomplete', 'off');
			input.setAttribute('spellcheck', 'false');

			var clear = document.createElement('button');
			clear.type = 'button';
			clear.className = 'lang-search-clear';
			clear.setAttribute('aria-label', 'Clear search');
			clear.innerHTML = ICON_CLEAR;
			clear.hidden = true;

			var options = document.createElement('div');
			options.className = 'lang-options';
			options.id = side + '-options';

			search.append(input, clear);
			menu.append(search, options);

			input.addEventListener('input', function () {
				clear.hidden = input.value === '';
				fillOptions(side, input.value);
			});

			input.addEventListener('keydown', function (event) {
				if (event.key === 'Enter') {
					var first = options.querySelector('.lang-option');
					if (first) {
						event.preventDefault();
						selectLang(side, first.dataset.lang);
					}
				}
			});

			clear.addEventListener('click', function () {
				input.value = '';
				clear.hidden = true;
				fillOptions(side, '');
				input.focus();
			});

			fillOptions(side, '');
		}

		function toggleMenu(side) {
			var expanded = selectButton[side].getAttribute('aria-expanded') === 'true';
			closeMenus();
			if (expanded) return;

			document.getElementById(side + '-menu').hidden = false;
			selectButton[side].setAttribute('aria-expanded', 'true');

			var input = document.getElementById(side + '-search');
			if (input) {
				input.value = '';
				var clear = document.querySelector('#' + side + '-menu .lang-search-clear');
				if (clear) clear.hidden = true;
				fillOptions(side, '');
				input.focus();
			}
		}

		function selectLang(side, code) {
			if (!LANGS[code]) return;
			if (side === 'target' && code === 'auto') return;
			var other = side === 'source' ? 'target' : 'source';
			if (code !== state[side] && code === state[other]) {
				/* Keep the pair distinct, Google-style: our previous
				   language moves across to the other side. */
				var hand = state[side];
				if (hand === 'auto' || hand === code) hand = code === 'en' ? 'de' : 'en';
				state[other] = hand;
			}
			state[side] = code;
			noteUse(side, code);
			closeMenus();
			saveState();
			render();
		}

		function renderMenus() {
			buildMenu('source');
			buildMenu('target');
		}

		/* ---------- Swap ---------- */

		function swap() {
			/* "Detect language" has no real detector here; the sample is English. */
			var source = state.source === 'auto' ? 'en' : state.source;
			state.source = state.target;
			state.target = source;
			noteUse('source', state.source);
			noteUse('target', state.target);

			var oldSource = textarea.value;
			textarea.value = output.textContent;
			output.textContent = oldSource;

			saveState();
			render();
		}

		/* ---------- Writing style ---------- */

		function renderStyles() {
			document.querySelectorAll('.style-option').forEach(function (button) {
				var active = button.dataset.style === state.style;
				button.classList.toggle('active', active);
				button.setAttribute('aria-pressed', active ? 'true' : 'false');
			});
		}

		/* ---------- Recent languages ----------
		   Kept only as a record of what has been used; nothing but the
		   current pair is shown outside the pulldown. */

		function noteUse(side, code) {
			var list = state.recent[side];
			var at = list.indexOf(code);
			if (at !== -1) list.splice(at, 1);
			list.unshift(code);
			if (list.length > 6) list.length = 6;
		}

		/* The two languages currently being translated appear on the left of
		   each pulldown: source first, then target, on both sides. Clicking
		   either one swaps the pair, exactly like the middle swap button. */
		function renderLabels() {
			['source', 'target'].forEach(function (side) {
				var pair = document.getElementById(side + '-tabs');
				pair.querySelector('.lang-tab.from').textContent = LANGS[state.source].name;
				pair.querySelector('.lang-tab.into').textContent = LANGS[state.target].name;
			});
		}

		/* ---------- Copy ---------- */

		function copyText(text) {
			if (navigator.clipboard && navigator.clipboard.writeText) {
				return navigator.clipboard.writeText(text).then(function () {
					return true;
				}, function () {
					return legacyCopy(text);
				});
			}
			return Promise.resolve(legacyCopy(text));
		}

		function legacyCopy(text) {
			try {
				var field = document.createElement('textarea');
				field.value = text;
				field.setAttribute('readonly', '');
				field.style.position = 'fixed';
				field.style.opacity = '0';
				document.body.appendChild(field);
				field.select();
				var copied = document.execCommand('copy');
				field.remove();
				return copied;
			} catch (err) {
				return false;
			}
		}

		/* ---------- Speech ----------
		   Uses the browser's own speechSynthesis, fed by the OS speech engine.
		   Only voices the browser reports as local are used, so text is never
		   sent to a remote service to generate audio. */

		function pickVoice(tag) {
			if (!speechReady) return null;
			var wanted = tag.toLowerCase();
			var base = wanted.split('-')[0];
			var best = null;
			var bestRank = 0;

			window.speechSynthesis.getVoices().forEach(function (voice) {
				/* voice.localService === false means a cloud voice (e.g. Chrome's
				   "Google" voices); exclude those. */
				if (voice.localService === false) return;
				var lang = voice.lang.toLowerCase();
				var rank = 0;
				if (lang === wanted) rank = voice.default ? 4 : 3;
				else if (lang.split('-')[0] === base) rank = voice.default ? 2 : 1;
				if (rank > bestRank) {
					best = voice;
					bestRank = rank;
				}
			});
			return best;
		}

		function stopSpeaking() {
			if (!speechReady) return;
			window.speechSynthesis.cancel();
			speaking = false;
			listenBtn.classList.remove('is-speaking');
			listenBtn.setAttribute('aria-pressed', 'false');
			listenBtn.setAttribute('aria-label', 'Listen to translation');
		}

		function speak() {
			if (!speechReady) {
				showToast('This browser cannot read text aloud');
				return;
			}
			if (speaking) {
				stopSpeaking();
				return;
			}

			var target = LANGS[state.target];
			var text = output.textContent.trim();
			if (!text) return;

			var voice = pickVoice(target.tag);
			if (!voice) {
				showToast('No offline ' + target.name + ' voice on this device');
				return;
			}

			utterance = new SpeechSynthesisUtterance(text);
			utterance.voice = voice;
			utterance.lang = target.tag;
			utterance.onend = stopSpeaking;
			utterance.onerror = stopSpeaking;

			speaking = true;
			listenBtn.classList.add('is-speaking');
			listenBtn.setAttribute('aria-pressed', 'true');
			listenBtn.setAttribute('aria-label', 'Stop reading');
			window.speechSynthesis.cancel();
			window.speechSynthesis.speak(utterance);
		}

		/* ---------- Wiring ---------- */

		function render() {
			renderLabels();
			renderMenus();
			renderStyles();
			updateCount();
		}

		document.getElementById('swap-btn').addEventListener('click', swap);

		/* Clicking either of the two current languages swaps the pair. */
		document.querySelectorAll('.lang-tab').forEach(function (tab) {
			tab.addEventListener('click', swap);
		});

		document.getElementById('copy-btn').addEventListener('click', function () {
			copyText(output.textContent.trim()).then(function (copied) {
				showToast(copied ? 'Translation copied' : 'Could not copy');
				if (!copied) return;
				copyBtn.innerHTML = ICON_DONE;
				setTimeout(function () { copyBtn.innerHTML = copyIconHTML; }, 1200);
			});
		});

		clearBtn.addEventListener('click', function () {
			textarea.value = '';
			output.textContent = '';
			updateCount();
			saveState();
			textarea.focus();
		});

		listenBtn.addEventListener('click', speak);
		if (!speechReady) {
			listenBtn.setAttribute('aria-label', 'Text reading is not supported in this browser');
		}

		textarea.addEventListener('input', function () {
			/* No engine yet: an empty source leaves nothing to show. */
			if (textarea.value === '') output.textContent = '';
			updateCount();
			saveState();
		});

		for (var side in selectButton) {
			selectButton[side].addEventListener('click', (function (which) {
				return function () {
					toggleMenu(which);
				};
			})(side));
		}

		document.querySelectorAll('.style-option').forEach(function (button) {
			button.addEventListener('click', function () {
				state.style = state.style === button.dataset.style ? null : button.dataset.style;
				saveState();
				renderStyles();
			});
		});

		document.addEventListener('click', function (event) {
			if (!event.target.closest('.lang-menu') && !event.target.closest('.lang-select')) closeMenus();
		});

		document.addEventListener('keydown', function (event) {
			if (event.key === 'Escape') closeMenus();
		});

		/* Voices can load asynchronously; a warm-up read keeps them ready. */
		if (speechReady) {
			window.speechSynthesis.getVoices();
			window.speechSynthesis.addEventListener('voiceschanged', function () {
				window.speechSynthesis.getVoices();
			});
		}

		loadState();
		render();

		/* On a keyboard-first device an empty box is an invitation. */
		if (textarea.value === '' && window.matchMedia('(pointer: fine)').matches && window.innerWidth > 768) {
			textarea.focus({ preventScroll: true });
		}
	})();

/* ==========================================================================
   Error page
   Only runs when the error card is present, so this file can be shared
   by every template.
   ========================================================================== */
if (document.getElementById('status-code')) {
		/* ------------------------------------------------------------------
		   Error copy.

		   The router in public/index.php serves this template for any path
		   other than "/", but the status code reaches the browser separately,
		   in order of preference:

		     1. ?code=404  (or ?status=404) in the query string
		     2. #404 in the fragment
		     3. a same-origin cookie named "error_code" (e.g. set by nginx
		        error_page, or by an upstream 5xx pass-through)
		     4. Referer / original URL guessing, for hosts that keep the old
		        path in a redirect fragment or query

		   Anything unrecognised falls back to a plain 404 — the one error
		   every site can be relied upon to produce.
		   ------------------------------------------------------------------ */
		(function () {
			'use strict';

			var MESSAGES = {
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

			var GENERIC = {
				category: 'Something Went Wrong',
				title: 'Something went wrong.',
				joke: 'The server tried its best and its best wasn\u2019t quite enough.',
				advice: 'Try again in a moment. If the problem persists, it\u2019s probably not going away on its own.'
			};

			/* Fallback categories, so an unknown code still reads sensibly. */
			function categoryFor(code) {
				if (code >= 400 && code < 500) return 'Client Error';
				if (code >= 500 && code < 600) return 'Server Error';
				return GENERIC.category;
			}

			function byId(id) { return document.getElementById(id); }

			/* ---------- Work out what went wrong ---------- */

			function validCode(value) {
				var code = parseInt(value, 10);
				return code >= 400 && code <= 599 ? code : null;
			}

			function readCookie(name) {
				var parts = (' ' + document.cookie).split('; ' + name + '=');
				if (parts.length < 2) return null;
				return decodeURIComponent(parts.pop().split(';').shift());
			}

			/* Paths inside the fragment (some hosts redirect to /#/old/path)
			   and the ?url= / ?path= / ?from= query keys all count as "requested". */
			function readTarget(search, hash) {
				var params = new URLSearchParams(search || '');
				var keys = ['url', 'path', 'from', 'uri', 'requested'];
				for (var i = 0; i < keys.length; i++) {
					var value = params.get(keys[i]);
					if (value) return value;
				}
				var fragment = (hash || '').replace(/^#\/?/, '');
				if (fragment && !/^\d{3}$/.test(fragment)) return '/' + fragment;
				return null;
			}

			function detect() {
				var params = new URLSearchParams(window.location.search || '');

				var code = validCode(params.get('code')) ||
					validCode(params.get('status')) ||
					validCode(params.get('err')) ||
					validCode(readCookie('error_code')) ||
					validCode((window.location.hash || '').replace(/^#\/?/, ''));
				var target = readTarget(window.location.search, window.location.hash);

				/* The router serves the error page at the requested path, so if
				   nothing else identified it, the path we are on is the request
				   that went wrong — unless we are somehow on the root. */
				if (!target && window.location.pathname && window.location.pathname !== '/') {
					target = window.location.pathname + window.location.search;
				}

				return { code: code || 404, target: target };
			}

			var found = detect();
			var message = MESSAGES[found.code] || GENERIC;

			/* ---------- Draw it ---------- */

			document.title = found.code + ' ' + message.category + ' \u2014 translate.hellyer.kiwi';

			byId('status-code').textContent = found.code;
			byId('status-category').textContent = MESSAGES[found.code] ? message.category : categoryFor(found.code);
			byId('status-title').textContent = message.title;
			byId('status-joke').textContent = message.joke;
			byId('status-advice').textContent = message.advice;

			var shownCategory = byId('status-category').textContent;
			byId('meta-status').textContent = found.code + ' ' + shownCategory;
			byId('meta-url').textContent = found.target || 'Not recorded by the server \u2014 ' +
				'add ?code= and the original path to fix that.';

			var referrer = document.referrer;
			byId('meta-referrer').textContent = referrer || 'Nothing. You arrived alone.';

			try {
				byId('meta-time').textContent = new Date().toLocaleString('en-NZ', { dateStyle: 'medium', timeStyle: 'medium' });
			} catch (e) {
				byId('meta-time').textContent = new Date().toString();
			}

			/* Retry: go back through history so the original URL is retried, and
			   reload as the fallback when there is no history to walk. */
			byId('retry-btn').addEventListener('click', function () {
				if (window.history.length > 1) window.history.back();
				else window.location.reload();
			});
		})();
}
