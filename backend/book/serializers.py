from rest_framework import serializers
import csv
import io
from .models import Book, BookWord


class BookSerializer(serializers.ModelSerializer):
    is_default = serializers.ReadOnlyField()

    class Meta:
        model = Book
        fields = ["id", "book_name", "is_default"]


class BookWordSerializer(serializers.ModelSerializer):
    word_text = serializers.CharField(source="word.word_text", read_only=True)

    class Meta:
        model = BookWord
        fields = [
            "id",
            "word_text",
            "meaning",
            "example",
            "difficulty",
        ]


class BookWordCreateSerializer(serializers.Serializer):
    word_text = serializers.CharField(max_length=50)
    meaning = serializers.CharField(max_length=255)
    example = serializers.CharField(required=False, allow_blank=True)
    difficulty = serializers.IntegerField(min_value=1, max_value=3, default=1)

    def validate_word_text(self, value):
        return value.strip().lower()


class BookWordUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookWord
        fields = ["meaning", "example", "difficulty"]


class FileUploadSerializer(serializers.Serializer):
    """Serializer to handle CSV/TXT file uploads for word lists."""

    file = serializers.FileField()

    def validate_file(self, value):
        """Validate file extension and format."""
        file_name = value.name.lower()
        if not (file_name.endswith(".csv") or file_name.endswith(".txt")):
            raise serializers.ValidationError("Only CSV and TXT files are supported.")

        # Try parsing the file to validate content
        try:
            self._parse_file_content(value)
        except serializers.ValidationError:
            raise
        except Exception as e:
            raise serializers.ValidationError(f"Error processing file: {str(e)}")
        finally:
            # Reset file pointer to beginning for subsequent reads
            value.seek(0)

        return value

    def _parse_file_content(self, uploaded_file):
        """Internal method to parse and validate file content.

        Expected CSV format (no header row):
        word_text,meaning[,example][,difficulty]

        - word_text (required)
        - meaning (required)
        - example (optional)
        - difficulty (optional, values 1–3, default 1)
        """
        try:
            # Decode file content
            file_content = uploaded_file.read().decode("utf-8")
            file_io = io.StringIO(file_content)

            # Parse CSV without header
            reader = csv.reader(file_io)

            # Parse rows
            words_data = []
            for row_num, row in enumerate(reader, start=1):
                # Skip empty rows
                if not row or not any(cell.strip() for cell in row):
                    continue

                # Check minimum required fields
                if len(row) < 2:
                    raise serializers.ValidationError(
                        f"Row {row_num}: Each line must have at least 'word_text' and 'meaning' separated by comma."
                    )

                word_text = row[0].strip()
                meaning = row[1].strip()

                if not word_text or not meaning:
                    raise serializers.ValidationError(
                        f"Row {row_num}: 'word_text' and 'meaning' cannot be empty."
                    )

                words_data.append(row)

            if not words_data:
                raise serializers.ValidationError("File contains no word entries.")

        except UnicodeDecodeError:
            raise serializers.ValidationError(
                "File encoding error. Please use UTF-8 encoding."
            )
        except csv.Error as e:
            raise serializers.ValidationError(f"CSV parsing error: {str(e)}")

    def parse_file(self):
        """Parse the uploaded file and return list of word data.

        Expected format (no header row required):
        Resilient,Able to recover quickly,She was resilient in adversity.,2
        Ephemeral,Lasting for a very short time,The ephemeral beauty of cherry blossoms.,3

        Each line should have: word_text,meaning[,example][,difficulty]
        - word_text (required)
        - meaning (required)
        - example (optional)
        - difficulty (optional, values 1–3, default 1)

        Returns:
            list: List of dictionaries with word data
        """
        uploaded_file = self.validated_data["file"]
        file_content = uploaded_file.read().decode("utf-8")
        file_io = io.StringIO(file_content)

        # Parse CSV without header
        reader = csv.reader(file_io)

        # Parse rows
        words_data = []
        for row in reader:
            # Skip empty rows
            if not row or not any(cell.strip() for cell in row):
                continue

            word_text = row[0].strip()
            meaning = row[1].strip()
            example = row[2].strip() if len(row) > 2 else ""

            # Parse difficulty if provided, default to 1
            difficulty = 1
            if len(row) > 3:
                try:
                    difficulty = int(row[3].strip())
                    if difficulty < 1 or difficulty > 3:
                        difficulty = 1  # Silently default to 1 if invalid
                except (ValueError, AttributeError):
                    difficulty = 1  # Silently default to 1 if not a valid integer

            word_data = {
                "word_text": word_text,
                "meaning": meaning,
                "example": example,
                "difficulty": difficulty,
            }

            words_data.append(word_data)

        return words_data
