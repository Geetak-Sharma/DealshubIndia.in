import { generateMetadata, generateOpenGraph, SEOProps } from './metadata';
import { BreadcrumbSchema } from './schema/builders';

export interface AIMetadata {
  contentType?: string;
  entityType?: string;
  intent?: string;
  summary?: string;
  topics?: string[];
  audience?: string;
  readingLevel?: string;
  lastReviewed?: string;
  confidence?: number;
}

export interface ContentProps extends SEOProps {
  entityId?: string;
  aiMetadata?: AIMetadata;
}

export const Content = {
  generate: (props: ContentProps) => {
    const meta = generateMetadata(props);
    const og = generateOpenGraph(props);
    
    let jsonLd = [];
    if (props.schema) jsonLd.push(props.schema);
    if (props.breadcrumbs) jsonLd.push(BreadcrumbSchema(props.breadcrumbs));

    // Entity Metadata
    if (props.entityId) {
      meta.push({ name: 'dealshub:entity_id', content: props.entityId });
    }

    // Output AI metadata as explicit meta tags (could also be JSON-LD in the future)
    if (props.aiMetadata) {
      Object.entries(props.aiMetadata).forEach(([key, value]) => {
        meta.push({ name: `dealshub:ai:${key}`, content: String(value) });
      });
    }

    return {
      title: props.title,
      tags: [...meta, ...og],
      canonical: props.canonical,
      jsonLd: jsonLd.length > 0 ? JSON.stringify(jsonLd) : null
    };
  }
};
