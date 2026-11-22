# Raspberry Pi kiosk setup

Cardboard works best on a wired or reliable Wi-Fi connection. Raspberry Pi 2 devices should use a 720p display and the built-in low-power renderer (`?perf=1`).

## Recommended URL

Add the screen in **Control → Screens**, then use the generated URL:

```text
https://YOUR-DOMAIN/screen/SCREEN-ID?perf=1
```

The screen ID is public and does not contain a password. Anyone with the URL can view the board.

## Chromium flags

Use Chromium in app/kiosk mode with a single renderer process:

```sh
chromium-browser \
  --kiosk \
  --app="https://YOUR-DOMAIN/screen/SCREEN-ID?perf=1" \
  --disable-dev-shm-usage \
  --renderer-process-limit=1 \
  --disable-session-crashed-bubble \
  --noerrdialogs \
  --disable-infobars \
  --autoplay-policy=no-user-gesture-required
```

`?perf=1` disables blur, shadows, Ken Burns motion, and other expensive effects. The app also enables lite mode automatically on weak devices.

## Autostart with systemd

Create `/etc/systemd/system/cardboard-kiosk.service`:

```ini
[Unit]
Description=Cardboard TV kiosk
After=graphical.target network-online.target
Wants=network-online.target

[Service]
User=pi
Environment=DISPLAY=:0
Environment=XAUTHORITY=/home/pi/.Xauthority
Restart=always
RestartSec=10
ExecStart=/usr/bin/chromium-browser --kiosk --app=https://YOUR-DOMAIN/screen/SCREEN-ID?perf=1 --disable-dev-shm-usage --renderer-process-limit=1 --disable-session-crashed-bubble --noerrdialogs --disable-infobars --autoplay-policy=no-user-gesture-required

[Install]
WantedBy=graphical.target
```

Enable it with:

```sh
sudo systemctl daemon-reload
sudo systemctl enable --now cardboard-kiosk
```

If the desktop session starts Chromium separately, remove that autostart entry so only one kiosk instance runs.

## Screen blanking and maintenance

On X11, disable blanking for the kiosk user:

```sh
xset s off
xset -dpms
xset s noblank
```

Set **Settings → Performance → Low-power mode** on older Pis. Set a nightly reload such as `03:30` to clear stale browser state. Keep the Pi ventilated and schedule a nightly OS reboot if the device runs continuously:

```cron
30 3 * * * /sbin/shutdown -r now
```

Check status with `systemctl status cardboard-kiosk` and logs with `journalctl -u cardboard-kiosk -f`.
