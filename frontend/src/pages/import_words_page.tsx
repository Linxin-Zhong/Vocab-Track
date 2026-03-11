import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import type { Book } from "../services/bookService";
import { importWordsEntries, type ImportWordsResponse } from "../services/importService";
import "./import_words_page.css";

type ImportWordsPageProps = {
  books: Book[];
  selectedBookId: number | null;
  onChangeBook: (bookId: number) => Promise<void> | void;
  onCreateBook: (bookName: string) => Promise<Book>;
  onGoToDictionaries: () => void;
  onStartStudySession: () => Promise<void> | void;
};

type ImportSource = "csv" | "txt";
type ImportStage = "idle" | "preview" | "importing" | "success";
type ImportTargetMode = "existing" | "new";

type ParsedWordRow = {
  word: string;
  definition: string;
  example: string;
  difficulty?: number;
  lineNumber: number;
};

type ParsedFileResult = {
  source: ImportSource;
  rows: ParsedWordRow[];
  skippedRows: number;
  warnings: string[];
};

const ACCEPTED_EXTENSIONS = [".csv", ".txt"];
const PREVIEW_ROW_LIMIT = 5;

function formatFileSize(sizeInBytes: number): string {
  if (sizeInBytes < 1024) return `${sizeInBytes} B`;
  if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      const nextChar = line[i + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  fields.push(current.trim());
  return fields;
}

function isLikelyCsvHeader(fields: string[]): boolean {
  if (fields.length < 2) return false;
  const first = fields[0].toLowerCase();
  const second = fields[1].toLowerCase();
  return (
    (first === "word" || first === "word_text") &&
    (second === "definition" || second === "meaning")
  );
}

function parseCsvContent(content: string): ParsedFileResult {
  const lines = content.split(/\r?\n/);
  const rows: ParsedWordRow[] = [];
  const warnings: string[] = [];
  let skippedRows = 0;

  lines.forEach((rawLine, index) => {
    const lineNumber = index + 1;
    const line = rawLine.trim();
    if (!line) return;

    const fields = parseCsvLine(rawLine);
    if (lineNumber === 1 && isLikelyCsvHeader(fields)) return;

    if (fields.length < 2) {
      skippedRows += 1;
      warnings.push(
        `Skipped row ${lineNumber}: expected at least word and definition columns.`,
      );
      return;
    }

    const word = fields[0]?.trim() ?? "";
    const definition = fields[1]?.trim() ?? "";
    const example = fields[2]?.trim() ?? "";
    const rawDifficulty = fields[3]?.trim();
    let difficulty: number | undefined;

    if (rawDifficulty) {
      const parsedDifficulty = Number(rawDifficulty);
      if ([1, 2, 3].includes(parsedDifficulty)) {
        difficulty = parsedDifficulty;
      } else {
        warnings.push(
          `Row ${lineNumber}: difficulty '${rawDifficulty}' is invalid. Defaulting to 1.`,
        );
      }
    }

    if (!word || !definition) {
      skippedRows += 1;
      warnings.push(
        `Skipped row ${lineNumber}: word and definition cannot be empty.`,
      );
      return;
    }

    rows.push({ word, definition, example, difficulty, lineNumber });
  });

  if (!rows.length) {
    throw new Error(
      "We couldn't find valid rows in this CSV. Use rows like: word,definition,example.",
    );
  }

  return { source: "csv", rows, skippedRows, warnings };
}

function parseTxtContent(content: string): ParsedFileResult {
  const lines = content.split(/\r?\n/);
  const rows: ParsedWordRow[] = [];

  lines.forEach((rawLine, index) => {
    const word = rawLine.trim();
    if (!word) return;

    rows.push({
      word,
      definition: "",
      example: "",
      lineNumber: index + 1,
    });
  });

  if (!rows.length) {
    throw new Error("This TXT file is empty. Add one word per line and try again.");
  }

  return {
    source: "txt",
    rows,
    skippedRows: 0,
    warnings: [
      "TXT import uses one word per line. Definitions/examples can be added later in Dictionaries.",
    ],
  };
}

function shouldTreatTxtAsCsv(content: string): boolean {
  const nonEmptyLines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!nonEmptyLines.length) return false;

  const commaLines = nonEmptyLines.filter((line) => parseCsvLine(line).length >= 2);
  return commaLines.length / nonEmptyLines.length >= 0.6;
}

function getFileExtension(fileName: string): string {
  const lowerCaseName = fileName.toLowerCase();
  if (lowerCaseName.endsWith(".csv")) return ".csv";
  if (lowerCaseName.endsWith(".txt")) return ".txt";
  return "";
}

function PreviewTable({ rows }: { rows: ParsedWordRow[] }) {
  return (
    <div className="import-preview-table-wrap">
      <table className="import-preview-table">
        <thead>
          <tr>
            <th>Word</th>
            <th>Definition</th>
            <th>Example</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.lineNumber}-${row.word}`}>
              <td>{row.word}</td>
              <td>{row.definition || <span className="muted-cell">-</span>}</td>
              <td>{row.example || <span className="muted-cell">-</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ImportWordsPage({
  books,
  selectedBookId,
  onChangeBook,
  onCreateBook,
  onGoToDictionaries,
  onStartStudySession,
}: ImportWordsPageProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [stage, setStage] = useState<ImportStage>("idle");
  const [importTargetMode, setImportTargetMode] = useState<ImportTargetMode>("existing");
  const [newBookName, setNewBookName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedFile, setParsedFile] = useState<ParsedFileResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [destinationError, setDestinationError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportWordsResponse | null>(null);
  const [successTargetBookName, setSuccessTargetBookName] = useState<string | null>(null);

  const userBooks = useMemo(() => books.filter((book) => !book.is_default), [books]);

  const activeBookId = useMemo(() => {
    if (selectedBookId && userBooks.some((book) => book.id === selectedBookId)) {
      return selectedBookId;
    }
    return userBooks[0]?.id ?? null;
  }, [selectedBookId, userBooks]);

  const activeBookName = useMemo(() => {
    const active = userBooks.find((book) => book.id === activeBookId);
    return active?.book_name ?? "No personal dictionaries available";
  }, [activeBookId, userBooks]);

  const previewRows = useMemo(
    () => parsedFile?.rows.slice(0, PREVIEW_ROW_LIMIT) ?? [],
    [parsedFile],
  );
  const isImporting = stage === "importing";
  const hasExistingBookOption = userBooks.length > 0;

  useEffect(() => {
    if (!hasExistingBookOption && importTargetMode === "existing") {
      setImportTargetMode("new");
    }
  }, [hasExistingBookOption, importTargetMode]);

  const resetFileState = () => {
    setStage("idle");
    setSelectedFile(null);
    setParsedFile(null);
    setErrorMessage(null);
    setDestinationError(null);
    setImportResult(null);
    setSuccessTargetBookName(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const parseAndPreviewFile = async (file: File) => {
    const extension = getFileExtension(file.name);
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      throw new Error("Unsupported file type. Please upload a CSV or TXT file.");
    }

    const content = await file.text();
    if (!content.trim()) {
      throw new Error("This file is empty. Add content and try again.");
    }

    if (extension === ".csv") {
      return parseCsvContent(content);
    }
    if (shouldTreatTxtAsCsv(content)) {
      const parsed = parseCsvContent(content);
      return {
        ...parsed,
        warnings: [
          "Detected comma-separated rows in TXT file. Parsed as CSV format automatically.",
          ...parsed.warnings,
        ],
      };
    }

    return parseTxtContent(content);
  };

  const handleFileSelection = async (file: File | null) => {
    setErrorMessage(null);
    setDestinationError(null);
    setImportResult(null);

    if (!file) {
      resetFileState();
      return;
    }

    try {
      const parsed = await parseAndPreviewFile(file);
      setSelectedFile(file);
      setParsedFile(parsed);
      setStage("preview");
    } catch (error) {
      resetFileState();
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "We couldn't read this file. Please try another one.",
      );
    }
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (isImporting) return;

    const droppedFile = event.dataTransfer.files?.[0] ?? null;
    void handleFileSelection(droppedFile);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (isImporting) return;
    const file = event.target.files?.[0] ?? null;
    void handleFileSelection(file);
  };

  const handleConfirmImport = async () => {
    setErrorMessage(null);
    setDestinationError(null);

    if (!parsedFile?.rows.length) {
      setErrorMessage("Upload a valid file before importing.");
      return;
    }

    if (importTargetMode === "existing" && !activeBookId) {
      setDestinationError("Select an existing dictionary to continue.");
      return;
    }

    if (importTargetMode === "new" && !newBookName.trim()) {
      setDestinationError("Dictionary name is required.");
      return;
    }

    setStage("importing");

    try {
      let targetBookId: number | null = activeBookId;
      let targetBookName = activeBookName;

      if (importTargetMode === "new") {
        const trimmedBookName = newBookName.trim();
        if (!trimmedBookName) {
          throw new Error("Enter a name for your new dictionary.");
        }

        const newBook = await onCreateBook(trimmedBookName);
        targetBookId = newBook.id;
        targetBookName = newBook.book_name;
        setImportTargetMode("existing");
        setNewBookName("");
      } else if (!targetBookId) {
        throw new Error("Choose an existing dictionary or create a new one.");
      }

      if (!targetBookId) {
        throw new Error("No dictionary selected for import.");
      }

      const payload = parsedFile.rows.map((row) => ({
        word_text: row.word,
        meaning: row.definition || row.word,
        example: row.example,
        ...(row.difficulty ? { difficulty: row.difficulty } : {}),
      }));

      const response = await importWordsEntries(targetBookId, payload);
      setImportResult(response);
      setSuccessTargetBookName(targetBookName);
      setStage("success");
    } catch (error) {
      setStage("preview");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to import words. Please try again.",
      );
    }
  };

  const triggerBrowse = () => {
    if (isImporting) return;
    inputRef.current?.click();
  };

  const switchTargetMode = (mode: ImportTargetMode) => {
    setImportTargetMode(mode);
    setDestinationError(null);
    setErrorMessage(null);
    setImportResult(null);
  };

  const isCompactLayout = stage === "idle";

  return (
    <main className={`import-words-page ${isCompactLayout ? "is-compact" : "is-expanded"}`}>
      <header className="import-words-header">
        <h1 className="import-words-title">Import Words</h1>
        <p className="import-words-subtitle">Upload a custom vocabulary list to study</p>
      </header>

      <section className="import-target-card" aria-label="Import destination">
        <h2 className="destination-title">Import destination</h2>

        <fieldset className="destination-options">
          <legend className="sr-only">Choose import destination</legend>
          <div className={`destination-choice ${importTargetMode === "existing" ? "selected" : ""}`}>
            <label className="destination-option">
              <input
                type="radio"
                name="destination-mode"
                checked={importTargetMode === "existing"}
                onChange={() => switchTargetMode("existing")}
                disabled={!hasExistingBookOption || isImporting}
              />
              <span className="destination-option-text">
                <span className="destination-option-title">Existing dictionary</span>
                <span className="destination-option-hint">
                  Add imported words to a dictionary you already have.
                </span>
              </span>
            </label>
            <div className="destination-field">
              <label htmlFor="existing-dictionary-select" className="destination-field-label">
                Dictionary
              </label>
              {hasExistingBookOption ? (
                <select
                  id="existing-dictionary-select"
                  className="import-book-select"
                  value={activeBookId ?? ""}
                  onChange={(event) => {
                    void onChangeBook(Number(event.target.value));
                  }}
                  disabled={isImporting || importTargetMode !== "existing"}
                >
                  {userBooks.map((book) => (
                    <option key={book.id} value={book.id}>
                      {book.book_name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="target-help-text">No existing dictionaries found.</p>
              )}
            </div>
          </div>

          <div className={`destination-choice ${importTargetMode === "new" ? "selected" : ""}`}>
            <label className="destination-option">
              <input
                type="radio"
                name="destination-mode"
                checked={importTargetMode === "new"}
                onChange={() => switchTargetMode("new")}
                disabled={isImporting}
              />
              <span className="destination-option-text">
                <span className="destination-option-title">Create new dictionary</span>
                <span className="destination-option-hint">
                  Create a new destination for this import.
                </span>
              </span>
            </label>
            <div className="destination-field">
              <label htmlFor="new-dictionary-name" className="destination-field-label">
                Dictionary name
              </label>
              <input
                id="new-dictionary-name"
                className="import-book-input"
                value={newBookName}
                onChange={(event) => {
                  setNewBookName(event.target.value);
                  if (destinationError) setDestinationError(null);
                }}
                placeholder="e.g. TOEFL Core"
                maxLength={50}
                disabled={isImporting || importTargetMode !== "new"}
              />
            </div>
          </div>
        </fieldset>

        {destinationError ? (
          <p className="destination-error" role="alert">
            {destinationError}
          </p>
        ) : null}
      </section>

      <section className="import-uploader-card" aria-labelledby="upload-zone-title">
        {stage === "idle" ? (
          <label
            className={`dropzone ${isDragging ? "is-dragging" : ""}`}
            onDrop={handleDrop}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                triggerBrowse();
              }
            }}
            aria-disabled={isImporting}
          >
            <div className="dropzone-icon" aria-hidden="true">UP</div>
            <p id="upload-zone-title" className="dropzone-title">
              Drop your file here, or click to browse
            </p>
            <p className="dropzone-subtitle">Supports CSV and TXT files</p>
            <input
              ref={inputRef}
              type="file"
              className="dropzone-input"
              accept={ACCEPTED_EXTENSIONS.join(",")}
              onChange={handleInputChange}
              disabled={isImporting}
              aria-label="Choose a CSV or TXT file to import"
            />
          </label>
        ) : (
          <div className="uploader-collapsed" role="status" aria-live="polite">
            <p className="uploader-collapsed-title">File selected</p>
            <button
              type="button"
              className="import-secondary-btn"
              onClick={resetFileState}
              disabled={isImporting}
            >
              Upload Different File
            </button>
          </div>
        )}

        {selectedFile && parsedFile ? (
          <div className="file-meta" role="status" aria-live="polite">
            <span>{selectedFile.name}</span>
            <span>{formatFileSize(selectedFile.size)}</span>
            <span>{parsedFile.rows.length} rows parsed</span>
            {parsedFile.skippedRows > 0 ? <span>{parsedFile.skippedRows} rows skipped</span> : null}
          </div>
        ) : null}

        {errorMessage ? (
          <p className="import-feedback error" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </section>

      {stage === "preview" && parsedFile ? (
        <section className="import-preview-card" aria-labelledby="preview-title">
          <div className="preview-header-row">
            <div>
              <h2 id="preview-title" className="preview-title">Preview</h2>
              <p className="preview-subtitle">
                Showing {previewRows.length} of {parsedFile.rows.length} rows before import.
              </p>
            </div>
            <button type="button" className="import-reset-btn" onClick={resetFileState}>
              Remove File
            </button>
          </div>

          <PreviewTable rows={previewRows} />

          {parsedFile.warnings.length > 0 ? (
            <div className="import-warning-box" role="status" aria-live="polite">
              {parsedFile.warnings.slice(0, 3).map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          ) : null}

          <div className="preview-actions">
            <button
              type="button"
              className="import-confirm-btn"
              onClick={() => {
                void handleConfirmImport();
              }}
              disabled={isImporting}
            >
              {isImporting ? "Importing..." : "Confirm Import"}
            </button>
          </div>
        </section>
      ) : null}

      {stage === "success" ? (
        <section className="import-success-card" role="status" aria-live="polite">
          <h2 className="success-title">Words imported successfully</h2>
          <p className="success-subtitle">Your vocabulary list is ready to study.</p>
          <p className="success-meta">
            {importResult?.created.length ?? 0} created
            {importResult && importResult.failed.length > 0
              ? `, ${importResult.failed.length} skipped`
              : ""}
            {successTargetBookName ? ` in ${successTargetBookName}` : ""}.
          </p>
          <div className="success-actions">
            <button
              type="button"
              className="import-confirm-btn"
              onClick={() => {
                void onStartStudySession();
              }}
            >
              Start Study Session
            </button>
            <button type="button" className="import-secondary-btn" onClick={onGoToDictionaries}>
              View Dictionaries
            </button>
            <button type="button" className="import-secondary-btn" onClick={resetFileState}>
              Import Another File
            </button>
          </div>
        </section>
      ) : null}

      <section className="import-format-card">
        <h2 className="import-format-title">Expected CSV Format</h2>
        <p className="import-format-text">
          Your file should include three columns separated by commas, with one word per row.
        </p>
        <div className="import-format-code" aria-label="CSV format example">
          <p className="csv-line">word,definition,example</p>
          <p className="csv-line">
            Resilient,Able to recover quickly,She was resilient in adversity.
          </p>
          <p className="csv-line">
            Candid,Truthful and straightforward,He gave a candid opinion.
          </p>
        </div>
      </section>
    </main>
  );
}
