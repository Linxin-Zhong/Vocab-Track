from django.contrib import admin
from .models import Book, BookWord


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ("id", "book_name", "user_id", "create_time")
    search_fields = ("book_name",)


@admin.register(BookWord)
class BookWordAdmin(admin.ModelAdmin):
    list_display = ("id", "book_id", "word_id", "meaning", "difficulty")
    search_fields = ("meaning",)
