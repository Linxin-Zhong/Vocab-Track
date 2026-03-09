from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient, APITestCase
from rest_framework.authtoken.models import Token
from rest_framework import status

from review.models import UserWord, ReviewSession, ReviewItem
from review.serializers import (
    ReviewStartSerializer,
    ReviewAnswerSerializer,
    ReviewEndSerializer,
)
from user.models import User
from book.models import Book, BookWord
from word.models import Word


class UserWordModelTest(TestCase):
    """Test cases for UserWord model"""

    def setUp(self):
        self.user = User.objects.create_user(
            email="testuser@example.com", password="testpass123"
        )
        self.book = Book.objects.create(user=self.user, book_name="Test Book")
        self.word = Word.objects.create(word_text="hello")
        self.book_word = BookWord.objects.create(
            book=self.book, word=self.word, meaning="greeting"
        )

    def test_create_user_word(self):
        """Test creating a UserWord"""
        user_word = UserWord.objects.create(
            user=self.user,
            book_word=self.book_word,
            ease_factor=0,
            correct_times=0,
            wrong_times=0,
        )
        self.assertEqual(user_word.user, self.user)
        self.assertEqual(user_word.book_word, self.book_word)
        self.assertEqual(user_word.ease_factor, 0)
        self.assertEqual(user_word.correct_times, 0)
        self.assertEqual(user_word.wrong_times, 0)

    def test_user_word_str_representation(self):
        """Test UserWord string representation"""
        user_word = UserWord.objects.create(user=self.user, book_word=self.book_word)
        self.assertIn(str(self.user), str(user_word))
        self.assertIn(str(self.book_word), str(user_word))

    def test_user_word_unique_together(self):
        """Test that user and book_word combination is unique"""
        UserWord.objects.create(user=self.user, book_word=self.book_word)
        with self.assertRaises(Exception):  # IntegrityError
            UserWord.objects.create(user=self.user, book_word=self.book_word)

    def test_user_word_cascade_delete(self):
        """Test that UserWord is deleted when User is deleted"""
        user_word = UserWord.objects.create(user=self.user, book_word=self.book_word)
        user_word_id = user_word.id
        self.user.delete()
        self.assertFalse(UserWord.objects.filter(id=user_word_id).exists())

    def test_user_word_with_review_times(self):
        """Test UserWord with last_time and next_review_time"""
        now = timezone.now()
        user_word = UserWord.objects.create(
            user=self.user,
            book_word=self.book_word,
            last_time=now,
            next_review_time=now + timedelta(days=3),
        )
        self.assertEqual(user_word.last_time, now)
        self.assertEqual(user_word.next_review_time, now + timedelta(days=3))


class ReviewSessionModelTest(TestCase):
    """Test cases for ReviewSession model"""

    def setUp(self):
        self.user = User.objects.create_user(
            email="testuser@example.com", password="testpass123"
        )
        self.book = Book.objects.create(user=self.user, book_name="Test Book")

    def test_create_review_session(self):
        """Test creating a ReviewSession"""
        now = timezone.now()
        session = ReviewSession.objects.create(
            user=self.user,
            book=self.book,
            start_time=now,
            total_cnt=5,
            correct_cnt=0,
        )
        self.assertEqual(session.user, self.user)
        self.assertEqual(session.book, self.book)
        self.assertEqual(session.total_cnt, 5)
        self.assertEqual(session.correct_cnt, 0)
        self.assertEqual(session.accuracy, 0.0)

    def test_review_session_str_representation(self):
        """Test ReviewSession string representation"""
        session = ReviewSession.objects.create(
            user=self.user, book=self.book, start_time=timezone.now()
        )
        self.assertIn("Session", str(session))
        self.assertIn(str(self.user), str(session))
        self.assertIn(str(self.book), str(session))

    def test_review_session_cascade_delete_user(self):
        """Test that ReviewSession is deleted when User is deleted"""
        session = ReviewSession.objects.create(
            user=self.user, book=self.book, start_time=timezone.now()
        )
        session_id = session.id
        self.user.delete()
        self.assertFalse(ReviewSession.objects.filter(id=session_id).exists())

    def test_review_session_cascade_delete_book(self):
        """Test that ReviewSession is deleted when Book is deleted"""
        session = ReviewSession.objects.create(
            user=self.user, book=self.book, start_time=timezone.now()
        )
        session_id = session.id
        self.book.delete()
        self.assertFalse(ReviewSession.objects.filter(id=session_id).exists())

    def test_review_session_accuracy_calculation(self):
        """Test accuracy calculation"""
        session = ReviewSession.objects.create(
            user=self.user,
            book=self.book,
            total_cnt=10,
            correct_cnt=7,
            accuracy=0.7,
        )
        self.assertEqual(session.accuracy, 0.7)

    def test_review_session_with_end_time(self):
        """Test ReviewSession with start and end times"""
        start_time = timezone.now()
        end_time = start_time + timedelta(minutes=10)
        session = ReviewSession.objects.create(
            user=self.user,
            book=self.book,
            start_time=start_time,
            end_time=end_time,
        )
        self.assertEqual(session.start_time, start_time)
        self.assertEqual(session.end_time, end_time)


class ReviewItemModelTest(TestCase):
    """Test cases for ReviewItem model"""

    def setUp(self):
        self.user = User.objects.create_user(
            email="testuser@example.com", password="testpass123"
        )
        self.book = Book.objects.create(user=self.user, book_name="Test Book")
        self.word = Word.objects.create(word_text="hello")
        self.book_word = BookWord.objects.create(
            book=self.book, word=self.word, meaning="greeting"
        )
        self.user_word = UserWord.objects.create(
            user=self.user, book_word=self.book_word
        )
        self.session = ReviewSession.objects.create(
            user=self.user, book=self.book, start_time=timezone.now()
        )

    def test_create_review_item_correct(self):
        """Test creating a ReviewItem for correct answer"""
        item = ReviewItem.objects.create(
            session=self.session,
            user_word=self.user_word,
            is_correct=True,
            pre_ease_factor=0,
            post_ease_factor=1,
        )
        self.assertEqual(item.session, self.session)
        self.assertEqual(item.user_word, self.user_word)
        self.assertTrue(item.is_correct)
        self.assertEqual(item.pre_ease_factor, 0)
        self.assertEqual(item.post_ease_factor, 1)

    def test_create_review_item_wrong(self):
        """Test creating a ReviewItem for wrong answer"""
        item = ReviewItem.objects.create(
            session=self.session,
            user_word=self.user_word,
            is_correct=False,
            pre_ease_factor=0,
            post_ease_factor=0,
        )
        self.assertFalse(item.is_correct)

    def test_review_item_has_create_time(self):
        """Test that ReviewItem has auto-generated create_time"""
        item = ReviewItem.objects.create(
            session=self.session,
            user_word=self.user_word,
            is_correct=True,
            pre_ease_factor=0,
            post_ease_factor=1,
        )
        self.assertIsNotNone(item.create_time)

    def test_review_item_unique_constraint(self):
        """Test that session and user_word combination is unique"""
        ReviewItem.objects.create(
            session=self.session,
            user_word=self.user_word,
            is_correct=True,
            pre_ease_factor=0,
            post_ease_factor=1,
        )
        with self.assertRaises(Exception):  # IntegrityError
            ReviewItem.objects.create(
                session=self.session,
                user_word=self.user_word,
                is_correct=False,
                pre_ease_factor=1,
                post_ease_factor=0,
            )

    def test_review_item_cascade_delete_session(self):
        """Test that ReviewItem is deleted when ReviewSession is deleted"""
        item = ReviewItem.objects.create(
            session=self.session,
            user_word=self.user_word,
            is_correct=True,
            pre_ease_factor=0,
            post_ease_factor=1,
        )
        item_id = item.id
        self.session.delete()
        self.assertFalse(ReviewItem.objects.filter(id=item_id).exists())

    def test_review_item_cascade_delete_user_word(self):
        """Test that ReviewItem is deleted when UserWord is deleted"""
        item = ReviewItem.objects.create(
            session=self.session,
            user_word=self.user_word,
            is_correct=True,
            pre_ease_factor=0,
            post_ease_factor=1,
        )
        item_id = item.id
        self.user_word.delete()
        self.assertFalse(ReviewItem.objects.filter(id=item_id).exists())


class ReviewStartSerializerTest(TestCase):
    """Test cases for ReviewStartSerializer"""

    def test_serializer_with_valid_data(self):
        """Test ReviewStartSerializer with valid data"""
        data = {"book_id": 1, "limit": 10}
        serializer = ReviewStartSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data["book_id"], 1)
        self.assertEqual(serializer.validated_data["limit"], 10)

    def test_serializer_with_default_limit(self):
        """Test ReviewStartSerializer with default limit"""
        data = {"book_id": 1}
        serializer = ReviewStartSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data["limit"], 5)

    def test_serializer_invalid_book_id(self):
        """Test ReviewStartSerializer with invalid book_id"""
        data = {"book_id": -1, "limit": 5}
        serializer = ReviewStartSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("book_id", serializer.errors)

    def test_serializer_invalid_limit(self):
        """Test ReviewStartSerializer with invalid limit"""
        data = {"book_id": 1, "limit": 101}
        serializer = ReviewStartSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("limit", serializer.errors)

    def test_serializer_missing_book_id(self):
        """Test ReviewStartSerializer with missing book_id"""
        data = {"limit": 5}
        serializer = ReviewStartSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("book_id", serializer.errors)


class ReviewAnswerSerializerTest(TestCase):
    """Test cases for ReviewAnswerSerializer"""

    def test_serializer_with_valid_data_correct(self):
        """Test ReviewAnswerSerializer with valid correct answer"""
        data = {"session_id": 1, "user_word_id": 1, "is_correct": True}
        serializer = ReviewAnswerSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        self.assertTrue(serializer.validated_data["is_correct"])

    def test_serializer_with_valid_data_wrong(self):
        """Test ReviewAnswerSerializer with valid wrong answer"""
        data = {"session_id": 1, "user_word_id": 1, "is_correct": False}
        serializer = ReviewAnswerSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        self.assertFalse(serializer.validated_data["is_correct"])

    def test_serializer_missing_session_id(self):
        """Test ReviewAnswerSerializer with missing session_id"""
        data = {"user_word_id": 1, "is_correct": True}
        serializer = ReviewAnswerSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("session_id", serializer.errors)

    def test_serializer_missing_user_word_id(self):
        """Test ReviewAnswerSerializer with missing user_word_id"""
        data = {"session_id": 1, "is_correct": True}
        serializer = ReviewAnswerSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("user_word_id", serializer.errors)

    def test_serializer_missing_is_correct(self):
        """Test ReviewAnswerSerializer with missing is_correct"""
        data = {"session_id": 1, "user_word_id": 1}
        serializer = ReviewAnswerSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("is_correct", serializer.errors)


class ReviewEndSerializerTest(TestCase):
    """Test cases for ReviewEndSerializer"""

    def test_serializer_with_valid_data(self):
        """Test ReviewEndSerializer with valid data"""
        data = {"session_id": 1}
        serializer = ReviewEndSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data["session_id"], 1)

    def test_serializer_missing_session_id(self):
        """Test ReviewEndSerializer with missing session_id"""
        data = {}
        serializer = ReviewEndSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("session_id", serializer.errors)


class ReviewStartViewTest(APITestCase):
    """Test cases for ReviewStartView"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="testuser@example.com", password="testpass123"
        )
        self.token = Token.objects.create(user=self.user)
        self.book = Book.objects.create(user=self.user, book_name="Test Book")
        self.word1 = Word.objects.create(word_text="hello")
        self.word2 = Word.objects.create(word_text="world")
        self.book_word1 = BookWord.objects.create(
            book=self.book, word=self.word1, meaning="greeting"
        )
        self.book_word2 = BookWord.objects.create(
            book=self.book, word=self.word2, meaning="planet"
        )

    def test_start_review_without_authentication(self):
        """Test starting review without authentication"""
        data = {"book_id": self.book.id, "limit": 5}
        response = self.client.post("/review/start/", data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_start_review_with_valid_data(self):
        """Test starting a review session with valid data"""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token.key)
        data = {"book_id": self.book.id, "limit": 5}
        response = self.client.post("/review/start/", data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("session_id", response.data)
        self.assertIn("words", response.data)
        self.assertEqual(len(response.data["words"]), 2)

    def test_start_review_nonexistent_book(self):
        """Test starting review with non-existent book"""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token.key)
        data = {"book_id": 9999, "limit": 5}
        response = self.client.post("/review/start/", data)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_start_review_book_with_no_words(self):
        """Test starting review with book that has no words"""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token.key)
        empty_book = Book.objects.create(user=self.user, book_name="Empty Book")
        data = {"book_id": empty_book.id, "limit": 5}
        response = self.client.post("/review/start/", data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "book has no words")

    def test_start_review_creates_user_words(self):
        """Test that start review creates UserWord entries"""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token.key)
        initial_count = UserWord.objects.filter(user=self.user).count()
        data = {"book_id": self.book.id, "limit": 5}
        response = self.client.post("/review/start/", data)
        new_count = UserWord.objects.filter(user=self.user).count()
        self.assertEqual(new_count, initial_count + 2)

    def test_start_review_respects_limit(self):
        """Test that start review respects the limit"""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token.key)
        data = {"book_id": self.book.id, "limit": 1}
        response = self.client.post("/review/start/", data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["words"]), 1)

    def test_start_review_returns_session_id(self):
        """Test that start review returns session_id"""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token.key)
        data = {"book_id": self.book.id, "limit": 5}
        response = self.client.post("/review/start/", data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        session_id = response.data["session_id"]
        session = ReviewSession.objects.get(id=session_id)
        self.assertEqual(session.user, self.user)
        self.assertEqual(session.book, self.book)

    def test_start_review_with_public_book(self):
        """Test starting review with public book (user=None)"""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token.key)
        public_book = Book.objects.create(user=None, book_name="Public Book")
        word = Word.objects.create(word_text="test")
        BookWord.objects.create(book=public_book, word=word, meaning="test meaning")
        data = {"book_id": public_book.id, "limit": 5}
        response = self.client.post("/review/start/", data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class ReviewAnswerViewTest(APITestCase):
    """Test cases for ReviewAnswerView"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="testuser@example.com", password="testpass123"
        )
        self.token = Token.objects.create(user=self.user)
        self.book = Book.objects.create(user=self.user, book_name="Test Book")
        self.word = Word.objects.create(word_text="hello")
        self.book_word = BookWord.objects.create(
            book=self.book, word=self.word, meaning="greeting"
        )
        self.user_word = UserWord.objects.create(
            user=self.user, book_word=self.book_word, ease_factor=0
        )
        self.session = ReviewSession.objects.create(
            user=self.user,
            book=self.book,
            start_time=timezone.now(),
            total_cnt=1,
        )

    def test_answer_without_authentication(self):
        """Test answering without authentication"""
        data = {
            "session_id": self.session.id,
            "user_word_id": self.user_word.id,
            "is_correct": True,
        }
        response = self.client.post("/review/answer/", data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_answer_correct(self):
        """Test answering correctly"""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token.key)
        data = {
            "session_id": self.session.id,
            "user_word_id": self.user_word.id,
            "is_correct": True,
        }
        response = self.client.post("/review/answer/", data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_correct"])
        # Verify ease factor increased
        self.user_word.refresh_from_db()
        self.assertEqual(self.user_word.ease_factor, 1)
        self.assertEqual(self.user_word.correct_times, 1)

    def test_answer_incorrect(self):
        """Test answering incorrectly"""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token.key)
        data = {
            "session_id": self.session.id,
            "user_word_id": self.user_word.id,
            "is_correct": False,
        }
        response = self.client.post("/review/answer/", data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["is_correct"])
        # Verify ease factor stayed at 0
        self.user_word.refresh_from_db()
        self.assertEqual(self.user_word.ease_factor, 0)
        self.assertEqual(self.user_word.wrong_times, 1)

    def test_answer_nonexistent_session(self):
        """Test answering with non-existent session"""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token.key)
        data = {
            "session_id": 9999,
            "user_word_id": self.user_word.id,
            "is_correct": True,
        }
        response = self.client.post("/review/answer/", data)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_answer_nonexistent_user_word(self):
        """Test answering with non-existent user_word"""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token.key)
        data = {
            "session_id": self.session.id,
            "user_word_id": 9999,
            "is_correct": True,
        }
        response = self.client.post("/review/answer/", data)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_answer_same_word_twice(self):
        """Test answering the same word twice in same session"""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token.key)
        data = {
            "session_id": self.session.id,
            "user_word_id": self.user_word.id,
            "is_correct": True,
        }
        # First answer
        response1 = self.client.post("/review/answer/", data)
        self.assertEqual(response1.status_code, status.HTTP_200_OK)
        # Second answer
        response2 = self.client.post("/review/answer/", data)
        self.assertEqual(response2.status_code, status.HTTP_400_BAD_REQUEST)

    def test_answer_next_review_time_correct(self):
        """Test next_review_time after correct answer"""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token.key)
        before = timezone.now()
        data = {
            "session_id": self.session.id,
            "user_word_id": self.user_word.id,
            "is_correct": True,
        }
        response = self.client.post("/review/answer/", data)
        after = timezone.now()
        self.user_word.refresh_from_db()
        # With adaptive algorithm: first correct answer should be ~1 day later
        # (ease_factor=0→1, accuracy=1.0, so interval ≈ 1-2 days)
        min_expected = before + timedelta(days=1)
        max_expected = after + timedelta(days=2)
        self.assertGreaterEqual(
            self.user_word.next_review_time, min_expected - timedelta(seconds=1)
        )
        self.assertLessEqual(
            self.user_word.next_review_time,
            max_expected + timedelta(seconds=1),
        )

    def test_answer_next_review_time_wrong(self):
        """Test next_review_time after wrong answer"""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token.key)
        before = timezone.now()
        data = {
            "session_id": self.session.id,
            "user_word_id": self.user_word.id,
            "is_correct": False,
        }
        response = self.client.post("/review/answer/", data)
        after = timezone.now()
        self.user_word.refresh_from_db()
        # Should be 1 day later
        expected = before + timedelta(days=1)
        self.assertGreaterEqual(
            self.user_word.next_review_time, expected - timedelta(seconds=1)
        )

    def test_answer_creates_review_item(self):
        """Test that answer creates ReviewItem"""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token.key)
        data = {
            "session_id": self.session.id,
            "user_word_id": self.user_word.id,
            "is_correct": True,
        }
        response = self.client.post("/review/answer/", data)
        item = ReviewItem.objects.get(session=self.session, user_word=self.user_word)
        self.assertTrue(item.is_correct)
        self.assertEqual(item.pre_ease_factor, 0)
        self.assertEqual(item.post_ease_factor, 1)


class ReviewEndViewTest(APITestCase):
    """Test cases for ReviewEndView"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="testuser@example.com", password="testpass123"
        )
        self.token = Token.objects.create(user=self.user)
        self.book = Book.objects.create(user=self.user, book_name="Test Book")
        self.word1 = Word.objects.create(word_text="hello")
        self.word2 = Word.objects.create(word_text="world")
        self.book_word1 = BookWord.objects.create(
            book=self.book, word=self.word1, meaning="greeting"
        )
        self.book_word2 = BookWord.objects.create(
            book=self.book, word=self.word2, meaning="planet"
        )
        self.user_word1 = UserWord.objects.create(
            user=self.user, book_word=self.book_word1
        )
        self.user_word2 = UserWord.objects.create(
            user=self.user, book_word=self.book_word2
        )
        self.session = ReviewSession.objects.create(
            user=self.user,
            book=self.book,
            start_time=timezone.now(),
            total_cnt=2,
        )

    def test_end_review_without_authentication(self):
        """Test ending review without authentication"""
        data = {"session_id": self.session.id}
        response = self.client.post("/review/end/", data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_end_review_successfully(self):
        """Test ending a review session successfully"""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token.key)
        # Create some review items
        ReviewItem.objects.create(
            session=self.session,
            user_word=self.user_word1,
            is_correct=True,
            pre_ease_factor=0,
            post_ease_factor=1,
        )
        ReviewItem.objects.create(
            session=self.session,
            user_word=self.user_word2,
            is_correct=False,
            pre_ease_factor=0,
            post_ease_factor=0,
        )
        data = {"session_id": self.session.id}
        response = self.client.post("/review/end/", data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("session_id", response.data)
        self.assertIn("duration_seconds", response.data)
        self.assertIn("total", response.data)
        self.assertIn("correct", response.data)
        self.assertIn("accuracy", response.data)
        self.assertEqual(response.data["total"], 2)
        self.assertEqual(response.data["correct"], 1)
        self.assertEqual(response.data["accuracy"], 0.5)

    def test_end_review_nonexistent_session(self):
        """Test ending non-existent session"""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token.key)
        data = {"session_id": 9999}
        response = self.client.post("/review/end/", data)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_end_review_other_user_session(self):
        """Test ending another user's session"""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token.key)
        other_user = User.objects.create_user(
            email="other@example.com", password="otherpass123"
        )
        other_session = ReviewSession.objects.create(
            user=other_user,
            book=self.book,
            start_time=timezone.now(),
        )
        data = {"session_id": other_session.id}
        response = self.client.post("/review/end/", data)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_end_review_sets_end_time(self):
        """Test that end review sets end_time"""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token.key)
        before = timezone.now()
        data = {"session_id": self.session.id}
        response = self.client.post("/review/end/", data)
        after = timezone.now()
        self.session.refresh_from_db()
        self.assertIsNotNone(self.session.end_time)
        self.assertGreaterEqual(self.session.end_time, before)
        self.assertLessEqual(self.session.end_time, after)

    def test_end_review_with_no_items(self):
        """Test ending review with no review items"""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token.key)
        data = {"session_id": self.session.id}
        response = self.client.post("/review/end/", data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total"], 0)
        self.assertEqual(response.data["correct"], 0)
        self.assertEqual(response.data["accuracy"], 0.0)

    def test_end_review_accuracy_calculation(self):
        """Test accuracy calculation in end review"""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token.key)
        # Create new session for clean test
        session = ReviewSession.objects.create(
            user=self.user,
            book=self.book,
            start_time=timezone.now(),
            total_cnt=10,
        )
        # Create 7 user_words with 7 correct answers
        for i in range(7):
            word = Word.objects.create(word_text=f"word{i}")
            book_word = BookWord.objects.create(
                book=self.book, word=word, meaning=f"meaning{i}"
            )
            user_word = UserWord.objects.create(user=self.user, book_word=book_word)
            ReviewItem.objects.create(
                session=session,
                user_word=user_word,
                is_correct=True,
                pre_ease_factor=0,
                post_ease_factor=1,
            )
        # Create 3 user_words with 3 wrong answers
        for i in range(3):
            word = Word.objects.create(word_text=f"wrong_word{i}")
            book_word = BookWord.objects.create(
                book=self.book, word=word, meaning=f"wrong_meaning{i}"
            )
            user_word = UserWord.objects.create(user=self.user, book_word=book_word)
            ReviewItem.objects.create(
                session=session,
                user_word=user_word,
                is_correct=False,
                pre_ease_factor=0,
                post_ease_factor=0,
            )
        data = {"session_id": session.id}
        response = self.client.post("/review/end/", data)
        self.assertEqual(response.data["total"], 10)
        self.assertEqual(response.data["correct"], 7)
        self.assertAlmostEqual(response.data["accuracy"], 0.7, places=2)

    def test_end_review_updates_session(self):
        """Test that end review updates session data"""
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token.key)
        ReviewItem.objects.create(
            session=self.session,
            user_word=self.user_word1,
            is_correct=True,
            pre_ease_factor=0,
            post_ease_factor=1,
        )
        data = {"session_id": self.session.id}
        response = self.client.post("/review/end/", data)
        self.session.refresh_from_db()
        self.assertEqual(self.session.total_cnt, 1)
        self.assertEqual(self.session.correct_cnt, 1)
        self.assertEqual(self.session.accuracy, 1.0)
