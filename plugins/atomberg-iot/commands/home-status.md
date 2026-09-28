---
description: Summarise every Atomberg device on the account and flag anything that needs attention
---

Give me a short status of my Atomberg devices using the atomberg-iot tools.

1. Call list_devices once for names and types, then get_device_state once with device_id "all". Make no other calls.
2. One line per device: its name, what it is, and its key state. Fans: on or off, speed, light. Water purifiers: mode, and whether choking_faults and system_faults are healthy. Locks: battery.
3. Then a "Needs attention" list: devices that are offline, locks with battery under 20%, and purifiers with faults. Leave the list out if nothing qualifies.
