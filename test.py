#!/usr/bin/env python
# coding: utf-8

# -------------------------------------------------------------------------------------------------
# Imports
# -------------------------------------------------------------------------------------------------

import datetime
import uuid
from unittest import main
from pathlib import Path
from tempfile import TemporaryDirectory

from freezegun import freeze_time
from flask_testing import TestCase
import server
from server import app, delete_old_files, DELETE_AFTER_DAYS


# -------------------------------------------------------------------------------------------------
# Global variables
# -------------------------------------------------------------------------------------------------

UUID = str(uuid.uuid4())
DEFAULT_INDEX = '{"aliases": {}}'


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
            f.write(DEFAULT_INDEX)

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

    def test_get_features_index(self):
        response = self.client.get('/api/features')
        self.assert200(response)
        self.assertTrue('aliases' in response.text)

    def test_get_features_by_uuid(self):
        response = self.client.get(f'/api/features/{UUID}')
        self.assert200(response)
        self.assertEqual(response.json.get("example", None), "data")

    @freeze_time(datetime.date.today() + datetime.timedelta(days=DELETE_AFTER_DAYS - 2))
    def test_delete_old_files_1(self):
        today = datetime.date.today()
        self.assertEqual(delete_old_files(self.features_dir), 0)

    @freeze_time(datetime.date.today() + datetime.timedelta(days=DELETE_AFTER_DAYS + 2))
    def test_delete_old_files_2(self):
        today = datetime.date.today()
        self.assertEqual(delete_old_files(self.features_dir), 1)


if __name__ == '__main__':
    main()
