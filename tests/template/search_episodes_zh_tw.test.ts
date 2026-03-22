import { renderTemplate } from '../helpers/template-renderer';

const TEMPLATE = 'es/search_episodes_zh_tw/query.template.mustache';

describe('ES Template: search_episodes_zh_tw — zh-tw specific behavior', () => {

  it('BM25 multi_match includes title.chinese field (IK Analyzer)', () => {
    const rendered = renderTemplate(TEMPLATE, { query: '人工智慧', mode: 'bm25', from: 0, size: 20 });
    const parsed = JSON.parse(rendered);
    const fields: string[] = parsed.query?.bool?.must?.[0]?.multi_match?.fields ?? [];
    expect(fields.some((f: string) => f.includes('chinese'))).toBe(true);
  });

  it('does not contain STConvert-related settings (removed in v2)', () => {
    const rendered = renderTemplate(TEMPLATE, { query: '人工智慧', mode: 'bm25', from: 0, size: 20 });
    expect(rendered).not.toContain('stconvert');
    expect(rendered).not.toContain('st_convert');
  });

  it('hybrid mode includes both BM25 and kNN', () => {
    const rendered = renderTemplate(TEMPLATE, {
      query: '人工智慧', mode_hybrid: true, from: 0, size: 20,
      queryVector: Array(768).fill(0.1),
    });
    const parsed = JSON.parse(rendered);
    expect(parsed.knn).toBeDefined();
    expect(parsed.query).toBeDefined();
  });
});
