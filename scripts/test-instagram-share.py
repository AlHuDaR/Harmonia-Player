"""Optional live public-embed acceptance test on an already installed test APK.
Runs only with HARMONIA_INSTAGRAM_SMOKE_URL set. No cookies/accounts/Metro.
Uses system intents rather than automation of the installed Instagram app.
"""
import os, re, subprocess, time, xml.etree.ElementTree as ET
from urllib.parse import urlsplit

source = os.environ.get('HARMONIA_INSTAGRAM_SMOKE_URL', '')
if not source:
    print('Live Instagram test not requested; this is not a provider verification pass.')
    raise SystemExit(0)
url = urlsplit(source)
match = re.fullmatch(r'/(reel|p|tv)/([A-Za-z0-9_-]{5,64})/?', url.path)
assert url.scheme == 'https' and url.netloc in ('instagram.com', 'www.instagram.com') and match, 'Use a public canonical Instagram post/Reel URL'
canonical = 'https://www.instagram.com/' + match[1] + '/' + match[2] + '/'
PACKAGE = 'com.alhudar.harmonia'
COMPONENT = PACKAGE + '/.MainActivity'

def adb(*args):
    return subprocess.check_output(['adb', *args], text=True, stderr=subprocess.STDOUT, timeout=30)

def tree():
    adb('shell', 'uiautomator', 'dump', '/sdcard/harmonia-window.xml')
    return ET.fromstring(adb('shell', 'cat', '/sdcard/harmonia-window.xml'))

def has(root, label):
    return any(label in (n.get('text'), n.get('content-desc')) for n in root.iter('node'))

def wait(predicate, description, seconds=90):
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        try:
            root = tree()
            if predicate(root):
                return root
        except (subprocess.SubprocessError, ET.ParseError):
            pass
        time.sleep(1)
    raise AssertionError('Timed out: ' + description)

def click(root, label):
    for n in root.iter('node'):
        if label in (n.get('text'), n.get('content-desc')):
            bounds = list(map(int, re.findall(r'\d+', n.get('bounds', ''))))
            if len(bounds) == 4 and bounds[2] > bounds[0] and bounds[3] > bounds[1]:
                adb('shell', 'input', 'tap', str((bounds[0]+bounds[2])//2), str((bounds[1]+bounds[3])//2))
                return
    raise AssertionError('Missing button: ' + label)

def ready(root):
    if not has(root, 'Instagram') or not has(root, 'Save Link'):
        return False
    for label in ['Play Video', 'Download Video', 'Audio Only', 'Download Audio']:
        enabled = 'true' if label in ['Play Video', 'Download Video'] else 'false'
        if not any(label in (n.get('text'), n.get('content-desc')) and n.get('enabled') == enabled for n in root.iter('node')):
            return False
    return True

def elapsed(root):
    for n in root.iter('node'):
        clock = re.fullmatch(r'Playback position (\d+):(\d{2})', n.get('content-desc', ''))
        if clock and int(clock[1])*60+int(clock[2]) > 0:
            return True
    return False

def share():
    adb('shell', 'am', 'start', '-W', '-n', COMPONENT, '-a', 'android.intent.action.SEND', '-t', 'text/plain', '--es', 'android.intent.extra.TEXT', canonical)
    return wait(ready, 'real public Instagram video/download capabilities')

adb('shell', 'cmd', 'connectivity', 'airplane-mode', 'disable')
adb('shell', 'am', 'force-stop', PACKAGE)
root = share()
click(root, 'Play Video')
wait(elapsed, 'live Instagram playback', 45)
click(tree(), 'Close player')
root = share()
click(root, 'Download Video')
click(wait(lambda r: has(r, 'Close'), 'share close button'), 'Close')
click(wait(lambda r: has(r, 'Library'), 'Library tab'), 'Library')
click(wait(lambda r: has(r, 'Downloads'), 'Downloads navigation'), 'Downloads')
# The base smoke fixture may already be present. Select the new Instagram row,
# never mistake its existing Ready offline label for this download's completion.
def downloaded(root):
    rows = [n for n in root.iter('node') if n.get('content-desc', '').startswith('Play ') and n.get('content-desc') not in ('Play all', 'Play Direct media', 'Play Video')]
    return rows and any(has(parent, 'Ready offline') and any(child is rows[0] for child in parent.iter('node')) for parent in root.iter('node') if parent.get('class') == 'android.view.ViewGroup' and len(list(parent)) > 1 and not has(parent, 'Play Direct media'))

wait(downloaded, 'Instagram downloaded row marked Ready offline', 180)
adb('shell', 'am', 'force-stop', PACKAGE)
adb('shell', 'cmd', 'connectivity', 'airplane-mode', 'enable')
try:
    adb('shell', 'am', 'start', '-W', '-n', COMPONENT, '-a', 'android.intent.action.MAIN')
    click(wait(lambda r: has(r, 'Library'), 'Library after restart'), 'Library')
    click(wait(lambda r: has(r, 'Downloads'), 'Downloads after restart'), 'Downloads')
    root = wait(downloaded, 'persistent Instagram offline row')
    label = next(n.get('content-desc') for n in root.iter('node') if n.get('content-desc', '').startswith('Play ') and n.get('content-desc') not in ('Play all', 'Play Direct media', 'Play Video'))
    click(root, label)
    wait(elapsed, 'Instagram offline playback after process restart', 45)
finally:
    adb('shell', 'cmd', 'connectivity', 'airplane-mode', 'disable')
logs = adb('logcat', '-d', '-s', 'AndroidRuntime:E')
assert not ('FATAL EXCEPTION' in logs and PACKAGE in logs), logs
print('Public Instagram discovery, actual video playback/download, restart and offline playback passed. Isolated audio actions stayed disabled.')
