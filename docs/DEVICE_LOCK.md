# Device restriction support

## Current boundary

The shared parent account, child links and Study focus sessions work in the web app.
`approved`, `revoked` and `expired` describe the **Study session**, never a confirmed
OS unlock. The selected session duration remains the parent's advance approval
of ending Study at that time.

The current release adds a kiosk link entry at the sign-in screen and platform
setup instructions in the parent panel. No native controller, MDM integration,
automatic device enrollment, or OS lock acknowledgement is installed by this
release. A PWA cannot attest that other apps are blocked.

## Supported preparation paths

| Platform | Manual preparation now | Automatic full device control still required |
| --- | --- | --- |
| Android | App pinning with parent-only device credentials | Installed native controller, Device Owner / managed deployment and allowlisted Lock Task Mode |
| iPhone / iPad | Guided Access with a separate parent passcode | Signed native app on supervised device, MDM allowlist for Autonomous Single App Mode, Mac/Xcode build and real-device test |
| Windows | Assigned Access with Edge on supported editions, a separate kiosk account and protected parent account | Installed authenticated device controller or management integration; an explicit release policy and confirmed OS acknowledgement |

Windows Home does not support Assigned Access. App pinning, Guided Access, and
Assigned Access keep an app in use; a browser may still navigate to other websites
unless browser controls / managed URL restrictions also limit it. These manual
paths do not satisfy "a link alone automatically locks every consumer device".
Windows' Ctrl+Alt+Del breakout can reach sign-in independently of Study approval.

## Link entry inside an existing kiosk

Use `https://study.imai.my/` as the permanent Edge kiosk startup URL.
On Study's sign-in page, expand **Buka link belajar**, paste a fresh full child
link and press **Mula belajar**. This uses the existing single-use redemption
flow and child-only token. The input accepts only this deployment's origin,
root path and a single valid join fragment, and never redirects to a supplied
third-party host or stores the invite in query parameters.

Do not redeem the link in a normal browser first: an Edge kiosk runs InPrivate
and will not inherit that browser's tab-scoped Study token. Do not put one-use
links in persistent kiosk profiles, logs, screenshots or startup settings.
Restarting the kiosk may clear InPrivate state and require a fresh link.

## Before native implementation and enrollment

The next implementation needs target device enrollment and distribution inputs,
particularly a Mac/Xcode signing environment, supervised iOS test hardware and
the chosen device management service. Android and iOS build tools and mobile
test devices are not available through the currently connected Ubuntu/Windows
devices. Windows TimeMachine is Pro and supports Assigned Access, but it has
not been converted into a child's kiosk.

Keep device credentials separate from parent passwords and browser session
tokens. Bind each enrolled device to its owning family and child. Native
controllers must authenticate to the server and accept only bounded session
commands; a JavaScript message or checkbox must not authorize OS release.
Report parent approval and confirmed OS release as separate states.
Offline recovery must use parent/admin authentication, with explicit expiry
policy; network errors cannot be interpreted as approval.

Native acceptance requires testing: correct child landing, blocked app switching,
parent-approved release, rejected child/cross-family release, reconnect,
restart/reboot, session expiry and parent recovery without network. A build,
test double, static configuration or setup checkbox cannot prove OS enforcement.

Do not reset, supervise, enroll, replace a user's normal desktop, or apply kiosk
policies without a separate review of the actual device, backup and recovery
account. No reset or policy change is performed by this preparation release.

## Windows preparation files

See [Windows preparation](../devices/windows/README.md). The preflight is read-only;
the generator writes an XML file for review and does not apply policy.

## Official references

- [Android app pinning](https://support.google.com/android/answer/9455138?hl=en)
- [Android Lock Task Mode](https://developer.android.com/work/dpc/dedicated-devices/lock-task-mode)
- [Android dedicated device provisioning](https://developer.android.com/work/dpc/dedicated-devices)
- [Apple Guided Access](https://support.apple.com/en-us/111795)
- [Apple Single App Mode](https://developer.apple.com/videos/play/wwdc2022/10152/)
- [Apple supervision](https://support.apple.com/guide/deployment/about-device-supervision-dep1d89f0bff/web)
- [Microsoft Assigned Access](https://learn.microsoft.com/en-us/windows/configuration/assigned-access/)
- [Microsoft Edge kiosk](https://learn.microsoft.com/en-us/deployedge/microsoft-edge-configure-kiosk-mode)
