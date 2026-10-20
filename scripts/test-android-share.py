"""Standalone APK/system-intent smoke test. Run after adb install; no Metro used.
This injects Android SEND/VIEW from adb shell, not Instagram/TikTok UI automation.
"""
import subprocess, time, xml.etree.ElementTree as ET, pathlib, atexit, re
PACKAGE = 'com.alhudar.harmonia'
COMPONENT = PACKAGE + '/.MainActivity'
ARTIFACTS=pathlib.Path('artifacts/android-smoke');ARTIFACTS.mkdir(parents=True,exist_ok=True)
def capture():
    for name,command in [('logcat.txt',['adb','logcat','-d']),('media-session.txt',['adb','shell','dumpsys','media_session']),('window.xml',['adb','shell','cat','/sdcard/harmonia-window.xml'])]:
        try:(ARTIFACTS/name).write_bytes(subprocess.check_output(command,stderr=subprocess.STDOUT,timeout=20))
        except Exception:pass
    try:(ARTIFACTS/'screen.png').write_bytes(subprocess.check_output(['adb','exec-out','screencap','-p'],timeout=20))
    except Exception:pass
atexit.register(capture)
def adb(*args):
    return subprocess.check_output(['adb', *args], text=True, stderr=subprocess.STDOUT)
def wait_sheet(source, media=False):
    deadline = time.monotonic() + 60
    while time.monotonic() < deadline:
        try:
            adb('shell', 'uiautomator', 'dump', '/sdcard/harmonia-window.xml')
            xml = adb('shell', 'cat', '/sdcard/harmonia-window.xml')
            root = ET.fromstring(xml)
            labels = [n.get('text', '') or n.get('content-desc', '') for n in root.iter('node')]
            if source in labels and 'Save Link' in labels:
                ready=all(any((n.get('text') == label or n.get('content-desc') == label) and n.get('enabled') == ('true' if media and label in ['Play Video', 'Download Video'] else 'false') for n in root.iter('node')) for label in ['Play Video', 'Audio Only', 'Download Video', 'Download Audio'])
                if ready:return root
        except (subprocess.CalledProcessError, ET.ParseError):
            pass
        time.sleep(1)
    raise AssertionError('Share sheet did not appear: ' + source)
def click(root, label):
    import re
    for n in root.iter('node'):
        if n.get('text') == label or n.get('content-desc') == label:
            values = list(map(int, re.findall(r'\d+', n.get('bounds', ''))))
            if len(values) == 4 and values[2] > values[0] and values[3] > values[1]:
                adb('shell', 'input', 'tap', str((values[0]+values[2])//2), str((values[1]+values[3])//2))
                return
    raise AssertionError('Missing button: ' + label)
def close(root): click(root, 'Close')
def wait_text(label, seconds=60):
    deadline=time.monotonic()+seconds
    while time.monotonic()<deadline:
        try:
            adb('shell','uiautomator','dump','/sdcard/harmonia-window.xml')
            root=ET.fromstring(adb('shell','cat','/sdcard/harmonia-window.xml'))
            if any(n.get('text')==label or n.get('content-desc')==label for n in root.iter('node')):return root
        except (subprocess.CalledProcessError,ET.ParseError):pass
        time.sleep(1)
    raise AssertionError('Timed out waiting for: '+label)
handlers=adb('shell','cmd','package','query-activities','--brief','-a','android.intent.action.SEND','-t','text/plain','-c','android.intent.category.DEFAULT')
assert PACKAGE+'/' in handlers,'Harmonia is not registered as an Android text Share destination'
adb('logcat', '-c')
adb('shell','pm','grant',PACKAGE,'android.permission.POST_NOTIFICATIONS')
adb('shell', 'am', 'force-stop', PACKAGE)
for index in range(3):
    adb('shell', 'am', 'start', '-W', '-n', COMPONENT, '-a', 'android.intent.action.SEND', '-t', 'text/plain', '--es', 'android.intent.extra.TEXT', 'https://instagram.com/reel/123')
    root = wait_sheet('Instagram')
    close(root)
    print(('cold' if index == 0 else 'warm/repeated') + ' SEND passed')
adb('shell', 'am', 'start', '-W', '-n', COMPONENT, '-a', 'android.intent.action.VIEW', '-d', 'https://www.facebook.com/reel/123')
close(wait_sheet('Facebook'))
# The repository's generated media fixture, not third-party copyrighted media.
fixture='https://raw.githubusercontent.com/AlHuDaR/Harmonia-Player/ecf20e0767e3264ac58c0b49a10c0ec8159198f4/tests/fixtures/video.mp4'
adb('shell','am','start','-W','-n',COMPONENT,'-a','android.intent.action.SEND','-t','text/plain','--es','android.intent.extra.TEXT',fixture)
root=wait_sheet('Direct media',media=True)
click(root,'Download Video')
close(wait_text('Close'))
adb('shell','input','keyevent','3') # native worker must finish without JS in foreground
# Reopen the existing Activity; persisted native records drive Downloads.
adb('shell','am','start','-W','-n',COMPONENT,'-a','android.intent.action.MAIN')
click(wait_text('Library'),'Library')
click(wait_text('Downloads'),'Downloads')
wait_text('Ready offline',120)
adb('shell','am','force-stop',PACKAGE)
adb('shell','cmd','connectivity','airplane-mode','enable')
try:
    adb('shell','am','start','-W','-n',COMPONENT,'-a','android.intent.action.MAIN')
    click(wait_text('Library'),'Library')
    click(wait_text('Downloads'),'Downloads')
    root=wait_text('Play Direct media')
    click(root,'Play Direct media')
    import re
    deadline=time.monotonic()+30
    playing=False
    while time.monotonic()<deadline:
        adb('shell','uiautomator','dump','/sdcard/harmonia-window.xml')
        current=ET.fromstring(adb('shell','cat','/sdcard/harmonia-window.xml'))
        # UIAutomator may wait for idle until the 15-second fixture ends.
        # Check the explicitly named elapsed clock, never a duration label.
        if any(re.fullmatch(r'Playback position 0:(0[1-9]|1[0-5])',n.get('content-desc','')) for n in current.iter('node')):
            playing=True;break
        time.sleep(1)
    if not playing:
        print('Player labels:',[(n.get('text'),n.get('content-desc')) for n in current.iter('node') if n.get('text') or n.get('content-desc')],flush=True)
    assert playing,'Offline playback time did not advance'
    print('Native file download, process restart and offline playback passed')
finally:
    adb('shell','cmd','connectivity','airplane-mode','disable')
logs = adb('logcat' , '-d', '-s', 'AndroidRuntime:E')
assert not ('FATAL EXCEPTION' in logs and PACKAGE in logs), logs
print('Standalone startup, external system SEND/VIEW and repeated-share smoke passed. No Metro started.')
