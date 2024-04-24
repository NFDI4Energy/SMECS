# Counting number of extracted metadata
def count_non_empty_values(data):
    count = 0
    for value in data.values():
        if isinstance(value, dict):
            count += count_non_empty_values(value)  # Recursively count nested values
        elif isinstance(value, list):
            count += len(value)  # Count elements in lists
        else:
            count += 1
    return count