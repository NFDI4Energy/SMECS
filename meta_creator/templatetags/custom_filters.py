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
    return dictionary.get(key)

# Define a function to change camelcase to nice output
@register.filter
def camel_to_spaces_lower(value):
    return re.sub(r'(?<!^)(?=[A-Z])', ' ', value).title()

#Define function to check if a author with a given email is present
@register.filter
def check_author(dictionary, email):
    authors = dictionary.get("author")

    return check_for_value(authors, email)

def check_for_value(metadata, email):
    if not metadata:
        return False
    for value in metadata:
        if isinstance(value, dict) and value.get('email') == email:
            return True
    
    return False

#Define function to check if a maintainer with a given email is present
@register.filter
def check_maintainer(dictionary, email):
    maintainers = dictionary.get("maintainer")

    return check_for_value(maintainers, email)

@register.filter
def prepare(obj):
    if obj[0].get("identifier"):
        json.dumps(obj)
    return json.dumps([])