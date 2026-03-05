"""Shared utility functions for the API."""


def format_serializer_errors(errors):
    """Convert Django REST Framework serializer errors to a single message string.

    Args:
        errors: The error dictionary from serializer.errors

    Returns:
        str: A semicolon-separated string of error messages in the format "field: message"
    """
    error_messages = []
    for field, messages in errors.items():
        if isinstance(messages, list):
            error_messages.extend([f"{field}: {msg}" for msg in messages])
        else:
            error_messages.append(f"{field}: {messages}")
    return "; ".join(error_messages)
