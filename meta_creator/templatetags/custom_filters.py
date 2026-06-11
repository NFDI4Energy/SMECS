from django import template
import re
import json

register = template.Library()

#is_dict: This filter checks if the value is a dictionary, uses the built-in 'isinstance' function to check the type of the value.
@register.filter
def is_dict(value):
    return isinstance(value, dict)

#is_list: This filter checks if the value is a list, uses the built-in 'isinstance' function to check the type of the value.
@register.filter(name='list')
def is_list(value):
    return isinstance(value, list)

#Define 'get' to access values in the dictionary
@register.filter
def get(dictionary, key):
    if not isinstance(dictionary, dict):
        return ''
    return dictionary.get(key, '')

# Define a function to change camelcase to nice output
@register.filter
def camel_to_spaces_lower(value):
    return re.sub(r'(?<!^)(?=[A-Z])', ' ', value).title()

#Define function to check if a author with a given email is present
@register.filter
def check_author(dictionary, contributor):
    if not isinstance(contributor, dict):
        return False
    authors = dictionary.get("author")

    return check_for_value(authors, contributor)

def check_for_value(metadata, contributor):
    if not metadata:
        return False
    for value in metadata:
        if isinstance(value, dict) and value.get('email') == contributor.get('email',''):
            return True
        if isinstance(value, dict) and value.get('givenName') == contributor.get('givenName','') and value.get('familyName') == contributor.get('familyName',''):
            return True
    
    return False

#Define function to check if a maintainer with a given email is present
@register.filter
def check_maintainer(dictionary, email):
    maintainers = dictionary.get("maintainer")

    return check_for_value(maintainers, email)

@register.filter
def prepare_array(obj):
    if isinstance(obj, list) and obj and isinstance(obj[0], dict) and obj[0].get("identifier"):
        return json.dumps(obj)
    return json.dumps([])

@register.filter
def prepare_single(obj):
    return json.dumps(obj)

#Define 'get' to access values in the dictionary
@register.filter
def get_array(dictionary, key):
    result = dictionary.get(key, '')
    if isinstance(result, list) and result:
        return result[0]
    return {}

@register.filter
def row_has_values(row, columns):
    """
    Returns True if at least one value in the row for the given columns is not empty.
    Usage: {% if row|row_has_values:columns %} ... {% endif %}
    """
    for col in columns:
        value = row.get(col, "")
        if value not in [None, '', [], {}]:
            return True
    return False

def _persons_are_same(p1, p2):
    """Return True if two person dicts represent the same individual."""
    if not isinstance(p1, dict) or not isinstance(p2, dict):
        return False

    def first_email(e):
        if isinstance(e, list):
            return e[0].strip().lower() if e else ""
        return (e or "").strip().lower()

    e1, e2 = first_email(p1.get("email")), first_email(p2.get("email"))
    if e1 and e2 and e1 == e2:
        return True

    g1 = (p1.get("givenName") or "").strip().lower()
    f1 = (p1.get("familyName") or "").strip().lower()
    g2 = (p2.get("givenName") or "").strip().lower()
    f2 = (p2.get("familyName") or "").strip().lower()
    return bool(g1 or f1) and g1 == g2 and f1 == f2


@register.filter
def check_person_in_list(person_list, person):
    """
    Return True if person (dict) matches any entry in person_list.
    Used in the unique-tab person table to determine role checkbox state.
    """
    if not isinstance(person_list, list) or not isinstance(person, dict):
        return False
    return any(_persons_are_same(person, p) for p in person_list)


@register.filter
def get_rows(value, metadata_dict):
    """
    Return a deduplicated list of all persons from contributor, author, and
    maintainer when the tab contains all three role lists (i.e. RelatedPersons).
    For all other tabs the original value is returned unchanged.

    Used as {{ value|get_rows:metadata_dict }} on the table row iteration so
    that persons who only appear in 'author' or 'maintainer' (e.g. from a CFF
    source) are also shown in the unified person table.
    """
    if not isinstance(metadata_dict, dict):
        return value

    role_keys = {"contributor", "author", "maintainer"}
    if not role_keys.issubset(set(metadata_dict.keys())):
        return value  # Not the person tab — use the field's own list unchanged

    result = []
    for role_key in ("contributor", "author", "maintainer"):
        for person in metadata_dict.get(role_key, []):
            if not isinstance(person, dict):
                continue
            given  = (person.get("givenName")  or "").strip()
            family = (person.get("familyName") or "").strip()
            if not given and not family:
                continue
            if not any(_persons_are_same(person, p) for p in result):
                result.append(person)

    # If nothing found (all lists have only empty placeholders), fall back so
    # the add-row row still renders correctly
    return result if result else value


@register.filter
def all_types_same(type_metadata, metadata_dict):
    """
    Returns True if all type_metadata values for keys in metadata_dict are the same.
    """
    if not metadata_dict:
        return True
    collected_types = [type_metadata.get(key) for key in metadata_dict.keys()]
    return all(t == collected_types[0] for t in collected_types)