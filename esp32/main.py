# main.py -- DHT22 -> Postgres every five seconds
#
# Wiring (see esp32/dht22.yml):
#   VCC  -> 3V3
#   DATA -> GPIO4
#   GND  -> GND
#
# Each round trip does two jobs: it sends the reading, and it brings back
# threshold_c, which decides whether the onboard LED on GPIO 2 is lit.
#
#   mpremote connect COM5 run esp32/main.py      # run it once, watch the posts
#   mpremote connect COM5 fs cp esp32/main.py :main.py   # make it survive reboot

import gc
import time

import network
import ujson
import urequests
from machine import Pin

import dht

# ======== CHANGE THESE ========
WIFI_SSID = "Tufts_Wireless"
WIFI_PASS = ""
STATION = "medford-01"
URL = "https://weather-one-virid.vercel.app/cloud/history"
INTERVAL_S = 5
SENSOR_PIN = 4
LED_PIN = 2                 # onboard LED
# ==============================

sensor = dht.DHT22(Pin(SENSOR_PIN))
led = Pin(LED_PIN, Pin.OUT)
led.off()


def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)

    if wlan.isconnected():
        return wlan

    print("wifi: connecting to " + WIFI_SSID)
    wlan.connect(WIFI_SSID, WIFI_PASS)

    for _ in range(30):
        if wlan.isconnected():
            break
        print(".", end="")
        time.sleep(1)
    print()

    if not wlan.isconnected():
        print("wifi: failed - check SSID, or the MAC registration")
        return None

    print("wifi: ip " + wlan.ifconfig()[0])
    return wlan


def upload(temperature, humidity):
    """POST one reading. Returns threshold_c, or None if the call failed."""
    body = ujson.dumps(
        {
            "station": STATION,
            "temperature": round(temperature, 1),
            "humidity": round(humidity, 1),
        }
    )

    response = None
    try:
        response = urequests.post(
            URL, data=body, headers={"Content-Type": "application/json"}
        )
        status = response.status_code
        text = response.text
        print(status, text)

        if status == 200:
            return response.json().get("threshold_c")
    except Exception as error:
        # Wi-Fi blips and TLS hiccups are normal on a shared network.
        print("upload failed: " + str(error))
    finally:
        # The board has ~8 MB of RAM; a leaked response eats it in a few hours.
        if response is not None:
            response.close()

    return None


def main():
    wlan = connect_wifi()
    threshold = None

    while True:
        started = time.ticks_ms()

        if wlan is None or not wlan.isconnected():
            wlan = connect_wifi()

        try:
            sensor.measure()
            temperature = sensor.temperature()
            humidity = sensor.humidity()
        except OSError as error:
            # A checksum timeout now and then is normal on a long jumper.
            print("sensor: " + str(error))
            time.sleep_ms(INTERVAL_S * 1000)
            continue

        reported = upload(temperature, humidity)
        if reported is not None:
            threshold = reported

        if threshold is None:
            led.off()
        else:
            led.value(1 if temperature > threshold else 0)

        print(
            "%.1fC  %.1f%%  led=%d  threshold=%s"
            % (temperature, humidity, led.value(), threshold)
        )

        gc.collect()

        # Sleep only the remainder, so a cycle is five seconds end to end
        # rather than five seconds plus however long the POST took.
        elapsed = time.ticks_diff(time.ticks_ms(), started)
        pause = INTERVAL_S * 1000 - elapsed
        if pause > 0:
            time.sleep_ms(pause)


main()
