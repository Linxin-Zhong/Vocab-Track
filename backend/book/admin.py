from django.contrib import admin
from .models import Book, BookWord


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ("id", "book_name", "user", "create_time", "language")
    search_fields = ("book_name",)


@admin.register(BookWord)
class BookWordAdmin(admin.ModelAdmin):
    list_display = ("id", "book", "word", "meaning", "difficulty")
    search_fields = ("meaning",)
