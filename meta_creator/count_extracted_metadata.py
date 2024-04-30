# Counting number of extracted metadata
def count_non_empty_values(data):
    count = 0
    if isinstance(data, dict):
        for value in data.values():
            if isinstance(value, dict):
                count += count_non_empty_values(value) 
            elif isinstance(value, list):
                count += len(value) 
            else:
                count += 1
    elif isinstance(data, list):
        for item in data:
            count += count_non_empty_values(item)
    return count
