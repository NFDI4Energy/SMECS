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
    if obj[0].get("identifier"):
        return json.dumps(obj)
    return json.dumps([])

@register.filter
def prepare_single(obj):
    return json.dumps(obj)

#Define 'get' to access values in the dictionary
@register.filter
def get_array(dictionary, key):
    result = dictionary.get(key, '')
    return result[0]

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

@register.filter
def all_types_same(type_metadata, metadata_dict):
    """
    Returns True if all type_metadata values for keys in metadata_dict are the same.
    """
    if not metadata_dict:
        return True
    types = [type_metadata.get(key) for key in metadata_dict.keys()]
    return all(t == types[0] for t in types)