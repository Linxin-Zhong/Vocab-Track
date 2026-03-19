from django.test import TestCase
from rest_framework.test import APIClient, APITestCase
from rest_framework.authtoken.models import Token
from rest_framework import status

from book.models import Book, BookWord
from book.serializers import (
    BookSerializer,
    BookWordSerializer,
    BookWordCreateSerializer,
)
from word.models import Word
from user.models import User
from review.models import UserWord, ReviewSession, ReviewItem


class BookModelTest(TestCase):
    """Test cases for Book model"""

    def setUp(self):
        self.user = User.objects.create_user(
            email="testuser@example.com", password="testpass123"
        )

    def test_create_user_book(self):
        """Test creating a book owned by a user"""
        book = Book.objects.create(user=self.user, book_name="My Book")
        self.assertEqual(book.user, self.user)
        self.assertEqual(book.book_name, "My Book")
        self.assertFalse(book.is_default)

    def test_create_default_book(self):
        """Test creating a default (public) book with user=None"""
        book = Book.objects.create(user=None, book_name="Default Book")
        self.assertIsNone(book.user)
        self.assertEqual(book.book_name, "Default Book")
        self.assertTrue(book.is_default)

    def test_book_str_representation(self):
        """Test book string representation"""
        book = Book.objects.create(user=self.user, book_name="Test Book")
        self.assertEqual(str(book), "Test Book")

    def test_book_has_create_time(self):
        """Test that book has create_time timestamp"""
        book = Book.objects.create(user=self.user, book_name="Test Book")
        self.assertIsNotNone(book.create_time)

    def test_book_cascade_delete_on_user_delete(self):
        """Test that book is deleted when user is deleted"""
        book = Book.objects.create(user=self.user, book_name="Test Book")
        book_id = book.id
        self.user.delete()
        self.assertFalse(Book.objects.filter(id=book_id).exists())

    def test_book_name_max_length(self):
        """Test book name max length constraint"""
        # Book name can be max 50 characters
        # Create with exactly 50 chars - should succeed
        long_name = "a" * 50
        book = Book.objects.create(user=self.user, book_name=long_name)
        self.assertEqual(len(book.book_name), 50)

    def test_default_book_is_property(self):
        """Test is_default property"""
        user_book = Book.objects.create(user=self.user, book_name="User Book")
        default_book = Book.objects.create(user=None, book_name="Default Book")
        self.assertFalse(user_book.is_default)
        self.assertTrue(default_book.is_default)
    
    def test_create_book_with_language(self):
        """Test creating a book with language field"""
        book = Book.objects.create(
            user=self.user,
            book_name="English Book",
            language="en-US"
        )
        self.assertEqual(book.language, "en-US")
        self.assertEqual(book.user, self.user)
        self.assertEqual(book.book_name, "English Book")


class BookWordModelTest(TestCase):
    """Test cases for BookWord model"""

    def setUp(self):
        self.user = User.objects.create_user(
            email="testuser@example.com", password="testpass123"
        )
        self.book = Book.objects.create(user=self.user, book_name="Test Book")
        self.word = Word.objects.create(word_text="hello")

    def test_create_book_word(self):
        """Test creating a BookWord"""
        book_word = BookWord.objects.create(
            book=self.book,
            word=self.word,
            meaning="greeting",
            example="Hello, world!",
            difficulty=1,
        )
        self.assertEqual(book_word.book, self.book)
        self.assertEqual(book_word.word, self.word)
        self.assertEqual(book_word.meaning, "greeting")
        self.assertEqual(book_word.example, "Hello, world!")
        self.assertEqual(book_word.difficulty, 1)

    def test_book_word_str_representation(self):
        """Test BookWord string representation"""
        book_word = BookWord.objects.create(
            book=self.book, word=self.word, meaning="greeting"
        )
        self.assertIn(self.book.book_name, str(book_word))
        self.assertIn(self.word.word_text, str(book_word))

    def test_book_word_word_text_property(self):
        """Test word_text property"""
        book_word = BookWord.objects.create(
            book=self.book, word=self.word, meaning="greeting"
        )
        self.assertEqual(book_word.word_text, "hello")

    def test_book_word_unique_constraint(self):
        """Test that book and word combination is unique"""
        BookWord.objects.create(book=self.book, word=self.word, meaning="greeting")
        with self.assertRaises(Exception):  # IntegrityError
            BookWord.objects.create(book=self.book, word=self.word, meaning="salute")

    def test_book_word_cascade_delete_book(self):
        """Test that BookWord is deleted when Book is deleted"""
        book_word = BookWord.objects.create(
            book=self.book, word=self.word, meaning="greeting"
        )
        book_word_id = book_word.id
        self.book.delete()
        self.assertFalse(BookWord.objects.filter(id=book_word_id).exists())

    def test_book_word_cascade_delete_word(self):
        """Test that BookWord is deleted when Word is deleted"""
        book_word = BookWord.objects.create(
            book=self.book, word=self.word, meaning="greeting"
        )
        book_word_id = book_word.id
        self.word.delete()
        self.assertFalse(BookWord.objects.filter(id=book_word_id).exists())

    def test_book_word_default_difficulty(self):
        """Test default difficulty"""
        book_word = BookWord.objects.create(
            book=self.book, word=self.word, meaning="greeting"
        )
        self.assertEqual(book_word.difficulty, 1)

    def test_book_word_blank_example(self):
        """Test that example field can be blank"""
        book_word = BookWord.objects.create(
            book=self.book, word=self.word, meaning="greeting", example=""
        )
        self.assertEqual(book_word.example, "")


class BookSerializerTest(TestCase):
    """Test cases for BookSerializer"""

    def setUp(self):
        self.user = User.objects.create_user(
            email="testuser@example.com", password="testpass123"
        )
        self.user_book = Book.objects.create(user=self.user, book_name="User Book")
        self.default_book = Book.objects.create(user=None, book_name="Default Book")

    def test_serializer_user_book(self):
        """Test BookSerializer with user book"""
        serializer = BookSerializer(self.user_book)
        data = serializer.data
        self.assertEqual(data["book_name"], "User Book")
        self.assertFalse(data["is_default"])
        self.assertIn("book_id", data)
        self.assertEqual(data["book_id"], self.user_book.id)

    def test_serializer_default_book(self):
        """Test BookSerializer with default book"""
        serializer = BookSerializer(self.default_book)
        data = serializer.data
        self.assertEqual(data["book_name"], "Default Book")
        self.assertTrue(data["is_default"])

    def test_serializer_fields(self):
        """Test that serializer contains expected fields"""
        serializer = BookSerializer(self.user_book)
        self.assertEqual(
            set(serializer.data.keys()),
            {
                "book_id",
                "book_name",
                "is_default",
                "words_num",
                "words_rw_count",
                "days_active",
                "avg_accuracy",
                "rw_trend",
                "rw_words",
            },
        )

    def test_serializer_is_default_read_only(self):
        """Test that is_default is read-only"""
        serializer = BookSerializer(self.user_book)
        self.assertTrue(serializer.fields["is_default"].read_only)

    def test_serializer_includes_language(self):
        """Test that BookSerializer includes the language field"""
        book = Book.objects.create(
            user=self.user,
            book_name="French Book",
            language="fr-FR"
        )
        serializer = BookSerializer(book)
        data = serializer.data
        self.assertEqual(data.get("language"), "fr-FR")


class BookWordSerializerTest(TestCase):
    """Test cases for BookWordSerializer"""

    def setUp(self):
        self.user = User.objects.create_user(
            email="testuser@example.com", password="testpass123"
        )
        self.book = Book.objects.create(user=self.user, book_name="Test Book")
        self.word = Word.objects.create(word_text="hello")
        self.book_word = BookWord.objects.create(
            book=self.book,
            word=self.word,
            meaning="greeting",
            example="Hello!",
            difficulty=2,
        )

    def test_serializer_basic_fields(self):
        """Test BookWordSerializer contains expected fields"""
        serializer = BookWordSerializer(self.book_word)
        data = serializer.data
        self.assertEqual(data["word_text"], "hello")
        self.assertEqual(data["meaning"], "greeting")
        self.assertEqual(data["example"], "Hello!")
        self.assertEqual(data["difficulty"], 2)

    def test_serializer_fields(self):
        """Test serializer field names"""
        serializer = BookWordSerializer(self.book_word)
        expected_fields = {"book_word_id", "word_text", "meaning", "example", "difficulty"}
        self.assertEqual(serializer.data["book_word_id"], self.book_word.id)
        self.assertEqual(set(serializer.data.keys()), expected_fields)

    def test_serializer_word_text_read_only(self):
        """Test that word_text is read-only"""
        serializer = BookWordSerializer(self.book_word)
        self.assertTrue(serializer.fields["word_text"].read_only)


class BookWordCreateSerializerTest(TestCase):
    """Test cases for BookWordCreateSerializer"""

    def test_serializer_valid_data(self):
        """Test with valid data"""
        data = {
            "word_text": "HELLO",
            "meaning": "greeting",
            "example": "Hello, world!",
            "difficulty": 2,
        }
        serializer = BookWordCreateSerializer(data=data)
        self.assertTrue(serializer.is_valid())

    def test_serializer_word_text_stripped_and_lowercased(self):
        """Test that word_text is stripped and lowercased"""
        data = {
            "word_text": "  HELLO  ",
            "meaning": "greeting",
        }
        serializer = BookWordCreateSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data["word_text"], "hello")

    def test_serializer_example_optional(self):
        """Test that example is optional"""
        data = {
            "word_text": "hello",
            "meaning": "greeting",
        }
        serializer = BookWordCreateSerializer(data=data)
        self.assertTrue(serializer.is_valid())

    def test_serializer_difficulty_default(self):
        """Test default difficulty"""
        data = {
            "word_text": "hello",
            "meaning": "greeting",
        }
        serializer = BookWordCreateSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data["difficulty"], 1)

    def test_serializer_difficulty_invalid(self):
        """Test invalid difficulty"""
        data = {
            "word_text": "hello",
            "meaning": "greeting",
            "difficulty": 5,
        }
        serializer = BookWordCreateSerializer(data=data)
        self.assertFalse(serializer.is_valid())

    def test_serializer_missing_word_text(self):
        """Test missing word_text"""
        data = {"meaning": "greeting"}
        serializer = BookWordCreateSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("word_text", serializer.errors)

    def test_serializer_missing_meaning(self):
        """Test missing meaning"""
        data = {"word_text": "hello"}
        serializer = BookWordCreateSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("meaning", serializer.errors)

    def test_serializer_word_text_max_length(self):
        """Test word_text max length"""
        data = {
            "word_text": "a" * 51,
            "meaning": "greeting",
        }
        serializer = BookWordCreateSerializer(data=data)
        self.assertFalse(serializer.is_valid())

    def test_serializer_meaning_max_length(self):
        """Test meaning max length"""
        data = {
            "word_text": "hello",
            "meaning": "a" * 256,
        }
        serializer = BookWordCreateSerializer(data=data)
        self.assertFalse(serializer.is_valid())


class BookViewSetTest(APITestCase):
    """Test cases for BookViewSet"""

    def setUp(self):
        self.client = APIClient()
        self.user1 = User.objects.create_user(
            email="user1@example.com", password="pass123"
        )
        self.user2 = User.objects.create_user(
            email="user2@example.com", password="pass123"
        )
        self.token1 = Token.objects.create(user=self.user1)
        self.token2 = Token.objects.create(user=self.user2)
        self.user1_book = Book.objects.create(user=self.user1, book_name="User1 Book")
        self.user2_book = Book.objects.create(user=self.user2, book_name="User2 Book")
        self.default_book = Book.objects.create(user=None, book_name="Default Book")

    def test_list_without_authentication(self):
        """Test listing books without authentication"""
        response = self.client.get("/book/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_user_books_and_defaults(self):
        """Test user can see their books and default books"""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token1.key)
        response = self.client.get("/book/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        book_names = [book["book_name"] for book in response.data]
        self.assertIn("User1 Book", book_names)
        self.assertIn("Default Book", book_names)
        self.assertNotIn("User2 Book", book_names)

    def test_create_book_without_authentication(self):
        """Test creating book without authentication"""
        data = {"book_name": "New Book"}
        response = self.client.post("/book/", data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_book_successfully(self):
        """Test creating a book successfully"""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token1.key)
        data = {"book_name": "New Book"}
        response = self.client.post("/book/", data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["book_name"], "New Book")
        # Verify book was created with correct user
        book = Book.objects.get(book_name="New Book")
        self.assertEqual(book.user, self.user1)

    def test_retrieve_book(self):
        """Test retrieving a specific book"""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token1.key)
        response = self.client.get(f"/book/{self.user1_book.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["book_name"], "User1 Book")

    def test_retrieve_default_book(self):
        """Test retrieving a default book"""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token1.key)
        response = self.client.get(f"/book/{self.default_book.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_default"])

    def test_retrieve_other_user_book(self):
        """Test that user cannot retrieve other user's book"""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token1.key)
        response = self.client.get(f"/book/{self.user2_book.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_own_book(self):
        """Test updating own book"""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token1.key)
        data = {"book_name": "Updated Book"}
        response = self.client.put(f"/book/{self.user1_book.id}/", data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user1_book.refresh_from_db()
        self.assertEqual(self.user1_book.book_name, "Updated Book")

    def test_update_default_book_fails(self):
        """Test that updating default book fails"""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token1.key)
        data = {"book_name": "Modified Default"}
        response = self.client.put(f"/book/{self.default_book.id}/", data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("Cannot modify", response.data["message"])

    def test_partial_update_own_book(self):
        """Test partially updating own book"""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token1.key)
        data = {"book_name": "Patched Book"}
        response = self.client.patch(f"/book/{self.user1_book.id}/", data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user1_book.refresh_from_db()
        self.assertEqual(self.user1_book.book_name, "Patched Book")

    def test_partial_update_default_book_fails(self):
        """Test that partial updating default book fails"""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token1.key)
        data = {"book_name": "Patched Default"}
        response = self.client.patch(f"/book/{self.default_book.id}/", data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_own_book(self):
        """Test deleting own book"""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token1.key)
        book = Book.objects.create(user=self.user1, book_name="Book to Delete")
        response = self.client.delete(f"/book/{book.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Book.objects.filter(id=book.id).exists())

    def test_delete_default_book_fails(self):
        """Test that deleting default book fails"""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token1.key)
        response = self.client.delete(f"/book/{self.default_book.id}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("Cannot delete", response.data["message"])
        # Verify it still exists
        self.assertTrue(Book.objects.filter(id=self.default_book.id).exists())

    def test_delete_other_user_book_fails(self):
        """Test that user cannot delete other user's book"""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token1.key)
        response = self.client.delete(f"/book/{self.user2_book.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_returns_success_message(self):
        """Test that delete returns success message"""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token1.key)
        book = Book.objects.create(user=self.user1, book_name="My Book")
        response = self.client.delete(f"/book/{book.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("Successfully deleted book", response.data["message"])


class BookWordViewSetTest(APITestCase):
    """Test cases for BookWordViewSet"""

    def setUp(self):
        self.client = APIClient()
        self.user1 = User.objects.create_user(
            email="user1@example.com", password="pass123"
        )
        self.user2 = User.objects.create_user(
            email="user2@example.com", password="pass123"
        )
        self.token1 = Token.objects.create(user=self.user1)
        self.token2 = Token.objects.create(user=self.user2)
        self.user1_book = Book.objects.create(user=self.user1, book_name="User1 Book")
        self.user2_book = Book.objects.create(user=self.user2, book_name="User2 Book")
        self.default_book = Book.objects.create(user=None, book_name="Default Book")
        self.word1 = Word.objects.create(word_text="hello")
        self.word2 = Word.objects.create(word_text="world")

    def test_list_book_words_without_authentication(self):
        """Test listing book words without authentication"""
        response = self.client.get(f"/book/{self.user1_book.id}/word/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_book_words_empty(self):
        """Test listing book words when book is empty"""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token1.key)
        response = self.client.get(f"/book/{self.user1_book.id}/word/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_list_book_words(self):
        """Test listing book words"""
        BookWord.objects.create(
            book=self.user1_book, word=self.word1, meaning="greeting"
        )
        BookWord.objects.create(book=self.user1_book, word=self.word2, meaning="planet")
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token1.key)
        response = self.client.get(f"/book/{self.user1_book.id}/word/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_list_default_book_words(self):
        """Test listing words in default book"""
        BookWord.objects.create(
            book=self.default_book, word=self.word1, meaning="greeting"
        )
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token1.key)
        response = self.client.get(f"/book/{self.default_book.id}/word/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_list_other_user_book_words_fails(self):
        """Test that user cannot list other user's book words"""
        BookWord.objects.create(
            book=self.user2_book, word=self.word1, meaning="greeting"
        )
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token1.key)
        response = self.client.get(f"/book/{self.user2_book.id}/word/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_create_book_word_without_authentication(self):
        """Test creating book word without authentication"""
        data = [
            {"word_text": "hello", "meaning": "greeting"},
        ]
        response = self.client.post(
            f"/book/{self.user1_book.id}/word/", data, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_book_word_successfully(self):
        """Test creating book word successfully"""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token1.key)
        data = [
            {"word_text": "hello", "meaning": "greeting"},
        ]
        response = self.client.post(
            f"/book/{self.user1_book.id}/word/", data, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data["created"]), 1)
        self.assertEqual(response.data["created"][0]["word_text"], "hello")

    def test_create_multiple_book_words(self):
        """Test creating multiple book words"""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token1.key)
        data = [
            {"word_text": "hello", "meaning": "greeting"},
            {"word_text": "world", "meaning": "planet"},
        ]
        response = self.client.post(
            f"/book/{self.user1_book.id}/word/", data, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data["created"]), 2)

    def test_create_book_word_with_example(self):
        """Test creating book word with example"""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token1.key)
        data = [
            {
                "word_text": "hello",
                "meaning": "greeting",
                "example": "Hello, world!",
            },
        ]
        response = self.client.post(
            f"/book/{self.user1_book.id}/word/", data, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["created"][0]["example"], "Hello, world!")

    def test_create_book_word_with_difficulty(self):
        """Test creating book word with difficulty"""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token1.key)
        data = [
            {
                "word_text": "hello",
                "meaning": "greeting",
                "difficulty": 2,
            },
        ]
        response = self.client.post(
            f"/book/{self.user1_book.id}/word/", data, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["created"][0]["difficulty"], 2)

    def test_create_duplicate_book_word(self):
        """Test creating duplicate book word in same book"""
        BookWord.objects.create(
            book=self.user1_book, word=self.word1, meaning="greeting"
        )
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token1.key)
        data = [
            {"word_text": "hello", "meaning": "hi"},
        ]
        response = self.client.post(
            f"/book/{self.user1_book.id}/word/", data, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(len(response.data["failed"]), 1)
        self.assertEqual(response.data["failed"][0]["reason"], "duplicate")

    def test_create_nonexistent_book(self):
        """Test creating word for non-existent book"""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token1.key)
        data = [
            {"word_text": "hello", "meaning": "greeting"},
        ]
        response = self.client.post("/book/9999/word/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_create_book_word_in_default_book_fails(self):
        """Test that adding words to default book fails"""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token1.key)
        data = [
            {"word_text": "hello", "meaning": "greeting"},
        ]
        response = self.client.post(
            f"/book/{self.default_book.id}/word/", data, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("Cannot add", response.data["message"])

    def test_create_book_word_in_other_user_book_fails(self):
        """Test that user cannot add words to other user's book"""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token1.key)
        data = [
            {"word_text": "hello", "meaning": "greeting"},
        ]
        response = self.client.post(
            f"/book/{self.user2_book.id}/word/", data, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("do not have permission", response.data["message"])

    def test_create_mixed_valid_invalid_words(self):
        """Test creating mix of valid and invalid words"""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token1.key)
        word = Word.objects.create(word_text="existing")
        BookWord.objects.create(
            book=self.user1_book, word=word, meaning="already has this"
        )
        data = [
            {"word_text": "hello", "meaning": "greeting"},
            {"word_text": "existing", "meaning": "conflict"},
        ]
        response = self.client.post(
            f"/book/{self.user1_book.id}/word/", data, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data["created"]), 1)
        self.assertEqual(len(response.data["failed"]), 1)

    def test_create_normalizes_word_text(self):
        """Test that word_text is normalized (lowercased and stripped)"""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token1.key)
        data = [
            {"word_text": "  HELLO  ", "meaning": "greeting"},
        ]
        response = self.client.post(
            f"/book/{self.user1_book.id}/word/", data, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # Check that the word was created with lowercase
        word = Word.objects.get(word_text="hello")
        self.assertEqual(word.word_text, "hello")

    def test_book_word_created_with_correct_defaults(self):
        """Test that BookWord is created with correct default values"""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token1.key)
        data = [
            {"word_text": "test", "meaning": "examination"},
        ]
        response = self.client.post(
            f"/book/{self.user1_book.id}/word/", data, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        book_word = BookWord.objects.get(word__word_text="test")
        self.assertEqual(book_word.example, "")
        self.assertEqual(book_word.difficulty, 1)

    def test_retrieve_book_word_detail_with_review_stats(self):
        """Test retrieving nested book word detail including review stats/history."""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token1.key)

        book_word = BookWord.objects.create(
            book=self.user1_book,
            word=self.word1,
            meaning="greeting",
            example="hello there",
            difficulty=2,
        )
        user_word = UserWord.objects.create(
            user=self.user1,
            book_word=book_word,
            correct_times=2,
            wrong_times=1,
        )
        session1 = ReviewSession.objects.create(user=self.user1, book=self.user1_book)
        session2 = ReviewSession.objects.create(user=self.user1, book=self.user1_book)
        ReviewItem.objects.create(
            session=session1,
            user_word=user_word,
            is_correct=True,
            pre_ease_factor=0,
            post_ease_factor=1,
        )
        ReviewItem.objects.create(
            session=session2,
            user_word=user_word,
            is_correct=False,
            pre_ease_factor=1,
            post_ease_factor=0,
        )

        response = self.client.get(f"/book/{self.user1_book.id}/word/{book_word.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["book_id"], self.user1_book.id)
        self.assertEqual(response.data["book_name"], self.user1_book.book_name)
        self.assertEqual(response.data["book_word_id"], book_word.id)
        self.assertEqual(response.data["word_text"], "hello")
        self.assertEqual(response.data["times_reviewed"], 3)
        self.assertEqual(response.data["correct_times"], 2)
        self.assertEqual(response.data["incorrect_times"], 1)
        self.assertEqual(response.data["accuracy"], 0.6667)
        self.assertEqual(len(response.data["review_history"]), 2)
        self.assertEqual(response.data["review_history"][0]["result"], "correct")
        self.assertEqual(response.data["review_history"][1]["result"], "incorrect")

    def test_retrieve_book_word_detail_without_review_stats(self):
        """Test retrieving nested book word detail before any review."""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token1.key)

        book_word = BookWord.objects.create(
            book=self.user1_book,
            word=self.word1,
            meaning="greeting",
        )

        response = self.client.get(f"/book/{self.user1_book.id}/word/{book_word.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["times_reviewed"], 0)
        self.assertEqual(response.data["correct_times"], 0)
        self.assertEqual(response.data["incorrect_times"], 0)
        self.assertEqual(response.data["accuracy"], 0.0)
        self.assertEqual(response.data["review_history"], [])
