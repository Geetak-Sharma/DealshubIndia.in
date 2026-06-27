export interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  image?: string;
  type?: 'website' | 'article' | 'product';
  robots?: string;
  schema?: Record<string, any>;
  breadcrumbs?: Array<{ name: string; item: string }>;
}

export function generateMetadata(props: SEOProps) {
  return [
    { name: 'title', content: props.title },
    { name: 'description', content: props.description },
    { name: 'robots', content: props.robots || 'index, follow' }
  ];
}

export function generateOpenGraph(props: SEOProps) {
  return [
    { property: 'og:title', content: props.title },
    { property: 'og:description', content: props.description },
    { property: 'og:type', content: props.type || 'website' },
    ...(props.image ? [{ property: 'og:image', content: props.image }] : [])
  ];
}
