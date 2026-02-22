"""Tests for Elasticsearch index templates module."""

import pytest
from unittest.mock import MagicMock, patch, call

from cloudshield.ThreatDetection.es_templates import ensure_index_templates, INDEX_TEMPLATES


class TestEnsureIndexTemplates:
    def test_creates_missing_indices(self):
        """Indices that don't exist should be created with correct mappings."""
        es = MagicMock()
        es.indices.exists.return_value = False
        logger = MagicMock()

        ensure_index_templates(es, logger)

        # Should check existence for each template
        assert es.indices.exists.call_count == len(INDEX_TEMPLATES)

        # Should create each one
        assert es.indices.create.call_count == len(INDEX_TEMPLATES)

        # Verify the index names
        created_indices = {c.kwargs["index"] for c in es.indices.create.call_args_list}
        expected_indices = set(INDEX_TEMPLATES.keys())
        assert created_indices == expected_indices

    def test_skips_existing_indices(self):
        """Indices that already exist should not be recreated."""
        es = MagicMock()
        es.indices.exists.return_value = True
        logger = MagicMock()

        ensure_index_templates(es, logger)

        es.indices.create.assert_not_called()

    def test_mixed_existing_and_new(self):
        """Only missing indices are created."""
        es = MagicMock()
        index_names = list(INDEX_TEMPLATES.keys())

        # First 2 exist, rest don't
        def exists_side_effect(index):
            return index in index_names[:2]

        es.indices.exists.side_effect = exists_side_effect
        logger = MagicMock()

        ensure_index_templates(es, logger)

        assert es.indices.create.call_count == len(index_names) - 2

    def test_handles_creation_error_gracefully(self):
        """An error creating one index shouldn't prevent others."""
        es = MagicMock()
        es.indices.exists.return_value = False
        es.indices.create.side_effect = [Exception("fail")] + [None] * 10
        logger = MagicMock()

        # Should not raise
        ensure_index_templates(es, logger)

        # Should still attempt all indices
        assert es.indices.create.call_count == len(INDEX_TEMPLATES)

    def test_template_mappings_have_properties(self):
        """Every template should have a mappings.properties dict."""
        for name, body in INDEX_TEMPLATES.items():
            assert "mappings" in body, f"{name} missing mappings"
            assert "properties" in body["mappings"], f"{name} missing properties"

    def test_unified_alerts_has_key_fields(self):
        """The unified_alerts index should have severity, source, src_ip, dst_ip."""
        props = INDEX_TEMPLATES["unified_alerts"]["mappings"]["properties"]
        for field in ("severity", "source", "src_ip", "dst_ip", "timestamp"):
            assert field in props, f"unified_alerts missing field: {field}"
