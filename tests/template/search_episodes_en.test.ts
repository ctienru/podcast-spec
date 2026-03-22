import { renderTemplate } from '../helpers/template-renderer';

const TEMPLATE = 'es/search_episodes_en/query.template.mustache';

describe('ES Template: search_episodes_en — en specific behavior', () => {

  it('multi_match does not include title.chinese field', () => {
    const rendered = renderTemplate(TEMPLATE, { query: 'machine learning', mode: 'bm25', from: 0, size: 20 });
    const parsed = JSON.parse(rendered);
    const fields: string[] = parsed.query?.bool?.must?.[0]?.multi_match?.fields ?? [];
    expect(fields.some((f: string) => f.includes('chinese'))).toBe(false);
  });

  it('multi_match includes title field (standard analyzer)', () => {
    const rendered = renderTemplate(TEMPLATE, { query: 'machine learning', mode: 'bm25', from: 0, size: 20 });
    const parsed = JSON.parse(rendered);
    const fields: string[] = parsed.query?.bool?.must?.[0]?.multi_match?.fields ?? [];
    expect(fields.some((f: string) => f === 'title' || f.startsWith('title^'))).toBe(true);
  });
});
