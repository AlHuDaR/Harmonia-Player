import { usePlayerStore } from "@/store/playerStore";
export const ar: Record<string, string> = {
  "Clear search": "مسح البحث",
  "Searching…": "جارٍ البحث…",
  "Try another title or artist.": "جرّب عنواناً أو فناناً آخر.",
  "Cast": "البث إلى جهاز",
  "Cast devices": "أجهزة البث",
  "Disconnect Cast": "قطع اتصال البث",
  "Play locally": "التشغيل على هذا الجهاز",
  "Playing on receiver": "التشغيل على جهاز الاستقبال",
  "Cast connected": "البث متصل",
  "Lower receiver volume": "خفض صوت جهاز الاستقبال",
  "Raise receiver volume": "رفع صوت جهاز الاستقبال",
  "Google Cast needs Google Play services on an Android phone. Install the standalone APK; Expo Go and web are unsupported.": "يتطلب Google Cast خدمات Google Play على هاتف أندرويد. ثبّت التطبيق المستقل؛ لا يُدعم Expo Go أو الويب.",
  "Casting isn't supported for this source. You can play it on this device.": "لا يُدعم بث هذا المصدر. يمكنك تشغيله على هذا الجهاز.",
  "No compatible YouTube stream is available for Cast. You can play it on this device.": "لا يتوفر مسار YouTube متوافق مع البث. يمكنك تشغيل المقطع على هذا الجهاز.",
  "Preparing Cast…": "جارٍ إعداد البث…",
  "Casting downloaded media": "بث الوسائط المحمّلة",
  "Stop casting": "إيقاف البث",
  "This downloaded file is missing, protected or unsupported for Cast. Try another download.": "هذا الملف المحمّل مفقود أو محمي أو غير مدعوم للبث. جرّب ملفاً آخر.",
  "Connect this phone and the Cast receiver to the same Wi-Fi, then retry.": "وصّل الهاتف وجهاز الاستقبال بشبكة Wi-Fi نفسها ثم أعد المحاولة.",
  "Open Harmonia to start casting this download, then retry.": "افتح هارمونيا لبدء بث هذا الملف المحمّل ثم أعد المحاولة.",
  "Stop the current Cast before sharing another download.": "أوقف البث الحالي قبل بث ملف محمّل آخر.",
  "The downloaded Cast source stopped. Tap Cast to reconnect or disconnect first.": "توقف مصدر بث الملف المحمّل. اضغط البث لإعادة الاتصال أو اقطع الاتصال أولاً.",
  "Install the updated Android APK to cast downloaded files.": "ثبّت إصدار أندرويد المحدّث لبث الملفات المحمّلة.",
  "Loading on receiver…": "جارٍ التحميل على جهاز الاستقبال…",
  "Playback on receiver": "التشغيل على جهاز الاستقبال",
  "Receiver playback timed out. Local playback is available.": "انتهت مهلة التشغيل على جهاز الاستقبال. يمكنك التشغيل على هذا الجهاز.",
  "The receiver couldn't play this stream. You can play it on this device.": "تعذر على جهاز الاستقبال تشغيل هذا المسار. يمكنك تشغيله على هذا الجهاز.",
  "Cast playback failed. Try again or play on this device.": "تعذر البث. أعد المحاولة أو شغّل المقطع على هذا الجهاز.",
  "Cast preparation cancelled. Local playback is available.": "أُلغي إعداد البث. يمكنك التشغيل على هذا الجهاز.",
  "Cast preparation timed out. Keep playing here or try again.": "انتهت مهلة إعداد البث. تابع التشغيل هنا أو أعد المحاولة.",
  "Cast preparation is busy. Try again shortly.": "إعداد البث مشغول. أعد المحاولة بعد قليل.",
  "Install the updated Android APK to enable YouTube Cast preparation.": "ثبّت إصدار أندرويد المحدّث لتفعيل إعداد بث YouTube.",
  "Receiver status is uncertain. Disconnect Cast before resuming local playback.": "حالة جهاز الاستقبال غير مؤكدة. اقطع اتصال البث قبل استئناف التشغيل على هذا الجهاز.",
  "Cast connection interrupted. Reconnect or disconnect before playing locally.": "انقطع اتصال البث مؤقتاً. أعد الاتصال أو اقطعه قبل التشغيل على هذا الجهاز.",
  "Cast disconnected. Press Play to continue on this device.": "انقطع اتصال البث. اضغط تشغيل للمتابعة على هذا الجهاز.",
  "Receiver playback failed. Local playback is available.": "تعذر التشغيل على جهاز الاستقبال. يمكنك التشغيل على هذا الجهاز.",
  "Receiver media changed. Press Play to continue on this device.": "تغيّرت الوسائط على جهاز الاستقبال. اضغط تشغيل للمتابعة على هذا الجهاز.",
  "Cast connection failed. Check the receiver and Wi-Fi, then retry.": "تعذر اتصال البث. تحقق من جهاز الاستقبال وشبكة Wi-Fi ثم أعد المحاولة.",
  "Cast receiver disconnected.": "انقطع اتصال جهاز الاستقبال.",
  "Cast playback failed. Try local playback or another public MP4/HLS source.": "تعذر البث. جرّب التشغيل على هذا الجهاز أو مصدراً عاماً آخر بصيغة MP4 أو HLS.",
  "Cast receiver rejected the request. Try local playback or another public MP4/HLS source.": "رفض جهاز الاستقبال الطلب. جرّب التشغيل على هذا الجهاز أو مصدراً عاماً آخر بصيغة MP4 أو HLS.",
  "Cast control failed. Check the receiver connection.": "تعذر التحكم في البث. تحقق من اتصال جهاز الاستقبال.",
  "Return to local playback to use this control.": "عُد إلى التشغيل على هذا الجهاز لاستخدام هذا الخيار.",
  "Auto · adaptive up to 1080p": "تلقائي · جودة تكيفية حتى 1080p",
  "Instagram share did not resolve to an Instagram post. Open in Browser.": "لم تؤدِ مشاركة إنستغرام إلى منشور إنستغرام. افتح الرابط في المتصفح.",
  "Facebook share did not resolve to a supported public video. Open in Browser.": "لم تؤدِ مشاركة فيسبوك إلى فيديو عام مدعوم. افتح الرابط في المتصفح.",
  "Playback speed": "سرعة التشغيل",
  "Shared media file": "ملف وسائط مشارك",
  "Shared media": "وسائط مشاركة",
  "Import this audio or video into your library. Maximum size: 512 MB.": "استورد الصوت أو الفيديو إلى مكتبتك. الحد الأقصى للحجم: 512 ميغابايت.",
  "This source provides no separate audio stream.": "لا يوفر هذا المصدر مساراً صوتياً منفصلاً.",
  "Available streams support playback only. Offline download is unavailable.": "تدعم المسارات المتاحة التشغيل فقط. التنزيل دون اتصال غير متاح.",
  "No public video stream is exposed by this page. It may require login, be restricted or provide browser-only playback. Open in Browser to check.": "لا تعرض هذه الصفحة مسار فيديو عاماً. قد تتطلب تسجيل الدخول أو تكون مقيدة أو تدعم التشغيل في المتصفح فقط. افتحها في المتصفح للتحقق.",
  "The public metadata did not expose a compatible progressive MP4 video. Open in Browser.": "لم تعرض البيانات العامة فيديو MP4 متوافقاً. افتح الصفحة في المتصفح.",
  "Unsupported social link. Use a Facebook video/Reel or Snapchat Spotlight link; open other content in Browser.": "رابط اجتماعي غير مدعوم. استخدم رابط فيديو أو ريل من فيسبوك أو سبوتلايت من سناب شات؛ وافتح المحتوى الآخر في المتصفح.",
  "Only shared audio and video files can be imported.": "يمكن استيراد ملفات الصوت والفيديو المشاركة فقط.",
  "Shared file permission is unavailable. Share the file again.": "إذن الملف المشارك غير متاح. شارك الملف مجدداً.",
  "Shared file exceeds the import size or time limit.": "تجاوز الملف المشارك حد الحجم أو الوقت المسموح للاستيراد.",
  "Shared media could not be imported. Share the file again.": "تعذر استيراد الوسائط المشاركة. شارك الملف مجدداً.",
  "Download exceeds the 2 GB limit.": "تجاوز التنزيل الحد الأقصى البالغ 2 غيغابايت.",
  "Download exceeded the 30 minute limit. Retry on a faster connection.": "تجاوز التنزيل الحد الزمني البالغ 30 دقيقة. أعد المحاولة باتصال أسرع.",
  "Search downloads": "البحث في التنزيلات",
  "Download status": "حالة التنزيل",
  "All": "الكل",
  "Active": "نشطة",
  "Needs attention": "تحتاج إلى مراجعة",
  "No matching downloads.": "لا توجد تنزيلات مطابقة.",
  "Playback position": "موضع التشغيل",
  "Media duration": "مدة الوسائط",
  "No playable media source is available.": "لا يتوفر مصدر وسائط قابل للتشغيل.",
  "No downloadable formats available.": "لا تتوفر صيغ قابلة للتنزيل.",
  "No compatible audio format available.": "لا تتوفر صيغة صوت متوافقة.",
  "Invalid web link.": "رابط الويب غير صالح.",
  "Only web links without credentials are supported.":
    "تُدعم روابط الويب الخالية من بيانات تسجيل الدخول فقط.",
  "Local, internal and nonstandard-port links are not supported.":
    "لا تُدعم الروابط المحلية أو الداخلية أو ذات المنافذ غير القياسية.",
  "Saved links": "الروابط المحفوظة",
  "Save Link": "حفظ الرابط",
  "Link saved": "تم حفظ الرابط",
  "Open in Browser": "فتح في المتصفح",
  "Audio Only": "صوت فقط",
  "Remove saved link": "إزالة الرابط المحفوظ",
  "Working…": "جارٍ العمل…",
  "No safe web link was found in the shared text.":
    "لم يتم العثور على رابط ويب آمن في النص المشارك.",
  "Could not read the shared link. Please share it again.":
    "تعذرت قراءة الرابط المشارك. يرجى مشاركته مجدداً.",
  "Could not open the browser.": "تعذر فتح المتصفح.",
  "Playback and download are not supported for this page. Save the link or open the original source.":
    "لا تدعم هذه الصفحة التشغيل والتنزيل. احفظ الرابط أو افتح المصدر الأصلي.",
  "Media availability and download formats depend on the source. Only use media you are authorized to access.":
    "يعتمد توفر الوسائط وصيغ التنزيل على المصدر. استخدم فقط الوسائط المصرح لك بالوصول إليها.",
  "Share a web link to Harmonia, then choose Save Link.":
    "شارك رابط ويب مع هارمونيا، ثم اختر حفظ الرابط.",
  "Play Video": "تشغيل الفيديو",
  "Download Video": "تنزيل الفيديو",
  "Download Audio": "تنزيل الصوت",
  "Refresh formats": "تحديث الصيغ",
  "Discovering available media…": "جارٍ اكتشاف الوسائط المتاحة…",
  Queued: "في قائمة الانتظار",
  "Waiting to retry": "في انتظار إعادة المحاولة",
  "Cancel download": "إلغاء التنزيل",
  "Download cancelled.": "تم إلغاء التنزيل.",
  "Use an Instagram post or Reel link.": "استخدم رابط منشور أو ريل من إنستغرام.",
  "Use an Instagram post or Reel link; profiles, Stories and share redirects are not extracted.":
    "استخدم رابط منشور أو ريل من إنستغرام؛ لا يتم استخراج الملفات الشخصية أو القصص أو روابط إعادة توجيه المشاركة.",
  "Instagram embed response is too large.": "استجابة تضمين إنستغرام كبيرة جداً.",
  "This Instagram embed marks the content as private. It is not accessed.":
    "يشير تضمين إنستغرام إلى أن المحتوى خاص. لا يتم الوصول إليه.",
  "This Instagram embed does not expose a single public video. Photos and carousels are not extracted.":
    "لا يعرض هذا التضمين فيديو عاماً منفرداً. لا يتم استخراج الصور أو المنشورات المتعددة.",
  "Instagram did not expose a public video in this embed. The post may be unavailable, restricted or embedding may be disabled. Open in Browser to check.":
    "لم يوفر إنستغرام فيديو عاماً في هذا التضمين. قد يكون المنشور غير متاح أو مقيداً أو قد يكون التضمين معطلاً. افتحه في المتصفح للتحقق.",
  "Instagram did not return a compatible public MP4 file.":
    "لم يوفر إنستغرام ملف MP4 عاماً متوافقاً.",
  "Facebook media discovery requires an authorized platform interface. Login-required, private and restricted videos are not accessed.":
    "يتطلب اكتشاف وسائط فيسبوك واجهة منصة مصرحاً بها. لا يتم الوصول إلى الفيديوهات الخاصة أو المقيدة أو التي تتطلب تسجيل الدخول.",
  "TikTok's public embed interface does not expose a supported downloadable media stream here. Open the original source.":
    "لا توفر واجهة تضمين تيك توك العامة بث وسائط مدعوماً للتنزيل هنا. افتح المصدر الأصلي.",
  "X media access requires an authorized API interface. Harmonia does not collect account credentials or bypass access restrictions.":
    "يتطلب الوصول إلى وسائط إكس واجهة برمجية مصرحاً بها. لا يجمع هارمونيا بيانات الحساب ولا يتجاوز قيود الوصول.",
  "No supported public media interface is available for this page.":
    "لا تتوفر واجهة وسائط عامة مدعومة لهذه الصفحة.",
  "Media discovery requires the standalone Android app.":
    "يتطلب اكتشاف الوسائط تطبيق أندرويد المستقل.",
  "Could not synchronize background downloads. Records remain on this device.":
    "تعذرت مزامنة التنزيلات في الخلفية. لا تزال السجلات محفوظة على هذا الجهاز.",
  "Network interrupted. Waiting to retry.":
    "انقطع الاتصال. في انتظار إعادة المحاولة.",
  "Not enough free storage.": "لا تتوفر مساحة تخزين كافية.",
  "DRM-protected media is not supported.":
    "الوسائط المحمية بحقوق رقمية غير مدعومة.",
  "Encrypted/DRM playlists are not supported.":
    "قوائم البث المشفرة أو المحمية بحقوق رقمية غير مدعومة.",
  "Background job stopped. Retry to resolve fresh media.":
    "توقفت المهمة في الخلفية. أعد المحاولة للحصول على وسائط متاحة مجدداً.",
  Home: "الرئيسية",
  Search: "البحث",
  Downloads: "التنزيلات",
  Library: "المكتبة",
  Settings: "الإعدادات",
  "Harmonia Player": "هارمونيا",
  "Recently played": "تم تشغيله مؤخراً",
  "Your music and videos, online and offline.":
    "موسيقاك وفيديوهاتك، متصلة أو دون إنترنت.",
  "Discover something to play": "ابحث عن شيء تستمتع به",
  "Search songs, artists, or videos": "ابحث عن أغنية أو فنان أو فيديو",
  "Search query": "عبارة البحث",
  "No results found.": "لا توجد نتائج.",
  "Load more": "تحميل المزيد",
  "Loading…": "جارٍ التحميل…",
  "Loading media…": "جارٍ تحميل الوسائط…",
  Retry: "إعادة المحاولة",
  Close: "إغلاق",
  "Close player": "إغلاق المشغل",
  "Expand player": "توسيع المشغل",
  "Back to browsing": "العودة للتصفح",
  "Now playing": "قيد التشغيل",
  Play: "تشغيل",
  Pause: "إيقاف مؤقت",
  Previous: "السابق",
  Next: "التالي",
  Shuffle: "تشغيل عشوائي",
  Repeat: "تكرار",
  "Repeat one": "تكرار المقطع",
  "Repeat all": "تكرار الكل",
  "Repeat off": "إيقاف التكرار",
  Seek: "موضع التشغيل",
  "Seek back 10 seconds": "الرجوع ١٠ ثوانٍ",
  "Seek forward 10 seconds": "التقدم ١٠ ثوانٍ",
  Favorite: "المفضلة",
  "Remove favorite": "إزالة من المفضلة",
  "♥ Saved": "♥ محفوظ",
  "♡ Favorite": "♡ المفضلة",
  "More options": "خيارات إضافية",
  "Audio / quality": "الصوت والجودة",
  "Quality / audio": "الجودة والصوت",
  Audio: "صوت",
  Video: "فيديو",
  audio: "صوت",
  video: "فيديو",
  Offline: "دون إنترنت",
  "Add To": "إضافة إلى",
  Background: "الخلفية",
  Popup: "نافذة عائمة",
  "Picture in Picture": "نافذة عائمة",
  Download: "تنزيل",
  Downloaded: "تم التنزيل",
  Playlist: "قائمة تشغيل",
  Share: "مشاركة",
  Description: "الوصف",
  "No description available.": "لا يوجد وصف.",
  "Add to queue": "إضافة إلى قائمة الانتظار",
  "New playlist name": "اسم قائمة التشغيل الجديدة",
  "Playlist name": "اسم قائمة التشغيل",
  "Create and add": "إنشاء وإضافة",
  "Create playlist": "إنشاء قائمة",
  "Play all": "تشغيل الكل",
  "Playback quality": "جودة التشغيل",
  "Download format": "صيغة التنزيل",
  "Loading formats…": "جارٍ تحميل الصيغ…",
  "No compatible formats available.": "لا توجد صيغ متوافقة.",
  Cancel: "إلغاء",
  "Saved for offline playback": "محفوظ للتشغيل دون إنترنت",
  "Up next": "التالي",
  "Auto-enqueue": "إضافة تلقائية",
  "Auto-enqueue related videos": "إضافة فيديوهات مقترحة تلقائياً",
  "Move up": "نقل للأعلى",
  Remove: "إزالة",
  "Play next": "تشغيل التالي",
  "No related videos available.": "لا توجد فيديوهات مقترحة.",
  Favorites: "المفضلة",
  "Tap Favorite on a track to save it.": "اضغط المفضلة لحفظ المقطع.",
  Playlists: "قوائم التشغيل",
  "Use the Playlist button on a track to add it here.":
    "أضف المقاطع من قائمة خيارات المقطع.",
  "Local media & saved tracks": "الوسائط المحلية والمحفوظة",
  "Import a file from Home to add local media.":
    "استورد ملفاً لإضافته إلى المكتبة.",
  "Import local audio or video": "استيراد صوت أو فيديو",
  "Open a YouTube or media URL": "فتح رابط يوتيوب أو وسائط",
  "YouTube link or direct media URL": "رابط يوتيوب أو رابط وسائط مباشر",
  "Media URL": "رابط الوسائط",
  "Open URL": "فتح الرابط",
  "Opening…": "جارٍ الفتح…",
  "Files are saved privately on this device for offline playback.":
    "تُحفظ الملفات داخل التطبيق على هذا الجهاز للتشغيل دون إنترنت.",
  "Download a direct media file from Home or a search result.":
    "نزّل مقطعاً من نتائج البحث للاستماع دون إنترنت.",
  "Retry download": "إعادة التنزيل",
  "Delete download": "حذف التنزيل",
  downloading: "جارٍ التنزيل",
  complete: "مكتمل",
  failed: "فشل",
  Playback: "التشغيل",
  "Background playback & media controls": "التشغيل في الخلفية والتحكم بالوسائط",
  "Background playback": "التشغيل في الخلفية",
  "Automatic Picture in Picture": "النافذة العائمة تلقائياً",
  Language: "اللغة",
  Storage: "التخزين",
  "Clear listening history": "مسح سجل التشغيل",
  "History cleared.": "تم مسح السجل.",
  "Support the developer": "دعم المطور",
  "Enjoying Harmonia? Your support helps development and improvements.":
    "تستمتع بهارمونيا؟ دعمك يساهم في تطوير التطبيق وتحسينه.",
  "Donations will be available here once a payment method is added.":
    "ستتاح التبرعات هنا بعد إضافة وسيلة الدفع.",
  "Source code and licences": "الشيفرة المصدرية والتراخيص",
  "Could not open the source link.": "تعذر فتح رابط المصدر.",
  "YouTube links": "روابط يوتيوب",
  "Open link settings": "إعدادات فتح الروابط",
  "Share a YouTube link to Harmonia, or enable supported links in Android settings.":
    "شارك رابط يوتيوب إلى هارمونيا أو فعّل فتح الروابط المدعومة في إعدادات أندرويد.",
  Privacy: "الخصوصية",
  "Your library stays on this device. YouTube receives requests when you search or stream. No advertising or analytics SDK is included.":
    "تبقى مكتبتك على هذا الجهاز. يستقبل يوتيوب طلبات البحث والتشغيل. لا يتضمن التطبيق إعلانات أو حزمة تحليلات.",
  About: "حول التطبيق",
  "No supported YouTube video link was found.":
    "لم يتم العثور على رابط فيديو يوتيوب مدعوم.",
  "Open link": "فتح رابط",
  "No compatible format is available for this video.":
    "لا توجد صيغة متوافقة لهذا الفيديو.",
  "Create a playlist in Library first.": "أنشئ قائمة تشغيل في المكتبة أولاً.",
  "Add to playlist": "إضافة لقائمة تشغيل",
  subscribers: "مشترك",
  views: "مشاهدة",
  likes: "إعجاب",
  Downloading: "جارٍ التنزيل",
  "Delete playlist": "حذف القائمة",
  "Play a file or stream to start your listening history.":
    "ابدأ التشغيل لإظهار سجلك هنا.",
  "Loading library…": "جارٍ تحميل المكتبة…",
  "Retry loading library": "إعادة تحميل المكتبة",
  "Could not read the saved library. Your stored data has not been replaced.":
    "تعذرت قراءة المكتبة المحفوظة. لم يتم استبدال بياناتك.",
  YouTube: "يوتيوب",
  "Favorites, playlists, downloads and the latest 100 played tracks persist on this device. Uninstalling removes app-private files.":
    "تُحفظ المفضلة والقوائم والتنزيلات وآخر ١٠٠ مقطع على الجهاز. حذف التطبيق يزيل ملفاته الخاصة.",
  "Search, playback and downloads run directly on this Android device using NewPipe Extractor. No API key, Google login or resolver server is required. Restricted videos and YouTube changes can affect availability.":
    "يعمل البحث والتشغيل والتنزيل مباشرة على جهاز أندرويد. قد تؤثر قيود الفيديوهات وتغييرات يوتيوب في توفر المحتوى.",
};
Object.assign(ar, {
  "Enter a direct HTTPS audio or video URL.":
    "أدخل رابط HTTPS مباشراً للصوت أو الفيديو.",
  "URLs containing credentials are not supported.":
    "الروابط التي تحتوي بيانات دخول غير مدعومة.",
  "YouTube request failed. Check your connection and retry. Restricted videos or a YouTube change may require an extractor update.":
    "تعذر الاتصال بيوتيوب. تحقق من الشبكة وأعد المحاولة. قد تتطلب قيود الفيديو أو تغييرات يوتيوب تحديث التطبيق.",
  "YouTube blocked or rate limited this connection. Retry later or change network.":
    "قيّد يوتيوب هذا الاتصال. حاول لاحقاً أو غيّر الشبكة.",
  "Could not combine the downloaded audio and video. Check free storage or select a different MP4 quality.":
    "تعذر دمج الصوت والفيديو. تحقق من المساحة أو اختر جودة MP4 أخرى.",
  "YouTube search and streams are available in the Android APK. Direct media and local files remain supported.":
    "البحث والتشغيل من يوتيوب متاحان في تطبيق أندرويد. تبقى الروابط المباشرة والملفات المحلية مدعومة.",
  "Install the updated Harmonia Android APK to enable on-device YouTube. Expo Go does not contain the extractor.":
    "ثبّت أحدث نسخة أندرويد من هارمونيا لتفعيل يوتيوب.",
  "This track has no playable media source.":
    "لا يحتوي المقطع على مصدر قابل للتشغيل.",
  "Requested media format is unavailable.": "صيغة الوسائط المطلوبة غير متاحة.",
  "Extractor returned an unsupported media source.": "مصدر الوسائط غير مدعوم.",
  "Extractor returned an unsupported audio source.": "مصدر الصوت غير مدعوم.",
  "Offline downloads are available in the Android app.":
    "التنزيل دون إنترنت متاح في تطبيق أندرويد.",
  "App storage is unavailable.": "مساحة تخزين التطبيق غير متاحة.",
  "App storage unavailable.": "مساحة تخزين التطبيق غير متاحة.",
  "The server did not return a media file.": "لم يُرجع الخادم ملف وسائط.",
  "Downloaded file is empty.": "الملف المنزّل فارغ.",
  "The URL returned a page instead of media.":
    "الرابط يشير إلى صفحة وليس ملف وسائط.",
  "Could not create the combined video file.": "تعذر إنشاء ملف الفيديو المدمج.",
  "Import local media using the Android app.":
    "استورد الوسائط المحلية باستخدام تطبيق أندرويد.",
  "Download interrupted. Retry to start again.":
    "توقف التنزيل. أعد المحاولة للبدء من جديد.",
  "Playback failed. Retry or check the media URL.":
    "تعذر التشغيل. أعد المحاولة أو تحقق من الرابط.",
  "Offline download requires a single media file; adaptive streams are playback-only.":
    "هذا البث متاح للتشغيل فقط ولا يدعم التنزيل بهذه الصيغة.",
  "Request cancelled.": "تم إلغاء الطلب.",
  "Could not open link settings.": "تعذر فتح إعدادات الروابط.",
});
Object.assign(ar, {
  Samples: "مقتطفات",
  "Speed dial": "تشغيل سريع",
  "Explore your recent music and videos.":
    "استكشف الموسيقى والفيديوهات الأخيرة في مكتبتك.",
  "Open menu": "فتح القائمة",
  "Close menu": "إغلاق القائمة",
  "Main navigation": "التنقل الرئيسي",
  "About Harmonia": "حول هارمونيا",
  "Support the Developer": "دعم المطور",
  "Source Code & Licenses": "الشيفرة المصدرية والتراخيص",
  Appearance: "المظهر",
  Light: "فاتح",
  Dark: "داكن",
  System: "النظام",
  "Surface transparency": "شفافية الواجهة",
  Subtle: "شفافية خفيفة",
  Solid: "غير شفاف",
  "Preferred download format": "صيغة التنزيل المفضلة",
  "Choose available quality in the player before downloading.":
    "اختر الجودة المتاحة في المشغل قبل التنزيل.",
  Links: "الروابط",
  "Storage & Privacy": "التخزين والخصوصية",
  "Normal updates keep your library and preferences.":
    "تحافظ التحديثات العادية على مكتبتك وتفضيلاتك.",
  Version: "الإصدار",
  Developer: "المطور",
  "An independent player developed by AlHuDaR.": "مشغل مستقل من تطوير الهودار.",
  "Report issues or suggest improvements on GitHub.":
    "أبلغ عن المشكلات أو اقترح تحسينات عبر GitHub.",
  "Developer support": "التواصل مع المطور",
  "Donations coming soon": "التبرعات قريباً",
  "Open repository": "فتح المستودع",
  "NewPipe Extractor": "NewPipe Extractor",
  "Harmonia is free software. Source code and license terms are available in the repository.":
    "هارمونيا برنامج حر. تتوفر الشيفرة المصدرية وشروط الترخيص في المستودع.",
  "Uses NewPipe Extractor by Team NewPipe under GPL-3.0-or-later.":
    "يستخدم NewPipe Extractor من فريق NewPipe بترخيص GPL-3.0-or-later.",
  "Other dependencies retain their respective licenses. See the third-party notices and bundled dependency license files.":
    "تحتفظ المكتبات الأخرى بتراخيصها. راجع إشعارات الجهات الخارجية وملفات تراخيص المكتبات.",
  "Third-party notices": "إشعارات الجهات الخارجية",
  Fullscreen: "ملء الشاشة",
});
Object.assign(ar, {
  Recent: "الأخيرة",
  "Quick access": "وصول سريع",
  "View library": "فتح المكتبة",
  "View recent": "عرض السجل",
  "Make yourself at home": "ابدأ رحلتك مع هارمونيا",
  "Search for something you love, or import a file in Library. Your listening history will appear here.":
    "ابحث عما تحب أو استورد ملفاً من المكتبة. سيظهر سجل التشغيل هنا.",
  "No listening history yet": "لا يوجد سجل تشغيل بعد",
  "Color palette": "ألوان الواجهة",
  Harmonia: "هارمونيا",
  Midnight: "منتصف الليل",
  "AMOLED Black": "أسود AMOLED",
  Ocean: "المحيط",
  Sunset: "الغروب",
  "AMOLED Black uses a true black background in Dark mode.":
    "يستخدم أسود AMOLED خلفية سوداء بالكامل في الوضع الداكن.",
  "Local media": "وسائط محلية",
  "Saved tracks": "مقاطع محفوظة",
  "Your playlists start here": "أنشئ قوائمك هنا",
  "Create a playlist, then use Add To in the player to save tracks to it.":
    "أنشئ قائمة ثم استخدم إضافة إلى في المشغل لحفظ المقاطع فيها.",
  "Keep what you love": "احتفظ بما تحب",
  "Nothing here yet": "لا توجد مقاطع هنا بعد",
  "Import local audio or video using the button above.":
    "استورد صوتاً أو فيديو من الزر أعلاه.",
  "Tracks you open or play are saved here. Downloads have their own space.":
    "تظهر هنا المقاطع التي تفتحها أو تشغلها. للتنزيلات قسم مستقل.",
  "Find your next listen": "اعثر على مقطعك التالي",
  "Search YouTube by title or artist. You can also open a link or import a file in Library.":
    "ابحث في يوتيوب بالعنوان أو الفنان. يمكنك أيضاً فتح رابط أو استيراد ملف من المكتبة.",
  "Ready offline": "جاهز دون إنترنت",
  "Download failed": "تعذر التنزيل",
  "No downloads yet": "لا توجد تنزيلات بعد",
  "Use Download in the player to keep a track for offline listening.":
    "استخدم تنزيل في المشغل لحفظ مقطع للاستماع دون إنترنت.",
});
export function translate(text: string, language: "en" | "ar"): string {
  if (language === "en") return text;
  const normalized = text.replace(/\s+/g, " ").trim();
  if (ar[normalized])
    return (
      (/^\s/.test(text) ? " " : "") +
      ar[normalized] +
      (/\s$/.test(text) ? " " : "")
    );
  if (/^\s+$/.test(text)) return text;
  return text;
}
export function useLocale() {
  const language = usePlayerStore((s) => s.language);
  return {
    language,
    rtl: language === "ar",
    t: (s: string) => translate(s, language),
  };
}
