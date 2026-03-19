from django.db import models


class Book(models.Model):
    id = models.AutoField(primary_key=True, db_column="book_id")
    book_name = models.CharField(max_length=50)
    user = models.ForeignKey(
        "user.User",
        on_delete=models.CASCADE,
        null=True,  # Allow null value in db for default books
        blank=True,  # Allow blank field for default books
        db_column="user_id",
    )
    language = models.CharField(max_length=20, null=True, blank=True)
    create_time = models.DateTimeField(auto_now_add=True, db_column="create_time")

    class Meta:
        db_table = "tbl_book"

    def __str__(self):
        return self.book_name

    @property
    def is_default(self):
        return self.user is None


class BookWord(models.Model):
    id = models.AutoField(primary_key=True, db_column="book_word_id")
    book = models.ForeignKey(Book, on_delete=models.CASCADE, db_column="book_id")
    word = models.ForeignKey("word.Word", on_delete=models.CASCADE, db_column="word_id")

    meaning = models.CharField(max_length=255)
    example = models.TextField(blank=True)
    difficulty = models.IntegerField(default=1)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["book", "word"], name="unique_book_word")
        ]
        db_table = "tbl_book_word"

    def __str__(self):
        return f"{self.book.book_name} - {self.word.word_text}"

    @property
    def word_text(self):
        return self.word.word_text
