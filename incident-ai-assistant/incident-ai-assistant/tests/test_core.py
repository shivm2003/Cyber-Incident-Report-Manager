from __future__ import annotations
import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.ingestion import chunk_text, extract_text
from app.rag import cosine_similarity
from app import reporting


class IngestionTests(unittest.TestCase):
    def test_json_records_are_preserved_as_text(self):
        raw = json.dumps([
            {"incident_id": "INC-1", "severity": "High", "description": "Broken access control"},
            {"incident_id": "INC-2", "severity": "Low", "description": "Missing header"},
        ]).encode()
        result = extract_text("incidents.json", raw)
        self.assertIn("INC-1", result)
        self.assertIn("Broken access control", result)
        self.assertIn("INC-2", result)

    def test_csv_rows_are_preserved_as_text(self):
        raw = b"incident_id,severity\nINC-7,Critical\n"
        result = extract_text("crawler.csv", raw)
        self.assertIn("INC-7", result)
        self.assertIn("Critical", result)

    def test_chunker_returns_content(self):
        text = "\n\n".join([f"Incident {i}: " + ("evidence " * 100) for i in range(10)])
        chunks = chunk_text(text, chunk_size=700, overlap=80)
        self.assertGreater(len(chunks), 1)
        self.assertTrue(all(chunk.strip() for chunk in chunks))
        self.assertIn("Incident 0", "\n".join(chunks))

    def test_unsupported_type_is_rejected(self):
        with self.assertRaises(ValueError):
            extract_text("payload.exe", b"not an incident document")


class RetrievalMathTests(unittest.TestCase):
    def test_cosine_similarity(self):
        self.assertAlmostEqual(cosine_similarity([1, 0], [1, 0]), 1.0)
        self.assertAlmostEqual(cosine_similarity([1, 0], [0, 1]), 0.0)
        self.assertEqual(cosine_similarity([1], [1, 2]), -1.0)

    def test_report_exports_are_created(self):
        original_dir = reporting.REPORTS_DIR
        with tempfile.TemporaryDirectory() as temp_dir:
            reporting.REPORTS_DIR = Path(temp_dir)
            try:
                files = reporting.create_report_files(
                    "abc12345ff", "Unit Test Report",
                    "# Summary\n\nEvidence-backed summary paragraph.\n\n## Actions\n\n- Validate the source record."
                )
                self.assertEqual(set(files), {"md", "docx", "pdf"})
                for path in files.values():
                    self.assertTrue(Path(path).exists())
                    self.assertGreater(Path(path).stat().st_size, 50)
            finally:
                reporting.REPORTS_DIR = original_dir


if __name__ == "__main__":
    unittest.main()
