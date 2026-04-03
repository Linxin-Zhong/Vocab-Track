from django.core.exceptions import ValidationError
from django.test import TestCase

from word.models import Word


class WordModelTest(TestCase):
    """Test cases for Word model."""

    def test_create_word(self):
        """Test creating a word."""
        word = Word.objects.create(word_text="hello")

        self.assertEqual(word.word_text, "hello")
        self.assertIsNotNone(word.id)

    def test_word_str_representation(self):
        """Test word string representation."""
        word = Word.objects.create(word_text="bonjour")

        self.assertEqual(str(word), "bonjour")

    def test_word_text_is_unique(self):
        """Test that word_text must be unique."""
        Word.objects.create(word_text="hello")

        with self.assertRaises(Exception):  # IntegrityError
            Word.objects.create(word_text="hello")

    def test_word_text_is_required(self):
        """Test that word_text cannot be blank."""
        word = Word(word_text="")

        with self.assertRaises(ValidationError):
            word.full_clean()

    def test_word_text_max_length_allows_50_characters(self):
        """Test that word_text accepts values up to 50 characters."""
        word = Word(word_text="a" * 50)

        word.full_clean()

        self.assertEqual(len(word.word_text), 50)

    def test_word_text_max_length_rejects_more_than_50_characters(self):
        """Test that word_text rejects values longer than 50 characters."""
        word = Word(word_text="a" * 51)

        with self.assertRaises(ValidationError):
            word.full_clean()

    def test_word_model_metadata(self):
        """Test Word model field mapping metadata."""
        self.assertEqual(Word._meta.db_table, "tbl_word")
        self.assertEqual(Word._meta.get_field("id").db_column, "word_id")
        self.assertEqual(Word._meta.get_field("word_text").db_column, "word_text")
