from rest_framework.viewsets import GenericViewSet, ModelViewSet
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from django.db.models import Q
from django.db import transaction
from word.models import Word
from api.utils import format_serializer_errors
from .models import Book, BookWord
from .serializers import (
    BookWordSerializer,
    BookSerializer,
    BookBasicSerializer,
    BookWordCreateSerializer,
    BookWordUpdateSerializer,
    BookWordDetailSerializer,
    FileUploadSerializer,
)


class BookViewSet(ModelViewSet):
    """ViewSet for managing Book objects owned by the authenticated user.

    - Only authenticated users may access these endpoints.
    - Queryset is restricted to books where `userid` matches `request.user`.
    - When creating a book, `userid` is set to the current user.
    """

    serializer_class = BookSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        # Use full serializer only for retrieve (single book detail)
        if self.action == "retrieve":
            return BookSerializer
        # Use basic serializer for list, create, update
        return BookBasicSerializer

    def get_queryset(self):
        # Restrict returned books to those owned by the requesting user or default books.
        return Book.objects.filter(Q(user=self.request.user) | Q(user__isnull=True))

    def perform_create(self, serializer):
        # Ensure the created Book is associated with the current user.
        serializer.save(user=self.request.user)

    def update(self, request, *args, **kwargs):
        # Prevent updating default (official) books — only allow user-owned books
        instance = self.get_object()
        if instance.user is None:
            return Response(
                {"message": "Cannot modify default (official) books."}, status=403
            )
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        # Same restriction for PATCH
        instance = self.get_object()
        if instance.user is None:
            return Response(
                {"message": "Cannot modify default (official) books."}, status=403
            )
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        # Prevent deleting default (official) books — only allow user-owned books
        instance = self.get_object()
        if instance.user is None:
            return Response(
                {"message": "Cannot delete default (official) books."}, status=403
            )
        # delete and return a readable success message
        book_name = instance.book_name
        instance.delete()
        return Response(
            {"message": f"Successfully deleted book '{book_name}'"}, status=200
        )


class BookWordViewSet(GenericViewSet):
    """Nested viewset to manage BookWord items for a particular Book.

    Endpoints are nested under a Book (book_pk). All operations verify
    that the target Book belongs to the authenticated user to prevent
    unauthorized access.
    """

    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "create":
            return BookWordCreateSerializer
        if self.action == "retrieve":
            return BookWordDetailSerializer
        return BookWordSerializer

    def retrieve(self, request, pk=None, book_pk=None):
        # Only allow access to the caller's own books and default books.
        try:
            book_word = BookWord.objects.select_related("book", "word").get(
                id=pk,
                book_id=book_pk,
            )
        except BookWord.DoesNotExist:
            return Response({"message": "BookWord not found."}, status=404)

        parent_book = book_word.book
        if parent_book.user is not None and parent_book.user != request.user:
            return Response(
                {"message": "You do not have permission to view words in this book."},
                status=403,
            )

        serializer = self.get_serializer(book_word)
        return Response(serializer.data)

    def list(self, request, book_pk=None):
        # Return all BookWord entries for the specified book which belongs
        # to the requesting user. Use `select_related('wordid')` to avoid
        # extra queries when the serializer accesses the related Word.
        qs = BookWord.objects.filter(
            Q(book__user=request.user) | Q(book__user__isnull=True),
            book_id=book_pk,
        ).select_related("word")

        serializer = BookWordSerializer(qs, many=True)
        return Response(serializer.data)

    @transaction.atomic
    def create(self, request, book_pk=None):
        # Check if file upload or JSON array
        if "file" in request.FILES:
            # Handle file upload
            try:
                file_serializer = FileUploadSerializer(data=request.data)
                file_serializer.is_valid(raise_exception=True)
            except ValidationError as e:
                # Convert field errors to message format
                error_detail = e.detail.get("file", str(e.detail))
                if isinstance(error_detail, list):
                    error_detail = error_detail[0]
                return Response({"message": error_detail}, status=400)

            # Parse the file to get word data
            words_data = file_serializer.parse_file()

            # Validate words data with BookWordCreateSerializer
            serializer = BookWordCreateSerializer(data=words_data, many=True)
            if not serializer.is_valid():
                return Response(
                    {"message": format_serializer_errors(serializer.errors)},
                    status=400,
                )
        else:
            # Handle JSON array (existing functionality)
            serializer = BookWordCreateSerializer(data=request.data, many=True)
            if not serializer.is_valid():
                return Response(
                    {"message": format_serializer_errors(serializer.errors)},
                    status=400,
                )

        # Ensure the book exists
        try:
            book = Book.objects.get(id=book_pk)
        except Book.DoesNotExist:
            return Response({"message": "Book not found."}, status=404)

        # Disallow adding BookWords to default (official) books or books
        # not owned by the requesting user
        if book.user is None:
            return Response(
                {"message": "Cannot add words to default (official) books."},
                status=403,
            )

        if book.user != request.user:
            return Response(
                {"message": "You do not have permission to add words to this book."},
                status=403,
            )

        created = []
        failed = []

        for item in serializer.validated_data:
            word, _ = Word.objects.get_or_create(word_text=item["word_text"])

            book_word, is_new = BookWord.objects.get_or_create(
                book=book,
                word=word,
                defaults={
                    "meaning": item["meaning"],
                    "example": item.get("example", ""),
                    "difficulty": item.get("difficulty", 1),
                },
            )

            if is_new:
                created.append(book_word)
            else:
                failed.append(
                    {
                        "word_text": word.word_text,
                        "reason": "duplicate",
                        "book_word_id": book_word.id,
                    }
                )

        if not created:
            return Response(
                {
                    "message": "No words were created. Check for duplicates or validation errors.",
                    "failed": failed,
                },
                status=400,
            )

        response_data = {
            "message": "Words added successfully.",
            "created": BookWordSerializer(created, many=True).data,
            "failed": failed,
        }
        return Response(response_data, status=201)

    def update(self, request, pk=None, book_pk=None):
        # Find the BookWord; return 404 if missing
        try:
            book_word = BookWord.objects.get(id=pk, book=book_pk)
        except BookWord.DoesNotExist:
            return Response({"message": "BookWord not found."}, status=404)

        # Disallow editing entries in default (official) books or books
        # not owned by the requesting user
        parent_book = book_word.book
        if parent_book.user is None:
            return Response(
                {"message": "Cannot modify words in default (official) books."},
                status=403,
            )
        if parent_book.user != request.user:
            return Response(
                {"message": "You do not have permission to modify words in this book."},
                status=403,
            )

        serializer = BookWordUpdateSerializer(
            book_word, data=request.data, partial=True
        )
        if not serializer.is_valid():
            return Response(
                {"message": format_serializer_errors(serializer.errors)},
                status=400,
            )
        serializer.save()

        return Response(
            {
                "message": "Word updated successfully.",
                "word": BookWordSerializer(book_word).data,
            }
        )

    def destroy(self, request, pk=None, book_pk=None):
        # Find the BookWord; return 404 if missing
        try:
            book_word = BookWord.objects.get(id=pk, book=book_pk)
        except BookWord.DoesNotExist:
            return Response({"message": "BookWord not found."}, status=404)

        parent_book = book_word.book
        if parent_book.user is None:
            return Response(
                {"message": "Cannot delete words from default (official) books."},
                status=403,
            )
        if parent_book.user != request.user:
            return Response(
                {
                    "message": "You do not have permission to delete words from this book."
                },
                status=403,
            )
        word_text = book_word.word.word_text
        book_word.delete()
        return Response(
            {"message": f"Successfully deleted word '{word_text}'"}, status=200
        )
