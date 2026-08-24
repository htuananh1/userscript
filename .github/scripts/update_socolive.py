#!/usr/bin/env python3
"""Fetch current public Socolive live rooms and write IPTV JSON/M3U outputs.

The upstream stream URLs are short lived. This script is intentionally small and
stdlib-only so GitHub Actions can refresh the playlist around the clock.
"""

from __future__ import annotations

import argparse
import json
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any
from urllib.error import URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

API = "https://json.vnres.co"
UA = "namhau-socolive-updater/2.0"
ROOT = Path(__file__).resolve().parents[2]
JSON_OUTPUT = ROOT / "Socolive.json"
M3U_OUTPUT = ROOT / "Socolive.m3u"


def fetch_jsonp(path: str, callback: str) -> dict[str, Any]:
    """Return a JSON object from the upstream JSONP endpoint."""
    query = urlencode({"callback": callback})
    request = Request(
        f"{API}{path}?{query}",
        headers={"Accept": "application/json,text/javascript,*/*", "User-Agent": UA},
    )
    with urlopen(request, timeout=20) as response:
        text = response.read().decode("utf-8")

    starts = [index for index in (text.find("{"), text.find("[")) if index >= 0]
    start = min(starts, default=-1)
    end = max(text.rfind("}"), text.rfind("]"))
    if start < 0 or end < start:
        raise ValueError(f"invalid JSONP response for {path}")

    parsed = json.loads(text[start : end + 1])
    if not isinstance(parsed, dict):
        raise ValueError(f"unexpected JSONP payload for {path}")
    return parsed


def stream_url(stream: dict[str, Any]) -> tuple[str, str] | None:
    """Pick the best available stream URL and return it with its stream type."""
    for key in ("hdM3u8", "m3u8", "m3u8Url", "hls"):
        url = stream.get(key)
        if isinstance(url, str) and url.strip():
            return url.strip(), "hls"
    for key in ("hdFlv", "flv", "flvUrl"):
        url = stream.get(key)
        if isinstance(url, str) and url.strip():
            return url.strip(), "flv"
    return None


def fetch_detail(room: dict[str, Any]) -> dict[str, Any] | None:
    room_num = str(room.get("roomNum") or "").strip()
    if not room_num:
        return None

    data = fetch_jsonp(f"/room/{quote(room_num)}/detail.json", "detail")
    detail = data.get("data") if isinstance(data.get("data"), dict) else {}
    detail_room = detail.get("room") if isinstance(detail.get("room"), dict) else {}
    stream = detail.get("stream") if isinstance(detail.get("stream"), dict) else {}
    selected_stream = stream_url(stream)
    if not selected_stream:
        return None

    url, kind = selected_stream
    title = room.get("title") or detail_room.get("title") or f"Socolive {room_num}"
    anchor = room.get("anchor") if isinstance(room.get("anchor"), dict) else {}
    detail_anchor = detail_room.get("anchor") if isinstance(detail_room.get("anchor"), dict) else {}
    nickname = anchor.get("nickName") or detail_anchor.get("nickName")
    name = f"{title} - {nickname}" if nickname else str(title)
    logo = room.get("cover") or detail_room.get("cover") or ""

    return {
        "id": room_num,
        "tvg_id": f"socolive-{room_num}",
        "name": name,
        "logo": logo,
        "group": "Socolive 24/7",
        "url": url,
        "type": kind,
    }


def load_live_rooms() -> list[dict[str, Any]]:
    payload = fetch_jsonp("/all_live_rooms.json", "all_live_rooms")
    groups = payload.get("data") if isinstance(payload.get("data"), dict) else {}
    unique: dict[str, dict[str, Any]] = {}
    for rooms in groups.values():
        if not isinstance(rooms, list):
            continue
        for room in rooms:
            if not isinstance(room, dict):
                continue
            room_num = str(room.get("roomNum") or "").strip()
            if room_num and room.get("liveStatus") == 1:
                unique.setdefault(room_num, room)
    return list(unique.values())


def write_json(channels: list[dict[str, Any]], path: Path = JSON_OUTPUT) -> None:
    path.write_text(json.dumps(channels, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_m3u(channels: list[dict[str, Any]], path: Path = M3U_OUTPUT) -> None:
    lines = ["#EXTM3U"]
    for channel in channels:
        attrs = [
            f'tvg-id="{channel["tvg_id"]}"',
            f'tvg-name="{channel["name"]}"',
            f'tvg-logo="{channel["logo"]}"',
            f'group-title="{channel["group"]}"',
        ]
        lines.append(f"#EXTINF:-1 {' '.join(attrs)},{channel['name']}")
        lines.append(channel["url"])
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def update_outputs(keep_existing_on_error: bool = True) -> int:
    try:
        rooms = load_live_rooms()
    except (OSError, URLError, ValueError, json.JSONDecodeError) as exc:
        if keep_existing_on_error and JSON_OUTPUT.exists() and JSON_OUTPUT.stat().st_size > 0:
            print(f"warning: keeping existing playlist because upstream fetch failed: {exc}", file=sys.stderr)
            return 0
        raise

    channels: list[dict[str, Any]] = []
    errors: list[str] = []
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = [pool.submit(fetch_detail, room) for room in rooms]
        for future in as_completed(futures):
            try:
                channel = future.result()
                if channel:
                    channels.append(channel)
            except Exception as exc:  # keep one bad room from stopping the update
                errors.append(str(exc))

    channels.sort(key=lambda item: item["id"])
    write_json(channels)
    write_m3u(channels)

    print(f"live_rooms={len(rooms)} streams={len(channels)} json={JSON_OUTPUT.name} m3u={M3U_OUTPUT.name}")
    for error in errors:
        print(f"warning: {error}", file=sys.stderr)
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Refresh Socolive IPTV 24/7 playlist files.")
    parser.add_argument("--fail-on-fetch-error", action="store_true", help="do not keep existing outputs when the upstream API is unavailable")
    args = parser.parse_args()
    return update_outputs(keep_existing_on_error=not args.fail_on_fetch_error)


if __name__ == "__main__":
    raise SystemExit(main())
