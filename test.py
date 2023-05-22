#!/usr/bin/env python
# coding: utf-8

# -------------------------------------------------------------------------------------------------
# Imports
# -------------------------------------------------------------------------------------------------

import uuid
import unittest
# import requests
import unittest
# from unittest.mock import patch
from pathlib import Path
from tempfile import TemporaryDirectory

from flask import Flask
from flask_testing import TestCase
import server
from server import app  # Import your Flask app object


# -------------------------------------------------------------------------------------------------
# Global variables
# -------------------------------------------------------------------------------------------------

UUID = str(uuid.uuid4())


# -------------------------------------------------------------------------------------------------
# Test
# -------------------------------------------------------------------------------------------------

class AppTestCase(TestCase):
    def create_app(self):
        return app

    def post_features(self):
        data = {
            'uuid': UUID,
            'json': '{"example": "data"}'
        }
        response = self.client.post('/api/features', data=data)
        self.assert200(response)
        self.assertTrue(UUID in response.text)

    # Class fixtures
    # ---------------------------------------------------------------------------------------------

    @classmethod
    def setUpClass(cls):
        cls.temp_dir = TemporaryDirectory()
        cls.features_dir = Path(cls.temp_dir.name) / 'data' / 'features'
        cls.features_dir.mkdir(exist_ok=True, parents=True)
        with open(cls.features_dir / 'index.json', 'w') as f:
            f.write('{"aliases": {}}')

        # NOTE: monkey-patch
        server.FEATURES_DIR = cls.features_dir

    @classmethod
    def tearDownClass(cls):
        cls.temp_dir.cleanup()

    # Instance fixtures
    # ---------------------------------------------------------------------------------------------

    def setUp(self):
        self.post_features()

    # Tests
    # ---------------------------------------------------------------------------------------------

    def test_post_features(self):
        pass

    def test_get_features(self):
        response = self.client.get('/api/features')
        self.assert200(response)
        self.assertTrue('aliases' in response.text)

    def test_get_features_by_uuid(self):
        response = self.client.get(f'/api/features/{UUID}')
        self.assert200(response)
        self.assertEqual(response.json.get("example", None), "data")


# # Patch the FEATURES_DIR for all methods of AppTestCase
# patcher = patch.object(
#     AppTestCase, 'features_dir', new_callable=lambda: FEATURES_DIR)
# patcher.start()


if __name__ == '__main__':
    unittest.main()
