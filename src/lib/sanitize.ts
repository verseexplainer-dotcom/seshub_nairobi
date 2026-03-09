import sanitizeHtml from 'sanitize-html';

const PRODUCT_ALLOWED_TAGS = [
  'p',
  'br',
  'ul',
  'ol',
  'li',
  'strong',
  'em',
  'b',
  'i',
  'u',
  'a',
  'blockquote',
  'code',
  'pre',
  'h2',
  'h3',
  'h4'
];

const PRODUCT_ALLOWED_ATTRS: sanitizeHtml.IOptions['allowedAttributes'] = {
  a: ['href', 'target', 'rel']
};

export function sanitizeProductDescription(input: unknown) {
  if (typeof input !== 'string' || !input.trim()) return '';

  return sanitizeHtml(input, {
    allowedTags: PRODUCT_ALLOWED_TAGS,
    allowedAttributes: PRODUCT_ALLOWED_ATTRS,
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    disallowedTagsMode: 'discard',
    transformTags: {
      a: (tagName, attribs) => {
        const href = typeof attribs.href === 'string' ? attribs.href.trim() : '';
        if (!href) {
          return {
            tagName,
            attribs: {}
          };
        }

        return {
          tagName,
          attribs: {
            href,
            target: '_blank',
            rel: 'noopener noreferrer nofollow'
          }
        };
      }
    }
  });
}
