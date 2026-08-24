#!/usr/bin/env python3
"""Fetch current public live rooms and write Socolive.json."""

import json
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

API = "https://json.vnres.co"
UA = "namhau-socolive-updater/1.0"


def fetch_jsonp(path, callback):
    query = urlencode({"callback": callback})
    request = Request(
        f"{API}{path}?{query}",
        headers={"Accept": "application/json", "User-Agent": UA},
    )
    with urlopen(request, timeout=20) as response:
        text = response.read().decode("utf-8")
    start = min((i for i in (text.find("{"), text.find("[")) if i >= 0), default=-1)
    end = max(text.rfind("}"), text.rfind("]"))
    if start < 0 or end < start:
        raise ValueError(f"invalid JSONP response for {path}")
    return json.loads(text[start : end + 1])


def fetch_detail(room):
    room_num = str(room.get("roomNum", ""))
    if not room_num:
        return None
    data = fetch_jsonp(f"/room/{quote(room_num)}/detail.json", "detail")
    stream = data.get("data", {}).get("stream", {}) or {}
    url = stream.get("hdM3u8") or stream.get("m3u8")
    kind = "hls"
    if not url:
        url = stream.get("hdFlv") or stream.get("flv")
        kind = "flv"
    if not url:
        return None

    detail_room = data.get("data", {}).get("room", {}) or {}
    title = room.get("title") or detail_room.get("title") or f"Room {room_num}"
    anchor = (room.get("anchor") or {}).get("nickName") or (detail_room.get("anchor") or {}).get("nickName")
    if anchor:
        title = f"{title} - {anchor}"
    logo = room.get("cover") or detail_room.get("cover") or ""
    return {
        "id": room_num,
        "tvg_id": f"room-{room_num}",
        "name": title,
        "logo": logo,
        "group": "SocoLive",
        "url": url,
        "type": kind,
    }


def main():
    payload = fetch_jsonp("/all_live_rooms.json", "all_live_rooms")
    groups = payload.get("data", {}) or {}
    unique = {}
    for value in groups.values():
        if not isinstance(value, list):
            continue
        for room in value:
            if room.get("roomNum") and room.get("liveStatus") == 1:
                unique.setdefault(str(room["roomNum"]), room)

    channels = []
    errors = []
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = [pool.submit(fetch_detail, room) for room in unique.values()]
        for future in as_completed(futures):
            try:
                channel = future.result()
                if channel:
                    channels.append(channel)
            except Exception as exc:  # keep one bad room from stopping the update
                errors.append(str(exc))

    channels.sort(key=lambda item: item["id"])
    with open("Socolive.json", "w", encoding="utf-8", newline="\n") as output:
        json.dump(channels, output, ensure_ascii=False, indent=2)
        output.write("\n")

    print(f"reported={sum(len(v) for v in groups.values() if isinstance(v, list))} unique={len(unique)} streams={len(channels)}")
    for error in errors:
        print(f"warning: {error}", file=sys.stderr)


if __name__ == "__main__":
    main()
