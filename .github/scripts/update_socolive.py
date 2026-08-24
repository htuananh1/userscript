#!/usr/bin/env python3
"""Fetch current Socolive IPTV streams and write Socolive.json."""

import datetime
import json
import sys
from urllib.request import Request, urlopen

API_URL = "https://api.gvapi.cc/api/matches"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"


def fetch_matches():
    request = Request(API_URL, headers={"User-Agent": UA, "Accept": "application/json"})
    with urlopen(request, timeout=20) as response:
        raw_data = response.read().decode("utf-8")
    data = json.loads(raw_data)
    if data.get("status") != 0:
        raise ValueError(f"API returned non-zero status: {data.get('status')}")
    return data.get("data", {})


def main():
    try:
        matches = fetch_matches()
    except Exception as exc:
        print(f"Error fetching Socolive matches: {exc}", file=sys.stderr)
        sys.exit(1)

    channels = []
    seen = set()

    for match_key, match in matches.items():
        if not isinstance(match, dict):
            continue

        home = (match.get("homeTeamName") or "").strip()
        away = (match.get("awayTeamName") or "").strip()
        comp = (match.get("competitionName") or "").strip()
        match_time_ts = match.get("matchTime")

        time_str = ""
        if match_time_ts:
            try:
                dt = datetime.datetime.fromtimestamp(match_time_ts)
                time_str = dt.strftime("%H:%M %d/%m")
            except Exception:
                pass

        if home and away:
            match_title = f"{home} vs {away}"
        else:
            match_title = match.get("match_id") or match_key

        group_title = comp if comp else "Socolive"

        anchors = match.get("anchorAppointmentVoList") or []
        for anchor in anchors:
            if not isinstance(anchor, dict):
                continue

            house_id = str(anchor.get("houseId") or "").strip()
            blv_name = (anchor.get("nickName") or "").strip()

            m3u8 = (anchor.get("playStreamAddress2") or "").strip()
            if not m3u8 and anchor.get("servers"):
                servers = anchor.get("servers")
                if isinstance(servers, list) and len(servers) > 0:
                    m3u8 = str(servers[0]).strip()

            if not m3u8:
                continue

            title = match_title
            if blv_name:
                title = f"{title} - {blv_name}"
            if time_str:
                title = f"{title} ({time_str})"

            logo = (
                anchor.get("userImage")
                or match.get("homeTeamLogo")
                or match.get("competitionLogo")
                or ""
            )

            dedup_key = (house_id, m3u8, title)
            if dedup_key in seen:
                continue
            seen.add(dedup_key)

            channels.append({
                "id": house_id if house_id else f"match-{match_key}",
                "tvg_id": f"house-{house_id}" if house_id else f"tvg-{match_key}",
                "name": title,
                "logo": logo,
                "group": group_title,
                "url": m3u8,
                "type": "hls",
            })

    channels.sort(key=lambda item: (item["group"], item["name"]))

    with open("Socolive.json", "w", encoding="utf-8", newline="\n") as output:
        json.dump(channels, output, ensure_ascii=False, indent=2)
        output.write("\n")

    print(f"Successfully processed {len(matches)} matches and generated {len(channels)} IPTV channels.")


if __name__ == "__main__":
    main()
