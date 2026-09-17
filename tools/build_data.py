#!/usr/bin/env python3
"""Build compact event-level JSON for the NSRD/Seque explorer."""

from __future__ import annotations

import csv
import json
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path


def clean(value: str | None) -> str:
    return " ".join((value or "").replace("\n", " ").split())


def first(rows: list[dict[str, str]], key: str) -> str:
    return next((row[key] for row in rows if row[key]), "")


def values(rows: list[dict[str, str]], key: str) -> list[str]:
    return list(dict.fromkeys(row[key] for row in rows if row[key]))


def slug(value: str) -> str:
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", ascii_value.lower()).strip("-")


def format_family(event_type: str, subtype: str) -> str:
    combined = f"{event_type} {subtype}".lower()
    if "postcard" in combined:
        return "Pastkartes plate"
    if "digital" in combined:
        return "Digitāls ieraksts"
    if "cd" in combined:
        return "CD"
    if "song" in combined:
        return "Dziesma"
    if "reel" in combined and "cass" not in combined:
        return "Lente"
    if any(term in combined for term in ("cass", "tape", "magnitizdat", "unreleased")):
        return "Kasete"
    return "Cits"


def display_place(place: str) -> str:
    aliases = {
        "Riga": "Rīga",
        "Latvia": "Latvija",
        "Riga, Jūrmala": "Rīga un Jūrmala",
        "Rīga, Jūrmala": "Rīga un Jūrmala",
        "Rīga & Jūrmala": "Rīga un Jūrmala",
        "Riga, Piebalga": "Rīga un Piebalga",
        "Banuži, Pārdaugava": "Bānūži un Pārdaugava",
    }
    return aliases.get(place, place)


def split_urls(raw_values: list[str]) -> list[str]:
    found: list[str] = []
    for raw in raw_values:
        found.extend(re.findall(r"https?://[^\s,;]+", raw))
    return list(dict.fromkeys(url.rstrip(".).") for url in found))


def main() -> None:
    source = Path(sys.argv[1])
    destination = Path(sys.argv[2])
    with source.open(encoding="utf-8-sig", newline="") as handle:
        raw_rows = list(csv.DictReader(handle))

    rows = [
        {clean(key): clean(value) for key, value in row.items()}
        for row in raw_rows
    ]
    grouped: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        grouped[row["Event / artefact"]].append(row)

    events = []
    people_map: dict[str, dict[str, object]] = {}
    for title, event_rows in grouped.items():
        year = int(first(event_rows, "YYYY"))
        month = int(first(event_rows, "MM")) if first(event_rows, "MM").isdigit() else None
        day = int(first(event_rows, "DD")) if first(event_rows, "DD").isdigit() else None
        event_type = first(event_rows, "Event/ artefact type")
        subtype = first(event_rows, "Event/ artefact subtype")
        event_id = f"{year}-{slug(title)}"
        credits = []
        seen_credits: set[tuple[str, str, str]] = set()
        for row in event_rows:
            person = row["Person Family, Name (Nick)"]
            credit_key = (person, row["Role"], row["Specific role"])
            if credit_key in seen_credits:
                continue
            seen_credits.add(credit_key)
            credits.append(
                {
                    "person": person,
                    "role": row["Role"] or "Nav norādīts",
                    "specificRole": row["Specific role"],
                    "otherCredit": row["Other credit (role; source):"],
                    "unspecifiedCredit": row["Unspecified credit:"],
                }
            )
            person_record = people_map.setdefault(
                person,
                {"name": person, "eventIds": [], "years": [], "roles": Counter()},
            )
            person_record["eventIds"].append(event_id)  # type: ignore[index]
            person_record["years"].append(year)  # type: ignore[index]
            person_record["roles"][row["Role"] or "Nav norādīts"] += 1  # type: ignore[index]

        raw_places = values(event_rows, "Place")
        events.append(
            {
                "id": event_id,
                "title": title,
                "year": year,
                "month": month,
                "day": day,
                "dateApprox": first(event_rows, "Date aprox."),
                "type": event_type,
                "subtype": subtype,
                "format": format_family(event_type, subtype),
                "artist": first(event_rows, "Artits/ group name"),
                "place": " · ".join(dict.fromkeys(display_place(place) for place in raw_places)),
                "rawPlace": " · ".join(raw_places),
                "space": " · ".join(values(event_rows, "Space")),
                "institutions": values(event_rows, "Institution, 1") + values(event_rows, "Institution, 2"),
                "sources": values(event_rows, "Source"),
                "urls": split_urls(values(event_rows, "URLs")),
                "notes": values(event_rows, "Notes") + values(event_rows, "More notes"),
                "credits": sorted(credits, key=lambda credit: credit["person"].casefold()),
            }
        )

    events.sort(key=lambda event: (event["year"], event["month"] or 0, event["day"] or 0, event["title"].casefold()))
    people = []
    for record in people_map.values():
        roles: Counter[str] = record.pop("roles")  # type: ignore[assignment]
        years = record["years"]  # type: ignore[assignment]
        people.append(
            {
                **record,
                "eventIds": list(dict.fromkeys(record["eventIds"])),
                "eventCount": len(set(record["eventIds"])),
                "firstYear": min(years),
                "lastYear": max(years),
                "roles": [{"role": role, "count": count} for role, count in roles.most_common()],
            }
        )
    people.sort(key=lambda person: (-person["eventCount"], person["name"].casefold()))

    years = Counter(event["year"] for event in events)
    formats = Counter(event["format"] for event in events)
    payload = {
        "meta": {
            "title": "NSRD / Seque skaņu ierakstu arhīvs",
            "creditRows": len(rows),
            "eventCount": len(events),
            "peopleCount": len(people),
            "yearStart": min(years),
            "yearEnd": max(years),
            "eventsByYear": [{"year": year, "count": years[year]} for year in range(min(years), max(years) + 1)],
            "formats": [{"format": name, "count": count} for name, count in formats.most_common()],
        },
        "events": events,
        "people": people,
    }
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


if __name__ == "__main__":
    main()
