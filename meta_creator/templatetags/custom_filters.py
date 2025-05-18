from django import template
import re

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