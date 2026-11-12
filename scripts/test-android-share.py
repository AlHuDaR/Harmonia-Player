"""Standalone APK/system-intent smoke test. Run after adb install; no Metro used.
This injects Android SEND/VIEW from adb shell, not Instagram/TikTok UI automation.
"""
import subprocess, time, xml.etree.ElementTree as ET, pathlib, atexit, re
PACKAGE = 'com.alhudar.harmonia'
COMPONENT = PACKAGE + '/.MainActivity'
ARTIFACTS=pathlib.Path('artifacts/android-smoke');ARTIFACTS.mkdir(parents=True,exist_ok=True)
def capture():
    try:
        dump_window()
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired, ET.ParseError):
        pass
    for name,command in [('logcat.txt',['adb','logcat','-d']),('media-session.txt',['adb','shell','dumpsys','media_session']),('window.xml',['adb','shell','cat','/sdcard/harmonia-window.xml'])]:
        try:(ARTIFACTS/name).write_bytes(subprocess.check_output(command,stderr=subprocess.STDOUT,timeout=20))
        except Exception:pass
    try:(ARTIFACTS/'screen.png').write_bytes(subprocess.check_output(['adb','exec-out','screencap','-p'],timeout=20))
    except Exception:pass
atexit.register(capture)
def adb(*args):
    return subprocess.check_output(['adb', *args], text=True, stderr=subprocess.STDOUT, timeout=25)
WINDOW = '/sdcard/harmonia-window.xml'
launcher_dialog_dismissed = False

def dump_window():
    # Never read an earlier hierarchy when UIAutomator fails to write a new one.
    adb('shell', 'rm', '-f', WINDOW)
    adb('shell', 'uiautomator', 'dump', WINDOW)
    return ET.fromstring(adb('shell', 'cat', WINDOW))

def tap_node(node):
    values = list(map(int, re.findall(r'\d+', node.get('bounds', ''))))
    if len(values) != 4 or values[2] <= values[0] or values[3] <= values[1]:
        return False
    adb('shell', 'input', 'tap', str((values[0]+values[2])//2), str((values[1]+values[3])//2))
    return True

def dismiss_launcher_anr(root):
    global launcher_dialog_dismissed
    if launcher_dialog_dismissed:
        return False
    system_nodes = [n for n in root.iter('node') if n.get('package') == 'android']
    if not any(n.get('resource-id') == 'android:id/alertTitle' and
               n.get('text') == "Pixel Launcher isn't responding" for n in system_nodes):
        return False
    close_button = next((n for n in system_nodes
                         if n.get('resource-id') == 'android:id/aerr_close'
                         and n.get('enabled') == 'true'), None)
    if close_button is None:
        return False
    ET.ElementTree(root).write(ARTIFACTS / 'pixel-launcher-anr.xml', encoding='utf-8')
    launcher_dialog_dismissed = tap_node(close_button)
    if launcher_dialog_dismissed:
        print('Dismissed Pixel Launcher ANR on the emulator; continuing UI assertions.', flush=True)
    return launcher_dialog_dismissed

def wait_for_window(description, matches, seconds=60):
    deadline = time.monotonic() + seconds
    observed = 'no hierarchy captured'
    while time.monotonic() < deadline:
        try:
            root = dump_window()
            nodes = list(root.iter('node'))
            observed = ', '.join(
                f"{n.get('package')}: {n.get('text') or n.get('content-desc')} (enabled={n.get('enabled')})"
                for n in nodes if n.get('text') or n.get('content-desc')
            ) or 'no visible labels'
            if not dismiss_launcher_anr(root) and matches(root):
                return root
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired, ET.ParseError) as error:
            observed = str(error)
        time.sleep(1)
    raise AssertionError(f'{description}. Last observation: {observed}')

def wait_sheet(source, media=False, absent_label=None):
    def matches(root):
        nodes = [n for n in root.iter('node') if n.get('package') == PACKAGE]
        labels = {label for n in nodes for label in (n.get('text'), n.get('content-desc'))}
        if source not in labels or 'Save Link' not in labels or absent_label in labels:
            return False
        return all(
            any(label in (n.get('text'), n.get('content-desc')) and n.get('enabled') == expected
                for n in nodes)
            for label, expected in (
                ('Play Video', 'true' if media else 'false'),
                ('Audio Only', 'false'),
                ('Download Video', 'true' if media else 'false'),
                ('Download Audio', 'false'),
            )
        )
    return wait_for_window('Share sheet did not appear: ' + source, matches)

def click(root, label):
    for n in root.iter('node'):
        if label in (n.get('text'), n.get('content-desc')) and tap_node(n):
            return
    raise AssertionError('Missing button: ' + label)
def close(root): click(root, 'Close')
def wait_text(label, seconds=60):
    return wait_for_window(
        'Timed out waiting for: ' + label,
        lambda root: any(n.get('package') == PACKAGE and
                         label in (n.get('text'), n.get('content-desc')) for n in root.iter('node')),
        seconds,
    )
handlers=adb('shell','cmd','package','query-activities','--brief','-a','android.intent.action.SEND','-t','text/plain','-c','android.intent.category.DEFAULT')
assert PACKAGE+'/' in handlers,'Harmonia is not registered as an Android text Share destination'
adb('logcat', '-c')
adb('shell','pm','grant',PACKAGE,'android.permission.POST_NOTIFICATIONS')
adb('shell', 'am', 'force-stop', PACKAGE)
for index in range(3):
    adb('shell', 'am', 'start', '-W', '-n', COMPONENT, '-a', 'android.intent.action.SEND', '-t', 'text/plain', '--es', 'android.intent.extra.TEXT', 'https://instagram.com/reel/123')
    root = wait_sheet('Instagram')
    close(root)
    wait_text('Home')  # Confirm dismissal before sending the next intent.
    print(('cold' if index == 0 else 'warm/repeated') + ' SEND passed')
adb('shell', 'am', 'start', '-W', '-n', COMPONENT, '-a', 'android.intent.action.SEND', '-t', 'text/plain', '--es', 'android.intent.extra.TEXT', 'https://instagram.com/reel/123')
wait_sheet('Instagram')
adb('shell', 'am', 'start', '-W', '-n', COMPONENT, '-a', 'android.intent.action.SEND', '-t', 'text/plain', '--es', 'android.intent.extra.TEXT', 'invalid-share')
share_error = 'No safe web link was found in the shared text.'
wait_text(share_error)
adb('shell', 'input', 'keyevent', 'KEYCODE_BACK')
root = wait_sheet('Instagram', absent_label=share_error)
close(root)
wait_text('Home')
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
