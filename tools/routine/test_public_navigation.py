"""Public publishing must not reintroduce links to the unlisted base."""
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import publish_site


class PublicNavigationTests(unittest.TestCase):
    def test_existing_briefing_navigation_and_aliases_are_normalized(self):
        content = '<article><h1>기존 브리핑</h1><p>확정 본문 &amp; 출처</p></article>'
        public_links = '<a href="../#/">포털</a><a href="archive/index.html">지난 브리핑</a>'
        hidden_links = ''.join(f'<a href="{href}"><span>기지</span></a>' for href in (
            '../#/base', '../#/admin?from=old', '../#/desk-3802e7b987d344178fc03571',
            '../privacy-guidelines.html#legacy', '/base',
            'https://ljs0336-koco.github.io/Seung_AI_Labs/#/base',
        ))
        source = '<html>\n<head></head>\n<body><nav class="site-bar">' + public_links + hidden_links + '</nav>\n' + content + publish_site.FOOT_INDEX[0] + '</body></html>'
        actual = publish_site.site_page(source, publish_site.NAV_INDEX, publish_site.FOOT_INDEX)
        self.assertIn(public_links, actual)
        self.assertIn(content, actual)
        self.assertNotIn('<span>기지</span>', actual)
        self.assertEqual(actual.count('class="site-bar"'), 1)
        self.assertIn('shared/content-share.js', actual)

    def test_library_copy_keeps_source_and_content_but_removes_entry_anchor(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            library = root / 'source'
            library.mkdir()
            visible = '<a href="../briefing/">브리핑</a><a href="../briefing/archive/">지난 브리핑</a>'
            body = '<main><h1>연구 서고</h1><p>확정 요약 &amp; 서지</p></main>'
            source = '<nav class="library-site-nav">' + visible + '<a href="../#/base">나만의 기지</a></nav>' + body
            (library / 'index.html').write_text(source, encoding='utf-8')
            (library / 'summary.json').write_text('{"count":50}', encoding='utf-8')
            with patch.object(publish_site, 'LIB', library):
                publish_site.publish_library(root / 'repo')
            actual = (root / 'repo/public/library/index.html').read_text(encoding='utf-8')
            self.assertIn(visible, actual)
            self.assertIn(body, actual)
            self.assertNotIn('나만의 기지', actual)
            self.assertEqual((library / 'index.html').read_text(encoding='utf-8'), source)
            self.assertEqual((root / 'repo/public/library/summary.json').read_text(encoding='utf-8'), '{"count":50}')

    def test_script_examples_and_external_links_remain_verbatim(self):
        source = '<script>const example = \'<a href="../#/base">sample</a>\';</script><a href="https://example.org/base">external source</a><p>기지라는 단어만 있는 본문</p>'
        self.assertEqual(publish_site.normalize_public_navigation(source), source)

    def test_current_briefing_templates_do_not_add_an_entry(self):
        for navigation in (publish_site.NAV_INDEX, publish_site.NAV_ARCHIVE, publish_site.NAV_LIST):
            self.assertNotIn('#/base', navigation)
            self.assertNotIn('나만의 기지', navigation)


if __name__ == '__main__':
    unittest.main()
