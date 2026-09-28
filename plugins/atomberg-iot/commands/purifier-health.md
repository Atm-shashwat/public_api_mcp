---
description: Check a water purifier for faults and explain them in plain language
argument-hint: [purifier name]
---

Check the health of my water purifier $ARGUMENTS using the atomberg-iot tools.

1. Call list_devices and find the water purifier: the one with this name if a name was given above, otherwise every water purifier on the account.
2. Call get_device_state once: with its device_id for a single purifier, or with "all" when checking several.
3. Report the input and tank TDS (ppm), the current mode, and whether choking_faults and system_faults are healthy.
4. For each fault, say in plain language what it means and what I should do. Check system_faults for NO_WATER, FLOW_SENSOR_FAILURE or PUMP_CHOKE first: a dead inlet sets every valve bit in choking_faults, so in that case report the inlet problem rather than several blocked valves. Ignore unknown_bits.
