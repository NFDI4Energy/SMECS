from django import template

register = template.Library()

#is_dict: This filter checks if the value is a dictionary, uses the built-in 'isinstance' function to check the type of the value.
@register.filter
def is_dict(value):
    return isinstance(value, dict)

#is_list: This filter checks if the value is a list, uses the built-in 'isinstance' function to check the type of the value.
@register.filter(name='list')
def is_list(value):
    return isinstance(value, list)
