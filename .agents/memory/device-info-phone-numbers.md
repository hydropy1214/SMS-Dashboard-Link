---
name: Device info phone numbers
description: How the Mac agent reports SMS-capable iPhones with real phone numbers and the real forwarding check
---

## What was built

New agent (installed via Setup Guide after reinstall) reports two extra fields in heartbeats:
- `usbHardwareCount: number` — raw count of USB-physically-connected iPhones from `system_profiler`
- `deviceInfo: {name, phone, connectionType}[]` — SMS-verified devices, phone extracted from Messages.app service IDs

## Real forwarding check

Old agent (no `usbHardwareCount`): `usbDevices` = raw hardware names; forwarding not ready if `usb.length > 0 && connectedDevices.length === 0`
New agent: forwarding not ready if `usbHardwareCount > 0 && deviceInfo.filter(d => d.connectionType === "usb").length === 0`

The key insight: old agent's `usbDevices` = raw hw names (not SMS-verified); new agent's `usbDevices` = SMS service names (forwarding already confirmed). So having `usbDevices` populated in new agent means forwarding IS on — you need `usbHardwareCount` to know whether physical iPhones are connected but forwarding is off.

## Phone number extraction (agent-side)

Messages.app service IDs contain the phone number: e.g. `SMS;-;E:+15551234567;+15551234567`.
AppleScript: `tell application "Messages" to get id of (services whose service type = SMS)` → parse with `/\+\d{7,15}/`.

## DB columns added

`mac_agents`: `usb_hardware_count integer`, `device_info jsonb`

**Why:** text[] columns can't store structured data. jsonb used for deviceInfo so frontend gets name + phone + connectionType without parsing.

## Frontend (Compose.tsx)

- `allDevices` memo: uses `deviceInfo` when present (new agent), falls back to string arrays (old agent)
- Device card primary label: phone number in monospace font when known, else service name
- "Any available" cards: phone numbers shown as inline monospace badges below summary line
- `forwardingNotReady`: dual-path logic (see above)
