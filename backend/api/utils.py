"""Shared utility functions for the API."""


def format_serializer_errors(errors):
    """Convert Django REST Framework serializer errors to a single message string.

    Handles both regular serializer errors (dict) and ListSerializer errors (list).
    When many=True is used, serializer.errors returns a list instead of a dict.

    Args:
        errors: The error dictionary from serializer.errors (dict) or
                a list of errors from a many=True serializer (list)

    Returns:
        str: A semicolon-separated string of error messages in the format "field: message"
             For list errors, includes the item index
    """
    error_messages = []

    if isinstance(errors, list):
        # Handle ListSerializer errors (many=True): list of dicts or values
        for index, item_errors in enumerate(errors):
            if isinstance(item_errors, dict):
                # Dict of field errors for this item
                for field, messages in item_errors.items():
                    if isinstance(messages, list):
                        error_messages.extend(
                            [f"Item {index} - {field}: {msg}" for msg in messages]
                        )
                    else:
                        error_messages.append(
                            f"Item {index} - {field}: {item_errors[field]}"
                        )
            else:
                # Direct error value (not a dict)
                error_messages.append(f"Item {index}: {item_errors}")
    else:
        # Handle regular serializer errors (dict): field -> messages
        for field, messages in errors.items():
            if isinstance(messages, list):
                error_messages.extend([f"{field}: {msg}" for msg in messages])
            else:
                error_messages.append(f"{field}: {messages}")

    return "; ".join(error_messages)
