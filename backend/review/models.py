from django.db import models


class UserWord(models.Model):
    id = models.AutoField(primary_key=True, db_column="user_word_id")

    user = models.ForeignKey(
        "user.User",
        on_delete=models.CASCADE,
        db_column="user_id",
        related_name="user_word",
    )

    book_word = models.ForeignKey(
        "book.BookWord",
        on_delete=models.CASCADE,
        db_column="book_word_id",
        related_name="user_word",
    )

    ease_factor = models.IntegerField(default=0)
    correct_times = models.IntegerField(default=0)
    wrong_times = models.IntegerField(default=0)

    last_time = models.DateTimeField(null=True, blank=True)
    next_review_time = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "tbl_user_word"
        unique_together = ("user", "book_word")

    def __str__(self):
        return f"{self.user}-{self.book_word}"


class ReviewSession(models.Model):
    id = models.AutoField(primary_key=True, db_column="rw_session_id")

    user = models.ForeignKey(
        "user.User",
        on_delete=models.CASCADE,
        db_column="user_id",
        related_name="review_session",
    )

    book = models.ForeignKey(
        "book.Book",
        on_delete=models.CASCADE,
        db_column="book_id",
        related_name="review_session",
    )

    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)

    total_cnt = models.IntegerField(default=0)
    correct_cnt = models.IntegerField(default=0)
    accuracy = models.FloatField(default=0.0)

    class Meta:
        db_table = "tbl_review_session"

    def __str__(self):
        return f"Session {self.id} ({self.user} - {self.book})"


class ReviewItem(models.Model):
    id = models.AutoField(primary_key=True, db_column="rw_item_id")

    session = models.ForeignKey(
        ReviewSession,
        on_delete=models.CASCADE,
        db_column="rw_session_id",
        related_name="review_item",
    )

    user_word = models.ForeignKey(
        UserWord,
        on_delete=models.CASCADE,
        db_column="user_word_id",
        related_name="review_item",
    )

    is_correct = models.BooleanField()

    pre_ease_factor = models.IntegerField()
    post_ease_factor = models.IntegerField()

    create_time = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "tbl_review_item"
