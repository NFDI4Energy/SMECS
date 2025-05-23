import copy
from pyld import jsonld

# Validating json.ld
def validate_codemeta(json):
    """Check whether a codemeta json object is valid"""
    try:
        original_context = json["@context"]
        context = json["@context"]
    except:
        print("Not a JSON-LD file")
        return False
    
    if context == "https://doi.org/10.5063/schema/codemeta-2.0":
        # Temp replacement for https resolution issues for schema.org
        context = "https://w3id.org/codemeta/3.0"
        json["@context"] = context

    if context == "https://w3id.org/codemeta/3.0":
        cp = copy.deepcopy(json)
        # Expand and contract to check mapping
        cp = jsonld.expand(cp)
        cp = jsonld.compact(cp, context)
        keys = cp.keys()
        # Using len because @type elements get returned as type
        same = len(set(keys)) == len(set(json.keys()))
        if not same:
            print("Unsupported terms in Codemeta file")
            diff = set(json.keys()) - set(keys)
            if "@type" in diff:
                diff.remove("@type")
            print(sorted(diff))
        fail = ":" in keys
        if fail:
            print("Not in schema")
            for k in keys:
                if ":" in k:
                    print(k)

        # Restore the original context
        json["@context"] = original_context
        return same and not fail

    return True