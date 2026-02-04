from django.db import models


class Word(models.Model):
    id = models.AutoField(primary_key=True, db_column="word_id")
    word_text = models.CharField(
        max_length=50, unique=True, db_column="word_text"
    )  # avoid same word entries

    class Meta:
        db_table = "tbl_word"

    def __str__(self):
        return self.word_text
