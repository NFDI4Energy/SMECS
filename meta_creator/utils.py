#utils.py


# hermes_utils.py

def merge_people_metadata(people_list):
    """
    Merge duplicate person entries (case-insensitive) based on givenName + familyName.
    Collect all unique emails, but if all are the same, keep only one.

    Example:
    Input:
        [
            {"givenName": "Micheal", "familyName": "Jack", "email": "micheal@example.com"},
            {"givenName": "micheal", "familyName": "jack", "email": "MICHEAL@example.com"},
            {"givenName": "micheal", "familyName": "jack", "email": "micheal.jack@work.com"},
            {"givenName": "Jane", "familyName": "Smith", "email": ""}
        ]

    Output:
        [
            {
                "@type": "Person",
                "givenName": "Micheal",
                "familyName": "jack",
                "email": ["micheal@example.com", "micheal.jack@work.com"]
            },
            {
                "@type": "Person",
                "givenName": "Jane",
                "familyName": "Smith",
                "email": ""
            }
        ]
    """
    if not people_list:
        return []

    merged = {}

    for person in people_list:
        given = person.get("givenName", "").strip().lower()
        family = person.get("familyName", "").strip().lower()
        email = person.get("email", "").strip().lower()

        if not given and not family:
            # skip if no name info
            continue

        key = (given, family)

        # Initialize entry if not present
        if key not in merged:
            merged[key] = {
                "@type": "Person",
                "givenName": person.get("givenName", "").strip().title(),
                "familyName": person.get("familyName", "").strip().title(),
                "emails": set()
            }

        # Add email if present
        if email:
            merged[key]["emails"].add(email)

    # Format results
    merged_people = []
    for person in merged.values():
        emails = list(person["emails"])
        if not emails:
            email_field = ""
        elif len(emails) == 1:
            email_field = emails[0]
        else:
            # Check if all emails are identical ignoring case (e.g., same email written differently)
            normalized = {e.lower() for e in emails}
            email_field = emails[0] if len(normalized) == 1 else sorted(list(normalized))

        merged_people.append({
            "@type": "Person",
            "givenName": person["givenName"],
            "familyName": person["familyName"],
            "email": email_field
        })

    return merged_people
