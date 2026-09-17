#!/usr/bin/env python3
"""Profile the NSRD/Seque credit-level CSV without modifying the source."""

from __future__ import annotations

import csv
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path


def clean(value: str) -> str:
    return " ".join(value.replace("\n", " ").split())


def main() -> None:
    source = Path(sys.argv[1])
    with source.open(encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))

    columns = list(rows[0]) if rows else []
    normalized = [{clean(key): clean(value) for key, value in row.items()} for row in rows]
    columns = [clean(column) for column in columns]

    missing = {
        column: sum(not row[column] for row in normalized)
        for column in columns
    }
    unique = {
        column: len({row[column] for row in normalized if row[column]})
        for column in columns
    }

    event_rows: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in normalized:
        event_rows[row["Event / artefact"]].append(row)

    years = Counter(row["YYYY"] for row in normalized if row["YYYY"])
    event_types = Counter(row["Event/ artefact type"] for row in normalized if row["Event/ artefact type"])
    event_subtypes = Counter(row["Event/ artefact subtype"] for row in normalized if row["Event/ artefact subtype"])
    roles = Counter(row["Role"] for row in normalized if row["Role"])
    specific_roles = Counter(row["Specific role"] for row in normalized if row["Specific role"])
    people = Counter(row["Person Family, Name (Nick)"] for row in normalized if row["Person Family, Name (Nick)"])
    places = Counter(row["Place"] for row in normalized if row["Place"])

    duplicate_credits = Counter(
        (
            row["Person Family, Name (Nick)"],
            row["Event / artefact"],
            row["Role"],
            row["Specific role"],
        )
        for row in normalized
    )

    report = {
        "rows": len(normalized),
        "columns": len(columns),
        "distinct_events": len([event for event in event_rows if event]),
        "blank_event_rows": len(event_rows.get("", [])),
        "distinct_people": len(people),
        "year_range": [min(map(int, years)), max(map(int, years))] if years else [],
        "missing": missing,
        "unique": unique,
        "top": {
            "years": years.most_common(20),
            "event_types": event_types.most_common(),
            "event_subtypes": event_subtypes.most_common(),
            "roles": roles.most_common(),
            "specific_roles": specific_roles.most_common(30),
            "people": people.most_common(30),
            "places": places.most_common(30),
            "events_by_credit_rows": sorted(
                ((event, len(event_credits)) for event, event_credits in event_rows.items() if event),
                key=lambda item: (-item[1], item[0].casefold()),
            )[:30],
        },
        "exact_duplicate_credit_groups": [
            {"key": list(key), "count": count}
            for key, count in duplicate_credits.items()
            if count > 1
        ],
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
