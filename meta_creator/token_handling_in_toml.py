import os
import toml
import base64


def update_token_to_toml(token: str, config_path: str = "hermes.toml") -> None:
    """
    Updates the token in the HERMES TOML configuration file, encoding it with base64.

    Args:
        token (str): The personal token key to be set.
        config_path (str): Path to the TOML config file.
    """
    # Encode the token
    encoded_token = base64.b64encode(token.encode()).decode()

    # Load TOML config
    if os.path.exists(config_path):
        with open(config_path, "r") as f:
            config = toml.load(f)
    else:
        config = {}

    # Modify the config
    config['harvest'] = config.get('harvest', {})
    config['harvest']['token'] = encoded_token

    # Save the token
    with open(config_path, "w") as f:
        toml.dump(config, f)


def load_token_from_toml(config_path: str = "hermes.toml") -> str:
    """
    Loads and decodes the token from the HERMES TOML configuration file.

    Args:
        config_path (str): Path to the TOML config file.

    Returns:
        str: The decoded token.
    """
    with open(config_path, "r") as f:
        config = toml.load(f)
    
    encoded_token = config.get('harvest', {}).get('token')
    if encoded_token:
        return base64.b64decode(encoded_token.encode()).decode()
    else:
        return None
    
     
def remove_token_from_toml(config_path):
    """
    Removes the 'token' field from the 'harvest' section of HERMES TOML file.

    This function loads the specified TOML file, checks if a 'token' entry exists under
    the 'harvest' section, deletes it if present, and saves the updated configuration
    back to the same file.

    Args:
        config_path (str): Path to the TOML configuration file to be modified.
    """
    # Load the TOML file
    with open(config_path, 'r') as file:
        data = toml.load(file)
    
    # Remove the token if it exists
    if 'token' in data.get('harvest', {}):
        del data['harvest']['token']
    
    # Save the updated TOML file
    with open(config_path, 'w') as file:
        toml.dump(data, file)



