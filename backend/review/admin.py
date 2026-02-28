from django.contrib import admin
from .models import UserWord, ReviewSession, ReviewItem


@admin.register(UserWord)
class UserWordAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "book_word",
        "ease_factor",
        "correct_times",
        "wrong_times",
        "last_time",
        "next_review_time",
    )
    search_fields = ("user__user_name", "book_word__word")
    list_filter = ("ease_factor", "last_time")
    ordering = ("-next_review_time",)


@admin.register(ReviewSession)
class ReviewSessionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "book",
        "start_time",
        "end_time",
        "total_cnt",
        "correct_cnt",
        "accuracy",
    )
    search_fields = ("user__user_name", "book__book_name")
    list_filter = ("start_time", "accuracy")
    ordering = ("-start_time",)


@admin.register(ReviewItem)
class ReviewItemAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "session",
        "user_word",
        "is_correct",
        "pre_ease_factor",
        "post_ease_factor",
        "create_time",
    )
    search_fields = (
        "session__id__exact",
        "user_word__user__user_name",
        "user_word__book_word__word",
    )
    list_filter = ("is_correct", "create_time")
    readonly_fields = ("create_time",)
    ordering = ("-create_time",)
