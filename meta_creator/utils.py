# utils.py

def merge_people_metadata(people_list):
    """
    Merge duplicate person entries (case-insensitive) by givenName + familyName,
    collecting each person's unique emails into a sorted list.

    Example:
        Input:
            [
                {"givenName": "Micheal", "familyName": "Jack", "email": "micheal@example.com"},
                {"givenName": "micheal", "familyName": "jack", "email": "MICHEAL@example.com"},
                {"givenName": "micheal", "familyName": "jack", "email": "micheal.jack@work.com"},
                {"givenName": "Jane", "familyName": "Smith", "email": ""},
            ]
        Output:
            [
                {"@type": "Person", "givenName": "Micheal", "familyName": "Jack",
                 "email": ["micheal.jack@work.com", "micheal@example.com"]},
                {"@type": "Person", "givenName": "Jane", "familyName": "Smith",
                 "email": []},
            ]
    """
    if not people_list:
        return []

    merged = {}
    for person in people_list:
        given = (person.get("givenName") or "").strip()
        family = (person.get("familyName") or "").strip()
        email = (person.get("email") or "").strip().lower()

        if not given and not family:
            continue  # skip entries with no name info

        key = (given.lower(), family.lower())
        if key not in merged:
            merged[key] = {
                "givenName": given.title(),
                "familyName": family.title(),
                "emails": set(),
            }
        if email:
            merged[key]["emails"].add(email)

    return [
        {
            "@type": "Person",
            "givenName": p["givenName"],
            "familyName": p["familyName"],
            "email": sorted(p["emails"]),
        }
        for p in merged.values()
    ]