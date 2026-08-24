import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / ".github" / "scripts" / "update_socolive.py"
spec = importlib.util.spec_from_file_location("update_socolive", SCRIPT)
update_socolive = importlib.util.module_from_spec(spec)
spec.loader.exec_module(update_socolive)


class UpdateSocoliveTest(unittest.TestCase):
    def test_stream_url_prefers_hls_before_flv(self):
        self.assertEqual(update_socolive.stream_url({"flv": "rtmp://x", "m3u8": "https://x/live.m3u8"}), ("https://x/live.m3u8", "hls"))

    def test_write_outputs(self):
        channels = [{"id":"1","tvg_id":"socolive-1","name":"Test","logo":"https://logo","group":"Socolive 24/7","url":"https://stream/live.m3u8","type":"hls"}]
        with tempfile.TemporaryDirectory() as tmp:
            json_path = Path(tmp) / "Socolive.json"
            m3u_path = Path(tmp) / "Socolive.m3u"
            update_socolive.write_json(channels, json_path)
            update_socolive.write_m3u(channels, m3u_path)
            self.assertEqual(json.loads(json_path.read_text()), channels)
            self.assertIn("#EXTM3U", m3u_path.read_text())
            self.assertIn("https://stream/live.m3u8", m3u_path.read_text())


if __name__ == "__main__":
    unittest.main()
