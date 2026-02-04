from rest_framework.viewsets import ViewSet
from rest_framework.viewsets import ModelViewSet
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from django.db import transaction
from django.shortcuts import get_object_or_404
from word.models import Word
from .models import Book, BookWord
from .serializers import (
    BookWordSerializer,
    BookSerializer,
    BookWordCreateSerializer,
    BookWordUpdateSerializer,
)


class BookViewSet(ModelViewSet):
    """ViewSet for managing Book objects owned by the authenticated user.

    - Only authenticated users may access these endpoints.
    - Queryset is restricted to books where `userid` matches `request.user`.
    - When creating a book, `userid` is set to the current user.
    """

    serializer_class = BookSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Restrict returned books to those owned by the requesting user or default books.
        return Book.objects.filter(
            Q(user_id=self.request.user) | Q(user_id__isnull=True)
        ).distinct()

    def perform_create(self, serializer):
        # Ensure the created Book is associated with the current user.
        serializer.save(user_id=self.request.user)

    def update(self, request, *args, **kwargs):
        # Prevent updating default (official) books — only allow user-owned books
        instance = self.get_object()
        if instance.user_id is None:
            return Response(
                {"detail": "Cannot modify default (official) books."}, status=403
            )
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        # Same restriction for PATCH
        instance = self.get_object()
        if instance.user_id is None:
            return Response(
                {"detail": "Cannot modify default (official) books."}, status=403
            )
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        # Prevent deleting default (official) books — only allow user-owned books
        instance = self.get_object()
        if instance.user_id is None:
            return Response(
                {"detail": "Cannot delete default (official) books."}, status=403
            )
        # delete and return a readable success message
        book_name = instance.book_name
        instance.delete()
        return Response({"detail": f"delete {book_name} success"}, status=200)


class BookWordViewSet(ViewSet):
    """Nested viewset to manage BookWord items for a particular Book.

    Endpoints are nested under a Book (book_pk). All operations verify
    that the target Book belongs to the authenticated user to prevent
    unauthorized access.
    """

    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "create":
            return BookWordCreateSerializer
        return BookWordSerializer

    def list(self, request, book_pk=None):
        # Return all BookWord entries for the specified book which belongs
        # to the requesting user. Use `select_related('wordid')` to avoid
        # extra queries when the serializer accesses the related Word.
        qs = BookWord.objects.filter(
            Q(book_id__user_id=request.user) | Q(book_id__user_id__isnull=True),
            book_id=book_pk,
        ).select_related("word_id")

        serializer = BookWordSerializer(qs, many=True)
        return Response(serializer.data)

    @transaction.atomic
    def create(self, request, book_pk=None):
        serializer = BookWordCreateSerializer(data=request.data, many=True)
        serializer.is_valid(raise_exception=True)

        # Ensure the book exists
        try:
            book = Book.objects.get(id=book_pk)
        except Book.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

        # Disallow adding BookWords to default (official) books
        if book.user_id is None:
            return Response(
                {"detail": "Cannot add BookWords to default (official) books."},
                status=403,
            )

        created = []
        failed = []

        for item in serializer.validated_data:
            word, _ = Word.objects.get_or_create(word_text=item["word_text"])

            book_word, is_new = BookWord.objects.get_or_create(
                book_id=book,
                word_id=word,
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

        response_data = {
            "created": BookWordSerializer(created, many=True).data,
            "failed": failed,
        }

        status_code = 201 if created else 200
        return Response(response_data, status=status_code)

    def update(self, request, pk=None, book_pk=None):
        # Find the BookWord; return 404 if missing
        try:
            bookword = BookWord.objects.get(id=pk, book_id=book_pk)
        except BookWord.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

        # Disallow editing entries in default (official) books
        parent_book = bookword.book_id
        if parent_book.user_id is None:
            return Response(
                {"detail": "Cannot modify BookWord in default (official) books."},
                status=403,
            )

        serializer = BookWordUpdateSerializer(bookword, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(BookWordSerializer(bookword).data)

    def destroy(self, request, pk=None, book_pk=None):
        # Find the BookWord; return 404 if missing
        try:
            book_word = BookWord.objects.get(id=pk, book_id=book_pk)
        except BookWord.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

        parent_book = book_word.book_id
        if parent_book.user_id is None:
            return Response(
                {"detail": "Cannot delete BookWord from default (official) books."},
                status=403,
            )

        word_text = book_word.word_id.word_text
        book_word.delete()
        return Response({"detail": f"delete {word_text} success"}, status=200)
