from django.utils import timezone


def calculate_adaptive_interval(
    is_correct: bool,
    ease_factor: int,
    correct_times: int,
    wrong_times: int,
) -> tuple:
    """
    Adaptive algorithm automatically adjusts review intervals
    based on performance and accuracy.
    """
    # Update counters first to calculate accurate accuracy
    if is_correct:
        new_correct_times = correct_times + 1
        new_wrong_times = wrong_times
    else:
        new_correct_times = correct_times
        new_wrong_times = wrong_times + 1

    # Calculate accuracy to detect performance trends
    total_attempts = new_correct_times + new_wrong_times
    accuracy = new_correct_times / total_attempts if total_attempts > 0 else 0

    if is_correct:
        new_ease_factor = ease_factor + 1

        # Performance-based interval selection
        if accuracy > 0.9:  # Very strong
            interval_multiplier = 2.0
        elif accuracy > 0.75:  # Good
            interval_multiplier = 1.5
        elif accuracy > 0.5:  # Okay
            interval_multiplier = 1.0
        else:  # Weak
            interval_multiplier = 0.7
    else:
        new_ease_factor = max(0, ease_factor - 1)
        interval_multiplier = 0.2  # Much shorter review

    # Normalize ease_factor into a practical range (0-3)
    ease_normalized = min(new_ease_factor / 10.0, 3.0)

    # Calculate interval: base * ease_factor * performance
    interval_days = max(1, int(7 * ease_normalized * interval_multiplier))

    next_review_delta = timezone.timedelta(days=interval_days)

    return new_ease_factor, next_review_delta
